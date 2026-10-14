import { useEffect, useRef } from 'react';

interface AttachableTrack {
  attach(el: HTMLMediaElement): unknown;
  detach(el: HTMLMediaElement): unknown;
}

/** Toca a voz de um participante remoto. */
export function VoiceAudio({ track, muted = false }: { track: AttachableTrack; muted?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    track.attach(el);
    return () => void track.detach(el);
  }, [track]);

  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
  }, [muted, track]);

  return <audio ref={audio} autoPlay data-testid="voice" />;
}
