import { join } from 'node:path';

export const DIAGNOSTICS_FILE = 'diagnostics.log';
export const MAX_LOG_BYTES = 1_000_000;
const MAX_LINE = 500;

export interface LogFs {
  appendFileSync(path: string, data: string): void;
  statSync(path: string): { size: number };
  renameSync(from: string, to: string): void;
  readFileSync(path: string, enc: 'utf8'): string;
  mkdirSync(path: string, opts: { recursive: true }): unknown;
}

/** Códigos de sala (XXXX-XXXX-XXXX-XXXX) e tokens JWT não podem ir para o arquivo. */
export function redact(line: string): string {
  return line
    .replace(/\b[A-Z2-7]{4}(-[A-Z2-7]{4}){3}\b/gi, '[sala]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]');
}

/**
 * Log de diagnóstico em arquivo, com um arquivo anterior de reserva (no máximo ~2 MB em disco).
 * Serve para um amigo copiar e mandar quando algo dá errado.
 */
export function createDiagnostics(dir: string, fs: LogFs, now: () => Date = () => new Date()) {
  const file = join(dir, DIAGNOSTICS_FILE);
  const previous = `${file}.1`;
  let ready = false;

  const size = () => {
    try {
      return fs.statSync(file).size;
    } catch {
      return 0;
    }
  };
  const read = (path: string) => {
    try {
      return fs.readFileSync(path, 'utf8');
    } catch {
      return '';
    }
  };

  return {
    log(message: unknown): void {
      if (typeof message !== 'string' || !message.trim()) return;
      try {
        if (!ready) {
          fs.mkdirSync(dir, { recursive: true });
          ready = true;
        }
        if (size() > MAX_LOG_BYTES) fs.renameSync(file, previous);
        const text = redact(message.replace(/\s+/g, ' ').trim()).slice(0, MAX_LINE);
        fs.appendFileSync(file, `${now().toISOString()} ${text}\n`);
      } catch {
        /* diagnóstico nunca derruba o app */
      }
    },
    /** Últimas linhas, das mais antigas para as mais novas. */
    tail(lines = 400): string {
      const all = (read(previous) + read(file)).split('\n').filter(Boolean);
      return all.slice(-lines).join('\n');
    },
  };
}
