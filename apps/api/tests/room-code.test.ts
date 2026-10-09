import { describe, expect, it } from 'vitest';
import { formatCode, generateRoomCode, normalizeCode } from '../src/room-code.js';

describe('room code', () => {
  it('gera 16 caracteres base32', () => {
    expect(generateRoomCode()).toMatch(/^[A-Z2-7]{16}$/);
  });
  it('é único em 10k amostras', () => {
    const s = new Set(Array.from({ length: 10_000 }, generateRoomCode));
    expect(s.size).toBe(10_000);
  });
  it('normaliza espaços, hífens e caixa', () => {
    const c = generateRoomCode();
    const messy = ` ${formatCode(c).toLowerCase()} `;
    expect(normalizeCode(messy)).toBe(c);
  });
  it('rejeita entradas inválidas', () => {
    expect(normalizeCode('abc')).toBeNull();
    expect(normalizeCode('1'.repeat(16))).toBeNull();
    expect(normalizeCode('')).toBeNull();
  });
  it('formata em grupos de 4', () => {
    expect(formatCode('ABCDEFGHIJKLMNOP')).toBe('ABCD-EFGH-IJKL-MNOP');
  });
});
