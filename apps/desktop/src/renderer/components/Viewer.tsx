import { useEffect, useRef, useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import type { BroadcastState } from '../livekit/useRoom';
import { ViewerControls } from './ViewerControls';

interface Props {
  state: BroadcastState;
  videoTrack: any;
  audioTrack: any;
  initialVolume?: number;
  onVolumeChange?: (v: number) => void;
}

const MESSAGES: Partial<Record<BroadcastState, string>> = {
  none: 'Aguardando alguém transmitir…',
  ended: 'A transmissão terminou.',
  interrupted: 'A transmissão foi interrompida (o transmissor saiu ou perdeu a conexão).',
};

export function Viewer({
  state,
  videoTrack,
  audioTrack,
  initialVolume = 1,
  onVolumeChange,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(initialVolume);
  const [muted, setMuted] = useState(false);

  // As preferências chegam depois da primeira renderização.
  useEffect(() => setVolume(initialVolume), [initialVolume]);

  useEffect(() => {
    const el = video.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => void videoTrack.detach(el);
  }, [videoTrack]);

  useEffect(() => {
    const el = audio.current;
    if (!el || !audioTrack) return;
    audioTrack.attach(el);
    return () => void audioTrack.detach(el);
  }, [audioTrack]);

  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume;
      audio.current.muted = muted;
    }
  }, [volume, muted, audioTrack]);

  const live = state === 'live';
  return (
    <div
      ref={box}
      className="viewer group relative flex size-full items-center justify-center bg-stage"
    >
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        data-testid="video"
        hidden={!live}
        className="size-full object-contain"
      />
      <audio ref={audio} autoPlay data-testid="audio" />
      {!live && (
        <div className="flex flex-col items-center gap-3 px-6 text-center text-soft">
          <MonitorPlay size={44} className="text-faint" />
          <p role="status" className="text-sm">
            {MESSAGES[state]}
          </p>
        </div>
      )}
      {live && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <ViewerControls
            volume={volume}
            muted={muted}
            onVolume={(v) => {
              setVolume(v);
              onVolumeChange?.(v);
            }}
            onToggleMute={() => setMuted((m) => !m)}
            onFullscreen={() => void box.current?.requestFullscreen?.()}
          />
        </div>
      )}
    </div>
  );
}
