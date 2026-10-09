import { describe, expect, it } from 'vitest';
import { generateRoomCode } from '../src/room-code.js';
import { makeApp } from './helpers.js';

describe('adivinhação de códigos', () => {
  it('200 códigos aleatórios nunca entram', async () => {
    const { app } = await makeApp({ tokenRateMax: 10_000, globalRateMax: 10_000 });
    await app.inject({ method: 'POST', url: '/rooms', payload: { displayName: 'Ana' } });
    for (let i = 0; i < 200; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/rooms/${generateRoomCode()}/token`,
        payload: { displayName: 'X' },
      });
      expect(res.statusCode).toBe(404);
    }
  });
  it('malformado e desconhecido têm a mesma resposta', async () => {
    const { app } = await makeApp();
    const a = await app.inject({
      method: 'POST',
      url: '/rooms/abc/token',
      payload: { displayName: 'X' },
    });
    const b = await app.inject({
      method: 'POST',
      url: `/rooms/${generateRoomCode()}/token`,
      payload: { displayName: 'X' },
    });
    expect(a.statusCode).toBe(b.statusCode);
    expect(a.json()).toEqual(b.json());
  });
});
