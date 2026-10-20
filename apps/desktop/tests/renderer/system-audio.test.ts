import { describe, expect, it } from 'vitest';
import { pickMonitor } from '../../src/renderer/livekit/systemAudio';

const dev = (kind: MediaDeviceKind, label: string) => ({ kind, label, deviceId: label });

describe('pickMonitor', () => {
  it('escolhe a fonte Monitor entre as entradas de áudio', () => {
    const devices = [
      dev('audioinput', 'Microfone USB'),
      dev('audiooutput', 'Monitor de estúdio'),
      dev('audioinput', 'Monitor of Built-in Audio Analog Stereo'),
    ];
    expect(pickMonitor(devices)?.label).toBe('Monitor of Built-in Audio Analog Stereo');
  });
  it('sem Monitor → null', () => {
    expect(pickMonitor([dev('audioinput', 'Microfone USB')])).toBeNull();
  });
});
