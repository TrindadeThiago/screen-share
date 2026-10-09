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
