import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  powerSaveBlocker,
  safeStorage,
  session,
  shell,
} from 'electron';
import * as fs from 'node:fs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createCapture } from './capture';
import {
  DEFAULTS_FILE_NAME,
  fetchMediaUrl,
  isServerConfigured,
  normalizeMediaUrl,
  normalizeServerUrl,
  readConfigFile,
  readMediaUrl,
  readServerKey,
  resolveServerUrl,
} from './config';
import { createDiagnostics } from './diagnostics';
import { createPresence } from './presence';
import { registerIpc, sanitizePreferences } from './ipc';
import { buildCsp, createWindowOptions } from './security';
import { checkForUpdate } from './version';
import type { Preferences } from '../shared';

/** Arquivo de estado do app: preferências, endereço do servidor e chave escolhidos na tela. */
function stateStore() {
  const file = join(app.getPath('userData'), 'preferences.json');
  const read = (): Record<string, unknown> => {
    try {
      return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    } catch {
      return {};
    }
  };
  const write = (o: Record<string, unknown>) => writeFileSync(file, JSON.stringify(o));
  return {
    prefs: {
      get: (): Preferences => sanitizePreferences(read()),
      set: (p: Preferences) => write({ ...read(), ...p }),
    },
    getSavedServer: () =>
      typeof read().serverUrl === 'string' ? (read().serverUrl as string) : null,
    saveServer: (url: string) => write({ ...read(), serverUrl: url }),
    getSavedMedia: () => (typeof read().mediaUrl === 'string' ? (read().mediaUrl as string) : null),
    saveMedia: (url: string | null) => {
      const rest = read();
      delete rest.mediaUrl;
      write(url ? { ...rest, mediaUrl: url } : rest);
    },
    /** A chave fica cifrada pelo sistema (DPAPI no Windows), nunca em texto puro. */
    getSavedKey: (): string | null => {
      const v = read().serverKey;
      if (typeof v !== 'string') return null;
      try {
        return safeStorage.decryptString(Buffer.from(v, 'base64')) || null;
      } catch {
        return null;
      }
    },
    saveKey: (key: string | null) => {
      const rest = read();
      delete rest.serverKey;
      if (!key) return write(rest);
      if (!safeStorage.isEncryptionAvailable())
        throw new Error('Este sistema não oferece como guardar a chave com segurança.');
      write({ ...rest, serverKey: safeStorage.encryptString(key).toString('base64') });
    },
  };
}

/** Pasta do .exe portable (config.json fica ao lado dele). */
const exeDir = () => process.env.PORTABLE_EXECUTABLE_DIR ?? dirname(app.getPath('exe'));

async function createWindow() {
  const store = stateStore();
  const capture = createCapture(desktopCapturer as never);
  let serverUrl = '';
  let csp = '';
  let mediaOverride: string | null = null;
  let configured = false;

  const resolveAll = async () => {
    const sources = {
      saved: store.getSavedServer(),
      file: readConfigFile(exeDir(), (p) => readFileSync(p, 'utf8')),
      env: process.env.SCREEN_SHARE_API_URL,
      builtIn: readConfigFile(
        join(__dirname, '..'),
        (p) => readFileSync(p, 'utf8'),
        DEFAULTS_FILE_NAME,
      ),
    };
    configured = isServerConfigured(sources);
    serverUrl = resolveServerUrl(sources);
    // Salvo no app > config.json; sem nenhum dos dois, vale o que a API informa.
    mediaOverride =
      normalizeMediaUrl(store.getSavedMedia()) ??
      readMediaUrl(exeDir(), (p) => readFileSync(p, 'utf8'));
    const apiMedia = configured && mediaOverride ? null : await fetchMediaUrl(serverUrl);
    // Sem endereço definido, o servidor padrão basta se responder; senão, a tela de setup.
    configured ||= apiMedia !== null;
    const mediaUrl =
      mediaOverride ?? apiMedia ?? normalizeServerUrl(process.env.SCREEN_SHARE_MEDIA_URL);
    csp = buildCsp(serverUrl, mediaUrl);
  };
  await resolveAll();

  const win = new BrowserWindow(createWindowOptions(join(__dirname, '../preload/index.js')));
  const diagnostics = createDiagnostics(join(app.getPath('userData'), 'logs'), fs);
  const presence = createPresence(powerSaveBlocker, globalShortcut, () =>
    win.webContents.send('mic:toggle'),
  );
  diagnostics.log(`app ${app.getVersion()} iniciado`);
  win.on('closed', () => presence.setInRoom(false));

  registerIpc(ipcMain, {
    capture,
    appVersion: app.getVersion(),
    allowedHosts: () => [new URL(serverUrl).hostname, 'github.com'],
    getServerUrl: () => serverUrl,
    async setServerUrl(input) {
      const url = normalizeServerUrl(input);
      if (!url) throw new Error('Endereço inválido. Use algo como https://meu-servidor.com');
      if (!(await fetchMediaUrl(url)))
        throw new Error(
          `Não foi possível falar com o servidor em ${url}. Confira o endereço e se ele está no ar.`,
        );
      store.saveServer(url);
      await resolveAll();
      win.webContents.reload();
    },
    openExternal: (url) => shell.openExternal(url),
    checkForUpdate: () => checkForUpdate(app.getVersion()),
    prefs: store.prefs,
    isServerConfigured: () => configured,
    getServerKey: () =>
      store.getSavedKey() ??
      readServerKey(exeDir(), (p) => readFileSync(p, 'utf8')) ??
      process.env.SCREEN_SHARE_SERVER_KEY ??
      null,
    setServerKey: (key) => store.saveKey(key),
    getMediaUrl: () => mediaOverride,
    async setMediaUrl(input) {
      const url = input === null || !input.trim() ? null : normalizeMediaUrl(input);
      if (input !== null && input.trim() && !url)
        throw new Error('Endereço inválido. Use algo como ws://localhost:7880');
      store.saveMedia(url);
      await resolveAll();
      win.webContents.reload();
    },
    diagnostics,
    setInRoom: (inRoom) => presence.setInRoom(inRoom),
  });

  session.defaultSession.setDisplayMediaRequestHandler((req, cb) =>
    capture.displayMediaHandler(req, cb as never),
  );
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  if (process.env.VITE_DEV_SERVER_URL) await win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else await win.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
