import { RoomServiceClient, TrackSource } from 'livekit-server-sdk';

export interface RoomParticipant {
  identity: string;
  /** Está publicando a tela agora. */
  sharingScreen: boolean;
  /** Tem permissão para publicar a tela. */
  mayShareScreen: boolean;
}

/** Operações do servidor de mídia usadas pela API (abstraídas para testes). */
export interface MediaGateway {
  listParticipants(roomName: string): Promise<RoomParticipant[]>;
  /** Concede ou retira a permissão de publicar a tela (o microfone continua liberado). */
  setScreenShareAllowed(roomName: string, identity: string, allowed: boolean): Promise<void>;
  closeRoom(roomName: string): Promise<void>;
}

const SCREEN = [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];

export function createMediaGateway(
  apiUrl: string,
  apiKey: string,
  apiSecret: string,
): MediaGateway {
  const client = new RoomServiceClient(apiUrl, apiKey, apiSecret);
  return {
    async listParticipants(roomName) {
      try {
        return (await client.listParticipants(roomName)).map((p) => ({
          identity: p.identity,
          sharingScreen: p.tracks.some((t) => t.source === TrackSource.SCREEN_SHARE),
          mayShareScreen:
            p.permission?.canPublishSources.includes(TrackSource.SCREEN_SHARE) ?? false,
        }));
      } catch {
        return []; // sala ainda não existe no servidor de mídia
      }
    },
    async setScreenShareAllowed(roomName, identity, allowed) {
      await client.updateParticipant(roomName, identity, {
        permission: {
          canSubscribe: true,
          canPublish: true,
          canPublishData: true,
          canPublishSources: [TrackSource.MICROPHONE, ...(allowed ? SCREEN : [])],
        },
      });
    },
    async closeRoom(roomName) {
      try {
        await client.deleteRoom(roomName);
      } catch {
        /* já inexistente */
      }
    },
  };
}
