# Execution Contract

This document defines the canonical local, CI, and release verification contract for DesktopPet.

## Runtime and Tooling Contract

- Package manager: `npm`
- Node runtime: `22 LTS`
- Rust toolchain: `stable`
- Tauri CLI: repo-pinned in `package.json`

## Canonical Required Check Entrypoint

Run:

```bash
npm run verify:required
```

This is the single required-check command for local and automation use.

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

## CI Parity Policy

- CI must call the same canonical script groups (`verify:required:frontend` and `verify:required:tauri`).
- Required check names should remain stable to avoid branch-protection drift.

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
