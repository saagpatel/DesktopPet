# Unsigned Release Candidate Status

Last updated: 2026-03-14

## Current Decision

DesktopPEt is at an unsigned macOS release-candidate state.

Go for pre-signing handoff:

- Yes

Go for final public distribution:

- Not yet

## What Is Proven

- Canonical verification passes:
  - `npm run verify:required`
  - `npm run verify:required:tauri`
- Release artifact validation passes:
  - `npm run release:artifacts:validate`
  - `npm run release:updater:package` (clean skip because updater assets are not enabled yet)
- Unsigned macOS artifacts build successfully:
  - `src-tauri/target/release/bundle/macos/Desktop Pet.app`
  - `src-tauri/target/release/bundle/dmg/Desktop Pet_1.0.0_aarch64.dmg`
- Live smoke checks passed in both `tauri dev` and the packaged `.app`:
  - pet and panel windows launch
  - timer preset changes apply
  - timer start, pause, resume, and reset work
  - backup export works
  - reset returns the app to defaults
  - backup import restores prior timer state
  - pet window recovery keeps the overlay reachable

## Evidence

- Release manifest:
  - `artifacts/release/tauri-artifacts.txt`
- Release checksums:
  - `artifacts/release/tauri-artifacts-sha256.txt`
- Pack QA report:
  - `artifacts/pack-qa-report.md`
- Performance budget report:
  - `artifacts/performance-budget-report.md`

## Remaining Blocker

The only material blocker for final distribution is Apple signing and notarization setup.

Missing release inputs are documented in:

- `docs/macos-signing-handoff.md`

## Non-Blocking Notes

- Updater packaging currently skips because no updater metadata or signatures are being produced.
- The branch contains verified release-hardening and product-fix work that still needs to be committed and pushed.

## Recommended Next Action

Use `docs/macos-signing-handoff.md` to provision Apple credentials, run signing preflight, build a signed/notarized bundle, and rerun artifact validation.
