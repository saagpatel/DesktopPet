#!/usr/bin/env bash
set -euo pipefail

strict_mode="${DESKTOP_PET_STRICT_RUST:-0}"

skip_or_fail() {
  local reason="$1"
  if [[ "$strict_mode" == "1" ]]; then
    echo "Rust test gate failed: ${reason}"
    exit 1
  fi
  echo "Skipping Rust test gate: ${reason}"
  echo "Set DESKTOP_PET_STRICT_RUST=1 to fail instead of skip."
  exit 0
}

if ! command -v cargo >/dev/null 2>&1; then
  skip_or_fail "cargo is not installed in this environment."
fi

# Cargo can fail when the workspace path contains a colon on macOS.
if [[ "$(pwd)" == *:* ]]; then
  skip_or_fail "workspace path contains ':', which is unsupported for this cargo workflow."
fi

cargo test --manifest-path src-tauri/Cargo.toml "$@"
