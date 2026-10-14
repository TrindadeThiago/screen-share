# Quickstart: rodar a aplicação

Passo a passo para subir o servidor, abrir o app e testar com amigos. Há dois caminhos para os amigos alcançarem o seu PC: pela Tailscale (seção 6, sem mexer no roteador) ou abrindo portas no roteador (seção 7, exige IP público). Para o roteiro de validação da especificação, veja `specs/001-screen-share-app/quickstart.md`.

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
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server:v1.13.9 --dev
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
npm start
```

**PowerShell:**

```powershell
cd apps\api
$env:LIVEKIT_URL="ws://localhost:7880"
$env:LIVEKIT_API_KEY="devkey"
$env:LIVEKIT_API_SECRET="secret"
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

Se o app abrir na tela **Configurar servidor**, digite `http://localhost:3000` em **Endereço do servidor** e clique em **Continuar**. O app recarrega.

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
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server:v1.13.9 --dev --node-ip 100.x.y.z
```

API, com o IP no `LIVEKIT_URL`:

```powershell
cd apps\api
$env:LIVEKIT_URL="ws://100.x.y.z:7880"
$env:LIVEKIT_API_KEY="devkey"
$env:LIVEKIT_API_SECRET="secret"
npm start
```

Se o Docker rodar dentro do WSL, as portas só ficam alcançáveis de fora com o WSL em modo de rede espelhado e os firewalls liberados (passos 7.4 e 7.5), ou usando o Docker Desktop do Windows no lugar.

Na primeira vez, o Firewall do Windows pode perguntar se o Node e o Docker podem receber conexões. Permita.

### 6.5 Conferir a partir de um amigo

Antes de abrir o app, um amigo roda no PowerShell dele:

```powershell
Invoke-RestMethod http://100.x.y.z:3000/config
tailscale ping 100.x.y.z
```

O primeiro comando deve devolver `mediaUrl` com o IP do servidor. O segundo deve terminar em `pong ... via ...`. Se aparecer `direct`, a conexão é direta e o vídeo terá a melhor qualidade. Se aparecer `DERP`, a conexão passa por um relé da Tailscale e pode ficar lenta.

### 6.6 Entregar o app aos amigos

Gere o `.exe` (passo 8) e envie. Na primeira vez que o amigo abrir, o app mostra a tela **Configurar servidor**: ele digita `http://100.x.y.z:3000` e clica em **Continuar**. A chave para criar salas pode ficar em branco.

Para pular essa tela, envie junto um arquivo `config.json` na **mesma pasta** do `.exe`:

```json
{ "apiUrl": "http://100.x.y.z:3000" }
```

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

## 7. Jogar com amigos abrindo portas no roteador

Alternativa à Tailscale: os amigos conectam direto no seu IP público. Não precisam instalar nada além do app, mas você precisa de IP público e de acesso ao roteador.

Este caminho usa `infra/docker-compose.home.yml`: sem domínio e sem HTTPS, com a API e o LiveKit direto na rede do PC. O tráfego da API (código e senha da sala) passa sem criptografia, então use para jogar com amigos e derrube o servidor quando terminar.

| Porta | Protocolo | Para quê |
|---|---|---|
| 3300 | TCP | API (criar e entrar em sala) |
| 7880 | TCP | Sinalização do LiveKit |
| 7881 | TCP | Mídia por TCP (reserva) |
| 7882 | UDP | Mídia (vídeo e áudio) |

### 7.1 Conferir se você tem IP público

1. Abra o painel do roteador (na Vivo, `http://192.168.15.1`, usuário `admin`, senha na etiqueta do aparelho) e anote o IP da WAN/Internet.
2. Compare com o que aparece em um site como `meuip.com.br`.

Se forem iguais, siga em frente. Se o IP da WAN for outro (em geral começando com `100.` ou `10.`), a operadora usa CGNAT e o redirecionamento de portas não funciona: peça um IP público à operadora ou use a Tailscale (seção 6).

### 7.2 Configurar e subir o servidor

