# Security Gates

This repository uses layered security checks for local and CI workflows.

## Canonical Security Command

```bash
npm run security:scan
```

This runs:

- `npm audit --omit=dev --audit-level=high`
- `cargo audit --file src-tauri/Cargo.lock`
- `gitleaks detect --no-git --source .`

Artifacts are written to `artifacts/security/`.

## Strict Mode

Enable strict enforcement:

```bash
DESKTOP_PET_STRICT_SECURITY=1 npm run security:scan
```

Behavior in strict mode:

- missing required scan tooling fails the run
- dependency vulnerabilities fail the run
- detected secrets fail the run

## CI Enforcement

`security.yml` runs strict dependency scans plus a strict secret scan on pull requests and pushes to `main`/`master`.

## Current Advisory Posture

- No current high/critical npm production vulnerabilities.
- No current Rust vulnerabilities in `src-tauri/Cargo.lock`.
- `cargo audit` may report informational warnings (for example, unmaintained transitive GTK3-era crates); these are tracked as technical debt, not immediate blockers.
