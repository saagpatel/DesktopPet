#!/usr/bin/env bash
set -euo pipefail

strict_mode="${DESKTOP_PET_STRICT_SECURITY:-0}"
output_dir="${1:-artifacts/security}"
skip_gitleaks="${DESKTOP_PET_SKIP_GITLEAKS:-0}"

mkdir -p "$output_dir"

warn_or_fail() {
  local reason="$1"
  if [[ "$strict_mode" == "1" ]]; then
    echo "Security gate failed: $reason"
    exit 1
  fi
  echo "Security gate warning: $reason"
}

echo "Running npm production dependency audit..."
if npm audit --omit=dev --audit-level=high --json >"$output_dir/npm-audit.json"; then
  echo "npm audit passed."
else
  warn_or_fail "npm audit reported high/critical vulnerabilities."
fi

if command -v cargo-audit >/dev/null 2>&1; then
  echo "Running cargo audit for src-tauri lockfile..."
  if cargo audit --file src-tauri/Cargo.lock --json >"$output_dir/cargo-audit.json"; then
    echo "cargo audit passed (informational warnings may still exist)."
  else
    warn_or_fail "cargo audit reported vulnerabilities."
  fi
else
  warn_or_fail "cargo-audit is not installed."
fi

if [[ "$skip_gitleaks" == "1" ]]; then
  echo "Skipping gitleaks scan (DESKTOP_PET_SKIP_GITLEAKS=1)."
elif command -v gitleaks >/dev/null 2>&1; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Running gitleaks git scan..."
    gitleaks_cmd=(git .)
  else
    echo "Running gitleaks workspace scan..."
    gitleaks_cmd=(detect --no-git --source .)
  fi

  if gitleaks "${gitleaks_cmd[@]}" --redact --report-format json --report-path "$output_dir/gitleaks.json"; then
    echo "gitleaks scan passed."
  else
    warn_or_fail "gitleaks detected potential secrets."
  fi
else
  warn_or_fail "gitleaks is not installed."
fi

echo "Security scans completed."
