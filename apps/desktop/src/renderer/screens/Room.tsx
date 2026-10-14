import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient, JoinResult } from '../api/client';
import { MIC_TOGGLE_LABEL, type Preferences } from '../../shared';
import { Participants } from '../components/Participants';
import { SourcePicker } from '../components/SourcePicker';
import { SelfPreview } from '../components/SelfPreview';
import {
  computeMetrics,
  sampleFromReport,
  StatsPanel,
  type StatsSample,
} from '../components/StatsPanel';
import { Viewer } from '../components/Viewer';
import { VoiceAudio } from '../components/VoiceAudio';
import { DEFAULT_PTT_KEY, keyLabel, useMic } from '../livekit/useMic';
import { PRESET_LABELS, type PresetName } from '../livekit/presets';
import { useRoom } from '../livekit/useRoom';
import { Track, type LocalVideoTrack } from 'livekit-client';

interface Props {
  join: JoinResult;
  displayName: string;
  password?: string;
  api: ApiClient;
  /** Servidor de mídia a usar no lugar do informado pela API (quem hospeda no próprio PC). */
  mediaUrl?: string | null;
  onLeave: () => void;
}

const STATUS_TEXT = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
  error: 'Erro de conexão',
} as const;

const QUALITY_TEXT: Record<string, string> = {
  excellent: 'excelente',
  good: 'boa',
  poor: 'ruim',
  lost: 'perdida',
};

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

