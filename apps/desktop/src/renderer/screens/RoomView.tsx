import { useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';
import { MIC_TOGGLE_LABEL, type Preferences } from '../../shared';
import { Participants } from '../components/Participants';
import { SelfPreview } from '../components/SelfPreview';
import { SettingsDialog } from '../components/SettingsDialog';
import { SourcePicker } from '../components/SourcePicker';
import { StatsPanel, type StatsSample } from '../components/StatsPanel';
import { Viewer } from '../components/Viewer';
import { VoiceAudio } from '../components/VoiceAudio';
import { Button, IconButton, Notice, Switch } from '../components/ui';
import type { BroadcastState, ParticipantInfo, Status, VoiceTrack } from '../livekit/useRoom';

interface AttachableTrack {
  attach(el: HTMLMediaElement): unknown;
  detach(el: HTMLMediaElement): unknown;
}

export interface RoomViewProps {
  code: string;
  status: Status;
  quality: string | null;
  error: string | null;
  warning: string | null;
  participants: ParticipantInfo[];
  broadcast: { state: BroadcastState; local: boolean; by?: string };
  videoTrack: AttachableTrack | null;
  audioTrack: AttachableTrack | null;
  voiceTracks: VoiceTrack[];
  localVideoTrack: AttachableTrack | null;
  /** A transmissão local é de tela inteira, que leva o som do computador junto. */
  sharingScreenAudio: boolean;
  micOpen: boolean;
  talking: boolean;
  prefs: Preferences;
  updatePrefs: (change: Preferences) => void;
  serverUrl: string;
  readSample: () => Promise<StatsSample | null>;
  onToggleMic: (open: boolean) => void;
  /** A fonte é escolhida pelo sistema (Linux/Wayland): não abre o seletor do app. */
  systemPicker?: boolean;
  onPickSource: (id: string) => void;
  onStopShare: () => void;
  onLeave: () => void;
  /** Abre já com as métricas visíveis (usado na pré-visualização). */
  initialStats?: boolean;
}

const STATUS_TEXT: Record<Status, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
  error: 'Erro de conexão',
};

const STATUS_DOT: Record<Status, string> = {
  connecting: 'bg-warn',
  connected: 'bg-ok',
  reconnecting: 'bg-warn animate-pulse',
  disconnected: 'bg-faint',
  error: 'bg-live',
};

const QUALITY_TEXT: Record<string, string> = {
  excellent: 'excelente',
  good: 'boa',
  poor: 'ruim',
  lost: 'perdida',
};

