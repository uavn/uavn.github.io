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
  --exclude '/unicorn-noir' \
  --exclude '/games' \
  --exclude '/medieval-drift' \
  ./ "$site_dir/"

while IFS='|' read -r destination _; do
  case "$destination" in
    ''|\#*) continue ;;
  esac

  "$(dirname "$0")/fetch-external-app.sh" "$destination" "$site_dir/$destination"
done < "$(dirname "$0")/external-apps.conf"

# Games kept in this repository: build each one and publish its dist/ at /<name>.
for game_dir in games/*/; do
  [ -f "${game_dir}package.json" ] || continue

  game_name="$(basename "$game_dir")"
  echo "Building game: $game_name"

  (cd "$game_dir" && npm ci --no-audit --no-fund && npm run build)

  if [ ! -d "${game_dir}dist" ]; then
    echo "Game build produced no dist/: $game_name" >&2
    exit 1
  fi

  rm -rf "$site_dir/$game_name"
  mkdir -p "$site_dir/$game_name"
  rsync -a "${game_dir}dist/" "$site_dir/$game_name/"
done

wallpapers_dir="$site_dir/resources/wallpapers"
manifest_file="$wallpapers_dir/manifest.json"

if [ -d "$wallpapers_dir" ]; then
  wallpapers_json="$({
    find "$wallpapers_dir" -maxdepth 1 -type f \
      \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.gif' \) \
      -print | sed "s#^$wallpapers_dir/##" | sort | while IFS= read -r name; do
        [ -n "$name" ] || continue
        printf '"%s"\n' "$name"
      done
  } | awk 'BEGIN{printf "["} {if (NR>1) printf ","; printf "%s", $0} END{printf "]"}')"

  printf '{"wallpapers":%s}\n' "$wallpapers_json" > "$manifest_file"
fi
