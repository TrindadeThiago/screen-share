import { describe, expect, it } from 'vitest';
import { captureStream, makeApp } from './helpers.js';

describe('logs', () => {
  it('não contêm código, token nem senha', async () => {
    const cap = captureStream();
    const { app } = await makeApp({ logStream: cap.stream, logLevel: 'info' });
    const created = (
      await app.inject({
        method: 'POST',
        url: '/rooms',
        payload: { displayName: 'Ana', password: 'segredo-unico' },
      })
    ).json();
    const joined = await app.inject({
      method: 'POST',
      url: `/rooms/${created.code}/token`,
      payload: { displayName: 'Bia', password: 'segredo-unico' },
    });
    await app.inject({
      method: 'POST',
      url: '/rooms/ZZZZ-ZZZZ-ZZZZ-ZZZZ/token',
      payload: { displayName: 'B' },
    });
    const text = cap.text();
    expect(text.length).toBeGreaterThan(0);
    for (const secret of [
      created.code,
      created.code.replaceAll('-', ''),
      created.token,
      joined.json().token,
      'segredo-unico',
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});
