import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRoom } from './fakeLivekit';

vi.mock('livekit-client', async () => (await import('./fakeLivekit')).livekitModule);
import { useRoom } from '../../src/renderer/livekit/useRoom';

const join = { code: 'AAAA', serverUrl: 'wss://x', token: 'tok', expiresAt: '' };

beforeEach(() => FakeRoom.reset());

describe('useRoom (transmissão)', () => {
  it('conecta com a URL e o token', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(FakeRoom.last.connect).toHaveBeenCalledWith('wss://x', 'tok');
  });
  it('publica a tela com áudio e depois despublica, permanecendo conectado', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare('detail'));
    const call = FakeRoom.last.localParticipant.setScreenShareEnabled.mock.calls[0]!;
    expect(call[0]).toBe(true);
    expect(call[1]).toMatchObject({
      audio: true,
      resolution: { width: 1280, height: 720, frameRate: 40 },
    });
    expect(call[2]).toMatchObject({ degradationPreference: 'maintain-resolution' });
    expect(result.current.broadcast).toMatchObject({ state: 'live', local: true });
    await act(() => result.current.stopShare());
    expect(FakeRoom.last.localParticipant.setScreenShareEnabled).toHaveBeenLastCalledWith(false);
    expect(result.current.broadcast.state).toBe('none');
    expect(result.current.status).toBe('connected');
  });
  it('bloqueia um segundo transmissor com aviso', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => void FakeRoom.last.addRemote('bia', 'Bia', true));
    await act(() => result.current.startShare());
    expect(FakeRoom.last.localParticipant.setScreenShareEnabled).not.toHaveBeenCalled();
    expect(result.current.warning).toMatch(/já está transmitindo/);
  });
  it('falha de conexão vira erro', async () => {
    FakeRoom.connectImpl = async () => {
      throw new Error('x');
    };
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeTruthy();
  });
});
