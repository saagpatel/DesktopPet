#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f ".lighthouserc.json" && ! -f "lighthouserc.json" && ! -f ".lighthouserc.js" && ! -f "lighthouserc.js" ]]; then
  echo "Lighthouse CI config not found; skipping perf:lhci."
  exit 0
fi

npx --no-install lhci autorun
