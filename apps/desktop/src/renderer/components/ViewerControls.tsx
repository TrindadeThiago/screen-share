import { Maximize, Volume2, VolumeX } from 'lucide-react';

interface Props {
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}

const BTN = 'rounded-md p-2 text-white/90 hover:bg-white/15 hover:text-white';

export function ViewerControls({ volume, muted, onVolume, onToggleMute, onFullscreen }: Props) {
  const muteLabel = muted ? 'Ativar som' : 'Silenciar';
  return (
    <div className="controls flex items-center gap-2 rounded-lg bg-black/65 px-2 py-1 backdrop-blur">
      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muteLabel}
        title={muteLabel}
        className={BTN}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <input
        type="range"
        aria-label="Volume"
        className="w-28"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolume(Number(e.target.value))}
      />
      <button
        type="button"
        onClick={onFullscreen}
        aria-label="Tela cheia"
        title="Tela cheia"
        className={BTN}
      >
        <Maximize size={18} />
      </button>
    </div>
  );
}
