#!/usr/bin/env bash
set -euo pipefail

echo "Refreshing performance baselines from current measurements..."
npm run perf:build
npm run perf:bundle

mkdir -p .perf-baselines
cp .perf-results/build-time.json .perf-baselines/build-time.json
cp .perf-results/bundle.json .perf-baselines/bundle.json

echo "Updated .perf-baselines/build-time.json and .perf-baselines/bundle.json"
