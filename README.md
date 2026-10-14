# Screen Share

App desktop (Windows 10/11, `.exe` portable) para compartilhar a tela com amigos, com o áudio do computador. Sem login: crie uma sala, envie o código, os amigos entram.

![Assistindo a uma transmissão, com as métricas abertas](docs/screenshots/room-watching.png)

- **Tela e som do computador**, com alvo de 720p a 40 fps, por um servidor que você mesmo hospeda.
- **Sem conta e sem instalação:** um `.exe` portable e um código de sala.
- **Voz na mesma sala**, pelo botão do microfone ou por um atalho que funciona fora do app.
- **Métricas ao vivo** de resolução, fps, codec e latência, para saber o que está chegando.

## Telas

| Tela inicial                                                                                | Escolher o que compartilhar                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ![Tela inicial com os cartões de criar sala e entrar com código](docs/screenshots/home.png) | ![Diálogo de escolha entre telas e janelas](docs/screenshots/picker.png) |

| Transmitindo                                                                                         | Configurações                                              |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| ![Sala de quem transmite, com a prévia e a contagem de quem assiste](docs/screenshots/room-live.png) | ![Diálogo de configurações](docs/screenshots/settings.png) |

As imagens vêm da página de pré-visualização do projeto, com dados simulados (veja [Desenvolver](#desenvolver)).

## Usar

1. Baixe o `.exe` na página do servidor (veja `infra/site`). O Windows pode mostrar o aviso "app não reconhecido": _Mais informações → Executar assim mesmo_.
2. Digite seu nome e **Criar sala**; copie o código e envie. Para entrar, cole o código e clique em **Entrar**.
3. **Compartilhar tela** → escolha uma tela inteira (com áudio) ou uma janela (sem áudio).
4. **Eco:** ao transmitir uma tela inteira, o app envia todo o som do computador, inclusive as vozes dos amigos tocadas por ele; fone de ouvido não evita isso. Marque _Silenciar as vozes para mim enquanto transmito_ para eliminar o eco.
5. **Voz:** o botão do microfone, ou `Ctrl+Shift+M` de qualquer lugar, liga e desliga o microfone. Em **Configurações** dá para habilitar "segurar `V` para falar" e trocar a tecla.
6. **Deu problema?** _Copiar diagnóstico_, em **Configurações**, copia o log (sem códigos de sala) para você colar e enviar.

## Endereço do servidor

O `.exe` não traz o servidor embutido. O app usa, nesta ordem:

1. o endereço salvo pelo campo **Endereço do servidor** na tela inicial (o app recarrega ao salvar);
2. um arquivo `config.json` ao lado do `.exe`: `{ "apiUrl": "http://100.x.y.z:3000", "serverKey": "..." }`;
3. a variável de ambiente `SCREEN_SHARE_API_URL`;
4. o padrão `https://screenshare.example.com` (placeholder).

Quem hospeda o servidor no próprio PC e não o alcança pelo IP público pode acrescentar `"mediaUrl": "ws://localhost:7880"` ao `config.json` (com `apiUrl` em `http://localhost:...`).

O app descobre o endereço do LiveKit sozinho, pela rota `GET /config` da API. Para mandar o `.exe` já configurado aos amigos, envie junto o `config.json`.

Se o servidor exigir chave para criar salas (`ROOM_CREATION_KEY`, veja `infra/README.md`), quem cria salas precisa de `serverKey` no `config.json` ou da variável `SCREEN_SHARE_SERVER_KEY`. Quem só entra com o código não precisa.

## Desenvolver

```sh
npm install
npm test            # Vitest: API e app
npm run lint
npm run dev -w @screen-share/desktop        # renderer (Vite)
npm run dist -w @screen-share/desktop       # gera o .exe portable (em Windows)
```

Com o `npm run dev` rodando, `/preview.html` mostra cada tela com dados simulados, sem servidor (por exemplo `/preview.html?v=room-live`).

Variáveis opcionais do app: `SCREEN_SHARE_API_URL` e `SCREEN_SHARE_MEDIA_URL` (esta só vale se a API não responder em `/config`).

## Servidor

Veja `infra/README.md`. Especificação e plano em `specs/001-screen-share-app/`.
