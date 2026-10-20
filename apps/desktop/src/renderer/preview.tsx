/**
 * Pré-visualização das telas com dados simulados, só para desenvolvimento
 * (`npm run dev` e abra /preview.html?v=<tela>). Não entra no build do app.
 */
import { createRoot } from 'react-dom/client';
import type { CaptureSource, Preferences, ScreenShareBridge } from '../shared';
import { SettingsDialog } from './components/SettingsDialog';
import { SourcePicker } from './components/SourcePicker';
import { Home } from './screens/Home';
import { RoomView, type RoomViewProps } from './screens/RoomView';
import './styles.css';

function thumb(label: string, hue: number): string {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 180;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 320, 180);
  grad.addColorStop(0, `hsl(${hue} 45% 28%)`);
  grad.addColorStop(1, `hsl(${hue + 40} 50% 16%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 320, 180);
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = '16px Segoe UI, sans-serif';
  g.fillText(label, 16, 30);
  return c.toDataURL();
}

const sources: CaptureSource[] = [
  { id: 'screen:0:0', name: 'Tela 1', kind: 'screen', thumbnailDataUrl: thumb('Tela 1', 220) },
  { id: 'screen:1:0', name: 'Tela 2', kind: 'screen', thumbnailDataUrl: thumb('Tela 2', 260) },
  { id: 'window:1:0', name: 'Jogo', kind: 'window', thumbnailDataUrl: thumb('Jogo', 10) },
  {
    id: 'window:2:0',
    name: 'Navegador',
    kind: 'window',
    thumbnailDataUrl: thumb('Navegador', 150),
  },
];

const prefs: Preferences = { displayName: 'Ana', preset: 'motion', simulcast: true, volume: 0.8 };

const bridge: ScreenShareBridge = {
  platform: 'win32',
  listSources: async () => sources,
  selectSource: async () => {},
  getAppVersion: async () => '0.1.0',
  checkForUpdate: async () => null,
  openExternal: async () => {},
  getServerUrl: async () => 'http://localhost:3300',
  setServerUrl: async () => {},
  isServerConfigured: async () => true,
  getPreferences: async () => prefs,
  setPreferences: async () => {},
  getServerKey: async () => null,
  setServerKey: async () => {},
  getMediaUrl: async () => null,
  setMediaUrl: async () => {},
  logDiagnostic: async () => {},
  readDiagnostics: async () => 'linhas de diagnóstico',
  setInRoom: async () => {},
  onMicToggle: () => () => {},
};
window.screenShare = bridge;

/** Faixa de vídeo de mentira: pinta o elemento em vez de tocar mídia. */
const fakeVideo = (hue: number) => ({
  attach: (el: HTMLMediaElement) => {
    el.style.background = `linear-gradient(135deg, hsl(${hue} 50% 30%), hsl(${hue + 60} 55% 14%))`;
  },
  detach: () => {},
});
const silent = { attach: () => {}, detach: () => {} };

const people = [
  { identity: 'ana', name: 'Ana', isSpeaking: false, isLocal: true },
  { identity: 'bia', name: 'Bia', isSpeaking: true, isLocal: false },
  { identity: 'caio', name: 'Caio', isSpeaking: false, isLocal: false },
];

const room: RoomViewProps = {
  code: 'ABCD-EFGH-2345-6723',
  status: 'connected',
  quality: 'good',
  error: null,
  warning: null,
  participants: people,
  broadcast: { state: 'none', local: false },
  videoTrack: null,
  audioTrack: null,
  voiceTracks: [],
  localVideoTrack: null,
  sharingScreenAudio: false,
  micOpen: false,
  talking: false,
  prefs,
  updatePrefs: () => {},
  serverUrl: 'http://localhost:3300',
  readSample: async () => ({
    timestamp: Date.now(),
    bytes: Math.round((Date.now() / 1000) * 590_000),
    packets: Math.round(Date.now() / 3),
    packetsLost: 0,
    rttMs: 24,
    video: { fps: 40, width: 1280, height: 720, codec: 'H264', implementation: 'MediaFoundation' },
  }),
  onToggleMic: () => {},
  onPickSource: () => {},
  onStopShare: () => {},
  onLeave: () => {},
};

const noop = async () => {};
const home = (
  <Home api={{} as never} serverUrl="http://localhost:3300" onChangeServer={noop} onJoined={noop} />
);

const VIEWS: Record<string, JSX.Element> = {
  home,
  settings: (
    <>
      {home}
      <SettingsDialog
        onClose={() => {}}
        prefs={prefs}
        update={() => {}}
        serverUrl="http://localhost:3300"
        onChangeServer={noop}
      />
    </>
  ),
  'room-empty': <RoomView {...room} />,
  'room-watching': (
    <RoomView
      {...room}
      broadcast={{ state: 'live', local: false, by: 'bia' }}
      videoTrack={fakeVideo(200)}
      audioTrack={silent}
      initialStats
    />
  ),
  'room-live': (
    <RoomView
      {...room}
      broadcast={{ state: 'live', local: true, by: 'ana' }}
      localVideoTrack={fakeVideo(280)}
      sharingScreenAudio
      micOpen
    />
  ),
  'room-reconnecting': (
    <RoomView
      {...room}
      status="reconnecting"
      quality="poor"
      warning="Outra pessoa já está transmitindo nesta sala."
      broadcast={{ state: 'interrupted', local: false }}
    />
  ),
  picker: (
    <>
      <RoomView {...room} />
      <SourcePicker onSelect={() => {}} onCancel={() => {}} />
    </>
  ),
};

const view = new URLSearchParams(location.search).get('v') ?? 'home';
createRoot(document.getElementById('root')!).render(
  VIEWS[view] ?? (
    <ul className="p-8">
      {Object.keys(VIEWS).map((k) => (
        <li key={k}>
          <a className="text-accent underline" href={`?v=${k}`}>
            {k}
          </a>
        </li>
      ))}
    </ul>
  ),
);
