import { describe, expect, it } from 'vitest';
import { createDiagnostics, MAX_LOG_BYTES, redact } from '../../src/main/diagnostics';

function memoryFs() {
  const files = new Map<string, string>();
  return {
    files,
    appendFileSync: (p: string, d: string) => void files.set(p, (files.get(p) ?? '') + d),
    statSync: (p: string) => {
      if (!files.has(p)) throw new Error('ENOENT');
      return { size: files.get(p)!.length };
    },
    renameSync: (a: string, b: string) => {
      files.set(b, files.get(a)!);
      files.delete(a);
    },
    readFileSync: (p: string) => {
      if (!files.has(p)) throw new Error('ENOENT');
      return files.get(p)!;
    },
    mkdirSync: () => undefined,
  };
}
const at = () => new Date('2026-10-13T12:00:00Z');

describe('diagnóstico', () => {
  it('remove códigos de sala e tokens', () => {
    expect(redact('sala ABCD-EFGH-2345-6723 ok')).toBe('sala [sala] ok');
    expect(redact('sala abcd-efgh-2345-6723')).toBe('sala [sala]');
    expect(redact('token eyJhbGciOi.eyJzdWIi.c2ln-_x fim')).toBe('token [token] fim');
    expect(redact('1280x720 a 40 fps, 4800 kbps')).toBe('1280x720 a 40 fps, 4800 kbps');
  });
  it('grava linhas com data, em uma linha só, e devolve o fim', () => {
    const fs = memoryFs();
    const d = createDiagnostics('/logs', fs, at);
    d.log('conectado\nà sala ABCD-EFGH-2345-6723');
    d.log(123);
    d.log('   ');
    d.log('x'.repeat(2000));
    const lines = d.tail().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('2026-10-13T12:00:00.000Z conectado à sala [sala]');
    expect(lines[1]!.length).toBeLessThan(600);
  });
  it('gira o arquivo ao passar do limite e mantém o anterior', () => {
    const fs = memoryFs();
    const d = createDiagnostics('/logs', fs, at);
    fs.files.set('/logs/diagnostics.log', 'antiga\n'.repeat(MAX_LOG_BYTES / 7 + 1));
    d.log('nova');
    expect(fs.files.get('/logs/diagnostics.log')).toBe('2026-10-13T12:00:00.000Z nova\n');
    expect(fs.files.get('/logs/diagnostics.log.1')).toContain('antiga');
    expect(d.tail(2).split('\n')).toEqual(['antiga', '2026-10-13T12:00:00.000Z nova']);
  });
  it('falha de disco não lança', () => {
    const fs = memoryFs();
    fs.appendFileSync = () => {
      throw new Error('disco cheio');
    };
    expect(() => createDiagnostics('/logs', fs, at).log('x')).not.toThrow();
  });
});
