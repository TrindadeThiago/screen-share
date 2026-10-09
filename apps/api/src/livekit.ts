import { RoomServiceClient } from 'livekit-server-sdk';

/** Operações do servidor de mídia usadas pela API (abstraídas para testes). */
export interface MediaGateway {
  countParticipants(roomName: string): Promise<number>;
  closeRoom(roomName: string): Promise<void>;
}

export function createMediaGateway(
  apiUrl: string,
  apiKey: string,
  apiSecret: string,
): MediaGateway {
  const client = new RoomServiceClient(apiUrl, apiKey, apiSecret);
  return {
    async countParticipants(roomName) {
      try {
        return (await client.listParticipants(roomName)).length;
      } catch {
        return 0; // sala ainda não existe no servidor de mídia
      }
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
