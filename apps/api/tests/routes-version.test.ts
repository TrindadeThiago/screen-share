import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeApp, makeDeps } from './helpers.js';

describe('GET /version', () => {
  it('200 com latest e downloadUrl', async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/version' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ latest: '1.2.0', downloadUrl: 'https://example.com/app.exe' });
  });
  it('500 claro quando o arquivo é inválido', async () => {
    const { app, deps } = await makeApp();
    writeFileSync(deps.versionFile, '{oops');
    const res = await app.inject({ method: 'GET', url: '/version' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('server_error');
  });
  it('500 quando o arquivo não existe', async () => {
    const { app } = await makeApp({ versionFile: '/nao/existe.json' });
    expect((await app.inject({ method: 'GET', url: '/version' })).statusCode).toBe(500);
    void makeDeps;
  });
});
