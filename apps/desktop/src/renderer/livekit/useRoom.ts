import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import type { JoinResult } from '../api/client';
import { captureOptions, publishOptions, type PresetName } from './presets';

export type Status = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
export type BroadcastState = 'none' | 'live' | 'ended' | 'interrupted';

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isLocal: boolean;
}

export interface UseRoomOptions {
  /** Obtém um token novo para reentrada após queda definitiva. */
  rejoin?: () => Promise<JoinResult>;
  maxRetries?: number;
  retryDelayMs?: number;
}

export function useRoom(initial: JoinResult, opts: UseRoomOptions = {}) {
  const { rejoin, maxRetries = 3, retryDelayMs = 2000 } = opts;
  const roomRef = useRef<Room | null>(null);
  const leftRef = useRef(false);
  const [status, setStatus] = useState<Status>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [broadcast, setBroadcast] = useState<{
    state: BroadcastState;
    local: boolean;
    by?: string;
  }>({
    state: 'none',
    local: false,
  });
  const [videoTrack, setVideoTrack] = useState<any>(null);
  const [audioTrack, setAudioTrack] = useState<any>(null);

  const refreshParticipants = useCallback((room: Room) => {
    const list: ParticipantInfo[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ].map((p: any) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isSpeaking: !!p.isSpeaking,
      isLocal: p === room.localParticipant,
    }));
    setParticipants(list);
  }, []);

  useEffect(() => {
    leftRef.current = false;
    let cancelled = false;
    let join = initial;

    const wire = (room: Room) => {
      const refresh = () => refreshParticipants(room);
      room
        .on(RoomEvent.ParticipantConnected, refresh)
        .on(RoomEvent.ParticipantDisconnected, (p: any) => {
          refresh();
          setBroadcast((b) =>
            b.state === 'live' && !b.local && b.by === p.identity
              ? { state: 'interrupted', local: false }
              : b,
          );
          setVideoTrack(null);
          setAudioTrack(null);
        })
        .on(RoomEvent.ActiveSpeakersChanged, refresh)
        .on(RoomEvent.TrackSubscribed, (track: any, _pub: any, p: any) => {
          if (track.source === Track.Source.ScreenShare) {
            setVideoTrack(track);
            setBroadcast({ state: 'live', local: false, by: p.identity });
          } else if (track.source === Track.Source.ScreenShareAudio) setAudioTrack(track);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: any) => {
          if (track.source === Track.Source.ScreenShare) {
            setVideoTrack(null);
            setBroadcast((b) =>
              b.state === 'live' && !b.local ? { state: 'ended', local: false } : b,
            );
          } else if (track.source === Track.Source.ScreenShareAudio) setAudioTrack(null);
        })
        .on(RoomEvent.Reconnecting, () => setStatus('reconnecting'))
        .on(RoomEvent.Reconnected, () => setStatus('connected'))
        .on(RoomEvent.Disconnected, () => {
          if (leftRef.current || cancelled) return;
          setStatus('reconnecting');
          void retry();
        });
    };

    const connect = async (j: JoinResult) => {
      const room = new Room({ adaptiveStream: true, dynacast: true });
      wire(room);
      await room.connect(j.serverUrl, j.token);
      roomRef.current = room;
      setStatus('connected');
      refreshParticipants(room);
    };

    const retry = async () => {
      if (!rejoin) return fail('Conexão perdida.');
      for (let i = 0; i < maxRetries && !cancelled && !leftRef.current; i++) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        try {
          join = await rejoin();
          await connect(join);
          return;
        } catch {
          /* tenta de novo */
        }
      }
      if (!cancelled && !leftRef.current)
        fail('Não foi possível reconectar à sala. Tente entrar novamente.');
    };

    const fail = (msg: string) => {
      setError(msg);
      setStatus('error');
    };

    connect(join).catch(() => fail('Não foi possível conectar à sala.'));
    return () => {
      cancelled = true;
      leftRef.current = true;
      void roomRef.current?.disconnect();
    };
  }, [initial.token]);

  const startShare = useCallback(async (preset: PresetName = 'motion') => {
    const room = roomRef.current;
    if (!room) return;
    const busy = Array.from(room.remoteParticipants.values()).some((p: any) =>
      p.getTrackPublication?.(Track.Source.ScreenShare),
    );
    if (busy) {
      setWarning('Outra pessoa já está transmitindo nesta sala.');
      return;
    }
    setWarning(null);
    await room.localParticipant.setScreenShareEnabled(
      true,
      captureOptions() as any,
      publishOptions(preset) as any,
    );
    setBroadcast({ state: 'live', local: true, by: room.localParticipant.identity });
  }, []);

  const stopShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setScreenShareEnabled(false);
    setBroadcast({ state: 'none', local: false });
  }, []);

  const setMicEnabled = useCallback(async (on: boolean) => {
    await roomRef.current?.localParticipant.setMicrophoneEnabled(on);
  }, []);

  const leave = useCallback(() => {
    leftRef.current = true;
    void roomRef.current?.disconnect();
    setStatus('disconnected');
  }, []);

  return {
    status,
    error,
    warning,
    participants,
    broadcast,
    videoTrack,
    audioTrack,
    startShare,
    stopShare,
    setMicEnabled,
    leave,
    getRoom: () => roomRef.current,
  };
}
