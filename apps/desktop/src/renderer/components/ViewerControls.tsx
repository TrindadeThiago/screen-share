interface Props {
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}

export function ViewerControls({ volume, muted, onVolume, onToggleMute, onFullscreen }: Props) {
  return (
    <div className="controls">
      <button type="button" onClick={onToggleMute} aria-pressed={muted}>
        {muted ? 'Ativar som' : 'Silenciar'}
      </button>
      <label>
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={onFullscreen}>
        Tela cheia
      </button>
    </div>
  );
}
