import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

export const RoomEvent = {
  ParticipantConnected: 'participantConnected',
  ParticipantDisconnected: 'participantDisconnected',
  ActiveSpeakersChanged: 'activeSpeakersChanged',
  TrackSubscribed: 'trackSubscribed',
  TrackUnsubscribed: 'trackUnsubscribed',
  LocalTrackUnpublished: 'localTrackUnpublished',
  ParticipantPermissionsChanged: 'participantPermissionsChanged',
  ConnectionQualityChanged: 'connectionQualityChanged',
  Reconnecting: 'reconnecting',
  Reconnected: 'reconnected',
  Disconnected: 'disconnected',
};
export const Track = {
  Source: {
    ScreenShare: 'screen_share',
    ScreenShareAudio: 'screen_share_audio',
    Microphone: 'microphone',
  },
};

export class FakeRoom extends EventEmitter {
  static instances: FakeRoom[] = [];
  static connectImpl: (url: string, token: string) => Promise<void> = async () => {};
  static get last() {
    return FakeRoom.instances[FakeRoom.instances.length - 1]!;
  }
  static reset() {
    FakeRoom.instances = [];
    FakeRoom.connectImpl = async () => {};
  }
  remoteParticipants = new Map<string, any>();
  localParticipant: any = {
    identity: 'me',
    name: 'Eu',
    isSpeaking: false,
    // 2 = microfone, 3 = tela (TrackSource do protocolo); testes de permissão trocam isto.
    permissions: { canPublishSources: [2, 3] },
    setScreenShareEnabled: vi.fn().mockResolvedValue(undefined),
    setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
    getTrackPublication: vi.fn(),
  };
  connect = vi.fn((url: string, token: string) => FakeRoom.connectImpl(url, token));
  disconnect = vi.fn().mockResolvedValue(undefined);
  constructor() {
    super();
    FakeRoom.instances.push(this);
  }
  addRemote(identity: string, name = identity, screenShare = false) {
    const p = {
      identity,
      name,
      isSpeaking: false,
      getTrackPublication: (src: string) =>
        screenShare && src === 'screen_share' ? {} : undefined,
    };
    this.remoteParticipants.set(identity, p);
    this.emit(RoomEvent.ParticipantConnected, p);
    return p;
  }
}

export const livekitModule = { Room: FakeRoom, RoomEvent, Track };

export const fakeTrack = (source: string) => ({ source, attach: vi.fn(), detach: vi.fn() });
