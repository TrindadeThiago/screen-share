import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

describe('GET /config', () => {
  it('devolve o endereço do servidor de mídia', async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/config' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ mediaUrl: 'wss://live.example.com' });
  });
});
