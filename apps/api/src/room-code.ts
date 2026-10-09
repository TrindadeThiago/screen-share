import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const CODE_LENGTH = 16;

/** Gera um código de sala normalizado (16 caracteres base32, ~80 bits) com CSPRNG. */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Normaliza entrada do usuário: remove espaços/hífens e usa maiúsculas. Retorna null se inválida. */
export function normalizeCode(input: string): string | null {
  const code = input.replace(/[\s-]+/g, '').toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!ALPHABET.includes(ch)) return null;
  return code;
}

/** Formata como XXXX-XXXX-XXXX-XXXX. */
export function formatCode(code: string): string {
  return code.match(/.{4}/g)!.join('-');
}
