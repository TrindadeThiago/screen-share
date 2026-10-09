import { describe, expect, it } from 'vitest';
import { captureOptions, DEGRADATION, publishOptions } from '../../src/renderer/livekit/presets';

describe('presets', () => {
  it('movimento mantém fps; detalhe mantém resolução', () => {
    expect(DEGRADATION.motion).toBe('maintain-framerate');
    expect(DEGRADATION.detail).toBe('maintain-resolution');
    expect(publishOptions('motion').degradationPreference).toBe('maintain-framerate');
    expect(publishOptions('detail').degradationPreference).toBe('maintain-resolution');
  });
  it('padrão 1280x720 a 40fps com áudio', () => {
    expect(captureOptions()).toMatchObject({
      audio: true,
      resolution: { width: 1280, height: 720, frameRate: 40 },
    });
    expect(publishOptions('motion').screenShareEncoding).toMatchObject({
      maxFramerate: 40,
      maxBitrate: 4_000_000,
    });
  });
});
