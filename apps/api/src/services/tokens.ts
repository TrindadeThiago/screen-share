import { AccessToken } from 'livekit-server-sdk';

export interface TokenInput {
  apiKey: string;
  apiSecret: string;
  room: string;
  identity: string;
  name: string;
  ttlSeconds: number;
}

/** Emite o JWT do LiveKit com TTL curto e permissões de participante comum. */
export async function issueToken(i: TokenInput): Promise<string> {
  const at = new AccessToken(i.apiKey, i.apiSecret, {
    identity: i.identity,
    name: i.name,
    ttl: i.ttlSeconds,
  });
  at.addGrant({
    roomJoin: true,
    room: i.room,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
  });
  return at.toJwt();
}
