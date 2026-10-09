#!/usr/bin/env sh
# Uso: infra/deploy.sh user@servidor /caminho/remoto
set -eu
HOST="$1"; DIR="${2:-/opt/screen-share}"
rsync -az --delete --exclude node_modules --exclude .git --exclude 'apps/desktop' ./ "$HOST:$DIR/"
ssh "$HOST" "cd $DIR/infra && docker compose up -d --build"