export function RoomView(p: RoomViewProps) {
  const [picking, setPicking] = useState(false);
  const pickSource = () => (p.systemPicker ? p.onPickSource('system') : setPicking(true));
  const [showStats, setShowStats] = useState(p.initialStats ?? false);
  const [showPeople, setShowPeople] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const broadcasting = p.broadcast.state === 'live' && p.broadcast.local;
  const watching = Math.max(0, p.participants.length - 1);
  const voicesMuted =
    broadcasting && p.sharingScreenAudio && (p.prefs.muteVoicesWhileSharing ?? false);
  const liveIdentity = p.broadcast.state === 'live' ? p.broadcast.by : undefined;
  const micLabel = `Microfone aberto (${MIC_TOGGLE_LABEL} liga e desliga, mesmo com o app em segundo plano)`;

  const copy = async () => {
    await navigator.clipboard.writeText(p.code);
    setCopied(true);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <span className="text-xs text-faint">Sala</span>
        <strong data-testid="room-code" data-selectable className="font-mono text-sm tracking-wide">
          {p.code}
        </strong>
        <Button
          variant="ghost"
          className="h-7 px-2 text-xs"
          icon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={() => void copy()}
        >
          {copied ? 'Copiado!' : 'Copiar código'}
        </Button>
        <span className="ml-auto flex items-center gap-2 text-xs text-soft">
          <span aria-hidden className={`size-2 rounded-full ${STATUS_DOT[p.status]}`} />
          <span role="status">{STATUS_TEXT[p.status]}</span>
          {p.quality && QUALITY_TEXT[p.quality] && (
            <span data-testid="quality" className="text-faint">
              · Qualidade da conexão: {QUALITY_TEXT[p.quality]}
            </span>
          )}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <section aria-label="Transmissão" className="relative min-w-0 flex-1 bg-stage">
          {broadcasting ? (
            <div className="flex size-full items-center justify-center">
              {p.localVideoTrack ? (
                <SelfPreview track={p.localVideoTrack} />
              ) : (
                <p className="text-sm text-soft">Você está transmitindo.</p>
              )}
            </div>
          ) : (
            <Viewer
              state={p.broadcast.state}
              videoTrack={p.videoTrack}
              audioTrack={p.audioTrack}
              initialVolume={p.prefs.volume ?? 1}
              onVolumeChange={(v) => p.updatePrefs({ volume: v })}
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-4">
            <div className="pointer-events-auto flex w-full max-w-xl flex-col gap-2">
              {p.error && <Notice>{p.error}</Notice>}
              {p.warning && <Notice tone="warn">{p.warning}</Notice>}
              {broadcasting && p.sharingScreenAudio && (
                <div className="flex flex-col gap-2 rounded-md border border-warn/40 bg-panel/95 px-3 py-2.5 backdrop-blur">
                  <p role="alert" className="text-xs text-soft">
                    Atenção: todo o som do computador é enviado, inclusive as vozes dos amigos
                    tocadas por este app. Eles vão se ouvir com eco, mesmo que você use fone.
                  </p>
                  <Switch
                    checked={p.prefs.muteVoicesWhileSharing ?? false}
                    onChange={(v) => p.updatePrefs({ muteVoicesWhileSharing: v })}
                  >
                    Silenciar as vozes para mim enquanto transmito (evita o eco)
                  </Switch>
                </div>
              )}
            </div>
          </div>

          {broadcasting && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/65 px-2.5 py-1.5 text-xs backdrop-blur">
              <span className="rounded bg-live px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                AO VIVO
              </span>
              <span data-testid="watching">
                {watching === 1 ? '1 pessoa assistindo' : `${watching} pessoas assistindo`}
              </span>
            </div>
          )}

          {showStats && (
            <div className="absolute right-3 top-3">
              <StatsPanel readSample={p.readSample} />
            </div>
          )}
        </section>

        {showPeople && (
          <aside className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto border-l border-line bg-panel p-3">
            <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-faint">
              Na sala — {p.participants.length}
            </h2>
            <Participants participants={p.participants} liveIdentity={liveIdentity} />
          </aside>
        )}
      </div>

      <footer
        aria-label="Voz"
        className="flex h-16 shrink-0 items-center gap-2 border-t border-line bg-panel px-4"
      >
        <div className="flex flex-1 items-center gap-2">
          <IconButton
            role="switch"
            aria-checked={p.micOpen}
            label={micLabel}
            tone={p.micOpen || p.talking ? 'on' : 'default'}
            onClick={() => p.onToggleMic(!p.micOpen)}
          >
            {p.micOpen || p.talking ? <Mic size={18} /> : <MicOff size={18} />}
          </IconButton>
          {(p.talking || p.micOpen) && <span className="text-xs text-ok">Falando…</span>}
        </div>

        <div className="flex items-center gap-2">
          {broadcasting ? (
            <>
              <Button icon={<RefreshCw size={16} />} onClick={pickSource}>
                Trocar fonte
              </Button>
              <Button variant="danger" icon={<MonitorX size={16} />} onClick={p.onStopShare}>
                Parar de compartilhar
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              icon={<MonitorUp size={16} />}
              disabled={p.status !== 'connected'}
              onClick={pickSource}
            >
              Compartilhar tela
            </Button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <IconButton
            label={showStats ? 'Ocultar métricas' : 'Mostrar métricas'}
            aria-pressed={showStats}
            className={showStats ? 'text-accent' : ''}
            onClick={() => setShowStats((v) => !v)}
          >
            <Activity size={18} />
          </IconButton>
          <IconButton
            label={showPeople ? 'Ocultar participantes' : 'Mostrar participantes'}
            aria-pressed={showPeople}
            className={showPeople ? 'text-accent' : ''}
            onClick={() => setShowPeople((v) => !v)}
          >
            <Users size={18} />
          </IconButton>
          <IconButton label="Configurações" onClick={() => setShowSettings(true)}>
            <Settings size={18} />
          </IconButton>
          <IconButton label="Sair" tone="danger" onClick={p.onLeave}>
            <LogOut size={18} />
          </IconButton>
        </div>
      </footer>

      {p.voiceTracks.map((v) => (
        <VoiceAudio key={v.identity} track={v.track} muted={voicesMuted} />
      ))}

      {picking && (
        <SourcePicker
          onSelect={(id) => {
            setPicking(false);
            p.onPickSource(id);
          }}
          onCancel={() => setPicking(false)}
        />
      )}
      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          prefs={p.prefs}
          update={p.updatePrefs}
          serverUrl={p.serverUrl}
        />
      )}
    </div>
  );
}
