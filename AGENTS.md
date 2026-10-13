# Purpose

DesktopPet is a local desktop companion built with Tauri and React. Keep persistence explicit and protect user data during migrations and imports.

# Layout

- `src/`: React interface, hooks, domain types, and frontend tests.
- `src-tauri/`: Tauri commands, Rust models, persistence, and backend tests.
- `scripts/`: build, performance budget, security, and release helpers.
- `docs/`: product contracts and release history.

# Setup

- Node.js 22.23.3 and npm 12.2.0 (see `package.json`).
- Rust 1.98.1 with `rustfmt` and `clippy` (see `src-tauri/rust-toolchain.toml`).
- Run `npm ci` to install frontend dependencies.
- Native desktop builds also need the Tauri prerequisites for the host operating system.

# Checks

- `make check` runs formatting, TypeScript, Vitest, Rust formatting, Clippy, Rust tests, and the frontend build.
- `npm run security:scan` runs the separate network-dependent security checks.
- Preserve failures and report the command and output; do not weaken checks to make them pass.

# Boundaries

- Do not add automatic focus interventions from configured rules without genuine observations and an explicit product decision.
- Keep local persistence as the source of truth; do not introduce a remote API or database without approval.
- Preserve unrelated work and user data. Do not publish, deploy, sign, notarize, or release as part of routine changes.
- Do not access the user's Downloads folder.

# Delivery

- Keep changes small and reviewable, with focused tests for changed behavior.
- Use conventional commit subjects: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, or `revert`.
- Verify the final diff and explain checks and any remaining limits.
