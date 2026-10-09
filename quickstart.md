# Quickstart: rodar a aplicação

Passo a passo para subir o servidor, abrir o app e testar com amigos. Para o roteiro de validação da especificação, veja `specs/001-screen-share-app/quickstart.md`.

> O servidor (LiveKit + API) roda em qualquer sistema com Docker e Node. O **app** só funciona de verdade no **Windows**, porque a captura do áudio do sistema só existe lá.

## O que você vai rodar

| Peça | O que é | Porta |
|---|---|---|
| LiveKit | servidor de mídia (vídeo e áudio) | 7880, 7881, 7882/udp |
| API | cria salas e emite tokens | 3000 |
| App | o Electron que você e seus amigos usam | — |

## 0. Pré-requisitos

- Node.js 22 e npm
- Docker (Docker Desktop no Windows)
- Windows 10 ou 11 para o app

**Importante:** rode o `npm install` no mesmo sistema onde vai abrir o app. O Electron baixa um binário específico do sistema. Se o repositório está no WSL, copie-o para o Windows (por exemplo `C:\dev\screen-share`) e instale lá.

## 1. Instalar e testar

Na raiz do projeto:

```sh
npm install
npm test
```

Deve terminar com todos os testes passando.

## 2. Subir o LiveKit

Em um terminal:

```sh
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

O modo `--dev` usa a chave `devkey` e o segredo `secret`. Deixe o terminal aberto.

## 3. Subir a API

Em outro terminal.

**Linux, macOS ou WSL:**

```sh
cd apps/api
LIVEKIT_URL=ws://localhost:7880 \
LIVEKIT_API_KEY=devkey \
LIVEKIT_API_SECRET=secret \
VERSION_FILE=../../infra/version.json \
npm start
```

**PowerShell:**

```powershell
cd apps\api
$env:LIVEKIT_URL="ws://localhost:7880"
$env:LIVEKIT_API_KEY="devkey"
$env:LIVEKIT_API_SECRET="secret"
$env:VERSION_FILE="..\..\infra\version.json"
npm start
```

Confira em outro terminal: `curl http://localhost:3000/config` deve responder `{"mediaUrl":"ws://localhost:7880"}`.

## 4. Abrir o app (no Windows)

```powershell
npm run build -w @screen-share/desktop
cd apps\desktop
$env:SCREEN_SHARE_API_URL="http://localhost:3000"
npx electron .
```

Se o app abrir mostrando o endereço `https://screenshare.example.com`, digite `http://localhost:3000` no campo **Endereço do servidor** e clique em **Salvar servidor**. O app recarrega.

## 5. Testar sozinho com duas janelas

1. Abra uma segunda instância com uma pasta de dados separada, em outro terminal:
   ```powershell
   cd apps\desktop
   $env:SCREEN_SHARE_API_URL="http://localhost:3000"
   npx electron . --user-data-dir=$env:TEMP\ss2
   ```
2. Na primeira janela: digite seu nome, clique em **Criar sala** e copie o código.
3. Na segunda: digite outro nome, cole o código e clique em **Entrar**.
4. Na primeira: **Compartilhar tela**, escolha uma **tela inteira** (as janelas saem sem áudio).
5. A segunda janela deve mostrar a tela. Teste volume, **Silenciar** e **Tela cheia**.

Com as duas janelas no mesmo PC, o som da transmissão sai nos alto-falantes e é capturado de novo. Para testar áudio e latência de verdade, use dois computadores.

## 6. Jogar com amigos (Tailscale)

A Tailscale cria uma rede privada entre os PCs de vocês. Ninguém precisa abrir portas no roteador, e o vídeo (UDP) passa direto entre os computadores sempre que a conexão direta é possível. Confira os limites do plano gratuito no site da Tailscale antes de convidar o grupo.

Chame de **servidor** o PC que roda o LiveKit e a API, e de **amigos** os outros.

### 6.1 Instalar a Tailscale (servidor e amigos)

1. Baixe em tailscale.com/download e instale.
2. Entre com uma conta (Google, Microsoft ou GitHub). Cada pessoa pode usar a própria conta.

### 6.2 Dar acesso aos amigos

Escolha uma das formas, pelo painel de administração (login.tailscale.com):

- **Convidar para a sua rede:** em **Users**, clique em **Invite users** e envie o link. O amigo entra na sua rede e enxerga os seus dispositivos.
- **Compartilhar só o servidor (mais restrito):** em **Machines**, abra o menu do PC servidor, escolha **Share** e envie o link. O amigo continua na rede dele e só acessa esse PC.

Cada amigo precisa aceitar o convite e ver o servidor na lista de dispositivos do app da Tailscale.

### 6.3 Descobrir o IP do servidor

No servidor:

