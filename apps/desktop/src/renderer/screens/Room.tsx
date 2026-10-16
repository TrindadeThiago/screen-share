import { useCallback, useEffect, useRef, useState } from 'react';
import { Track, type LocalVideoTrack } from 'livekit-client';
import type { ApiClient, JoinResult } from '../api/client';
import { computeMetrics, sampleFromReport, type StatsSample } from '../components/StatsPanel';
import { usePreferences } from '../hooks/usePreferences';
import { DEFAULT_PTT_KEY, useMic } from '../livekit/useMic';
import { useRoom } from '../livekit/useRoom';
import { RoomView } from './RoomView';

interface Props {
  join: JoinResult;
  displayName: string;
  password?: string;
  api: ApiClient;
  /** Endereço da API em uso, mostrado nas configurações. */
  serverUrl?: string;
  /** Servidor de mídia a usar no lugar do informado pela API (quem hospeda no próprio PC). */
  mediaUrl?: string | null;
  onLeave: () => void;
}

const DIAGNOSTIC_INTERVAL_MS = 5000;

/** Uma linha de métricas para o log de diagnóstico. */
export function describeSample(prev: StatsSample, curr: StatsSample): string {
  const m = computeMetrics(prev, curr);
  const v = m.video;
  return [
    'mídia',
    v?.width && v.height ? `${v.width}x${v.height}` : null,
    v?.fps != null ? `${Math.round(v.fps)}fps` : null,
    `${m.bitrateKbps}kbps`,
    `perda ${m.lossPercent}%`,
    m.rttMs !== null ? `rtt ${m.rttMs}ms` : null,
    v?.codec,
    v?.implementation,
    v?.limitation ? `limitado por ${v.limitation}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Room({ join, displayName, password, api, serverUrl, mediaUrl, onLeave }: Props) {
  const room = useRoom(join, {
    ...(mediaUrl ? { serverUrl: mediaUrl } : {}),
    rejoin: (previousToken) =>
      api.joinRoom(join.code, {
        displayName,
        ...(password ? { password } : {}),
        rejoinToken: previousToken,
      }),
    requestBroadcast: (token) => api.requestBroadcast(join.code, token),
    releaseBroadcast: (token) => api.releaseBroadcast(join.code, token),
  });
  const roomRef = useRef(room);
  roomRef.current = room;
  const { prefs, update } = usePreferences();
  const [openMic, setOpenMic] = useState(false);
  const [sharingScreenAudio, setSharingScreenAudio] = useState(false);
  const { talking } = useMic(
    room.setMicEnabled,
    prefs.pushToTalkKey ?? DEFAULT_PTT_KEY,
    (prefs.pushToTalk ?? false) && !openMic,
  );
  const broadcasting = room.broadcast.state === 'live' && room.broadcast.local;

  // Enquanto está na sala: tela acordada e atalho global do microfone.
  useEffect(() => {
    void window.screenShare.setInRoom(true).catch(() => {});
    const off = window.screenShare.onMicToggle(() => setOpenMic((v) => !v));
    return () => {
      off();
      void window.screenShare.setInRoom(false).catch(() => {});
    };
  }, []);

  const firstMic = useRef(true);
  useEffect(() => {
    if (firstMic.current) return void (firstMic.current = false);
    void room.setMicEnabled(openMic);
  }, [openMic]);

  // Diagnóstico: mudanças de estado e uma amostra de métricas a cada 5 s.
  const log = (message: string) => void window.screenShare.logDiagnostic(message).catch(() => {});
  useEffect(() => log(`conexão: ${room.status}`), [room.status]);
  useEffect(
    () => log(`transmissão: ${room.broadcast.state}${room.broadcast.local ? ' (local)' : ''}`),
    [room.broadcast.state, room.broadcast.local],
  );
  // Som do computador de quem transmite: a faixa só existe se a pessoa compartilhou tela inteira.
  const watching = room.broadcast.state === 'live' && !room.broadcast.local;
  const hasAudio = !!room.audioTrack;
  useEffect(() => {
    if (watching) log(`áudio da transmissão: ${hasAudio ? 'recebido' : 'ausente'}`);
  }, [watching, hasAudio]);
  useEffect(() => {
    if (room.quality) log(`qualidade da conexão: ${room.quality}`);
  }, [room.quality]);
  useEffect(() => {
    if (room.error) log(`erro: ${room.error}`);
  }, [room.error]);

  // Também serve para trocar de fonte no meio da transmissão (há um corte breve para quem assiste).
  const pick = async (id: string) => {
    // No Linux a fonte é escolhida pelo sistema, e o som do computador vai com tela ou janela.
    const linux = window.screenShare.platform === 'linux';
    if (!linux) await window.screenShare.selectSource(id);
    if (broadcasting) await room.stopShare();
    setSharingScreenAudio(linux || id.startsWith('screen:'));
    await room.startShare(prefs.preset ?? 'motion', { simulcast: prefs.simulcast ?? true });
  };

  const readSample = useCallback(async (): Promise<StatsSample | null> => {
    const { getRoom, videoTrack } = roomRef.current;
    const local = getRoom()?.localParticipant.getTrackPublication(Track.Source.ScreenShare)
      ?.videoTrack as LocalVideoTrack | undefined;
    const report = (await local?.sender?.getStats()) ?? (await videoTrack?.receiver?.getStats());
    if (!report) return null;
    const stats: Record<string, unknown>[] = [];
    report.forEach((entry) => stats.push(entry));
    return sampleFromReport(stats);
  }, []);

  useEffect(() => {
    let prev: StatsSample | null = null;
    const id = setInterval(async () => {
      const s = await readSample().catch(() => null);
      if (s && prev) log(describeSample(prev, s));
      prev = s;
    }, DIAGNOSTIC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [readSample]);

  return (
    <RoomView
      code={join.code}
      status={room.status}
      quality={room.quality}
      error={room.error}
      warning={room.warning}
      participants={room.participants}
      broadcast={room.broadcast}
      videoTrack={room.videoTrack}
      audioTrack={room.audioTrack}
      voiceTracks={room.voiceTracks}
      localVideoTrack={room.localVideoTrack}
      sharingScreenAudio={sharingScreenAudio}
      micOpen={openMic}
      talking={talking}
      prefs={prefs}
      updatePrefs={update}
      serverUrl={serverUrl ?? ''}
      readSample={readSample}
      onToggleMic={setOpenMic}
      systemPicker={window.screenShare.platform === 'linux'}
      onPickSource={(id) => void pick(id)}
      onStopShare={() => void room.stopShare()}
      onLeave={() => {
        room.leave();
        onLeave();
      }}
    />
  );
}
