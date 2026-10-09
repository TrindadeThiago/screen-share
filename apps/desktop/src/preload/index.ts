import { contextBridge, ipcRenderer } from 'electron';
import type { ScreenShareBridge } from '../shared';

const bridge: ScreenShareBridge = {
  listSources: () => ipcRenderer.invoke('capture:list'),
  selectSource: (id) => ipcRenderer.invoke('capture:select', id),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getServerUrl: () => ipcRenderer.invoke('server:get'),
  setServerUrl: (url) => ipcRenderer.invoke('server:set', url),
  getPreferences: () => ipcRenderer.invoke('prefs:get'),
  setPreferences: (p) => ipcRenderer.invoke('prefs:set', p),
};

contextBridge.exposeInMainWorld('screenShare', bridge);
