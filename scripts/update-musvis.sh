#!/usr/bin/env bash
set -euo pipefail

"$(dirname "$0")/fetch-external-app.sh" musvis "${1:-musvis}"
