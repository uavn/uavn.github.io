#!/usr/bin/env bash
set -euo pipefail

app_name="${1:-}"
destination_override="${2:-}"
config_file="$(dirname "$0")/external-apps.conf"

if [ -z "$app_name" ]; then
  echo "Usage: $0 <app-name> [destination]" >&2
  exit 1
fi

if [ ! -f "$config_file" ]; then
  echo "External app config not found: $config_file" >&2
  exit 1
fi

app_config="$(
  awk -F'|' -v app="$app_name" '
    $0 !~ /^[[:space:]]*(#|$)/ && $1 == app { print; found = 1; exit }
    END { if (!found) exit 1 }
  ' "$config_file"
)" || {
  echo "External app not configured: $app_name" >&2
  exit 1
}

IFS='|' read -r destination repo_owner repo_name branch build_command artifact_path <<EOF
$app_config
EOF

destination="${destination_override:-$destination}"
repo_path="${repo_owner}/${repo_name}.git"
repo="${EXTERNAL_APP_REPO:-}"
token="${EXTERNAL_APPS_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"

if [ -z "$token" ] && command -v gh >/dev/null 2>&1; then
  token="$(gh auth token 2>/dev/null || true)"
fi

if [ -z "$repo" ]; then
  if [ -z "$token" ]; then
    # Public repositories can still be cloned anonymously when no token is set.
    repo="https://github.com/${repo_path}"
  else
    repo="https://github.com/${repo_path}"
  fi
fi

export GIT_TERMINAL_PROMPT=0

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

if [ -n "$token" ] && command -v curl >/dev/null 2>&1; then
  status="$(
    curl -sS -o /dev/null -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${repo_owner}/${repo_name}"
  )"

  if [ "$status" != "200" ]; then
    echo "EXTERNAL_APPS_TOKEN cannot read ${repo_owner}/${repo_name} (GitHub API returned HTTP ${status})." >&2
    echo "Use a fine-grained token with Contents: Read for each external app repo, or a classic token with repo scope." >&2
    exit 1
  fi
fi

auth_repo="$repo"
if [ -n "$token" ] && [[ "$repo" =~ ^https://github\.com/ ]]; then
  auth_repo="https://x-access-token:${token}@${repo#https://}"
fi

clone_dir="$tmpdir/repo"

if ! git clone --depth 1 --branch "$branch" "$auth_repo" "$clone_dir" >/dev/null; then
  echo "Failed to clone ${repo_owner}/${repo_name}." >&2
  echo "Set EXTERNAL_APPS_TOKEN to a token with read access." >&2
  echo "Alternatively, set EXTERNAL_APP_REPO to an accessible git URL." >&2
  exit 1
fi

if [ -n "$build_command" ]; then
  (cd "$clone_dir" && bash -lc "$build_command")
fi

source_path="$clone_dir/$artifact_path"

if [ ! -d "$source_path" ]; then
  echo "External app artifact path not found for ${app_name}: ${artifact_path}" >&2
  exit 1
fi

mkdir -p "$(dirname "$destination")"
rm -rf "$destination"
mkdir -p "$destination"

rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.history' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '.DS_Store' \
  "$source_path/" "$destination/"

