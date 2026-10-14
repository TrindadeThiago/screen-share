import { useEffect, useRef } from 'react';

interface AttachableTrack {
  attach(el: HTMLMediaElement): unknown;
  detach(el: HTMLMediaElement): unknown;
}

/** Mostra a quem transmite o que os amigos estão vendo. */
export function SelfPreview({ track }: { track: AttachableTrack }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    track.attach(el);
    return () => void track.detach(el);
  }, [track]);

  return (
    <video
      ref={video}
      autoPlay
      playsInline
      muted
      width={320}
      data-testid="self-preview"
      aria-label="Prévia da sua transmissão"
    />
  );
}
