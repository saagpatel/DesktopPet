# Security Gates

This repository uses layered security checks for local and CI workflows.

## Canonical Security Command

```bash
npm run security:scan
```

This runs:

- `npm audit --omit=dev --audit-level=high`
- `cargo audit --file src-tauri/Cargo.lock`
- `gitleaks git .` in a Git checkout, or `gitleaks detect --no-git --source .` outside Git; reports are redacted

Run from the repository root after the locked npm installation. `cargo-audit` and `gitleaks` must be installed for their lanes. Dependency audits read the lockfiles and may contact npm/Rust advisory services; the secret scan reads this repository, not an installed desktop profile. Artifacts are written to `artifacts/security/`.

Default mode records warnings for failed or unavailable scans and may still exit successfully. Read each result; use strict mode for enforcement.

## Strict Mode

Enable strict enforcement:

```bash
DESKTOP_PET_STRICT_SECURITY=1 DESKTOP_PET_SKIP_GITLEAKS=0 npm run security:scan
```

`DESKTOP_PET_SKIP_GITLEAKS=1` explicitly skips the secret scan even in strict mode. Set it to `0`, as above, when requiring complete local scan coverage.

Behavior in strict mode:

- missing required scan tooling fails the run
- dependency vulnerabilities fail the run
- detected secrets fail the run

## CI Enforcement

`security.yml` is configured for pull requests and pushes to `main`/`master`. It sets `DESKTOP_PET_STRICT_SECURITY=1` and `DESKTOP_PET_SKIP_GITLEAKS=1`: dependency scans are strict, but both the script secret scan and the separate gitleaks action are skipped. `git-hygiene.yml` has a separate PR secret-scan job. A workflow definition is not evidence of an actual run; verify Actions availability and exact-head check results before claiming CI coverage.

## Interpreting Results

Use the current audit reports and exit statuses to establish advisory posture; this document does not certify a vulnerability-free lockfile. Treat detected vulnerabilities, unavailable tooling and skipped secret scans as distinct outcomes. Informational unmaintained-crate warnings are reported separately from vulnerability failures.
