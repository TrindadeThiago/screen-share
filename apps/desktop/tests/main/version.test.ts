import { describe, expect, it, vi } from 'vitest';
import {
  checkForUpdate,
  compareSemver,
  isAllowedExternalUrl,
  LATEST_RELEASE_URL,
} from '../../src/main/version';

const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });

describe('semver', () => {
  it.each([
    ['1.2.0', '1.1.9', 1],
    ['1.0.0', '1.0.0', 0],
    ['1.0.0', '1.0.1', -1],
    ['1.0.0-beta', '1.0.0', -1],
    ['2.0', '1.9.9', 1],
    ['v1.10.0', '1.9.0', 1],
  ])('compare(%s, %s)', (a, b, sign) => {
    expect(Math.sign(compareSemver(a, b))).toBe(sign);
  });
});

describe('checkForUpdate', () => {
  const page = 'https://github.com/TrindadeThiago/screen-share/releases/tag/v1.2.0';
  const release = { tag_name: 'v1.2.0', html_url: page };
  it('consulta a última release do GitHub e devolve a página dela', async () => {
    const f = ok(release);
    expect(await checkForUpdate('1.0.0', f as never)).toEqual({
      latest: '1.2.0',
      downloadUrl: page,
    });
    expect(f.mock.calls[0]![0]).toBe(LATEST_RELEASE_URL);
    expect(f.mock.calls[0]![1].headers['user-agent']).toBe('ScreenShare/1.0.0');
  });
  it('null quando atual ou mais nova', async () => {
    expect(await checkForUpdate('1.2.0', ok(release) as never)).toBeNull();
    expect(await checkForUpdate('2.0.0', ok(release) as never)).toBeNull();
  });
  it('recusa link de download fora do github.com', async () => {
    const evil = { tag_name: 'v9.0.0', html_url: 'https://evil.com/a.exe' };
    expect(await checkForUpdate('1.0.0', ok(evil) as never)).toBeNull();
  });
  it('falhas são silenciosas', async () => {
    expect(
      await checkForUpdate('1.0.0', vi.fn().mockRejectedValue(new Error('x')) as never),
    ).toBeNull();
    expect(
      await checkForUpdate('1.0.0', vi.fn().mockResolvedValue({ ok: false }) as never),
    ).toBeNull();
    expect(await checkForUpdate('1.0.0', ok({ nope: 1 }) as never)).toBeNull();
    const badJson = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => Promise.reject(new Error('bad')) });
    expect(await checkForUpdate('1.0.0', badJson as never)).toBeNull();
  });
});

describe('isAllowedExternalUrl', () => {
  it('aceita só https em hosts permitidos', () => {
    expect(isAllowedExternalUrl('https://github.com/a', ['github.com'])).toBe(true);
    expect(isAllowedExternalUrl('http://github.com/a', ['github.com'])).toBe(false);
    expect(isAllowedExternalUrl('https://evil.com', ['github.com'])).toBe(false);
    expect(isAllowedExternalUrl('javascript:alert(1)', ['github.com'])).toBe(false);
    expect(isAllowedExternalUrl('nota url', ['github.com'])).toBe(false);
  });
});
