# Quickstart: validação ponta a ponta

## Pré-requisitos
- VM com IP público, domínio e portas abertas (443 TCP, 3478 UDP, faixa UDP do LiveKit, 7881 TCP)
- Docker + Docker Compose; Windows 10/11 para o app; Node.js 22

## Subir o servidor
1. Configurar `infra/livekit.yaml` (chaves) e `infra/Caddyfile` (domínio).
2. `docker compose -f infra/docker-compose.yml up -d`
3. `curl https://<dominio>/config` → JSON com `mediaUrl`.

## Validar contratos da API (ver [contracts/api.openapi.yaml](contracts/api.openapi.yaml))
1. `POST /rooms` → 201 com `code` e `token`.
2. `POST /rooms/<code>/token` → 200; com código errado → 404; senha errada → 401; sala lotada → 409; expirada → 410.

## Validar o app (dois PCs Windows, um deles limpo)
1. Executar o `.exe` portable sem admin; abre sem instalação (US3).
2. PC A: criar sala, copiar código, escolher tela inteira, transmitir (US1).
3. PC B: colar o código, entrar, ver imagem e ouvir áudio; testar volume, mudo e tela cheia (US2).
4. Medir: latência < 1 s, ~720p@40fps, áudio sincronizado (SC-003..005); repetir em rede móvel (SC-007).
5. Publicar uma release maior no GitHub e reabrir o app → aviso com link (SC-010).
6. Fase 3: derrubar a rede do PC B por ~20 s → reconecta sozinho (SC-008).

## Dados do plano ↔ modelo
Ver [data-model.md](data-model.md) e [research.md](research.md) para decisões e pendências da Fase 0.
