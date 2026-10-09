import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

describe('POST /rooms', () => {
  it('retorna 201 com JoinResult', async () => {
    const { app } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/rooms',
      payload: { displayName: 'Ana' },
    });
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.code).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
    expect(b.token.split('.')).toHaveLength(3);
    expect(b.serverUrl).toBe('wss://live.example.com');
    expect(new Date(b.expiresAt).getTime()).toBeGreaterThan(0);
  });
  it.each([
    [{}],
    [{ displayName: '' }],
    [{ displayName: 'x'.repeat(33) }],
    [{ displayName: 'Ana', maxParticipants: 11 }],
    [{ displayName: 'Ana', expiresInMinutes: 5 }],
    [{ displayName: 'Ana', password: 'abc' }],
  ])('retorna 400 para %j', async (payload) => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/rooms', payload });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_request');
  });
});
