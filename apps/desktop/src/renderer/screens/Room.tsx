import { useCallback, useEffect, useState } from 'react';
import type { ApiClient, JoinResult } from '../api/client';
import { Participants } from '../components/Participants';
import { SourcePicker } from '../components/SourcePicker';
import { StatsPanel, type StatsSample } from '../components/StatsPanel';
import { Viewer } from '../components/Viewer';
import { useMic } from '../livekit/useMic';
import { PRESET_LABELS, type PresetName } from '../livekit/presets';
import { useRoom } from '../livekit/useRoom';

interface Props {
  join: JoinResult;
  displayName: string;
  password?: string;
  api: ApiClient;
  onLeave: () => void;
}

const STATUS_TEXT = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
  error: 'Erro de conexão',
} as const;

export function Room({ join, displayName, password, api, onLeave }: Props) {
  const room = useRoom(join, {
    rejoin: () => api.joinRoom(join.code, { displayName, ...(password ? { password } : {}) }),
  });
  const [preset, setPreset] = useState<PresetName>('motion');
  const [picking, setPicking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);
  const { talking } = useMic(room.setMicEnabled, 'KeyV', micOn);

  useEffect(() => {
    window.screenShare.getPreferences().then(
      (p) => p.preset && setPreset(p.preset),
      () => {},
    );
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(join.code);
    setCopied(true);
  };

  const pick = async (id: string) => {
    setPicking(false);
    await window.screenShare.selectSource(id);
    await room.startShare(preset);
  };

  const readSample = useCallback(async (): Promise<StatsSample | null> => {
    const r = room.getRoom() as any;
    if (!r) return null;
    const local = r.localParticipant?.getTrackPublication?.('screen_share')?.videoTrack;
    const stats =
      (await local?.getSenderStats?.()) ?? (await room.videoTrack?.getReceiverStats?.());
    if (!stats) return null;
    const s = Array.isArray(stats) ? stats[0] : stats;
    return {
      timestamp: Date.now(),
      bytes: s.bytesSent ?? s.bytesReceived ?? 0,
      packets: s.packetsSent ?? s.packetsReceived ?? 0,
      packetsLost: s.packetsLost ?? 0,
      rttMs: s.roundTripTime != null ? Math.round(s.roundTripTime * 1000) : null,
    };
  }, [room]);

  const leave = () => {
    room.leave();
    onLeave();
  };

  const broadcasting = room.broadcast.state === 'live' && room.broadcast.local;

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
        <button type="button" onClick={leave}>
          Sair
        </button>
      </header>

      {room.error && <p role="alert">{room.error}</p>}
      {room.warning && <p role="alert">{room.warning}</p>}

      <section aria-label="Transmissão">
        {broadcasting ? (
          <>
            <p role="alert">
              Atenção: o áudio do computador inteiro é enviado, inclusive a voz de quem fala na
              sala. Use fone de ouvido e deixe o microfone desligado enquanto transmite.
            </p>
            <button type="button" onClick={() => void room.stopShare()}>
              Parar de compartilhar
            </button>
          </>
        ) : (
          <>
            <label>
              Qualidade
              <select value={preset} onChange={(e) => setPreset(e.target.value as PresetName)}>
                {(Object.keys(PRESET_LABELS) as PresetName[]).map((k) => (
                  <option key={k} value={k}>
                    {PRESET_LABELS[k]}
                  </option>
                ))}
              </select>
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
        />
      )}

      <section aria-label="Voz">
        <label>
          <input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)} />
          Habilitar microfone (segure V para falar)
        </label>
        {talking && <span>Falando…</span>}
      </section>

      <Participants participants={room.participants} />

      <button type="button" onClick={() => setShowStats((v) => !v)}>
        {showStats ? 'Ocultar métricas' : 'Mostrar métricas'}
      </button>
      {showStats && <StatsPanel readSample={readSample} />}
    </main>
  );
}
