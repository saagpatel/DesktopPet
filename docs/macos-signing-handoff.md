# macOS Signing Handoff

This checklist covers everything still needed to move DesktopPEt from an unsigned release candidate to a signed and notarized macOS release.

## Current State

Already complete:

- unsigned release build succeeds
- unsigned DMG succeeds
- canonical verification passes
- packaged `.app` smoke test passes
- release artifact manifest and checksums are generated

Still required:

- Apple signing credentials
- Apple notarization credentials
- CI secret and variable wiring
- one signed/notarized validation pass

## Required CI Variables

Set these repository or environment variables before enforcing the release path:

- `REQUIRE_MACOS_SIGNING=1`
- `REQUIRE_MACOS_NOTARIZATION=1`

Optional:

- `REQUIRE_TAURI_UPDATER=1`
  - only set this when updater metadata and signatures are actually being produced

## Required CI Secrets

### Signing

- `APPLE_CERTIFICATE_BASE64`
  - Base64-encoded Developer ID Application certificate export
- `APPLE_CERTIFICATE_PASSWORD`
  - Password used to export the certificate bundle
- `APPLE_SIGNING_IDENTITY`
  - Example: `Developer ID Application: Your Name (TEAMID)`
- `APPLE_TEAM_ID`
  - Apple Developer team identifier

### Notarization

Provide one of the two supported auth modes.

Preferred: App Store Connect API key

- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY_BASE64`

Alternative: Apple ID app-specific password

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

## Local Preflight

Run this first after credentials are available:

```bash
npm run release:macos:preflight
```

Expected result:

- `macOS signing/notarization preflight passed.`

## Signing Execution Order

1. Export or obtain the Developer ID Application certificate.
2. Load the required env vars locally.
3. Run:

```bash
npm run release:macos:preflight
npm run verify:required:tauri
npm run release:artifacts:validate
```

4. Build the signed release bundle.
5. Notarize the macOS artifacts.
6. Staple the notarization ticket.
7. Re-run artifact validation.
8. Open the signed `.app` once outside dev mode and repeat the short timer smoke path.

## Expected Output After Signing

- signed `.app`
- signed `.dmg`
- notarization success
- stapled ticket validation
- refreshed artifact manifest and checksums

## If Signing Fails

Check in this order:

- missing or misspelled env vars
- wrong signing identity string
- wrong certificate export password
- using both notarization auth modes inconsistently
- CI variables left disabled while expecting enforced preflight

## Final Go/No-Go Rule

Go only when all of the following are true:

- `npm run verify:required` passes
- `npm run verify:required:tauri` passes
- `npm run release:macos:preflight` passes with enforcement enabled
- signed artifacts are generated
- notarization succeeds
- stapling succeeds
- packaged signed app passes the short smoke walkthrough