Em `infra/`, crie o arquivo `.env` (ele não vai para o Git):

```
DOMAIN=nao-usado
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=<32 ou mais caracteres aleatórios>
PUBLIC_IP=<seu IP público>
ROOM_CREATION_KEY=<uma chave sua>
```

`openssl rand -hex 24` gera um bom segredo. A `ROOM_CREATION_KEY` impede que estranhos criem salas no seu servidor; entrar numa sala continua exigindo só o código.

Suba e confira:

```sh
cd infra
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
curl http://localhost:3300/config
```

A resposta deve ser `{"mediaUrl":"ws://<seu IP público>:7880"}`.

### 7.3 Redirecionar as portas no roteador

1. Descubra o IP local do PC (`ipconfig` no Windows, campo "Endereço IPv4") e reserve-o para o PC na seção de DHCP do roteador, para ele não mudar.
2. Na tela de redirecionamento de portas ("Redirecionar Portas" ou "Port Forwarding"), crie uma regra para cada linha da tabela acima, com porta externa igual à interna e o IP local do PC como destino.

Na Vivo a tela fica em **Rede Local → Redirecionar Portas**. Deixe "IP Externo" vazio e atenção ao protocolo da 7882, que é **UDP**. Esse roteador não aceita faixa de portas, e por isso o `livekit.home.yaml` concentra toda a mídia UDP numa porta só.

### 7.4 Docker dentro do WSL: modo de rede espelhado

Pule este passo se o servidor roda em Linux nativo ou no Docker Desktop.

No modo padrão, o WSL não recebe conexões de fora do PC. Em `C:\Users\<você>\.wslconfig`:

```
[wsl2]
networkingMode=mirrored
```

Depois rode `wsl --shutdown` no PowerShell, reabra o WSL e suba o compose de novo. Exige Windows 11 22H2 ou mais novo.

### 7.5 Liberar os firewalls

**Windows (só com WSL espelhado)**, no PowerShell como administrador:

```powershell
$wsl = '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
New-NetFirewallHyperVRule -Name SS-TCP -DisplayName "ScreenShare TCP" -Direction Inbound -VMCreatorId $wsl -Protocol TCP -LocalPorts 3300,7880,7881
New-NetFirewallHyperVRule -Name SS-UDP -DisplayName "ScreenShare UDP" -Direction Inbound -VMCreatorId $wsl -Protocol UDP -LocalPorts 7882
```

**Linux ou WSL com `ufw` ativo** (`sudo ufw status` mostra):

```sh
sudo ufw allow 3300,7880,7881/tcp
sudo ufw allow 7882/udp
sudo ufw allow in on loopback0   # só no WSL espelhado: acesso do próprio Windows por localhost
```

### 7.6 Conferir de fora

No celular em 4G, com o Wi-Fi desligado, abra `http://<seu IP público>:3300/config`. Se aparecer o `mediaUrl`, os amigos alcançam o servidor.

Do seu próprio PC esse endereço pode não responder: muitos roteadores domésticos não devolvem conexões feitas de dentro de casa para o IP público. Isso não é defeito e está resolvido no passo 7.7.

### 7.7 Configurar o app de quem hospeda e dos amigos

Baixe o `.exe` da release ou gere o seu (passo 8). Quem hospeda usa `localhost`:

1. Na tela inicial, digite `http://localhost:3300` e a chave de criar salas (`ROOM_CREATION_KEY`).
2. Em **Configurações → Servidor de mídia**, digite `ws://localhost:7880` e clique em **Salvar**. O app recarrega.

Ou, em vez disso, ponha um `config.json` **na mesma pasta** do `.exe`:

```json
{
  "apiUrl": "http://localhost:3300",
  "mediaUrl": "ws://localhost:7880",
  "serverKey": "<valor de ROOM_CREATION_KEY>"
}
```

Os amigos podem digitar `http://<seu IP público>:3300` na tela inicial do app ou receber um `config.json` com:

