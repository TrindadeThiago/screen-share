import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db.js';
import { createMediaGateway } from '../src/livekit.js';
import { createRoom, joinRoom, requestBroadcast, type RoomDeps } from '../src/services/rooms.js';
import { readToken } from '../src/services/tokens.js';

/**
 * Roda contra um LiveKit de verdade; fica pulado sem LIVEKIT_TEST_URL. Para rodar:
 *   docker run --rm -p 7880:7880 -e LIVEKIT_KEYS='devkey: segredo-de-teste-com-32-caracteres-ou-mais' \
 *     livekit/livekit-server:v1.13.9 --dev
 *   LIVEKIT_TEST_URL=http://localhost:7880 npm test -w @screen-share/api
 */
const url = process.env.LIVEKIT_TEST_URL;
const apiKey = process.env.LIVEKIT_TEST_KEY ?? 'devkey';
const apiSecret = process.env.LIVEKIT_TEST_SECRET ?? 'segredo-de-teste-com-32-caracteres-ou-mais';

describe.skipIf(!url)('integração com LiveKit real', () => {
  const deps = (): RoomDeps => ({
    db: openDb(':memory:'),
    media: createMediaGateway(url!, apiKey, apiSecret),
    now: Date.now,
    apiKey,
    apiSecret,
    livekitUrl: url!.replace(/^http/, 'ws'),
    tokenTtlSeconds: 600,
  });

  it('o LiveKit aceita os tokens emitidos pela API', async () => {
    const { token } = await createRoom(deps(), { displayName: 'Ana' });
    const res = await fetch(`${url}/rtc/validate?access_token=${token}`);
    expect(res.status).toBe(200);
  });

  it('sala sem ninguém conectado: lista vazia, entrada livre, transmissão recusada', async () => {
    const d = deps();
    const ana = await createRoom(d, { displayName: 'Ana', maxParticipants: 2 });
    const room = readToken(ana.token, apiSecret)!.room;
    expect(await d.media.listParticipants(room)).toEqual([]);
    await expect(joinRoom(d, ana.code, { displayName: 'Bia' })).resolves.toBeTruthy();
    await expect(requestBroadcast(d, ana.code, ana.token)).rejects.toMatchObject({
      code: 'invalid_token',
    });
    await expect(d.media.closeRoom(room)).resolves.toBeUndefined();
  });
});
