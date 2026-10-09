# Data Model

Armazenado na API (SQLite). Participantes e transmissões vivem no LiveKit (estado em tempo real), não são persistidos.

## Room (persistida)
| Campo | Tipo | Regras |
|-------|------|--------|
| code | texto (PK) | 16 chars base32 normalizados (maiúsculas, sem hífen) |
| createdAt | timestamp | — |
| expiresAt | timestamp | padrão 12 h após criação; configurável pelo criador (FR-022) |
| maxParticipants | inteiro | 2-10, padrão 10 |
| passwordHash | texto, opcional | scrypt + salt |
| state | enum | `active` → `expired` |

Transição: `active` → `expired` quando `now ≥ expiresAt`; sala expirada recusa novos tokens e é removida do LiveKit.

## Participant (efêmero, LiveKit)
- identity: id aleatório por entrada; name: nome de exibição (1-32 chars, aparado)
- papel lógico: `broadcaster` | `viewer` (atributo); estados: microfone, falando, conexão
- Validação de limite: contagem atual do LiveKit < `maxParticipants` ao emitir token.

## Broadcast (efêmero, LiveKit)
- Faixas de vídeo (tela) e áudio (sistema) publicadas por um participante
- preset: `motion` | `detail`; estado: `live` → `ended`
- No máximo uma por sala.

## AccessToken (não persistido)
- JWT do LiveKit: sala, identity, name, TTL curto, grants (`roomJoin`, `canSubscribe`, `canPublish`, `canPublishData`), vinculado ao código.

## AppVersion (configuração do servidor)
- latest (semver), downloadUrl.

## Preferências locais do app
- displayName, volume, preset de qualidade, tecla de push-to-talk (arquivo local do usuário; nenhum dado sensível).
