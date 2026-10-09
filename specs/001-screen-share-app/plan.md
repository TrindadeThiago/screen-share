# Implementation Plan: Compartilhamento de Tela entre Amigos (app desktop)

**Branch**: `001-screen-share-app` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-screen-share-app/spec.md`

## Summary

App desktop Windows (Electron, `.exe` portable) que cria/entra em salas por código e transmite a tela inteira com áudio do sistema. Mídia via WebRTC com SFU (LiveKit OSS self-hosted, TURN embutido). Uma API mínima (Node + TypeScript) cria salas, valida códigos/senha/limite/expiração e emite tokens efêmeros do LiveKit; também informa a versão mais recente. Caddy faz TLS e proxy. Tudo roda em uma VM via Docker Compose. Escolhas detalhadas em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS (API); Electron (versão fixada, validada na Fase 0)

**Primary Dependencies**: `livekit-client`, `livekit-server-sdk`, React + Vite (renderer), `electron-builder` (alvo `portable`), Fastify (API), `zod`, `better-sqlite3`

**Storage**: SQLite (arquivo) na API para salas (código, hash da senha, limite, expiração); LiveKit sem Redis (nó único); app guarda só nome de exibição e preferências em arquivo local

**Testing**: Vitest em todo o monorepo (API com `fastify.inject` e SQLite em memória; desktop com ambientes `node` para o main e `jsdom` + Testing Library para o renderer, `livekit-client` e Electron mockados); validação manual de mídia/áudio em Windows real (ver quickstart)

**Target Platform**: Windows 10/11 (app); Linux x86_64 em Docker (servidor)

**Project Type**: desktop-app + web-service (monorepo)

**Performance Goals**: 720p@40fps, ~2,5-4 Mbps por stream; latência ponta a ponta < 1 s; 10 espectadores por sala

**Constraints**: `.exe` único sem admin e sem instalador; sem auto-update; sem assinatura de código; fallback TURN/TLS 443; renderer isolado (`contextIsolation`, sandbox, CSP); logs sem dados sensíveis

**Scale/Scope**: poucas salas simultâneas, 2-10 pessoas por sala, uma VM; banda de saída ≈ 4 Mbps × espectadores

## Constitution Check

A constituição do projeto (`.specify/memory/constitution.md`) ainda é o template sem princípios definidos, portanto não há gates a avaliar. Reavaliação pós-design: nenhuma violação. Recomenda-se definir a constituição antes de implementar (ex.: testes primeiro, simplicidade).

## Project Structure

### Documentation (this feature)

```text
specs/001-screen-share-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.openapi.yaml
│   └── desktop-ipc.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── desktop/
│   ├── src/main/        # janela, setDisplayMediaRequestHandler, desktopCapturer, IPC, CSP
│   ├── src/preload/     # ponte contextBridge tipada
│   ├── src/renderer/    # React: telas Home, Sala, Seletor de tela, Aviso de versão
│   ├── tests/
│   └── electron-builder.yml
└── api/
    ├── src/             # rotas, serviço de salas, tokens, versão, rate limit
    └── tests/
infra/
├── docker-compose.yml   # livekit + caddy + api
├── Caddyfile
└── livekit.yaml
```

**Structure Decision**: monorepo npm workspaces com dois apps (`desktop`, `api`) e `infra/`, como sugerido no plano de origem.

## Complexity Tracking

Sem violações a justificar.
