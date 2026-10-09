import { describe, expect, it, vi } from 'vitest';
import { checkForUpdate, compareSemver, isAllowedExternalUrl } from '../../src/main/version';

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
  const body = { latest: '1.2.0', downloadUrl: 'https://x.com/a.exe' };
  it('retorna info quando há versão nova', async () => {
    expect(await checkForUpdate('1.0.0', 'u', ok(body) as never)).toEqual(body);
  });
  it('null quando atual ou mais nova', async () => {
    expect(await checkForUpdate('1.2.0', 'u', ok(body) as never)).toBeNull();
    expect(await checkForUpdate('2.0.0', 'u', ok(body) as never)).toBeNull();
  });
  it('falhas são silenciosas', async () => {
    expect(
      await checkForUpdate('1.0.0', 'u', vi.fn().mockRejectedValue(new Error('x')) as never),
    ).toBeNull();
    expect(
      await checkForUpdate('1.0.0', 'u', vi.fn().mockResolvedValue({ ok: false }) as never),
    ).toBeNull();
    expect(await checkForUpdate('1.0.0', 'u', ok({ nope: 1 }) as never)).toBeNull();
    const badJson = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => Promise.reject(new Error('bad')) });
    expect(await checkForUpdate('1.0.0', 'u', badJson as never)).toBeNull();
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
