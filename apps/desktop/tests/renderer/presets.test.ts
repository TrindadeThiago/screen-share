import { describe, expect, it } from 'vitest';
import {
  captureOptions,
  DEGRADATION,
  MAX_BITRATE,
  publishOptions,
} from '../../src/renderer/livekit/presets';

describe('presets', () => {
  it('movimento mantém fps; detalhe mantém resolução', () => {
    expect(DEGRADATION.motion).toBe('maintain-framerate');
    expect(DEGRADATION.detail).toBe('maintain-resolution');
    expect(publishOptions('motion').degradationPreference).toBe('maintain-framerate');
    expect(publishOptions('detail').degradationPreference).toBe('maintain-resolution');
  });
  it('a dica de conteúdo acompanha o preset', () => {
    expect(captureOptions('motion').contentHint).toBe('motion');
    expect(captureOptions('detail').contentHint).toBe('detail');
  });
  it('padrão 1280x720 a 40fps com áudio', () => {
    expect(captureOptions()).toMatchObject({
      resolution: { width: 1280, height: 720, frameRate: 40 },
    });
    expect(publishOptions('motion').screenShareEncoding.maxFramerate).toBe(40);
  });
  it('movimento tem teto de bitrate maior que detalhe', () => {
    expect(publishOptions('motion').screenShareEncoding.maxBitrate).toBe(5_000_000);
    expect(publishOptions('detail').screenShareEncoding.maxBitrate).toBe(4_000_000);
    expect(MAX_BITRATE.motion).toBeGreaterThan(MAX_BITRATE.detail);
  });
  it('áudio da tela: estéreo, 128 kbps, sem filtros de voz nem DTX', () => {
    expect(captureOptions().audio).toEqual({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
    });
    expect(publishOptions('motion')).toMatchObject({
      audioPreset: { maxBitrate: 128_000 },
      forceStereo: true,
      dtx: false,
    });
  });
  it('simulcast é explícito: ligado por padrão, desligável', () => {
    expect(publishOptions('motion').simulcast).toBe(true);
    expect(publishOptions('motion', { simulcast: false }).simulcast).toBe(false);
  });
});
