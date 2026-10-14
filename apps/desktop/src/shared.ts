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
  /** Camada extra de baixa resolução para espectadores com conexão lenta (padrão: ligada). */
  simulcast?: boolean;
  /** Silencia as vozes dos amigos enquanto transmito a tela com áudio (evita eco). */
  muteVoicesWhileSharing?: boolean;
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
  /** Chave para criar salas neste servidor (config.json ou ambiente); null se não houver. */
  getServerKey(): Promise<string | null>;
  /** Endereço do servidor de mídia definido no config.json (`mediaUrl`); null usa o da API. */
  getMediaUrl(): Promise<string | null>;
  /** Acrescenta uma linha ao log de diagnóstico (códigos de sala e tokens são removidos). */
  logDiagnostic(message: string): Promise<void>;
  /** Últimas linhas do log de diagnóstico, para copiar e enviar. */
  readDiagnostics(): Promise<string>;
  /** Avisa que entrou/saiu de uma sala: mantém a tela acordada e ativa o atalho do microfone. */
  setInRoom(inRoom: boolean): Promise<void>;
  /** Chamado quando o atalho global do microfone é pressionado. Devolve a função para parar. */
  onMicToggle(callback: () => void): () => void;
}

/** Atalho global (funciona fora do app) que liga/desliga o microfone aberto. */
export const MIC_TOGGLE_LABEL = 'Ctrl+Shift+M';
