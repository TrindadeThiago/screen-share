# Contrato IPC do app desktop (preload ⇄ main)

Exposto ao renderer apenas via `contextBridge` como `window.screenShare`. Sem acesso a Node no renderer.

| Método | Direção | Descrição |
|--------|---------|-----------|
| `listSources(): Promise<{id, name, thumbnailDataUrl, kind: 'screen'\|'window'}[]>` | renderer → main | Telas/janelas para o seletor próprio (`desktopCapturer`) |
| `selectSource(id): Promise<void>` | renderer → main | Define a fonte; o handler de `getDisplayMedia` a usa. Tela → vídeo + `audio: 'loopback'`; janela → só vídeo |
| `getAppVersion(): Promise<string>` | renderer → main | Versão atual do app |
| `openExternal(url): Promise<void>` | renderer → main | Abre link de download no navegador; só `https` e domínio permitido |
| `getPreferences()/setPreferences(p)` | renderer ↔ main | Nome, volume, preset, tecla de push-to-talk |
| `checkForUpdate(): Promise<{latest, downloadUrl} \| null>` | renderer → main | Consulta `GET /version` no main; falhas retornam `null` |

Push-to-talk: no MVP é tratado no renderer (teclas `keydown`/`keyup`, só com o app em foco). Captura global de teclas exigiria módulo nativo e fica fora do escopo.

Regras: validação de todos os argumentos no main; `selectSource` só aceita ids retornados por `listSources`; navegação e novas janelas bloqueadas.
