import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

describe('GET /config', () => {
  it('devolve o endereço do servidor de mídia', async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/config' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ mediaUrl: 'wss://live.example.com' });
  });
  it('libera CORS para o app desktop (origem file://)', async () => {
    const { app } = await makeApp();
    const pre = await app.inject({
      method: 'OPTIONS',
      url: '/rooms',
      headers: { origin: 'null', 'access-control-request-method': 'POST' },
    });
    expect(pre.statusCode).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe('*');
    expect(pre.headers['access-control-allow-headers']).toContain('x-server-key');
    const res = await app.inject({ method: 'GET', url: '/config', headers: { origin: 'null' } });
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
