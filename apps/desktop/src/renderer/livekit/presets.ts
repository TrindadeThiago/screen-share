export type PresetName = 'motion' | 'detail';

export const PRESET_LABELS: Record<PresetName, string> = { motion: 'Movimento', detail: 'Detalhe' };

export const DEFAULT_VIDEO = { width: 1280, height: 720, frameRate: 40 } as const;
/**
 * Teto de vídeo por preset. "Movimento" sustenta 40 fps e precisa de mais banda
 * (cerca de 6 Mbps de upload estável); "detalhe" troca fps por nitidez e cabe em 4 Mbps.
 */
export const MAX_BITRATE: Record<PresetName, number> = { motion: 5_000_000, detail: 4_000_000 };

/** Áudio do computador é música/jogo, não voz: estéreo, sem filtros de voz e sem DTX. */
export const SCREEN_AUDIO_BITRATE = 128_000;
export const SCREEN_AUDIO_CAPTURE = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 2,
} as const;

/** "movimento" mantém o fps; "detalhe" mantém a resolução. */
export const DEGRADATION: Record<PresetName, 'maintain-framerate' | 'maintain-resolution'> = {
  motion: 'maintain-framerate',
  detail: 'maintain-resolution',
};

/** Dica ao encoder: "movimento" prioriza fluidez; "detalhe" prioriza nitidez de texto. */
export const CONTENT_HINT: Record<PresetName, 'motion' | 'detail'> = {
  motion: 'motion',
  detail: 'detail',
};

export function captureOptions(preset: PresetName = 'motion') {
  return {
    audio: { ...SCREEN_AUDIO_CAPTURE },
    resolution: { ...DEFAULT_VIDEO },
    contentHint: CONTENT_HINT[preset],
  };
}

export interface PublishChoices {
  /**
   * Publica também uma camada 640x360 para espectadores com conexão lenta.
   * Custa um segundo encode e mais upload para quem transmite.
   */
  simulcast?: boolean;
  videoCodec?: 'h264' | 'vp8' | 'vp9';
}

export function publishOptions(
  preset: PresetName,
  { simulcast = true, videoCodec = 'h264' }: PublishChoices = {},
) {
  return {
    videoCodec,
    simulcast,
    degradationPreference: DEGRADATION[preset],
    screenShareEncoding: {
      maxBitrate: MAX_BITRATE[preset],
      maxFramerate: DEFAULT_VIDEO.frameRate,
    },
    audioPreset: { maxBitrate: SCREEN_AUDIO_BITRATE },
    forceStereo: true,
    dtx: false,
  };
}
