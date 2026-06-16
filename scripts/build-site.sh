#!/usr/bin/env bash
set -euo pipefail

site_dir="${SITE_DIR:-_site}"

if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi

rm -rf "$site_dir"
mkdir -p "$site_dir"

rsync -a \
  --exclude '.git' \
  --exclude '.agents' \
  --exclude '.codex' \
  --exclude '.github' \
  --exclude '.history' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '.DS_Store' \
  --exclude '/_site' \
  --exclude '/scripts' \
  --exclude '/musvis' \
  --exclude '/movanova' \
  ./ "$site_dir/"

while IFS='|' read -r destination _; do
  case "$destination" in
    ''|\#*) continue ;;
  esac

  "$(dirname "$0")/fetch-external-app.sh" "$destination" "$site_dir/$destination"
done < "$(dirname "$0")/external-apps.conf"
