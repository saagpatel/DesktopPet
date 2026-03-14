#!/usr/bin/env bash
set -euo pipefail

tmp_root="${TMPDIR:-/tmp}"
temp_dir="$(mktemp -d "${tmp_root%/}/desktop-pet-strict.XXXXXX")"

cleanup() {
  if [[ -d "$temp_dir" ]]; then
    rm -r "$temp_dir"
  fi
}
trap cleanup EXIT

echo "Preparing strict Tauri verification workspace: $temp_dir"

rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.perf-results' \
  ./ "$temp_dir"/

pushd "$temp_dir" >/dev/null
npm ci --ignore-scripts
DESKTOP_PET_STRICT_RUST=1 npm run verify:required:tauri
popd >/dev/null

echo "Strict Tauri verification passed in temporary workspace."
