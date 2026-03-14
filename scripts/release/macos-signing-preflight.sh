#!/usr/bin/env bash
set -euo pipefail

require_signing="${REQUIRE_MACOS_SIGNING:-0}"
require_notarization="${REQUIRE_MACOS_NOTARIZATION:-0}"

if [[ "$require_signing" != "1" && "$require_notarization" != "1" ]]; then
  echo "macOS signing/notarization preflight skipped (requirements disabled)."
  exit 0
fi

missing=0

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required environment variable: $key"
    missing=1
  fi
}

if [[ "$require_signing" == "1" ]]; then
  require_env "APPLE_CERTIFICATE_BASE64"
  require_env "APPLE_CERTIFICATE_PASSWORD"
  require_env "APPLE_SIGNING_IDENTITY"
  require_env "APPLE_TEAM_ID"
fi

if [[ "$require_notarization" == "1" ]]; then
  # Support either app-specific password flow or App Store Connect API key flow.
  using_password_flow=0
  using_api_key_flow=0

  if [[ -n "${APPLE_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
    using_password_flow=1
  fi

  if [[ -n "${APPLE_API_KEY_ID:-}" && -n "${APPLE_API_ISSUER:-}" && -n "${APPLE_API_KEY_BASE64:-}" ]]; then
    using_api_key_flow=1
  fi

  if [[ "$using_password_flow" == "0" && "$using_api_key_flow" == "0" ]]; then
    echo "Missing notarization credentials."
    echo "Provide either APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD, or APPLE_API_KEY_ID + APPLE_API_ISSUER + APPLE_API_KEY_BASE64."
    missing=1
  fi
fi

if [[ "$missing" -ne 0 ]]; then
  echo "macOS signing/notarization preflight failed."
  exit 1
fi

echo "macOS signing/notarization preflight passed."
