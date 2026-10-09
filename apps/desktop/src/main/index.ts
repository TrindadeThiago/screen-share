import { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createCapture } from './capture';
import { fetchMediaUrl, normalizeServerUrl, readConfigFile, resolveServerUrl } from './config';
import { registerIpc, sanitizePreferences } from './ipc';
import { buildCsp, createWindowOptions } from './security';
import { checkForUpdate } from './version';
import type { Preferences } from '../shared';

/** Arquivo de estado do app: preferências e endereço do servidor escolhido na tela. */
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
  };
}

/** Pasta do .exe portable (config.json fica ao lado dele). */
const exeDir = () => process.env.PORTABLE_EXECUTABLE_DIR ?? dirname(app.getPath('exe'));

async function createWindow() {
  const store = stateStore();
  const capture = createCapture(desktopCapturer as never);
  let serverUrl = '';
  let csp = '';

  const resolveAll = async () => {
    serverUrl = resolveServerUrl({
      saved: store.getSavedServer(),
      file: readConfigFile(exeDir(), (p) => readFileSync(p, 'utf8')),
      env: process.env.SCREEN_SHARE_API_URL,
    });
    const mediaUrl =
      (await fetchMediaUrl(serverUrl)) ?? normalizeServerUrl(process.env.SCREEN_SHARE_MEDIA_URL);
    csp = buildCsp(serverUrl, mediaUrl);
  };
  await resolveAll();

  const win = new BrowserWindow(createWindowOptions(join(__dirname, '../preload/index.js')));

  registerIpc(ipcMain, {
    capture,
    appVersion: app.getVersion(),
    allowedHosts: () => [new URL(serverUrl).hostname, 'github.com'],
    getServerUrl: () => serverUrl,
    async setServerUrl(input) {
      const url = normalizeServerUrl(input);
      if (!url) throw new Error('Endereço inválido. Use algo como https://meu-servidor.com');
      store.saveServer(url);
      await resolveAll();
      win.webContents.reload();
    },
    openExternal: (url) => shell.openExternal(url),
    checkForUpdate: () => checkForUpdate(app.getVersion(), `${serverUrl}/version`),
    prefs: store.prefs,
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
