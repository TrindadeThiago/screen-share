import { describe, expect, it } from 'vitest';
import { issueToken } from '../src/services/tokens.js';
import { decodeJwt, KEY, SECRET } from './helpers.js';

describe('tokens', () => {
  it('contém sala, identidade, nome, TTL curto e permissões', async () => {
    const jwt = decodeJwt(
      await issueToken({
        apiKey: KEY,
        apiSecret: SECRET,
        room: 'ROOM',
        identity: 'id1',
        name: 'Ana',
        ttlSeconds: 600,
      }),
    );
    expect(jwt.iss).toBe(KEY);
    expect(jwt.sub).toBe('id1');
    expect(jwt.name).toBe('Ana');
    expect(jwt.exp - jwt.nbf).toBeLessThanOrEqual(600);
    expect(jwt.video).toMatchObject({
      roomJoin: true,
      room: 'ROOM',
      canSubscribe: true,
      canPublish: true,
    });
  });
});
