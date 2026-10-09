---
description: "Task list for Compartilhamento de Tela entre Amigos"
---

# Tasks: Compartilhamento de Tela entre Amigos (app desktop)

**Input**: Design documents from `/specs/001-screen-share-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Testes automatizados com **Vitest** em todo o monorepo (solicitado). Escritos antes da implementação de cada história (devem falhar primeiro). API: Vitest + `fastify.inject` + SQLite em memória. App: Vitest com ambiente `node` (processo main) e `jsdom` + Testing Library (renderer), com `livekit-client` e APIs do Electron mockados. Captura de mídia/áudio real, latência e redes só podem ser validadas manualmente pelo [quickstart.md](quickstart.md) (tarefas de validação).

**Organization**: Tarefas agrupadas por história de usuário (US1-US4) para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: história a que a tarefa pertence

## Path Conventions

Monorepo: `apps/desktop/` (Electron: `src/main`, `src/preload`, `src/renderer`, `tests/`), `apps/api/` (`src`, `tests/`), `infra/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create monorepo with npm workspaces: root `package.json` (scripts `test`, `test:api`, `test:desktop`), `tsconfig.base.json`, `.gitignore`, folders `apps/desktop`, `apps/api`, `infra`
- [X] T002 [P] Initialize `apps/api` (Node 22, TypeScript, Fastify, zod, better-sqlite3, livekit-server-sdk, Vitest with coverage-v8) in `apps/api/package.json` and `apps/api/vitest.config.ts`
- [X] T003 [P] Initialize `apps/desktop` (Electron pinned version, React, Vite, livekit-client, electron-builder, Vitest, jsdom, @testing-library/react, @testing-library/user-event) in `apps/desktop/package.json`
- [X] T004 [P] Configure Vitest workspace for desktop with two projects (`main` env node, `renderer` env jsdom + setup file with Electron/`window.screenShare` mocks) in `apps/desktop/vitest.config.ts` and `apps/desktop/tests/setup.ts`
- [X] T005 [P] Configure ESLint and Prettier at repo root (`eslint.config.js`, `.prettierrc`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Servidor de mídia, API base e casca do app; bloqueia todas as histórias.

- [X] T006 [P] Write LiveKit config with TURN (UDP 3478, TLS 443) and API keys from env in `infra/livekit.yaml`
- [X] T007 [P] Write Caddyfile with automatic TLS, reverse proxy of API and LiveKit, static `/download` in `infra/Caddyfile`
- [X] T008 Write compose with livekit + caddy + api services and env file template in `infra/docker-compose.yml` and `infra/.env.example`
- [X] T009 [P] Write failing tests for room code generator/normalizer (length 16, base32 alphabet, uniqueness over 10k samples, normalizer strips spaces/hyphens and uppercases, invalid input rejected) in `apps/api/tests/room-code.test.ts`
- [X] T010 [P] Implement room code generator (CSPRNG) and normalizer (`XXXX-XXXX-XXXX-XXXX` format) in `apps/api/src/room-code.ts`
- [X] T011 [P] Implement standard error responses (`invalid_request`, `wrong_password`, `room_not_found`, `room_full`, `room_expired`, `rate_limited`, Portuguese messages) in `apps/api/src/errors.ts`
- [X] T012 [P] Create SQLite setup and `rooms` table migration per data-model.md (supports `:memory:` for tests) in `apps/api/src/db.ts`
- [X] T013 Create Fastify app factory `buildApp(deps)` (injectable db, LiveKit client and clock for tests), config loading and structured logger without sensitive data in `apps/api/src/server.ts` and `apps/api/src/config.ts`
- [X] T014 Write failing test that the token route is rate limited (429 with `rate_limited` body after N requests) in `apps/api/tests/rate-limit.test.ts`, then register rate limiting in `apps/api/src/plugins/rate-limit.ts`
- [X] T015 Create Electron main process with hardened window (`contextIsolation`, no `nodeIntegration`, `sandbox`, CSP, block navigation/new windows) exposing a testable `createWindowOptions()` in `apps/desktop/src/main/index.ts`
- [X] T016 [P] Write test asserting `createWindowOptions()` has `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` and the CSP header forbids remote scripts in `apps/desktop/tests/main/security.test.ts`
- [X] T017 [P] Create typed preload bridge `window.screenShare` skeleton per contracts/desktop-ipc.md in `apps/desktop/src/preload/index.ts`
- [X] T018 [P] Create renderer shell (Vite config, React entry, simple screen router: Home / Room) in `apps/desktop/src/renderer/main.tsx` and `apps/desktop/vite.config.ts`
- [X] T019 [P] Write tests for the API client (success mapping, each error code mapped to a typed error, network failure) using mocked `fetch` in `apps/desktop/tests/renderer/api-client.test.ts`
- [X] T020 Implement API client for `/rooms`, `/rooms/:code/token`, `/version` per contracts/api.openapi.yaml in `apps/desktop/src/renderer/api/client.ts`
- [ ] T021 Phase 0 proof of concept: publish screen with `audio: 'loopback'` from Electron to LiveKit in `apps/desktop/src/renderer/poc/poc.ts`; record latency, bandwidth, CPU for H.264 vs VP8/VP9 and loopback behavior on the pinned Electron/Windows versions in `specs/001-screen-share-app/research.md` (manual)

**Checkpoint**: `npm test` passa, infra sobe, app abre e a PoC define codec e valida o áudio.

---

## Phase 3: User Story 1 - Criar sala e transmitir a tela com áudio (Priority: P1) 🎯 MVP

**Goal**: criar sala, receber código e transmitir tela inteira com áudio do sistema.

**Independent Test**: criar sala no app, copiar o código, escolher tela e iniciar; a transmissão fica ativa (quickstart) e os testes Vitest de US1 passam.

### Tests for User Story 1 (write first, must fail)

- [X] T022 [P] [US1] Service tests for `createRoom`: defaults (10 participants, 720 min), bounds (2-10, 15-1440), password stored only as scrypt hash, unique code, expiry computed from injected clock in `apps/api/tests/rooms-create.test.ts`
- [X] T023 [P] [US1] Token service tests: JWT contains room, identity, name, short TTL and grants (`roomJoin`, `canSubscribe`, `canPublish`) in `apps/api/tests/tokens.test.ts`
- [X] T024 [P] [US1] Contract test for `POST /rooms` via `fastify.inject` against `contracts/api.openapi.yaml` (201 shape `JoinResult`, 400 on empty/too long `displayName`) in `apps/api/tests/routes-create-room.test.ts`
- [X] T025 [P] [US1] Main-process tests: `selectSource` rejects ids not returned by `listSources`; display handler returns video + `audio: 'loopback'` for screens and video only for windows in `apps/desktop/tests/main/capture.test.ts`
- [X] T026 [P] [US1] Renderer tests: presets map `motion`→`maintain-framerate` and `detail`→`maintain-resolution`; default publish options are 1280x720 at 40fps in `apps/desktop/tests/renderer/presets.test.ts`
- [X] T027 [P] [US1] Renderer tests with mocked `livekit-client`: `useRoom` publishes screen video + audio on start, unpublishes on stop, stays connected after stop, blocks a second broadcaster with a warning in `apps/desktop/tests/renderer/useRoom-broadcast.test.tsx`
- [X] T028 [P] [US1] Component tests: Home "Criar sala" calls the client with the display name and shows the code with a working copy button; Room screen shows the echo warning while broadcasting in `apps/desktop/tests/renderer/home-create.test.tsx`

### Implementation for User Story 1

- [X] T029 [US1] Implement room service `createRoom` in `apps/api/src/services/rooms.ts`
- [X] T030 [US1] Implement token service issuing LiveKit JWT with short TTL and grants in `apps/api/src/services/tokens.ts`
- [X] T031 [US1] Implement `POST /rooms` returning `JoinResult` (201) in `apps/api/src/routes/rooms.ts`
- [X] T032 [P] [US1] Implement `listSources` and `selectSource` with `desktopCapturer` and `setDisplayMediaRequestHandler` in `apps/desktop/src/main/capture.ts`
- [X] T033 [US1] Wire IPC handlers with argument validation in `apps/desktop/src/main/ipc.ts` and `apps/desktop/src/preload/index.ts`
- [X] T034 [P] [US1] Implement quality presets and default 720p/40fps publish options in `apps/desktop/src/renderer/livekit/presets.ts`
- [X] T035 [P] [US1] Build Home screen: display name field and "Criar sala" button in `apps/desktop/src/renderer/screens/Home.tsx`
- [X] T036 [P] [US1] Build screen source picker with thumbnails and a note that window sharing has no audio in `apps/desktop/src/renderer/components/SourcePicker.tsx`
- [X] T037 [US1] Implement LiveKit room hook (connect, publish screen video + system audio with codec chosen in T021, unpublish, broadcast state, one broadcaster per room) in `apps/desktop/src/renderer/livekit/useRoom.ts`
- [X] T038 [US1] Build Room screen for broadcaster: copyable code, start/stop sharing, preset selector, echo warning (headphones, voice off) in `apps/desktop/src/renderer/screens/Room.tsx`
- [ ] T039 [US1] Run `npm test` for US1 until green; validate manually following quickstart (create room, start transmission, stop keeps room alive)

**Checkpoint**: criação e transmissão funcionam sozinhas.

---

## Phase 4: User Story 2 - Entrar em uma sala e assistir (Priority: P1)

**Goal**: entrar com o código e assistir com imagem e áudio.

**Independent Test**: com transmissão ativa, outro PC entra com o código e vê/ouve; controles funcionam; códigos inválidos mostram erro; testes Vitest de US2 passam.

### Tests for User Story 2 (write first, must fail)

- [X] T040 [P] [US2] Service tests for `joinRoom`: normalized code accepted, unknown → `room_not_found`, expired (clock advanced) → `room_expired`, wrong/missing password → `wrong_password`, participant count at limit (mocked LiveKit room service) → `room_full` in `apps/api/tests/rooms-join.test.ts`
- [X] T041 [P] [US2] Contract tests for `POST /rooms/:code/token` status codes 200/401/404/409/410/400 and error body shape in `apps/api/tests/routes-join-room.test.ts`
- [X] T042 [P] [US2] Security test: 200 random wrong codes never succeed and the response for unknown vs. malformed code leaks no room existence details beyond the contract in `apps/api/tests/code-guessing.test.ts`
- [X] T043 [P] [US2] Component tests: join form accepts pasted code with spaces/lowercase, shows the friendly message for each API error and allows retry in `apps/desktop/tests/renderer/home-join.test.tsx`
- [X] T044 [P] [US2] Component tests for Viewer: renders remote video/audio when a track is subscribed, shows "transmissão encerrada" when it ends, shows notice when the broadcaster disconnects in `apps/desktop/tests/renderer/viewer.test.tsx`
- [X] T045 [P] [US2] Component tests for ViewerControls: volume, mute and fullscreen change only the local element (volume value, `requestFullscreen` called) in `apps/desktop/tests/renderer/viewer-controls.test.tsx`

### Implementation for User Story 2

- [X] T046 [US2] Implement `joinRoom` (normalize code, existence, expiry, password check in constant time, participant limit via LiveKit room service) in `apps/api/src/services/rooms.ts`
- [X] T047 [US2] Implement `POST /rooms/:code/token` with 200/401/404/409/410 in `apps/api/src/routes/rooms.ts`
- [X] T048 [P] [US2] Add "Entrar" form (code paste field tolerant of spaces/case, optional password) with friendly per-error messages and retry to `apps/desktop/src/renderer/screens/Home.tsx`
- [X] T049 [P] [US2] Build Viewer component rendering remote video and audio, auto-appearing when broadcast starts, with ended/interrupted states in `apps/desktop/src/renderer/components/Viewer.tsx`
- [X] T050 [US2] Add viewer controls (volume, mute, fullscreen, local only) in `apps/desktop/src/renderer/components/ViewerControls.tsx`
- [X] T051 [US2] Notify when broadcast starts, ends or is interrupted in `apps/desktop/src/renderer/screens/Room.tsx`
- [ ] T052 [US2] Run `npm test` until green; validate with two PCs and measure SC-002..005 and SC-007 (including mobile network, then 10 viewers if possible) per quickstart

**Checkpoint**: MVP (US1 + US2) completo.

---

## Phase 5: User Story 3 - Obter o app e ser avisado de novas versões (Priority: P2)

**Goal**: `.exe` portable único e aviso de versão.

**Independent Test**: abrir o `.exe` em Windows limpo sem admin; publicar versão maior e ver o aviso; testes Vitest de US3 passam.

### Tests for User Story 3 (write first, must fail)

- [X] T053 [P] [US3] Contract test for `GET /version` (200 shape with `latest` and `downloadUrl`; missing/invalid config file yields a clear 500 not a crash) in `apps/api/tests/routes-version.test.ts`
- [X] T054 [P] [US3] Main tests for version check: semver compare (newer, equal, older, prerelease), network failure and invalid JSON fail silently, `openExternal` accepts only https URLs on the allowed domain in `apps/desktop/tests/main/version.test.ts`
- [X] T055 [P] [US3] Component tests for UpdateBanner: shown with link when newer version exists, hidden when current or when the check failed in `apps/desktop/tests/renderer/update-banner.test.tsx`
- [X] T056 [P] [US3] Config test that `electron-builder.yml` declares target `portable`, no installer target and `requestedExecutionLevel: asInvoker` in `apps/desktop/tests/main/builder-config.test.ts`

### Implementation for User Story 3

- [X] T057 [P] [US3] Implement `GET /version` reading `latest` and `downloadUrl` from config file in `apps/api/src/routes/version.ts`
- [X] T058 [P] [US3] Configure `electron-builder` target `portable` (single `.exe`, no admin) in `apps/desktop/electron-builder.yml`
- [X] T059 [US3] Implement version check in main (semver compare, silent failure, restricted `openExternal`) in `apps/desktop/src/main/version.ts`
- [X] T060 [US3] Build update notice banner with download link in `apps/desktop/src/renderer/components/UpdateBanner.tsx`
- [X] T061 [P] [US3] Write download page with SmartScreen instructions in `infra/site/index.html` and serve it from Caddy
- [ ] T062 [US3] Run `npm test` until green; validate on a clean Windows 10 and 11: portable without admin, SmartScreen flow, banner shown/not shown, API down harmless (SC-006, SC-010)

---

## Phase 6: User Story 4 - Voz, participantes e acabamento (Priority: P3)

**Goal**: participantes, voz, reconexão, senha/limite/expiração, métricas.

**Independent Test**: lista e indicador de fala atualizam; reconexão após queda; sala com senha recusa senha errada; testes Vitest de US4 passam.

### Tests for User Story 4 (write first, must fail)

- [X] T063 [P] [US4] Service tests for expiry job: expired rooms are marked `expired` and removed from LiveKit (mock), active rooms untouched, using fake timers in `apps/api/tests/expiry.test.ts`
- [X] T064 [P] [US4] Service tests for password and limit: room with password rejects join without/with wrong password and accepts the right one; limit N rejects participant N+1 in `apps/api/tests/rooms-password-limit.test.ts`
- [X] T065 [P] [US4] Component tests for Participants: list updates on join/leave events and marks the active speaker in `apps/desktop/tests/renderer/participants.test.tsx`
- [X] T066 [P] [US4] Tests for push-to-talk: key down enables mic, key up disables, mic off by default (hook with mocked IPC) in `apps/desktop/tests/renderer/useMic.test.tsx`
- [X] T067 [P] [US4] Tests for reconnection: simulated disconnect triggers status "reconectando", successful reconnect restores the room, failure after retries shows a clear error in `apps/desktop/tests/renderer/useRoom-reconnect.test.tsx`
- [X] T068 [P] [US4] Tests for StatsPanel: converts stats samples to bitrate, packet loss % and RTT in `apps/desktop/tests/renderer/stats-panel.test.tsx`

### Implementation for User Story 4

- [X] T069 [P] [US4] Build participant list with speaking indicator in `apps/desktop/src/renderer/components/Participants.tsx`
- [X] T070 [P] [US4] Implement optional microphone with push-to-talk (implemented in the renderer via keydown/keyup, app focused only; global key capture is out of MVP) in `apps/desktop/src/renderer/livekit/useMic.ts`
- [X] T071 [US4] Add create-room options UI (password, max participants, expiry) in `apps/desktop/src/renderer/screens/Home.tsx`
- [X] T072 [US4] Implement expiry job closing expired rooms in LiveKit and marking `expired` in `apps/api/src/services/expiry.ts`
- [X] T073 [US4] Implement automatic reconnection with status UI and clear error messages in `apps/desktop/src/renderer/livekit/useRoom.ts`
- [X] T074 [P] [US4] Add connection metrics panel (bitrate, packet loss, RTT) in `apps/desktop/src/renderer/components/StatsPanel.tsx`
- [ ] T075 [US4] Run `npm test` until green; validate manually: 20-30 s network drop (SC-008), push-to-talk with real mic, password, full and expired rooms

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T076 [P] Add log-redaction test (codes, tokens and passwords never appear in captured log output across all routes) in `apps/api/tests/logging.test.ts` and fix any leak in `apps/api/src`
- [X] T077 [P] Deploy script/CI pipeline running `npm test` for both workspaces, building and pushing the API image, deploying compose and building the portable `.exe` in `.github/workflows/release.yml` and `infra/deploy.sh`
- [X] T078 [P] Enable LiveKit Prometheus metrics and basic dashboard/alerts doc in `infra/livekit.yaml` and `infra/README.md`
- [X] T079 [P] Backup script for config and SQLite file in `infra/backup.sh`
- [X] T080 Check coverage report (`vitest --coverage`) for `apps/api/src` services and `apps/desktop/src/main`; add tests for uncovered branches
- [ ] T081 Spike (time-boxed 2-3 days): native module with Application Loopback API to exclude the app's own audio; decide go/no-go and record in `specs/001-screen-share-app/research.md`
- [X] T082 Write user README (how to get the app, create/join, echo guidance, how to run `npm test`) in `README.md`

---

## Dependencies & Execution Order

- Setup → Foundational → stories. T021 (PoC) precedes T037 (codec choice).
- Within each story: tests (red) → implementation (green) → validation task.
- **US1** and **US2** both depend on Foundational; US2 needs US1's `createRoom` (T029-T031) only for end-to-end testing, and shares `Home.tsx`, `useRoom.ts`, `rooms.ts` and `routes/rooms.ts` (sequence edits to those files).
- **US3** depends only on Foundational and a working app shell; can run in parallel with US2.
- **US4** builds on US1+US2.
- Polish last; T081 can start any time after US1.

## Parallel Examples

- Foundational: T006, T007, T009, T011, T012, T016-T019 in parallel.
- US1 tests: T022-T028 all in parallel; then T032, T034, T035, T036 in parallel.
- US2 tests: T040-T045 in parallel; then T048 and T049 in parallel.
- US3: T053-T056 in parallel; then T057, T058, T061 in parallel.
- US4 tests: T063-T068 in parallel.

## Implementation Strategy

1. Phases 1-2 (incluindo a PoC T021).
2. Entregar US1 + US2 como MVP com testes verdes e validar com amigos.
3. US3 para distribuição; depois US4 e Polish; T081 decide o fim do eco.