export function Room({ join, displayName, password, api, mediaUrl, onLeave }: Props) {
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
  const [preset, setPreset] = useState<PresetName>('motion');
  const [picking, setPicking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulcast, setSimulcast] = useState(true);
  const [volume, setVolume] = useState(1);
  const [pttKey, setPttKey] = useState(DEFAULT_PTT_KEY);
  const [choosingKey, setChoosingKey] = useState(false);
  const [openMic, setOpenMic] = useState(false);
  const [muteVoices, setMuteVoices] = useState(false);
  const [sharingScreenAudio, setSharingScreenAudio] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);
  const { talking } = useMic(room.setMicEnabled, pttKey, micOn && !openMic && !choosingKey);
  const broadcasting = room.broadcast.state === 'live' && room.broadcast.local;

  useEffect(() => {
    window.screenShare.getPreferences().then(
      (p) => {
        if (p.preset) setPreset(p.preset);
        if (p.simulcast !== undefined) setSimulcast(p.simulcast);
        if (p.volume !== undefined) setVolume(p.volume);
        if (p.pushToTalkKey) setPttKey(p.pushToTalkKey);
        if (p.muteVoicesWhileSharing !== undefined) setMuteVoices(p.muteVoicesWhileSharing);
      },
      () => {},
    );
  }, []);

  const save = (p: Preferences) => void window.screenShare.setPreferences(p).catch(() => {});

  // Trocar a tecla de falar: a próxima tecla pressionada vira a nova (Esc cancela).
  useEffect(() => {
    if (!choosingKey) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      setChoosingKey(false);
      if (e.code === 'Escape') return;
      setPttKey(e.code);
      save({ pushToTalkKey: e.code });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choosingKey]);

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
  useEffect(() => {
    if (room.quality) log(`qualidade da conexão: ${room.quality}`);
  }, [room.quality]);
  useEffect(() => {
    if (room.error) log(`erro: ${room.error}`);
  }, [room.error]);

  const copy = async () => {
    await navigator.clipboard.writeText(join.code);
    setCopied(true);
  };

  // Também serve para trocar de fonte no meio da transmissão (há um corte breve para quem assiste).
  const pick = async (id: string) => {
    setPicking(false);
    await window.screenShare.selectSource(id);
    if (broadcasting) await room.stopShare();
    setSharingScreenAudio(id.startsWith('screen:'));
    await room.startShare(preset, { simulcast });
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

  const copyDiagnostics = async () => {
    await navigator.clipboard.writeText(await window.screenShare.readDiagnostics());
    setDiagCopied(true);
  };

  const leave = () => {
    room.leave();
    onLeave();
  };

  const watching = Math.max(0, room.participants.length - 1);
  const voicesMuted = broadcasting && sharingScreenAudio && muteVoices;

  return (
    <main>
      <header>
        <p>
          Código da sala: <strong data-testid="room-code">{join.code}</strong>{' '}
          <button type="button" onClick={copy}>
            {copied ? 'Copiado!' : 'Copiar código'}
          </button>
        </p>
        <p role="status">{STATUS_TEXT[room.status]}</p>
        {room.quality && QUALITY_TEXT[room.quality] && (
          <p data-testid="quality">Qualidade da conexão: {QUALITY_TEXT[room.quality]}</p>
        )}
        <button type="button" onClick={leave}>
          Sair
        </button>
      </header>

      {room.error && <p role="alert">{room.error}</p>}
      {room.warning && <p role="alert">{room.warning}</p>}

      <section aria-label="Transmissão">
        {broadcasting ? (
          <>
            <p data-testid="watching">
              {watching === 1 ? '1 pessoa assistindo' : `${watching} pessoas assistindo`}
            </p>
            {room.localVideoTrack && <SelfPreview track={room.localVideoTrack} />}
            {sharingScreenAudio && (
              <>
                <p role="alert">
                  Atenção: todo o som do computador é enviado, inclusive as vozes dos amigos tocadas
                  por este app. Eles vão se ouvir com eco, mesmo que você use fone.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={muteVoices}
                    onChange={(e) => {
                      setMuteVoices(e.target.checked);
                      save({ muteVoicesWhileSharing: e.target.checked });
                    }}
                  />
                  Silenciar as vozes para mim enquanto transmito (evita o eco)
                </label>
              </>
            )}
            <button type="button" onClick={() => setPicking(true)}>
              Trocar fonte
            </button>
            <button type="button" onClick={() => void room.stopShare()}>
              Parar de compartilhar
            </button>
          </>
        ) : (
          <>
            <label>
              Qualidade
              <select
                value={preset}
                onChange={(e) => {
                  const p = e.target.value as PresetName;
                  setPreset(p);
                  save({ preset: p });
                }}
              >
                {(Object.keys(PRESET_LABELS) as PresetName[]).map((k) => (
                  <option key={k} value={k}>
                    {PRESET_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={simulcast}
                onChange={(e) => {
                  setSimulcast(e.target.checked);
                  save({ simulcast: e.target.checked });
                }}
              />
              Enviar também em baixa resolução (para amigos com conexão lenta)
            </label>
            <button
              type="button"
              disabled={room.status !== 'connected'}
              onClick={() => setPicking(true)}
            >
              Compartilhar tela
            </button>
          </>
        )}
        {picking && <SourcePicker onSelect={pick} onCancel={() => setPicking(false)} />}
      </section>

      {!broadcasting && (
        <Viewer
          state={room.broadcast.state}
          videoTrack={room.videoTrack}
          audioTrack={room.audioTrack}
          initialVolume={volume}
          onVolumeChange={(v) => {
            setVolume(v);
            save({ volume: v });
          }}
        />
      )}

      <section aria-label="Voz">
        <label>
          <input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)} />
          Habilitar microfone (segure {keyLabel(pttKey)} para falar)
        </label>
        <button type="button" onClick={() => setChoosingKey(true)} disabled={choosingKey}>
          {choosingKey ? 'Pressione uma tecla…' : 'Trocar tecla'}
        </button>
        <label>
          <input type="checkbox" checked={openMic} onChange={(e) => setOpenMic(e.target.checked)} />
          Microfone aberto ({MIC_TOGGLE_LABEL} liga e desliga, mesmo com o app em segundo plano)
        </label>
        {(talking || openMic) && <span>Falando…</span>}
        {room.voiceTracks.map((v) => (
          <VoiceAudio key={v.identity} track={v.track} muted={voicesMuted} />
        ))}
      </section>

      <Participants participants={room.participants} />

      <button type="button" onClick={() => setShowStats((v) => !v)}>
        {showStats ? 'Ocultar métricas' : 'Mostrar métricas'}
      </button>
      {showStats && <StatsPanel readSample={readSample} />}
      <button type="button" onClick={() => void copyDiagnostics()}>
        {diagCopied ? 'Diagnóstico copiado!' : 'Copiar diagnóstico'}
      </button>
    </main>
  );
}
