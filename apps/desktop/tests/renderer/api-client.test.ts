import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '../../src/renderer/api/client';

const res = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('api client', () => {
  it('createRoom envia JSON e devolve o resultado', async () => {
    const f = res(201, { code: 'AAAA', serverUrl: 'wss://x', token: 't', expiresAt: 'd' });
    const out = await createApiClient('https://api', f as never).createRoom({ displayName: 'Ana' });
    expect(out.token).toBe('t');
    expect(f).toHaveBeenCalledWith(
      'https://api/rooms',
      expect.objectContaining({ method: 'POST', body: '{"displayName":"Ana"}' }),
    );
  });
  it('joinRoom codifica o código na URL', async () => {
    const f = res(200, {});
    await createApiClient('https://api', f as never).joinRoom(' AB CD ', { displayName: 'B' });
    expect(f.mock.calls[0]![0]).toBe('https://api/rooms/AB%20CD/token');
  });
  it.each(['wrong_password', 'room_not_found', 'room_full', 'room_expired', 'rate_limited'])(
    'mapeia o erro %s',
    async (code) => {
      const f = res(400, { error: code, message: 'msg' });
      const err = await createApiClient('https://api', f as never)
        .joinRoom('x', { displayName: 'B' })
        .catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe(code);
      expect(err.message).toBe('msg');
    },
  );
  it('falha de rede vira ApiError network', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('fail'));
    const err = await createApiClient('https://api', f as never)
      .joinRoom('ABCD', { displayName: 'Ana' })
      .catch((e) => e);
    expect(err.code).toBe('network');
  });
  it('corpo não JSON vira server_error', async () => {
    const f = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => Promise.reject(new Error('x')),
    });
    const err = await createApiClient('https://api', f as never)
      .joinRoom('ABCD', { displayName: 'Ana' })
      .catch((e) => e);
    expect(err.code).toBe('server_error');
  });
  it('envia a chave do servidor só ao criar sala', async () => {
    const f = res(201, {});
    const client = createApiClient('https://api', f as never, 'chave');
    await client.createRoom({ displayName: 'Ana' });
    expect(f.mock.calls[0]![1].headers).toMatchObject({ 'x-server-key': 'chave' });
    await client.joinRoom('x', { displayName: 'B', rejoinToken: 'antigo' });
    expect(f.mock.calls[1]![1].headers).not.toHaveProperty('x-server-key');
    expect(f.mock.calls[1]![1].body).toContain('"rejoinToken":"antigo"');
  });
  it('pede e devolve a transmissão (respostas 204 sem corpo)', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => null });
    const client = createApiClient('https://api', f as never);
    await expect(client.requestBroadcast('AB', 'tok')).resolves.toBeUndefined();
    await client.releaseBroadcast('AB', 'tok');
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      'https://api/rooms/AB/broadcast',
      'https://api/rooms/AB/broadcast/stop',
    ]);
    expect(f.mock.calls[0]![1].body).toBe('{"token":"tok"}');
  });
});
