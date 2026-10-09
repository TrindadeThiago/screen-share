import type { Preferences, UpdateInfo } from '../shared';
import type { createCapture } from './capture';
import { isAllowedExternalUrl } from './version';

interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: any[]) => unknown): void;
}

export interface IpcDeps {
  capture: ReturnType<typeof createCapture>;
  appVersion: string;
  allowedHosts(): string[];
  getServerUrl(): string;
  setServerUrl(url: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  checkForUpdate(): Promise<UpdateInfo | null>;
  prefs: { get(): Preferences; set(p: Preferences): void };
}

export function sanitizePreferences(p: unknown): Preferences {
  const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
  const out: Preferences = {};
  if (typeof o.displayName === 'string') out.displayName = o.displayName.slice(0, 32);
  if (typeof o.volume === 'number' && o.volume >= 0 && o.volume <= 1) out.volume = o.volume;
  if (o.preset === 'motion' || o.preset === 'detail') out.preset = o.preset;
  if (typeof o.pushToTalkKey === 'string') out.pushToTalkKey = o.pushToTalkKey.slice(0, 32);
  return out;
}

export function registerIpc(ipcMain: IpcMainLike, d: IpcDeps): void {
  ipcMain.handle('capture:list', () => d.capture.listSources());
  ipcMain.handle('capture:select', (_e, id: unknown) => {
    if (typeof id !== 'string') throw new Error('id inválido');
    d.capture.selectSource(id);
  });
  ipcMain.handle('app:version', () => d.appVersion);
  ipcMain.handle('app:checkUpdate', () => d.checkForUpdate());
  ipcMain.handle('app:openExternal', async (_e, url: unknown) => {
    if (typeof url !== 'string' || !isAllowedExternalUrl(url, d.allowedHosts()))
      throw new Error('URL não permitida');
    await d.openExternal(url);
  });
  ipcMain.handle('server:get', () => d.getServerUrl());
  ipcMain.handle('server:set', async (_e, url: unknown) => {
    if (typeof url !== 'string') throw new Error('Endereço inválido');
    await d.setServerUrl(url);
  });
  ipcMain.handle('prefs:get', () => d.prefs.get());
  ipcMain.handle('prefs:set', (_e, p: unknown) => d.prefs.set(sanitizePreferences(p)));
}
