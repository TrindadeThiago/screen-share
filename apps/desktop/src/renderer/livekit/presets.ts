export type PresetName = 'motion' | 'detail';

export const PRESET_LABELS: Record<PresetName, string> = { motion: 'Movimento', detail: 'Detalhe' };

export const DEFAULT_VIDEO = { width: 1280, height: 720, frameRate: 40 } as const;
export const MAX_BITRATE = 4_000_000;

/** "movimento" mantém o fps; "detalhe" mantém a resolução. */
export const DEGRADATION: Record<PresetName, 'maintain-framerate' | 'maintain-resolution'> = {
  motion: 'maintain-framerate',
  detail: 'maintain-resolution',
};

export function captureOptions() {
  return { audio: true, resolution: { ...DEFAULT_VIDEO }, contentHint: 'motion' as const };
}

export function publishOptions(preset: PresetName, videoCodec: 'h264' | 'vp8' | 'vp9' = 'h264') {
  return {
    videoCodec,
    degradationPreference: DEGRADATION[preset],
    screenShareEncoding: { maxBitrate: MAX_BITRATE, maxFramerate: DEFAULT_VIDEO.frameRate },
  };
}
