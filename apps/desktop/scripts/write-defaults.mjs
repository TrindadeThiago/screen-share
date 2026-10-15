/* global process, console */
// Grava dist/defaults.json com o servidor padrão do .exe, vindo de SCREEN_SHARE_DEFAULT_API_URL
// (no ambiente ou em apps/desktop/.env). Sem a variável, o app abre na tela de configurar servidor.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KEY = 'SCREEN_SHARE_DEFAULT_API_URL';
const root = join(import.meta.dirname, '..');
const out = join(root, 'dist', 'defaults.json');

function fromEnvFile() {
  const file = join(root, '.env');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${KEY}=`));
  return line?.slice(KEY.length + 1).trim();
}

const apiUrl = (process.env[KEY] ?? fromEnvFile())?.trim();
if (apiUrl) {
  writeFileSync(out, JSON.stringify({ apiUrl }) + '\n');
  console.log(`defaults.json: servidor padrão definido (${KEY})`);
} else {
  rmSync(out, { force: true });
  console.warn(`${KEY} não definida: o .exe vai pedir o endereço do servidor ao abrir`);
}
