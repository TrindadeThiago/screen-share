export interface CaptureSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  kind: 'screen' | 'window';
}

export interface UpdateInfo {
  latest: string;
  downloadUrl: string;
}

export interface Preferences {
  displayName?: string;
  volume?: number;
  preset?: 'motion' | 'detail';
  pushToTalkKey?: string;
}

/** Contrato exposto ao renderer como window.screenShare (ver contracts/desktop-ipc.md). */
export interface ScreenShareBridge {
  listSources(): Promise<CaptureSource[]>;
  selectSource(id: string): Promise<void>;
  getAppVersion(): Promise<string>;
  checkForUpdate(): Promise<UpdateInfo | null>;
  openExternal(url: string): Promise<void>;
  /** Endereço da API em uso (resolvido: salvo > config.json > ambiente > padrão). */
  getServerUrl(): Promise<string>;
  /** Valida e salva o endereço e recarrega o app. Rejeita se for inválido. */
  setServerUrl(url: string): Promise<void>;
  getPreferences(): Promise<Preferences>;
  setPreferences(p: Preferences): Promise<void>;
}
