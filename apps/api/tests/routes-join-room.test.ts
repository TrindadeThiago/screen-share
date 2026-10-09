import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

async function setup(payload: object = { displayName: 'Ana' }) {
  const ctx = await makeApp();
  const created = (await ctx.app.inject({ method: 'POST', url: '/rooms', payload })).json();
  return { ...ctx, code: created.code as string };
}
const join = (
  app: Awaited<ReturnType<typeof makeApp>>['app'],
  code: string,
  payload: object = { displayName: 'Bia' },
) => app.inject({ method: 'POST', url: `/rooms/${code}/token`, payload });

describe('POST /rooms/:code/token', () => {
  it('200 com JoinResult', async () => {
    const { app, code } = await setup();
    const res = await join(app, code);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ code, serverUrl: 'wss://live.example.com' });
  });
  it('404 código inexistente', async () => {
    const { app } = await setup();
    const res = await join(app, 'AAAA-AAAA-AAAA-AAAA');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'room_not_found', message: expect.any(String) });
  });
  it('401 senha errada', async () => {
    const { app, code } = await setup({ displayName: 'Ana', password: 'segredo1' });
    expect((await join(app, code, { displayName: 'B', password: 'x' })).statusCode).toBe(401);
  });
  it('409 sala lotada', async () => {
    const { app, code, mediaState } = await setup({ displayName: 'Ana', maxParticipants: 2 });
    mediaState.count = 2;
    expect((await join(app, code)).statusCode).toBe(409);
  });
  it('410 sala expirada', async () => {
    const { app, code, clock } = await setup();
    clock.t += 721 * 60_000;
    const res = await join(app, code);
    expect(res.statusCode).toBe(410);
    expect(res.json().error).toBe('room_expired');
  });
  it('400 nome ausente', async () => {
    const { app, code } = await setup();
    expect((await join(app, code, {})).statusCode).toBe(400);
  });
});
