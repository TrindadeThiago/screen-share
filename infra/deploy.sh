#!/usr/bin/env sh
# Uso: infra/deploy.sh user@servidor /caminho/remoto
# O infra/.env do servidor não é enviado nem apagado: ele guarda as chaves de produção.
set -eu
HOST="$1"; DIR="${2:-/opt/screen-share}"
rsync -az --delete --exclude node_modules --exclude .git --exclude /apps/desktop \
  --exclude /infra/.env --exclude /infra/backups ./ "$HOST:$DIR/"
ssh "$HOST" "cd $DIR/infra && docker compose up -d --build"
