import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTrack, FakeRoom, RoomEvent } from './fakeLivekit';

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
  it('usa o servidor de mídia informado no lugar do que veio com o token', async () => {
    const { result } = renderHook(() => useRoom(join, { serverUrl: 'ws://localhost:7880' }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(FakeRoom.last.connect).toHaveBeenCalledWith('ws://localhost:7880', 'tok');
  });
  it('publica a tela com áudio e depois despublica, permanecendo conectado', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare('detail'));
    const call = FakeRoom.last.localParticipant.setScreenShareEnabled.mock.calls[0]!;
    expect(call[0]).toBe(true);
    expect(call[1]).toMatchObject({
      audio: { channelCount: 2, echoCancellation: false },
      resolution: { width: 1280, height: 720, frameRate: 40 },
    });
    expect(call[2]).toMatchObject({
      degradationPreference: 'maintain-resolution',
      simulcast: true,
    });
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
  it('preset detalhe captura com dica de conteúdo "detail"', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare('detail'));
    const call = FakeRoom.last.localParticipant.setScreenShareEnabled.mock.calls[0]!;
    expect(call[1]).toMatchObject({ contentHint: 'detail' });
  });
  it('repassa a escolha de simulcast ao publicar', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare('motion', { simulcast: false }));
    const call = FakeRoom.last.localParticipant.setScreenShareEnabled.mock.calls[0]!;
    expect(call[2]).toMatchObject({ simulcast: false });
  });
  it('fonte encerrada (janela fechada) encerra a transmissão local', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare());
    act(() => void FakeRoom.last.emit(RoomEvent.LocalTrackUnpublished, { source: 'screen_share' }));
    expect(result.current.broadcast).toEqual({ state: 'none', local: false });
  });
  it('espectador saindo não derruba o vídeo; transmissor saindo interrompe', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    const bia = FakeRoom.last.addRemote('bia');
    const caio = FakeRoom.last.addRemote('caio');
    const video = fakeTrack('screen_share');
    act(() => void FakeRoom.last.emit(RoomEvent.TrackSubscribed, video, {}, bia));
    act(() => void FakeRoom.last.emit(RoomEvent.ParticipantDisconnected, caio));
    expect(result.current.videoTrack).toBe(video);
    expect(result.current.broadcast).toMatchObject({ state: 'live', by: 'bia' });
    act(() => void FakeRoom.last.emit(RoomEvent.ParticipantDisconnected, bia));
    expect(result.current.videoTrack).toBeNull();
    expect(result.current.broadcast.state).toBe('interrupted');
  });
  it('expõe a voz dos participantes remotos e a remove quando saem', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    const bia = FakeRoom.last.addRemote('bia');
    const mic = fakeTrack('microphone');
    act(() => void FakeRoom.last.emit(RoomEvent.TrackSubscribed, mic, {}, bia));
    expect(result.current.voiceTracks).toEqual([{ identity: 'bia', track: mic }]);
    act(() => void FakeRoom.last.emit(RoomEvent.ParticipantDisconnected, bia));
    expect(result.current.voiceTracks).toEqual([]);
  });
  it('servidor recusa a vez: avisa e não publica', async () => {
    const requestBroadcast = vi.fn().mockRejectedValue({ code: 'broadcast_busy' });
    const releaseBroadcast = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRoom(join, { requestBroadcast, releaseBroadcast }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    await act(() => result.current.startShare());
    expect(requestBroadcast).toHaveBeenCalledWith('tok');
    expect(FakeRoom.last.localParticipant.setScreenShareEnabled).not.toHaveBeenCalled();
    expect(result.current.warning).toMatch(/já está transmitindo/);
    expect(result.current.broadcast.state).toBe('none');
  });
  it('espera a permissão de transmitir chegar antes de publicar', async () => {
    const requestBroadcast = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRoom(join, { requestBroadcast }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    const lp = FakeRoom.last.localParticipant;
    lp.permissions = { canPublishSources: [2] };
    let done = false;
    act(() => void result.current.startShare().then(() => (done = true)));
    await waitFor(() => expect(requestBroadcast).toHaveBeenCalled());
    expect(lp.setScreenShareEnabled).not.toHaveBeenCalled();
    lp.permissions = { canPublishSources: [2, 3] };
    act(() => void FakeRoom.last.emit(RoomEvent.ParticipantPermissionsChanged, undefined, lp));
    await waitFor(() => expect(done).toBe(true));
    expect(lp.setScreenShareEnabled).toHaveBeenCalled();
  });
  it('falha ao capturar a tela vira aviso e devolve a vez', async () => {
    const releaseBroadcast = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRoom(join, { releaseBroadcast }));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    FakeRoom.last.localParticipant.setScreenShareEnabled.mockRejectedValueOnce(new Error('x'));
    await act(() => result.current.startShare());
    expect(result.current.warning).toMatch(/Não foi possível iniciar/);
    expect(releaseBroadcast).toHaveBeenCalledWith('tok');
  });
  it('informa a qualidade da própria conexão', async () => {
    const { result } = renderHook(() => useRoom(join));
    await waitFor(() => expect(result.current.status).toBe('connected'));
    const room = FakeRoom.last;
    act(() => void room.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'bia' }));
    expect(result.current.quality).toBeNull();
    act(() => void room.emit(RoomEvent.ConnectionQualityChanged, 'poor', room.localParticipant));
    expect(result.current.quality).toBe('poor');
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
