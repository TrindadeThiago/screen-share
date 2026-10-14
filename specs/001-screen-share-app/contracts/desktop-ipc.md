# Contrato IPC do app desktop (preload ⇄ main)

Exposto ao renderer apenas via `contextBridge` como `window.screenShare`. Sem acesso a Node no renderer.

| Método | Direção | Descrição |
|--------|---------|-----------|
| `listSources(): Promise<{id, name, thumbnailDataUrl, kind: 'screen'\|'window'}[]>` | renderer → main | Telas/janelas para o seletor próprio (`desktopCapturer`) |
| `selectSource(id): Promise<void>` | renderer → main | Define a fonte; o handler de `getDisplayMedia` a usa. Tela → vídeo + `audio: 'loopback'`; janela → só vídeo |
| `getAppVersion(): Promise<string>` | renderer → main | Versão atual do app |
| `openExternal(url): Promise<void>` | renderer → main | Abre link de download no navegador; só `https` e domínio permitido |
| `getPreferences()/setPreferences(p)` | renderer ↔ main | Nome, volume, preset, tecla de push-to-talk, simulcast, silenciar vozes ao transmitir |
| `getServerKey(): Promise<string \| null>` | renderer → main | Chave para criar salas, lida de `config.json` (`serverKey`) ou `SCREEN_SHARE_SERVER_KEY` |
| `getMediaUrl(): Promise<string \| null>` | renderer → main | `mediaUrl` do `config.json`: servidor de mídia a usar no lugar do informado pela API |
| `logDiagnostic(message)` / `readDiagnostics()` | renderer → main | Log rotativo em `userData/logs/diagnostics.log`; códigos de sala e tokens são removidos |
| `setInRoom(inRoom)` | renderer → main | Na sala: impede a tela de dormir e registra o atalho global `Ctrl+Shift+M` |
| `onMicToggle(callback): () => void` | main → renderer | Atalho global pressionado: liga/desliga o microfone aberto |
| `checkForUpdate(): Promise<{latest, downloadUrl} \| null>` | renderer → main | Consulta `GET /version` no main; falhas retornam `null` |

Push-to-talk (segurar a tecla) é tratado no renderer e só funciona com o app em foco: o Electron não informa a soltura de teclas globais sem módulo nativo. Com o app em segundo plano, o atalho global alterna o microfone aberto.

Regras: validação de todos os argumentos no main; `selectSource` só aceita ids retornados por `listSources`; navegação e novas janelas bloqueadas.
