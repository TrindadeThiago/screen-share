# Screen Share

App desktop (Windows 10/11, `.exe` portable) para compartilhar a tela com amigos, com o áudio do computador. Sem login: crie uma sala, envie o código, os amigos entram.

## Usar

1. Baixe o `.exe` na página do servidor (veja `infra/site`). O Windows pode mostrar o aviso "app não reconhecido": _Mais informações → Executar assim mesmo_.
2. Digite seu nome e **Criar sala**; copie o código e envie. Para entrar, cole o código e clique em **Entrar**.
3. **Compartilhar tela** → escolha uma tela inteira (com áudio) ou uma janela (sem áudio).
4. **Eco:** o app envia todo o som do computador. Use fone de ouvido e deixe o microfone desligado ao transmitir. Push-to-talk: segure `V` com o app em foco.

## Endereço do servidor
O `.exe` não traz o servidor embutido. O app usa, nesta ordem:
1. o endereço salvo pelo campo **Endereço do servidor** na tela inicial (o app recarrega ao salvar);
2. um arquivo `config.json` ao lado do `.exe`: `{ "apiUrl": "http://100.x.y.z:3000" }`;
3. a variável de ambiente `SCREEN_SHARE_API_URL`;
4. o padrão `https://screenshare.example.com` (placeholder).

O app descobre o endereço do LiveKit sozinho, pela rota `GET /config` da API. Para mandar o `.exe` já configurado aos amigos, envie junto o `config.json`.

## Desenvolver

```sh
npm install
npm test            # Vitest: API e app
npm run lint
npm run dev -w @screen-share/desktop        # renderer (Vite)
npm run dist -w @screen-share/desktop       # gera o .exe portable (em Windows)
```

Variáveis opcionais do app: `SCREEN_SHARE_API_URL` e `SCREEN_SHARE_MEDIA_URL` (esta só vale se a API não responder em `/config`).

## Servidor

Veja `infra/README.md`. Especificação e plano em `specs/001-screen-share-app/`.
