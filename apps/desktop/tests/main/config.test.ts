import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SERVER_URL,
  fetchMediaUrl,
  normalizeServerUrl,
  readConfigFile,
  resolveServerUrl,
} from '../../src/main/config';

describe('normalizeServerUrl', () => {
  it.each([
    ['https://api.example.com/', 'https://api.example.com'],
    ['  api.example.com  ', 'https://api.example.com'],
    ['http://100.64.0.1:3000', 'http://100.64.0.1:3000'],
    ['http://meu-pc.local:3000/qualquer/coisa', 'http://meu-pc.local:3000'],
  ])('%s → %s', (input, out) => {
    expect(normalizeServerUrl(input)).toBe(out);
  });
  it.each([
    '',
    '   ',
    'ftp://x.com',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'http://',
    42,
    null,
  ])('rejeita %j', (input) => {
    expect(normalizeServerUrl(input)).toBeNull();
  });
});

describe('readConfigFile', () => {
  it('lê apiUrl do config.json', () => {
    const read = vi.fn().mockReturnValue('{"apiUrl":"http://100.1.2.3:3000/"}');
    expect(readConfigFile('/x', read)).toBe('http://100.1.2.3:3000');
    expect(read.mock.calls[0]![0]).toMatch(/config\.json$/);
  });
  it('arquivo ausente, JSON quebrado ou valor inválido → null', () => {
    expect(
      readConfigFile('/x', () => {
        throw new Error('ENOENT');
      }),
    ).toBeNull();
    expect(readConfigFile('/x', () => '{oops')).toBeNull();
    expect(readConfigFile('/x', () => '{"apiUrl":"ftp://x"}')).toBeNull();
    expect(readConfigFile('/x', () => '{}')).toBeNull();
  });
});

describe('resolveServerUrl', () => {
  it('respeita a prioridade salvo > arquivo > env > padrão', () => {
    expect(resolveServerUrl({ saved: 'a.com', file: 'b.com', env: 'c.com' })).toBe('https://a.com');
    expect(resolveServerUrl({ file: 'b.com', env: 'c.com' })).toBe('https://b.com');
    expect(resolveServerUrl({ env: 'c.com' })).toBe('https://c.com');
    expect(resolveServerUrl({})).toBe(DEFAULT_SERVER_URL);
  });
  it('ignora valores inválidos e cai para o próximo', () => {
    expect(resolveServerUrl({ saved: 'ftp://x', file: 'b.com' })).toBe('https://b.com');
  });
});

describe('fetchMediaUrl', () => {
  const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });
  it('devolve a origem do mediaUrl', async () => {
    expect(
      await fetchMediaUrl('https://api', ok({ mediaUrl: 'wss://live.example.com/x' }) as never),
    ).toBe('wss://live.example.com');
  });
  it('falhas e valores inválidos → null', async () => {
    expect(
      await fetchMediaUrl('https://api', vi.fn().mockRejectedValue(new Error('x')) as never),
    ).toBeNull();
    expect(
      await fetchMediaUrl('https://api', vi.fn().mockResolvedValue({ ok: false }) as never),
    ).toBeNull();
    expect(await fetchMediaUrl('https://api', ok({}) as never)).toBeNull();
    expect(await fetchMediaUrl('https://api', ok({ mediaUrl: 'ftp://x' }) as never)).toBeNull();
    expect(await fetchMediaUrl('https://api', ok({ mediaUrl: 'nota url' }) as never)).toBeNull();
  });
});
