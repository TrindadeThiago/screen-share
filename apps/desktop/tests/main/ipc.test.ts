import { describe, expect, it, vi } from 'vitest';
import { registerIpc, sanitizePreferences } from '../../src/main/ipc';

function setup() {
  const handlers = new Map<string, (...a: any[]) => unknown>();
  const deps = {
    capture: { listSources: vi.fn(), selectSource: vi.fn(), displayMediaHandler: vi.fn() },
    appVersion: '1.0.0',
    allowedHosts: () => ['api.example.com'],
    getServerUrl: () => 'https://api.example.com',
    setServerUrl: vi.fn().mockResolvedValue(undefined),
    openExternal: vi.fn().mockResolvedValue(undefined),
    checkForUpdate: vi.fn().mockResolvedValue(null),
    prefs: { get: vi.fn().mockReturnValue({}), set: vi.fn() },
    getServerKey: () => 'chave',
    getMediaUrl: () => 'ws://localhost:7880',
    diagnostics: { log: vi.fn(), tail: vi.fn().mockReturnValue('linhas') },
    setInRoom: vi.fn(),
  };
  registerIpc({ handle: (c, l) => void handlers.set(c, l) }, deps as never);
  return { call: (c: string, ...a: unknown[]) => handlers.get(c)!({}, ...a), deps };
}

describe('ipc', () => {
  it('select valida o tipo do argumento', () => {
    const { call, deps } = setup();
    expect(() => call('capture:select', 123)).toThrow();
    call('capture:select', 'screen:0:0');
    expect(deps.capture.selectSource).toHaveBeenCalledWith('screen:0:0');
  });
  it('openExternal só aceita https de hosts permitidos', async () => {
    const { call, deps } = setup();
    await expect(call('app:openExternal', 'http://api.example.com/x')).rejects.toThrow();
    await expect(call('app:openExternal', 'https://evil.com/x')).rejects.toThrow();
    await call('app:openExternal', 'https://api.example.com/app.exe');
    expect(deps.openExternal).toHaveBeenCalledOnce();
  });
  it('server:get devolve o endereço atual', async () => {
    const { call } = setup();
    expect(await call('server:get')).toBe('https://api.example.com');
  });
  it('server:set exige string e repassa ao main', async () => {
    const { call, deps } = setup();
    await expect(call('server:set', 123)).rejects.toThrow();
    await call('server:set', 'http://100.1.2.3:3000');
    expect(deps.setServerUrl).toHaveBeenCalledWith('http://100.1.2.3:3000');
  });
  it('expõe chave do servidor, diagnóstico e presença em sala', async () => {
    const { call, deps } = setup();
    expect(await call('server:key')).toBe('chave');
    expect(await call('server:media')).toBe('ws://localhost:7880');
    await call('diag:log', 'oi');
    expect(deps.diagnostics.log).toHaveBeenCalledWith('oi');
    expect(await call('diag:read')).toBe('linhas');
    await call('room:active', 'sim');
    expect(deps.setInRoom).toHaveBeenLastCalledWith(false);
    await call('room:active', true);
    expect(deps.setInRoom).toHaveBeenLastCalledWith(true);
  });
  it('sanitiza preferências', () => {
    expect(
      sanitizePreferences({ volume: 5, preset: 'x', displayName: 'a'.repeat(50), evil: 1 }),
    ).toEqual({
      displayName: 'a'.repeat(32),
    });
    expect(sanitizePreferences({ volume: 0.5, preset: 'motion', simulcast: false })).toEqual({
      volume: 0.5,
      preset: 'motion',
      simulcast: false,
    });
    expect(sanitizePreferences({ simulcast: 'no' })).toEqual({});
  });
});
