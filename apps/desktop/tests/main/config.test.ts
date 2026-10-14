import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SERVER_URL,
  fetchMediaUrl,
  isServerConfigured,
  normalizeMediaUrl,
  normalizeServerUrl,
  readConfigFile,
  readMediaUrl,
  readServerKey,
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

describe('normalizeMediaUrl', () => {
  it.each([
    ['ws://localhost:7880/rtc', 'ws://localhost:7880'],
    ['  localhost:7880 ', 'ws://localhost:7880'],
    ['wss://live.example.com', 'wss://live.example.com'],
    ['http://100.1.2.3:7880', 'http://100.1.2.3:7880'],
  ])('%s → %s', (input, out) => {
    expect(normalizeMediaUrl(input)).toBe(out);
  });
  it.each(['', '  ', 'ftp://x', 'javascript:alert(1)', 'ws://', 7880, null])(
    'rejeita %j',
    (input) => {
      expect(normalizeMediaUrl(input)).toBeNull();
    },
  );
});

describe('isServerConfigured', () => {
  it('basta uma fonte válida', () => {
    expect(isServerConfigured({ env: 'c.com' })).toBe(true);
    expect(isServerConfigured({ saved: null, file: 'http://100.1.2.3:3000' })).toBe(true);
  });
  it('sem fontes ou só valores inválidos → não configurado', () => {
    expect(isServerConfigured({})).toBe(false);
    expect(isServerConfigured({ saved: 'ftp://x', file: '', env: null })).toBe(false);
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

describe('config.json: mediaUrl e serverKey', () => {
  const file = (o: unknown) => () => JSON.stringify(o);
  it('lê mediaUrl ws/http e devolve a origem', () => {
    expect(readMediaUrl('/x', file({ mediaUrl: 'ws://localhost:7880/rtc' }))).toBe(
      'ws://localhost:7880',
    );
    expect(readMediaUrl('/x', file({ mediaUrl: 'https://live.example.com' }))).toBe(
      'https://live.example.com',
    );
  });
  it('ignora mediaUrl ausente, inválido ou de outro esquema', () => {
    expect(readMediaUrl('/x', file({}))).toBeNull();
    expect(readMediaUrl('/x', file({ mediaUrl: 'ftp://x' }))).toBeNull();
    expect(readMediaUrl('/x', file({ mediaUrl: 42 }))).toBeNull();
    expect(readMediaUrl('/x', () => 'não é json')).toBeNull();
  });
  it('lê serverKey quando é texto não vazio', () => {
    expect(readServerKey('/x', file({ serverKey: 'abc' }))).toBe('abc');
    expect(readServerKey('/x', file({ serverKey: '' }))).toBeNull();
    expect(readServerKey('/x', file({}))).toBeNull();
  });
});
