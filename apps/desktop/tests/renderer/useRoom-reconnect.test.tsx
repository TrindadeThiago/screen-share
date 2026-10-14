import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRoom, RoomEvent } from './fakeLivekit';

vi.mock('livekit-client', async () => (await import('./fakeLivekit')).livekitModule);
import { useRoom } from '../../src/renderer/livekit/useRoom';

const join = { code: 'AAAA', serverUrl: 'wss://x', token: 'tok', expiresAt: '' };
beforeEach(() => FakeRoom.reset());

describe('useRoom (reconexão)', () => {
  it('reflete reconexão automática do SDK', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => void FakeRoom.last.emit(RoomEvent.Reconnecting));
    expect(result.current.status).toBe('reconnecting');
    act(() => void FakeRoom.last.emit(RoomEvent.Reconnected));
    expect(result.current.status).toBe('connected');
  });
  it('após queda definitiva, reentra com token novo', async () => {
    const rejoin = vi.fn().mockResolvedValue({ ...join, token: 'novo' });
    const { result } = renderHook(() => useRoom(join, { rejoin, retryDelayMs: 0 }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => void FakeRoom.last.emit(RoomEvent.Disconnected));
    expect(result.current.status).toBe('reconnecting');
    await waitFor(() => expect(FakeRoom.instances).toHaveLength(2));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(FakeRoom.last.connect).toHaveBeenCalledWith('wss://x', 'novo');
  });
  it('reentra provando a identidade anterior e descarta a sala antiga', async () => {
    const rejoin = vi.fn().mockResolvedValue({ ...join, token: 'novo' });
    const { result } = renderHook(() => useRoom(join, { rejoin, retryDelayMs: 0 }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    const old = FakeRoom.last;
    act(() => void old.emit(RoomEvent.Disconnected));
    await waitFor(() => expect(FakeRoom.instances).toHaveLength(2));
    expect(rejoin).toHaveBeenCalledWith('tok');
    expect(old.disconnect).toHaveBeenCalled();
    expect(old.listenerCount(RoomEvent.Disconnected)).toBe(0);
  });
  it('quem transmitia volta a transmitir depois de reentrar', async () => {
    const rejoin = vi.fn().mockResolvedValue({ ...join, token: 'novo' });
    const requestBroadcast = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useRoom(join, { rejoin, requestBroadcast, retryDelayMs: 0 }),
    );
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare('detail', { simulcast: false }));
    act(() => void FakeRoom.last.emit(RoomEvent.Disconnected));
    await waitFor(() => expect(FakeRoom.instances).toHaveLength(2));
    await waitFor(() =>
      expect(FakeRoom.last.localParticipant.setScreenShareEnabled).toHaveBeenCalled(),
    );
    const call = FakeRoom.last.localParticipant.setScreenShareEnabled.mock.calls[0]!;
    expect(call[2]).toMatchObject({
      degradationPreference: 'maintain-resolution',
      simulcast: false,
    });
    expect(requestBroadcast).toHaveBeenLastCalledWith('novo');
    expect(result.current.broadcast).toMatchObject({ state: 'live', local: true });
  });
  it('esgota as tentativas e mostra erro claro', async () => {
    const rejoin = vi.fn().mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRoom(join, { rejoin, retryDelayMs: 0, maxRetries: 2 }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => void FakeRoom.last.emit(RoomEvent.Disconnected));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(rejoin).toHaveBeenCalledTimes(2);
    expect(result.current.error).toMatch(/reconectar/);
  });
  it('sair voluntariamente não tenta reconectar', async () => {
    const rejoin = vi.fn();
    const { result } = renderHook(() => useRoom(join, { rejoin, retryDelayMs: 0 }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    act(() => result.current.leave());
    act(() => void FakeRoom.last.emit(RoomEvent.Disconnected));
    expect(rejoin).not.toHaveBeenCalled();
    expect(result.current.status).toBe('disconnected');
  });
});
