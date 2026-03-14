#!/usr/bin/env bash
set -euo pipefail

if command -v husky >/dev/null 2>&1; then
  husky
else
  echo "Skipping husky setup: husky binary is unavailable in this install profile."
fi
