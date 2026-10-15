import { contextBridge, ipcRenderer } from 'electron';
import type { ScreenShareBridge } from '../shared';

const bridge: ScreenShareBridge = {
  platform: process.platform,
  listSources: () => ipcRenderer.invoke('capture:list'),
  selectSource: (id) => ipcRenderer.invoke('capture:select', id),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getServerUrl: () => ipcRenderer.invoke('server:get'),
  setServerUrl: (url) => ipcRenderer.invoke('server:set', url),
  getPreferences: () => ipcRenderer.invoke('prefs:get'),
  setPreferences: (p) => ipcRenderer.invoke('prefs:set', p),
  isServerConfigured: () => ipcRenderer.invoke('server:configured'),
  getServerKey: () => ipcRenderer.invoke('server:key'),
  setServerKey: (key) => ipcRenderer.invoke('server:setKey', key),
  getMediaUrl: () => ipcRenderer.invoke('server:media'),
  setMediaUrl: (url) => ipcRenderer.invoke('server:setMedia', url),
  logDiagnostic: (message) => ipcRenderer.invoke('diag:log', message),
  readDiagnostics: () => ipcRenderer.invoke('diag:read'),
  setInRoom: (inRoom) => ipcRenderer.invoke('room:active', inRoom),
  onMicToggle: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('mic:toggle', listener);
    return () => void ipcRenderer.removeListener('mic:toggle', listener);
  },
};

contextBridge.exposeInMainWorld('screenShare', bridge);
