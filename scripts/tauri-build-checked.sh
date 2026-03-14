#!/usr/bin/env bash
set -euo pipefail

strict_mode="${DESKTOP_PET_STRICT_RUST:-0}"

skip_or_fail() {
  local reason="$1"
  if [[ "$strict_mode" == "1" ]]; then
    echo "Tauri build gate failed: ${reason}"
    exit 1
  fi
  echo "Skipping Tauri build gate: ${reason}"
  echo "Set DESKTOP_PET_STRICT_RUST=1 to fail instead of skip."
  exit 0
}

if [[ "$(pwd)" == *:* ]]; then
  skip_or_fail "workspace path contains ':', which is unsupported for this cargo workflow."
fi

if [[ "$(uname -s)" == "Linux" ]] && ! ./scripts/tauri-preflight.sh; then
  skip_or_fail "Linux Tauri preflight dependencies are missing."
fi

node ./node_modules/@tauri-apps/cli/tauri.js build "$@"
