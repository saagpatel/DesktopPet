#!/usr/bin/env bash
set -euo pipefail

bundle_root="${1:-src-tauri/target/release/bundle}"
output_dir="${2:-artifacts/release}"
require_updater="${REQUIRE_TAURI_UPDATER:-0}"

mkdir -p "$output_dir"

shopt -s nullglob
dmg_files=("$bundle_root"/dmg/*.dmg)
app_files=("$bundle_root"/macos/*.app)
shopt -u nullglob

if [[ "${#dmg_files[@]}" -eq 0 ]]; then
  echo "Missing release artifacts: no DMG files found in $bundle_root/dmg"
  exit 1
fi

if [[ "${#app_files[@]}" -eq 0 ]]; then
  echo "Missing release artifacts: no macOS app bundles found in $bundle_root/macos"
  exit 1
fi

manifest_file="$output_dir/tauri-artifacts.txt"
checksum_file="$output_dir/tauri-artifacts-sha256.txt"

{
  echo "bundle_root=$bundle_root"
  echo "captured_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  echo "[dmg]"
  for f in "${dmg_files[@]}"; do
    echo "$f"
  done
  echo ""
  echo "[macos-app]"
  for f in "${app_files[@]}"; do
    echo "$f"
  done
} >"$manifest_file"

{
  for f in "${dmg_files[@]}"; do
    shasum -a 256 "$f"
  done
  # App bundles are directories; checksum the archive created by tar stream.
  for f in "${app_files[@]}"; do
    tar -cf - -C "$(dirname "$f")" "$(basename "$f")" | shasum -a 256 | awk -v app="$f" '{print $1 "  " app}'
  done
} >"$checksum_file"

if [[ "$require_updater" == "1" ]]; then
  updater_count="$(find "$bundle_root" -type f \( -name 'latest*.json' -o -name '*.sig' \) | wc -l | tr -d ' ')"
  if [[ "$updater_count" == "0" ]]; then
    echo "Updater artifacts required but not found (latest*.json or *.sig)."
    exit 1
  fi
fi

echo "Release artifacts validated."
echo "Manifest: $manifest_file"
echo "Checksums: $checksum_file"
