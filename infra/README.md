# Infra

1. Copie `.env.example` para `.env` e preencha `DOMAIN`, chaves do LiveKit.
2. Aponte `DOMAIN` e `live.DOMAIN` (DNS A) para a VM.
3. Abra no firewall: 80/tcp, 443/tcp, 7881/tcp, 3478/udp, 5349/tcp, 50000-50100/udp.
4. `docker compose up -d --build`
5. Coloque o `.exe` em `infra/site/download/ScreenShare-portable.exe` e atualize `version.json`.

## Fallback TURN/TLS na 443

O Caddy já usa a 443 para HTTPS. O LiveKit expõe TURN/TLS em 5349; para redes que só liberam 443,
crie um registro `turn.DOMAIN` e encaminhe a 443 desse nome (SNI) ao LiveKit (por exemplo com um
proxy de camada 4). Validar na Fase 0 (research.md, pendências).

## Monitoramento

O LiveKit expõe métricas Prometheus na porta 6789 (interna). Aponte um Prometheus para `livekit:6789`
e observe `livekit_room_total`, `livekit_participant_total`, e tráfego de rede. Alerte quando a banda
de saída da VM passar de ~80% do contratado.

## Backup

`infra/backup.sh` copia o SQLite da API e a configuração.
