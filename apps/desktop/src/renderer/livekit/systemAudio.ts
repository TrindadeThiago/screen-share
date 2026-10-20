import { createLocalAudioTrack, Track, type Room, type TrackPublishOptions } from 'livekit-client';
import { SCREEN_AUDIO_CAPTURE } from './presets';

type Device = Pick<MediaDeviceInfo, 'kind' | 'label' | 'deviceId'>;

/** No Linux não há loopback: o som do computador vem de uma fonte "Monitor of …" do PipeWire. */
export const usesMonitorAudio = () => window.screenShare?.platform === 'linux';

export function pickMonitor(devices: Device[]): Device | null {
  return devices.find((d) => d.kind === 'audioinput' && /monitor/i.test(d.label)) ?? null;
}

const log = (message: string) => void window.screenShare?.logDiagnostic(message).catch(() => {});

/**
 * Publica o som do computador como áudio da transmissão (Linux). Sai junto com a tela: o
 * LiveKit despublica o ScreenShareAudio ao desligar o compartilhamento.
 */
export async function publishMonitorAudio(
  room: Room,
  options: TrackPublishOptions,
): Promise<boolean> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === 'audioinput');
  log(`áudio linux: entradas ${inputs.map((d) => d.label || '(sem nome)').join(' | ')}`);
  const monitor = pickMonitor(devices);
  if (!monitor) {
    log('áudio linux: nenhuma fonte Monitor; transmitindo sem som do computador');
    return false;
  }
  const track = await createLocalAudioTrack({
    deviceId: { exact: monitor.deviceId },
    ...SCREEN_AUDIO_CAPTURE,
  });
  await room.localParticipant.publishTrack(track, {
    ...options,
    source: Track.Source.ScreenShareAudio,
  });
  log(`áudio linux: transmitindo "${monitor.label}"`);
  return true;
}
