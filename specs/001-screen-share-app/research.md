# Research

| # | Tema | Decisão | Justificativa | Alternativas |
|---|------|---------|---------------|--------------|
| 1 | Topologia de mídia | SFU com LiveKit OSS | Um upload do transmissor; sinalização, ICE/TURN e adaptação prontas | P2P mesh (upload cresce por espectador); RTMP/HLS (latência de segundos) |
| 2 | Captura de tela e áudio | `setDisplayMediaRequestHandler` com `audio: 'loopback'` + seletor próprio via `desktopCapturer` | Loopback nativo do Electron no Windows entrega o áudio do sistema ao compartilhar tela inteira | Módulo nativo desde o início (custo alto; fica para o spike de eco) |
| 3 | Eco | MVP: orientação (fone, voz desligada). Depois: spike com Application Loopback API excluindo o próprio app | Evita módulo nativo no MVP; exclusão por processo exige Windows 10 build 20348+ / Win 11 (confirmar na Fase 0) | Cancelamento de eco por software (não resolve áudio do sistema) |
| 4 | Codec | Decidir na Fase 0 por teste real: H.264 (aceleração por hardware) vs VP8/VP9 | Depende da GPU dos amigos e da banda; configurar `videoCodec` do publish | Fixar sem medir |
| 5 | Qualidade | 720p@40fps, bitrate máx ~4 Mbps; presets via `degradationPreference` (`maintain-framerate` = "movimento", `maintain-resolution` = "detalhe") | Mapeia direto os dois presets da spec | Simulcast adicional se a banda dos espectadores variar (avaliar Fase 0) |
| 6 | Código de sala | 16 caracteres base32 (80 bits) de CSPRNG, exibidos `XXXX-XXXX-XXXX-XXXX`; normalização ignora espaços, hífens e caixa | Não adivinhável por tentativa (SC-009) e fácil de colar | Código curto (adivinhável) |
| 7 | Acesso | Token JWT do LiveKit emitido pela API, TTL curto (10 min para entrar; renovação automática do SDK mantém a sessão), permissões por papel | Sem login (spec); credencial temporária (FR-005) | Sessões/cookies |
| 8 | Papéis | Todos entram com permissão de publicar; um transmissor por vez, imposto pelo app e por regra da API (um só token com `canPublish` de tela por vez via atributo da sala) | Spec: um transmissor por vez | Moderador dedicado |
| 9 | Persistência de salas | SQLite na API | Código/senha/limite/expiração sobrevivem a restart; sem servidor extra | Memória (perde salas no restart); Redis (desnecessário em nó único) |
| 10 | Senha de sala | Hash com scrypt; comparação em tempo constante | Senha opcional (FR-022) | Texto puro |
| 11 | Rate limit | `@fastify/rate-limit` por IP, mais estrito em `/rooms/:code/token` | FR-024, mitiga adivinhação | Só no Caddy |
| 12 | Versão do app | `GET /version` lê um JSON (`latest`, `downloadUrl`) servido da config; app compara semver | Portable sem auto-update (FR-016) | GitHub Releases API direto do app |
| 13 | Distribuição | `.exe` servido pelo Caddy ou GitHub Releases; página com instrução do SmartScreen | FR-017 | Instalador (fora de escopo) |
| 14 | Rede restritiva | TURN do LiveKit com UDP 3478 e TLS/TCP 443 via Caddy (layer4/ SNI ou domínio TURN dedicado) | FR-018 | TURN externo (coturn) |
| 15 | Segurança do Electron | `contextIsolation`, `nodeIntegration` off, `sandbox`, CSP restritiva, navegação externa bloqueada, versão do Electron fixada | Mudanças de loopback entre versões | — |
| 16 | Métricas | `room.engine` / `getStats` do livekit-client no renderer; Prometheus nativo do LiveKit no servidor | FR-023, FR-025 | — |

## Pendências para a Fase 0 (prova de conceito)
- Medir latência, banda e CPU em 720p40 com H.264 vs VP8/VP9.
- Confirmar build mínima do Windows 10 para loopback por processo (só afeta o spike de eco).
- Confirmar que `audio: 'loopback'` funciona na versão do Electron fixada.
- Definir exatamente como expor TURN/TLS na 443 junto ao Caddy (domínio separado é o caminho mais simples).
- Orçamento mensal de VPS/banda (aberto no plano de origem; não bloqueia o design).
