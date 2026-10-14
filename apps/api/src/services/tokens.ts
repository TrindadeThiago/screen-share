import { createHmac, timingSafeEqual } from 'node:crypto';
import { AccessToken, TrackSource } from 'livekit-server-sdk';

export interface TokenInput {
  apiKey: string;
  apiSecret: string;
  room: string;
  identity: string;
  name: string;
  ttlSeconds: number;
}

/**
 * Emite o JWT do LiveKit com TTL curto. Todo participante pode falar; transmitir a tela
 * exige a permissão concedida por requestBroadcast (um transmissor por vez).
 */
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
    canPublishSources: [TrackSource.MICROPHONE],
  });
  return at.toJwt();
}

/**
 * Lê identidade e sala de um token emitido por esta API, conferindo só a assinatura.
 * A validade é ignorada de propósito: o token serve como prova de "quem eu era nesta sala"
 * para reentrar ou pedir a transmissão, e não dá acesso a nada sozinho.
 */
export function readToken(
  jwt: string,
  apiSecret: string,
): { identity: string; room: string } | null {
  const [header, payload, signature] = jwt.split('.');
  if (!header || !payload || !signature) return null;
  try {
    if (
      (JSON.parse(Buffer.from(header, 'base64url').toString()) as { alg?: string }).alg !== 'HS256'
    )
      return null;
    const expected = createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      sub?: unknown;
      video?: { room?: unknown };
    };
    if (typeof claims.sub !== 'string' || typeof claims.video?.room !== 'string') return null;
    return { identity: claims.sub, room: claims.video.room };
  } catch {
    return null;
  }
}
