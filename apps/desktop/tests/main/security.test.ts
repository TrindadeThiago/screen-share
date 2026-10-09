import { describe, expect, it } from 'vitest';
import { buildCsp, createWindowOptions } from '../../src/main/security';

describe('segurança do Electron', () => {
  it('janela isolada e em sandbox', () => {
    const wp = createWindowOptions('/x/preload.js').webPreferences;
    expect(wp.contextIsolation).toBe(true);
    expect(wp.nodeIntegration).toBe(false);
    expect(wp.sandbox).toBe(true);
    expect(wp.preload).toBe('/x/preload.js');
  });
  it('CSP sem origem de mídia só libera a API', () => {
    const csp = buildCsp('https://api.example.com', null);
    expect(csp).toContain("connect-src 'self' https://api.example.com;");
  });
  it('CSP proíbe scripts remotos e eval', () => {
    const csp = buildCsp('https://api.example.com', 'https://live.example.com');
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*(https?:|unsafe-eval|unsafe-inline|\*)/);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('wss://live.example.com');
    expect(csp).toContain("object-src 'none'");
  });
});
