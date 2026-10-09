#!/usr/bin/env sh
# Copia a configuração e o banco SQLite da API. Uso: infra/backup.sh [destino]
set -eu
DEST="${1:-./backups}"; STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
docker compose -f "$(dirname "$0")/docker-compose.yml" cp api:/data/rooms.sqlite "$DEST/rooms-$STAMP.sqlite" || true
tar czf "$DEST/config-$STAMP.tgz" -C "$(dirname "$0")" docker-compose.yml Caddyfile livekit.yaml version.json .env 2>/dev/null || true
echo "Backup em $DEST"
