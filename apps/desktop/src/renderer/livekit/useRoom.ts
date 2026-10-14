import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type ConnectionQuality,
  type LocalTrackPublication,
  type LocalVideoTrack,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from 'livekit-client';
import type { JoinResult } from '../api/client';
import { captureOptions, publishOptions, type PresetName, type PublishChoices } from './presets';

export type Status = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
export type BroadcastState = 'none' | 'live' | 'ended' | 'interrupted';

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isLocal: boolean;
}

/** Faixa de microfone de um participante remoto, tocada pela tela da sala. */
export interface VoiceTrack {
  identity: string;
  track: RemoteTrack;
}

export interface UseRoomOptions {
  /** Servidor de mídia a usar no lugar do que veio com o token. */
  serverUrl?: string;
  /** Obtém um token novo após queda definitiva; recebe o anterior para manter a identidade. */
  rejoin?: (previousToken: string) => Promise<JoinResult>;
  /** Pede ao servidor a vez de transmitir; rejeita se outra pessoa já transmite. */
  requestBroadcast?: (token: string) => Promise<void>;
  /** Devolve a vez de transmitir. */
  releaseBroadcast?: (token: string) => Promise<void>;
  maxRetries?: number;
  retryDelayMs?: number;
  /** Quanto esperar a permissão de transmitir chegar pelo servidor de mídia. */
  permissionTimeoutMs?: number;
}

const SCREEN_SHARE_SOURCE = 3; // TrackSource.SCREEN_SHARE no protocolo do LiveKit

const mayShareScreen = (room: Room) =>
  !!room.localParticipant.permissions?.canPublishSources?.includes(SCREEN_SHARE_SOURCE);

/** A permissão concedida pela API chega ao cliente de forma assíncrona. */
function waitForSharePermission(room: Room, timeoutMs: number): Promise<void> {
  if (mayShareScreen(room)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      room.off(RoomEvent.ParticipantPermissionsChanged, onChange);
      resolve();
    };
    const onChange = () => {
      if (mayShareScreen(room)) done();
    };
    const timer = setTimeout(done, timeoutMs);
    room.on(RoomEvent.ParticipantPermissionsChanged, onChange);
  });
}

