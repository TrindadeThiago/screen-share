import { describe, expect, it } from 'vitest';
import { createRoom, verifyPassword } from '../src/services/rooms.js';
import { normalizeCode } from '../src/room-code.js';
import { makeDeps } from './helpers.js';

describe('createRoom', () => {
  it('aplica padrões (10 participantes, 720 min) e usa o relógio injetado', async () => {
    const { deps, clock } = makeDeps();
    const r = await createRoom(deps, { displayName: 'Ana' });
    const code = normalizeCode(r.code)!;
    const row = deps.db.prepare('SELECT * FROM rooms WHERE code=?').get(code) as Record<
      string,
      number
    >;
    expect(row.max_participants).toBe(10);
    expect(row.expires_at! - clock.t).toBe(720 * 60_000);
    expect(r.expiresAt).toBe(new Date(row.expires_at!).toISOString());
    expect(r.serverUrl).toBe('wss://live.example.com');
  });
  it('guarda a senha apenas como hash scrypt', async () => {
    const { deps } = makeDeps();
    const r = await createRoom(deps, { displayName: 'Ana', password: 'segredo1' });
    const row = deps.db
      .prepare('SELECT password_hash FROM rooms WHERE code=?')
      .get(normalizeCode(r.code)!) as {
      password_hash: string;
    };
    expect(row.password_hash).not.toContain('segredo1');
    expect(verifyPassword('segredo1', row.password_hash)).toBe(true);
    expect(verifyPassword('outra', row.password_hash)).toBe(false);
  });
  it('gera códigos distintos', async () => {
    const { deps } = makeDeps();
    const a = await createRoom(deps, { displayName: 'A' });
    const b = await createRoom(deps, { displayName: 'B' });
    expect(a.code).not.toBe(b.code);
  });
});
