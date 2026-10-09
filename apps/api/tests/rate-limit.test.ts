import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

describe('rate limit', () => {
  it('responde 429 rate_limited após o máximo na rota de token', async () => {
    const { app } = await makeApp({ tokenRateMax: 3 });
    const codes: number[] = [];
    let last;
    for (let i = 0; i < 5; i++) {
      last = await app.inject({
        method: 'POST',
        url: '/rooms/AAAA-AAAA-AAAA-AAAA/token',
        payload: { displayName: 'X' },
      });
      codes.push(last.statusCode);
    }
    expect(codes.slice(0, 3)).toEqual([404, 404, 404]);
    expect(codes[4]).toBe(429);
    expect(last!.json().error).toBe('rate_limited');
  });
});