export function useRoom(initial: JoinResult, opts: UseRoomOptions = {}) {
  const { rejoin, maxRetries = 3, retryDelayMs = 2000, permissionTimeoutMs = 3000 } = opts;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const roomRef = useRef<Room | null>(null);
  const joinRef = useRef(initial);
  const leftRef = useRef(false);
  const broadcasterRef = useRef<string | null>(null); // quem transmite agora (remoto)
  /** Última transmissão local pedida; usada para retomar após reentrar. */
  const shareRef = useRef<{ preset: PresetName; choices: PublishChoices } | null>(null);
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
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const [voiceTracks, setVoiceTracks] = useState<VoiceTrack[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [quality, setQuality] = useState<ConnectionQuality | null>(null);

  const refreshParticipants = useCallback((room: Room) => {
    const all: Participant[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];
    setParticipants(
      all.map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        isSpeaking: !!p.isSpeaking,
        isLocal: p === room.localParticipant,
      })),
    );
  }, []);

  const release = useCallback(() => {
    const token = joinRef.current.token;
    void Promise.resolve()
      .then(() => optsRef.current.releaseBroadcast?.(token))
      .catch(() => {});
  }, []);

  /** Publica a tela na sala atual. Devolve false (com aviso) se não foi possível. */
  const share = useCallback(
    async (room: Room, preset: PresetName, choices: PublishChoices): Promise<boolean> => {
      const busy = Array.from(room.remoteParticipants.values()).some((p) =>
        p.getTrackPublication(Track.Source.ScreenShare),
      );
      if (busy) {
        setWarning('Outra pessoa já está transmitindo nesta sala.');
        return false;
      }
      setWarning(null);
      const { requestBroadcast } = optsRef.current;
      try {
        if (requestBroadcast) {
          await requestBroadcast(joinRef.current.token);
          await waitForSharePermission(room, permissionTimeoutMs);
        }
        await room.localParticipant.setScreenShareEnabled(
          true,
          captureOptions(preset) as ScreenShareCaptureOptions,
          publishOptions(preset, choices) as TrackPublishOptions,
        );
      } catch (e) {
        setWarning(
          (e as { code?: string })?.code === 'broadcast_busy'
            ? 'Outra pessoa já está transmitindo nesta sala.'
            : 'Não foi possível iniciar a transmissão.',
        );
        release();
        return false;
      }
      shareRef.current = { preset, choices };
      const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      setLocalVideoTrack((pub?.videoTrack as LocalVideoTrack | undefined) ?? null);
      setBroadcast({ state: 'live', local: true, by: room.localParticipant.identity });
      return true;
    },
    [permissionTimeoutMs, release],
  );

  useEffect(() => {
    leftRef.current = false;
    joinRef.current = initial;
    let cancelled = false;

    const wire = (room: Room) => {
      const refresh = () => refreshParticipants(room);
      room
        .on(RoomEvent.ParticipantConnected, refresh)
        .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          refresh();
          setVoiceTracks((v) => v.filter((t) => t.identity !== p.identity));
          // Só quem transmitia leva a transmissão junto ao sair.
          if (broadcasterRef.current !== p.identity) return;
          broadcasterRef.current = null;
          setVideoTrack(null);
          setAudioTrack(null);
          setBroadcast({ state: 'interrupted', local: false });
        })
        .on(RoomEvent.ActiveSpeakersChanged, refresh)
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, p: RemoteParticipant) => {
          if (track.source === Track.Source.ScreenShare) {
            broadcasterRef.current = p.identity;
            setVideoTrack(track);
            setBroadcast({ state: 'live', local: false, by: p.identity });
          } else if (track.source === Track.Source.ScreenShareAudio) setAudioTrack(track);
          else if (track.source === Track.Source.Microphone)
            setVoiceTracks((v) => [
              ...v.filter((t) => t.identity !== p.identity),
              { identity: p.identity, track },
            ]);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, p: RemoteParticipant) => {
          if (track.source === Track.Source.ScreenShare) {
            broadcasterRef.current = null;
            setVideoTrack(null);
            setBroadcast((b) =>
              b.state === 'live' && !b.local ? { state: 'ended', local: false } : b,
            );
          } else if (track.source === Track.Source.ScreenShareAudio) setAudioTrack(null);
          else if (track.source === Track.Source.Microphone)
            setVoiceTracks((v) => v.filter((t) => t.identity !== p?.identity));
        })
        // A fonte capturada acabou (janela fechada, captura encerrada pelo sistema) ou foi parada.
        .on(RoomEvent.LocalTrackUnpublished, (pub: LocalTrackPublication) => {
          if (pub?.source !== Track.Source.ScreenShare) return;
          shareRef.current = null;
          setLocalVideoTrack(null);
          setBroadcast((b) => (b.local ? { state: 'none', local: false } : b));
          release();
        })
        .on(RoomEvent.ConnectionQualityChanged, (q: ConnectionQuality, p: Participant) => {
          if (p === room.localParticipant) setQuality(q);
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
      try {
        await room.connect(optsRef.current.serverUrl ?? j.serverUrl, j.token);
      } catch (e) {
        room.removeAllListeners();
        throw e;
      }
      if (cancelled) return void room.disconnect();
      roomRef.current = room;
      setStatus('connected');
      refreshParticipants(room);
      return room;
    };

    /** A sala caiu de vez: o que vinha dela não vale mais. */
    const discard = () => {
      const old = roomRef.current;
      roomRef.current = null;
      old?.removeAllListeners();
      void old?.disconnect();
      broadcasterRef.current = null;
      setVideoTrack(null);
      setAudioTrack(null);
      setVoiceTracks([]);
      setLocalVideoTrack(null);
      setQuality(null);
    };

    const retry = async () => {
      if (!rejoin) return fail('Conexão perdida.');
      const resume = shareRef.current;
      discard();
      setBroadcast((b) => (b.local ? b : { state: 'none', local: false }));
      for (let i = 0; i < maxRetries && !cancelled && !leftRef.current; i++) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        try {
          joinRef.current = await rejoin(joinRef.current.token);
          const room = await connect(joinRef.current);
          // Quem transmitia volta a transmitir a mesma fonte, sem escolher de novo.
          if (room && resume && !(await share(room, resume.preset, resume.choices))) {
            shareRef.current = null;
            setBroadcast({ state: 'none', local: false });
          }
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

    connect(initial).catch(() => fail('Não foi possível conectar à sala.'));
    return () => {
      cancelled = true;
      leftRef.current = true;
      void roomRef.current?.disconnect();
    };
  }, [initial.token]);

  const startShare = useCallback(
    async (preset: PresetName = 'motion', choices: PublishChoices = {}) => {
      const room = roomRef.current;
      if (room) await share(room, preset, choices);
    },
    [share],
  );

  const stopShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    shareRef.current = null;
    await room.localParticipant.setScreenShareEnabled(false);
    setLocalVideoTrack(null);
    setBroadcast({ state: 'none', local: false });
    release();
  }, [release]);

  const setMicEnabled = useCallback(async (on: boolean) => {
    await roomRef.current?.localParticipant.setMicrophoneEnabled(on);
  }, []);

  const leave = useCallback(() => {
    leftRef.current = true;
    if (shareRef.current) release();
    void roomRef.current?.disconnect();
    setStatus('disconnected');
  }, [release]);

  return {
    status,
    error,
    warning,
    participants,
    broadcast,
    videoTrack,
    audioTrack,
    voiceTracks,
    localVideoTrack,
    quality,
    startShare,
    stopShare,
    setMicEnabled,
    leave,
    getRoom: () => roomRef.current,
  };
}
