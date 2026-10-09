import { describe, expect, it } from 'vitest';
import { AppError } from '../src/errors.js';
import { createRoom, joinRoom } from '../src/services/rooms.js';
import { makeDeps } from './helpers.js';

const rejects = async (p: Promise<unknown>, code: string) => {
  const e = await p.then(
    () => null,
    (x) => x,
  );
  expect(e).toBeInstanceOf(AppError);
  expect((e as AppError).code).toBe(code);
};

describe('joinRoom', () => {
  it('aceita código com espaços e minúsculas', async () => {
    const { deps } = makeDeps();
    const r = await createRoom(deps, { displayName: 'Ana' });
    const j = await joinRoom(deps, ` ${r.code.toLowerCase()} `, { displayName: 'Bia' });
    expect(j.code).toBe(r.code);
  });
  it('código desconhecido ou malformado → room_not_found', async () => {
    const { deps } = makeDeps();
    await rejects(joinRoom(deps, 'AAAA-AAAA-AAAA-AAAA', { displayName: 'B' }), 'room_not_found');
    await rejects(joinRoom(deps, 'xyz', { displayName: 'B' }), 'room_not_found');
  });
  it('sala vencida → room_expired', async () => {
    const { deps, clock } = makeDeps();
    const r = await createRoom(deps, { displayName: 'Ana', expiresInMinutes: 15 });
    clock.t += 15 * 60_000;
    await rejects(joinRoom(deps, r.code, { displayName: 'B' }), 'room_expired');
  });
  it('senha ausente ou errada → wrong_password; correta passa', async () => {
    const { deps } = makeDeps();
    const r = await createRoom(deps, { displayName: 'Ana', password: 'segredo1' });
    await rejects(joinRoom(deps, r.code, { displayName: 'B' }), 'wrong_password');
    await rejects(
      joinRoom(deps, r.code, { displayName: 'B', password: 'errada' }),
      'wrong_password',
    );
    await expect(
      joinRoom(deps, r.code, { displayName: 'B', password: 'segredo1' }),
    ).resolves.toBeTruthy();
  });
  it('sala no limite → room_full', async () => {
    const { deps, mediaState } = makeDeps();
    const r = await createRoom(deps, { displayName: 'Ana', maxParticipants: 2 });
    mediaState.count = 1;
    await expect(joinRoom(deps, r.code, { displayName: 'B' })).resolves.toBeTruthy();
    mediaState.count = 2;
    await rejects(joinRoom(deps, r.code, { displayName: 'C' }), 'room_full');
  });
});
