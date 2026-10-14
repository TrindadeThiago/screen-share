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
    isServerConfigured: () => true,
    getServerKey: () => 'chave',
    setServerKey: vi.fn(),
    getMediaUrl: () => 'ws://localhost:7880',
    setMediaUrl: vi.fn().mockResolvedValue(undefined),
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
  it('server:setKey valida, apara e trata vazio como apagar', async () => {
    const { call, deps } = setup();
    expect(await call('server:configured')).toBe(true);
    expect(() => call('server:setKey', 42)).toThrow();
    expect(() => call('server:setKey', 'x'.repeat(257))).toThrow();
    call('server:setKey', '  segredo  ');
    expect(deps.setServerKey).toHaveBeenLastCalledWith('segredo');
    call('server:setKey', '   ');
    expect(deps.setServerKey).toHaveBeenLastCalledWith(null);
    call('server:setKey', null);
    expect(deps.setServerKey).toHaveBeenLastCalledWith(null);
  });
  it('server:setMedia aceita texto ou null e repassa ao main', async () => {
    const { call, deps } = setup();
    await expect(call('server:setMedia', 7880)).rejects.toThrow();
    await call('server:setMedia', 'ws://localhost:7880');
    expect(deps.setMediaUrl).toHaveBeenLastCalledWith('ws://localhost:7880');
    await call('server:setMedia', null);
    expect(deps.setMediaUrl).toHaveBeenLastCalledWith(null);
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
    expect(sanitizePreferences({ pushToTalk: true })).toEqual({ pushToTalk: true });
  });
});
