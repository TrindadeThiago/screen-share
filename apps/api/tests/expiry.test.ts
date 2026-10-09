import { describe, expect, it } from 'vitest';
import { expireRooms } from '../src/services/expiry.js';
import { createRoom } from '../src/services/rooms.js';
import { normalizeCode } from '../src/room-code.js';
import { makeDeps } from './helpers.js';

describe('expireRooms', () => {
  it('expira e fecha apenas salas vencidas', async () => {
    const { deps, clock, mediaState } = makeDeps();
    const short = await createRoom(deps, { displayName: 'A', expiresInMinutes: 15 });
    const long = await createRoom(deps, { displayName: 'B', expiresInMinutes: 600 });
    clock.t += 16 * 60_000;
    expect(await expireRooms(deps.db, deps.media, clock.t)).toBe(1);
    const state = (c: string) =>
      (
        deps.db.prepare('SELECT state FROM rooms WHERE code=?').get(normalizeCode(c)!) as {
          state: string;
        }
      ).state;
    expect(state(short.code)).toBe('expired');
    expect(state(long.code)).toBe('active');
    expect(mediaState.closed).toEqual([normalizeCode(short.code)]);
    expect(await expireRooms(deps.db, deps.media, clock.t)).toBe(0);
  });
});
