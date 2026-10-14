import { useEffect, useRef, useState } from 'react';
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
    <div ref={box} className="viewer">
      <video ref={video} autoPlay playsInline muted data-testid="video" hidden={!live} />
      <audio ref={audio} autoPlay data-testid="audio" />
      {!live && <p role="status">{MESSAGES[state]}</p>}
      {live && (
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
      )}
    </div>
  );
}
