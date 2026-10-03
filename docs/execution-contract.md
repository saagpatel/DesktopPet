# Execution Contract

This document defines the canonical local, CI, and release verification contract for DesktopPet.

## Runtime and Tooling Contract

- Package manager: `npm`
- Node runtime: `22.13+` on the `22.x` line (CI uses Node 22; the locked jsdom requires at least 22.13 on that line)
- Rust toolchain: `stable` for native work; the manifest declares 1.77.2, but locked dependencies may require newer Rust
- Tauri CLI: repo-pinned in `package.json`

## Setup and Working Directory

Run every command below from the repository root, where `package.json`, `package-lock.json` and `src-tauri/` live. Install with `npm ci` to use the committed lockfile. In an isolated worktree, `npm ci --ignore-scripts` avoids Husky preparation changing shared Git configuration; it also skips other lifecycle scripts and does not install hooks.

Frontend tests use Vitest with jsdom and mocked Tauri APIs from `src/test/setup.ts`; they do not launch the desktop app. Native tests/builds also need Cargo and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/). On Linux, `npm run test:tauri-preflight` checks pkg-config, GLib/GObject/GIO and WebKitGTK; on other operating systems it is a no-op, not proof that native tooling is installed.

## Focused Local Checks

Start with the changed test file or a real test-name filter:

```bash
# Example: a small utility test file using no desktop app state
npm test -- src/lib/__tests__/utils.test.ts
npm test -- src/lib/__tests__/utils.test.ts -t formatTime

# Existing frontend smoke set; mocked Tauri, no native build
npm run test:smoke:frontend

# Native Rust filter; wrapper forwards these arguments to cargo test
DESKTOP_PET_STRICT_RUST=1 npm run test:rust -- --locked apply_quest_progress
```

Replace the example file/filter with the tests covering your change. `npm run test:smoke` additionally attempts Rust smoke tests, so use `test:smoke:frontend` when only the frontend lane is intended. Native dependency resolution/builds may download crates and write Cargo build output; `--locked` prevents changing the Rust lockfile.

```bash
# Full frontend test suite
npm test

# Prettier formatting check (the lint script is a format check)
npm run lint

# Focused formatting check without installing another tool
npx --no-install prettier --check README.md CONTRIBUTING.md docs/execution-contract.md docs/security-gates.md

npm run typecheck
npm run build
```

`npm run build` writes the frontend output to `dist/`; it does not build a native app bundle. For a native bundle on a prepared machine use `DESKTOP_PET_STRICT_RUST=1 npm run verify:required:tauri`, which performs preflight, Rust tests and a local Tauri build. It writes native build/bundle output under `src-tauri/target/`. The broad native lane does not pass `--locked`, so use an isolated checkout and review any Rust lockfile changes; release publication and signing are separate steps in the [release runbook](release-runbook.md).

## Canonical Required Check Entrypoint

Run:

```bash
npm run verify:required
```

This is the broad required-check entrypoint used by `.codex/verify.commands`. It runs all groups below, writes local build/QA/performance/security artifacts, and queries dependency advisory services. It is not the first focused check for a documentation-only change.

The default command can succeed with skipped native checks or security warnings. For complete native/security evidence on a prepared machine, use:

```bash
DESKTOP_PET_STRICT_RUST=1 DESKTOP_PET_STRICT_SECURITY=1 DESKTOP_PET_SKIP_GITLEAKS=0 npm run verify:required
```

Inspect the result of every lane; a skip or warning is not evidence that that check passed. Strict security needs `cargo-audit` and `gitleaks` and requires advisory-service access. An explicit `DESKTOP_PET_SKIP_GITLEAKS=1` still skips secrets even in strict mode; the command above sets it to `0`; see [security gates](security-gates.md).

## Required Check Breakdown

`verify:required` executes two groups:

1. `verify:required:frontend`
2. `verify:required:tauri`

Frontend checks:

- unit and integration tests
- smoke tests (frontend set)
- pack QA harness
- typecheck + build
- performance budget
- performance build-time, bundle, and asset checks
- security scans (`npm audit`, `cargo audit`, `gitleaks`)

Tauri checks:

- Tauri preflight
- Rust tests
- Tauri production build
- Optional strict temp-workspace execution: `npm run verify:required:tauri:strict:temp`

## Environment Guardrails

- Rust checks use `scripts/tauri-rust-test.sh`.
- In strict mode (`DESKTOP_PET_STRICT_RUST=1`), any skip condition fails the run.
- In non-strict mode, Rust checks may skip when environment constraints are known unsupported.
- Current supported-path guard: workspace paths containing `:` are skipped in non-strict mode because Cargo fails in that path shape on macOS.
- For strict validation from a path-constrained workspace, run `verify:required:tauri:strict:temp` to execute strict checks in a temporary colon-free directory.

## Conditional Browser and Desktop Checks

For changed UI, pet packs, photo-booth output or other user-facing behavior, run relevant tests and the frontend build, then check the affected flow in the frontend preview (`npm run dev`). Check visible states, controls, layout and console errors. Browser previews and mocked tests cannot establish Tauri IPC, native window positioning, persistence or focus enforcement.

When those native behaviors change, perform the relevant desktop check with `npm run tauri -- dev` on a supported test machine or disposable OS user profile. This launches an app that can persist local state and enforce focus guardrails; use isolated test data for routine verification. Pure documentation changes do not require launching either preview or app.

## CI Parity Policy

- `ci.yml` calls `verify:required:frontend` on Ubuntu and `verify:required:tauri` plus cross-layer smoke on macOS; its native lane sets `DESKTOP_PET_STRICT_RUST=1`.
- Required check names should remain stable to avoid branch-protection drift. No local result proves that a hosted workflow ran; check the exact PR head and repository Actions availability before claiming CI parity.

## Performance Baseline Policy

- Enforced comparison requires baseline values greater than zero.
- Placeholder baseline values are invalid and must be replaced with measured values before enforcement.
- Build-time gate uses a 50% delta threshold when enabled.
- Strict performance regression enforcement is controlled with `DESKTOP_PET_STRICT_PERF=1`.
- Build-time delta enforcement is additionally controlled with `DESKTOP_PET_ENFORCE_BUILD_DELTA=1` to avoid cross-runner noise by default.

## Security Scan Policy

- `verify:required:frontend` runs `security:scan`.
- Security scan default mode records warnings when optional tools are missing.
- Strict mode (`DESKTOP_PET_STRICT_SECURITY=1`) fails on missing tools or detected vulnerabilities.