```sh
tailscale ip -4
```

Anote o resultado (algo como `100.101.102.103`). Nos passos abaixo, ele aparece como `100.x.y.z`. Esse IP não muda enquanto o PC continuar na rede.

### 6.4 Subir o servidor com esse IP

Repita os passos 2 e 3 deste guia, trocando `localhost` pelo IP da Tailscale.

LiveKit, com `--node-ip` (sem ele, o LiveKit anuncia um IP que os amigos não alcançam):

```sh
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev --node-ip 100.x.y.z
```

API, com o IP no `LIVEKIT_URL`:

```powershell
cd apps\api
$env:LIVEKIT_URL="ws://100.x.y.z:7880"
$env:LIVEKIT_API_KEY="devkey"
$env:LIVEKIT_API_SECRET="secret"
$env:VERSION_FILE="..\..\infra\version.json"
npm start
```

Se o Docker rodar dentro do WSL, use o Docker Desktop do Windows no lugar, para que as portas fiquem alcançáveis pelo IP da Tailscale.

Na primeira vez, o Firewall do Windows pode perguntar se o Node e o Docker podem receber conexões. Permita.

### 6.5 Conferir a partir de um amigo

Antes de abrir o app, um amigo roda no PowerShell dele:

```powershell
Invoke-RestMethod http://100.x.y.z:3000/config
tailscale ping 100.x.y.z
```

O primeiro comando deve devolver `mediaUrl` com o IP do servidor. O segundo deve terminar em `pong ... via ...`. Se aparecer `direct`, a conexão é direta e o vídeo terá a melhor qualidade. Se aparecer `DERP`, a conexão passa por um relé da Tailscale e pode ficar lenta.

### 6.6 Entregar o app aos amigos

Gere o `.exe` (passo 7) e envie, junto com um arquivo `config.json` na **mesma pasta**:

```json
{ "apiUrl": "http://100.x.y.z:3000" }
```

Sem o `config.json`, o amigo digita `http://100.x.y.z:3000` no campo **Endereço do servidor**, na tela inicial, e clica em **Salvar servidor**.

### 6.7 Usar

1. Você abre o app, cria a sala e envia o código.
2. Os amigos colam o código e entram.
3. Você escolhe uma tela inteira e começa a compartilhar.

O servidor precisa ficar ligado, com o LiveKit e a API rodando, enquanto a sessão durar.

### Se der errado

| Sintoma | O que verificar |
|---|---|
| O amigo não vê o servidor | Ele aceitou o convite? O servidor está online no app da Tailscale? |
| `Invoke-RestMethod` falha | A API está rodando? O Firewall do Windows bloqueou a porta 3000? |
| Entra na sala, mas sem imagem | O LiveKit foi iniciado com `--node-ip` correto? As portas 7881 (TCP) e 7882 (UDP) estão publicadas? |
| Imagem lenta ou com travadas | Rode `tailscale ping`. Se aparecer `DERP`, a conexão não é direta. Tente reiniciar a Tailscale nos dois lados. |
| O IP mudou | Atualize o `config.json`, o `LIVEKIT_URL` e o `--node-ip`, e reinicie o LiveKit e a API. |

## 7. Gerar o `.exe` portable

No Windows:

```powershell
npm run dist -w @screen-share/desktop
```

O arquivo sai em `apps\desktop\release\ScreenShare-portable.exe`. Ele não precisa de instalação nem de administrador. Na primeira vez o Windows mostra o aviso "app não reconhecido" (SmartScreen): **Mais informações**, depois **Executar assim mesmo**.

## Problemas comuns

| Sintoma | O que verificar |
|---|---|
| "Não foi possível conectar ao servidor" | A API está rodando? O endereço no app está certo (`http://` para IP local)? |
| Entra na sala, mas "Não foi possível conectar à sala" | O LiveKit está rodando? Com a Tailscale, o `--node-ip` foi usado? As portas 7880, 7881 e 7882/udp estão publicadas? |
| Tela aparece, mas sem som | Compartilhe a **tela inteira**. Janela individual não envia áudio. |
| Voz dos amigos volta na transmissão (eco) | Use fone de ouvido e deixe o microfone desligado ao transmitir. |
| Código "não encontrado" | Confira o código. Espaços e maiúsculas são ignorados, mas a sala pode ter expirado. |
| O app abre mas fica em branco | Rode `npm run build -w @screen-share/desktop` de novo antes de `npx electron .`. |

## Ainda não verificado

O app nunca foi aberto de verdade em Windows durante o desenvolvimento. Os testes automatizados cobrem a API e a lógica do app, mas a captura de tela, o áudio do sistema, o `.exe` portable e a latência dependem da sua validação. Se algo falhar, copie a mensagem de erro.
