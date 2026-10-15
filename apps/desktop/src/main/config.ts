import { join } from 'node:path';

export const DEFAULT_SERVER_URL = 'https://screenshare.example.com';
export const CONFIG_FILE_NAME = 'config.json';
/** Gravado em dist/ no build, a partir de SCREEN_SHARE_DEFAULT_API_URL: o servidor padrão do .exe. */
export const DEFAULTS_FILE_NAME = 'defaults.json';

/** Normaliza o endereço digitado: assume https se faltar esquema; só aceita http/https; devolve a origem. */
export function normalizeServerUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Normaliza o endereço do servidor de mídia: assume ws:// se faltar esquema; aceita ws, wss,
 * http e https; devolve a origem.
 */
export function normalizeMediaUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `ws://${raw}`);
    if (!['ws:', 'wss:', 'http:', 'https:'].includes(u.protocol) || !u.hostname) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Lê `serverKey` (chave para criar salas) de um config.json; qualquer falha retorna null. */
export function readServerKey(dir: string, readFile: (path: string) => string): string | null {
  try {
    const data = JSON.parse(readFile(join(dir, CONFIG_FILE_NAME))) as { serverKey?: unknown };
    return typeof data.serverKey === 'string' && data.serverKey ? data.serverKey : null;
  } catch {
    return null;
  }
}

/**
 * Lê `mediaUrl` de um config.json: endereço do servidor de mídia a usar no lugar do que a API
 * informa. Serve a quem hospeda o servidor no próprio PC e não o alcança pelo IP público.
 */
export function readMediaUrl(dir: string, readFile: (path: string) => string): string | null {
  try {
    const data = JSON.parse(readFile(join(dir, CONFIG_FILE_NAME))) as { mediaUrl?: unknown };
    return normalizeMediaUrl(data.mediaUrl);
  } catch {
    return null;
  }
}

/** Lê `apiUrl` de um config.json (ou do defaults.json do build); qualquer falha retorna null. */
export function readConfigFile(
  dir: string,
  readFile: (path: string) => string,
  fileName = CONFIG_FILE_NAME,
): string | null {
  try {
    const data = JSON.parse(readFile(join(dir, fileName))) as { apiUrl?: unknown };
    return normalizeServerUrl(data.apiUrl);
  } catch {
    return null;
  }
}

export interface ServerSources {
  saved?: string | null; // escolhido na tela do app
  file?: string | null; // config.json ao lado do .exe
  env?: string | null; // SCREEN_SHARE_API_URL
  builtIn?: string | null; // defaults.json gravado no build
}

/** Algum endereço válido foi definido (no app, no config.json ou no ambiente)? */
export function isServerConfigured(s: ServerSources): boolean {
  return [s.saved, s.file, s.env].some((v) => normalizeServerUrl(v) !== null);
}

/** Prioridade: escolha salva no app > config.json > variável de ambiente > padrão do build > placeholder. */
export function resolveServerUrl(s: ServerSources): string {
  return (
    normalizeServerUrl(s.saved) ??
    normalizeServerUrl(s.file) ??
    normalizeServerUrl(s.env) ??
    normalizeServerUrl(s.builtIn) ??
    DEFAULT_SERVER_URL
  );
}

/** Pergunta à API o endereço do servidor de mídia. Retorna null se indisponível ou inválido. */
export async function fetchMediaUrl(
  apiUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 4000,
): Promise<string | null> {
  try {
    const res = await fetchFn(`${apiUrl}/config`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = (await res.json()) as { mediaUrl?: unknown };
    if (typeof data.mediaUrl !== 'string') return null;
    const u = new URL(data.mediaUrl);
    return ['ws:', 'wss:', 'http:', 'https:'].includes(u.protocol) ? u.origin : null;
  } catch {
    return null;
  }
}
