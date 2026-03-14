#!/usr/bin/env bash
set -euo pipefail

bundle_root="${1:-src-tauri/target/release/bundle}"
output_dir="${2:-artifacts/release}"
require_updater="${REQUIRE_TAURI_UPDATER:-0}"

mkdir -p "$output_dir"

tmp_list="$(mktemp)"
if [[ ! -d "$bundle_root" ]]; then
  rm -f "$tmp_list"
  if [[ "$require_updater" == "1" ]]; then
    echo "Updater artifacts required but bundle path is missing: $bundle_root"
    exit 1
  fi
  echo "Bundle path not found; skipping updater package."
  exit 0
fi

(cd "$bundle_root" && find . -type f \( -name 'latest*.json' -o -name '*.sig' \) | sed 's|^\./||' | sort) >"$tmp_list"

if [[ ! -s "$tmp_list" ]]; then
  rm -f "$tmp_list"
  if [[ "$require_updater" == "1" ]]; then
    echo "Updater artifacts required but not found in $bundle_root."
    exit 1
  fi
  echo "No updater artifacts found; skipping updater package."
  exit 0
fi

manifest_file="$output_dir/updater-artifacts.txt"
archive_file="$output_dir/updater-assets.tar.gz"

{
  echo "bundle_root=$bundle_root"
  echo "captured_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  while IFS= read -r rel; do
    echo "$bundle_root/$rel"
  done <"$tmp_list"
} >"$manifest_file"

tar -czf "$archive_file" -C "$bundle_root" -T "$tmp_list"
rm -f "$tmp_list"

echo "Updater assets packaged."
echo "Manifest: $manifest_file"
echo "Archive: $archive_file"
