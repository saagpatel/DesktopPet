# Release Runbook

This runbook defines the release flow for DesktopPet.

## Release Preconditions

- Canonical checks pass:

```bash
npm run verify:required
```

- CI `CI` workflow is green.
- CI `perf-enforced` is green when `PERF_PROFILE=production`.

## Release Workflow

1. Create and push a semver tag (`vX.Y.Z`).
2. GitHub `Release` workflow builds macOS artifacts.
3. Workflow runs canonical strict Tauri verification:
   - `DESKTOP_PET_STRICT_RUST=1 npm run verify:required:tauri`
4. Workflow validates signing/notarization preflight when required:
   - `npm run release:macos:preflight`
5. Workflow validates generated release artifacts:
   - `npm run release:artifacts:validate`
6. Workflow packages updater assets when present:
   - `npm run release:updater:package`
7. Workflow publishes release assets and checksum evidence.

## Artifact Evidence

The release workflow emits:

- `src-tauri/target/release/bundle/macos/*.app`
- `src-tauri/target/release/bundle/dmg/*.dmg`
- `artifacts/release/tauri-artifacts.txt`
- `artifacts/release/tauri-artifacts-sha256.txt`
- `artifacts/release/updater-artifacts.txt` (when updater assets exist)
- `artifacts/release/updater-assets.tar.gz` (when updater assets exist)

## Rollback Posture

If a release is bad:

1. Mark the GitHub release as pre-release or remove it.
2. Publish a hotfix tag (`vX.Y.Z+1`) after remediation.
3. Include root-cause and mitigation notes in release notes.

## Updater Artifacts (When Enabled)

If updater delivery is enabled later, set:

```bash
REQUIRE_TAURI_UPDATER=1
```

This makes artifact validation fail when updater metadata/signature files are missing.
If updater assets exist, the workflow also publishes a packaged updater archive and manifest.

## Signing and Notarization (When Enabled)

Set release variables for enforcement:

- `REQUIRE_MACOS_SIGNING=1`
- `REQUIRE_MACOS_NOTARIZATION=1`

Required signing secrets:

- `APPLE_CERTIFICATE_BASE64`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_TEAM_ID`

Required notarization secrets (one auth mode):

- Password mode: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`
- API key mode: `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `APPLE_API_KEY_BASE64`

## Handoff Docs

- Current unsigned release-candidate posture:
  - `docs/release-candidate-status.md`
- Apple signing and notarization checklist:
  - `docs/macos-signing-handoff.md`
