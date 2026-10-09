import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

describe('electron-builder.yml', () => {
  const cfg = parse(readFileSync(resolve(__dirname, '../../electron-builder.yml'), 'utf8'));
  it('gera apenas o alvo portable, sem instalador', () => {
    const targets = cfg.win.target.map((t: string | { target: string }) =>
      typeof t === 'string' ? t : t.target,
    );
    expect(targets).toEqual(['portable']);
    expect(cfg.nsis).toBeUndefined();
  });
  it('não exige administrador', () => {
    expect(cfg.win.requestedExecutionLevel).toBe('asInvoker');
  });
});