```json
{ "apiUrl": "http://<seu IP público>:3300" }
```

### 7.8 Usar e encerrar

1. Você cria a sala e envia o código; os amigos colam e entram.
2. Ao terminar, derrube o servidor: `docker compose -f docker-compose.yml -f docker-compose.home.yml down`.

O IP público de conexões residenciais muda de tempos em tempos, em geral quando o roteador reinicia. Se mudar, atualize `PUBLIC_IP` no `.env`, suba o compose de novo e avise os amigos para trocar o endereço em **Configurações** (ou envie um `config.json` novo).

### Se der errado

| Sintoma | O que verificar |
|---|---|
| O celular em 4G não abre `/config` | As regras do roteador apontam para o IP local certo? O servidor está no ar? Com WSL: modo espelhado ativo e os dois firewalls liberados (7.4 e 7.5)? |
| Funciona no celular, mas não no seu PC | Configure o app de quem hospeda com `localhost` e o servidor de mídia `ws://localhost:7880` (7.7) |
| O amigo entra, mas o vídeo trava ou atrasa | A regra da 7882 está como UDP? Sem ela a mídia cai na 7881 (TCP), que funciona pior |
| "Este servidor exige uma chave para criar salas" | Falta a chave ou ela está errada: digite-a no campo que aparece em **Nova sala** (ou em **Configurações**), ou use `serverKey` no `config.json` |
| Parou de funcionar de um dia para o outro | O IP público mudou (7.8) |

## 8. Gerar o `.exe` portable

A versão pronta está na [última release](https://github.com/TrindadeThiago/screen-share/releases/latest): baixe o `ScreenShare-portable.exe` de lá. Para gerar o seu, no Windows, com o Node.js 22 instalado e o projeto numa pasta do Windows (não dentro do WSL):

```powershell
npm ci
npm run dist -w @screen-share/desktop
```

O arquivo sai em `apps\desktop\release\ScreenShare-portable.exe`. Ele não precisa de instalação nem de administrador. Na primeira vez o Windows mostra o aviso "app não reconhecido" (SmartScreen): **Mais informações**, depois **Executar assim mesmo**.

Se o build parar com `Cannot create symbolic link ... O cliente não tem o privilégio necessário`, ative o **Modo de desenvolvedor** do Windows (Configurações → Sistema → Para desenvolvedores) e rode o `npm run dist` de novo.

## Problemas comuns

| Sintoma | O que verificar |
|---|---|
| "Não foi possível conectar ao servidor" | A API está rodando? O endereço no app está certo (`http://` para IP local)? |
| Entra na sala, mas "Não foi possível conectar à sala" | O LiveKit está rodando? Com a Tailscale, o `--node-ip` foi usado? As portas 7880, 7881 e 7882/udp estão publicadas? Hospedando em casa, use `localhost` e o servidor de mídia `ws://localhost:7880` (7.7). |
| Tela aparece, mas sem som | Compartilhe a **tela inteira**. Janela individual não envia áudio. |
| Voz dos amigos volta na transmissão (eco) | Ao transmitir a tela inteira, todo o som do PC é enviado, inclusive as vozes tocadas pelo app; fone de ouvido não resolve. Marque **Silenciar as vozes para mim enquanto transmito**. |
| Código "não encontrado" | Confira o código. Espaços e maiúsculas são ignorados, mas a sala pode ter expirado. |
| O app abre mas fica em branco | Rode `npm run build -w @screen-share/desktop` de novo antes de `npx electron .`. |

## O que já foi validado

O caminho da seção 7 foi usado numa sessão real entre dois PCs com Windows, em conexões residenciais diferentes: criar e entrar em sala, transmitir a tela com áudio e falar por voz. O `.exe` foi gerado conforme a seção 8.

Ainda dependem de medição em máquinas diferentes: o encoder em uso (aparece em **Mostrar métricas**) e se vale manter ligada a opção de enviar também em baixa resolução. Se algo falhar, use **Copiar diagnóstico** na sala e guarde o texto.
