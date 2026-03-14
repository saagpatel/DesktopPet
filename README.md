# Desktop Pet

Desktop Pet is a playful desktop penguin + focus sidekick.
It floats above your windows, reacts to interactions, and turns your Pomodoro sessions into progression, coins, quests, and customization unlocks.

## Why It Is Fun

- Your penguin lives on your desktop and reacts to pats, care actions, and focus progress.
- Focus sessions reward coins and XP, which feed directly into pet growth and unlocks.
- Quests, events, and accessories keep the loop fresh without becoming noisy.
- You can theme both the app UI and your pet setup with loadouts.

## Current App Features

- **Floating Pet Overlay**: transparent, always-on-top companion window
- **Calm Controls**: Quiet Mode, Focus Mode, animation budget, and context-aware chill
- **Pomodoro Modes**: 15/5, 25/5, and 50/10 presets with runtime persistence
- **Multi-Species Pets**: data-driven species packs with selectable pet species
- **Pet Progression**: evolution stages, care stats, personality state, and calm questing
- **Quests + Events**: rolling events, active quests, and completion rewards
- **Shop + Coins**: accessory catalog with ownership and purchase tracking
- **Tasks + Daily Goals**: lightweight productivity tracking tied to session outcomes
- **Achievements**: 20+ unlockable achievements across 5 categories (focus, streak, pet care, progression, special)
- **Focus Guardrails**: allowlist/blocklist host matching, interventions, and event history
- **Customization**: skins, scenes, themes, and saved loadouts
- **Photo Booth**: user-triggered shareable pet card screenshots
- **Seasonal Cosmetic Packs**: optional, local-only cosmetic bundles
- **System Tray Controls**: quick timer start/pause/resume/reset + preset switching

## Reliability and Recovery

- Local-first data storage with schema normalization on startup
- Snapshot export/import for backup and restore
- One-click full local reset to defaults
- Diagnostics export for debugging and support workflows
- CI quality gates for frontend checks and Tauri backend/bundle checks
- Release evidence policy (manual QA run + CI gate summary in release PRs)

## Tech Stack

Built with [Tauri 2](https://tauri.app/), React, TypeScript, and TailwindCSS.
The pet is SVG-based, and app data is stored locally on-device.

## Prerequisites

- Node.js 22 LTS
- Rust toolchain (stable)
- Xcode Command Line Tools on macOS (`xcode-select --install`)

## Local Development

```bash
npm install
npm test
npm run test:smoke
npm run test:pack-qa
npm run tauri dev
```

### Lean Dev (low disk mode)

Use this when you want to keep local disk usage down while developing:

```bash
npm install
npm run dev:lean
```

What `npm run dev:lean` does:

- Starts the app with the normal `npm run tauri dev` flow.
- Redirects heavy build caches to temporary directories (Cargo target + Vite cache).
- Automatically removes temporary caches and heavy build artifacts when you exit the app.
- Prints before/after disk usage snapshots for major bloat paths.

Disk vs speed tradeoff:

- Lean mode uses less persistent disk.
- Lean mode is usually slower on next startup because caches are rebuilt.
- Normal `npm run tauri dev` keeps caches in-repo for faster repeated starts.

### Cleanup commands

Target heavy build artifacts only:

```bash
npm run clean:heavy
```

This removes:

- `dist/`
- `artifacts/`
- `src-tauri/target/`
- `node_modules/.vite/`

Full local reproducible cleanup:

```bash
npm run clean:all
```

This runs `clean:heavy` and also removes:

- `node_modules/`

## Verification

```bash
./scripts/verify.sh
```

This runs the canonical command contract in `.codex/verify.commands`:

- `npm run verify:required`

`verify:required` includes:

- Frontend quality gates (`typecheck`, tests, smoke, pack QA, build)
- Performance gates (`check:performance-budget`, bundle/build delta checks, assets, memory)
- Security scans (`npm audit`, `cargo audit`, `gitleaks`)
- Tauri gates (`test:tauri-preflight`, `test:rust`, checked Tauri build)

If your local workspace path contains `:`, Rust tests are skipped in non-strict mode because Cargo fails in that path shape on macOS. CI runs strict mode (`DESKTOP_PET_STRICT_RUST=1`) and fails if Rust checks cannot run.
To run strict Tauri checks locally from a path-constrained workspace, use:

```bash
npm run verify:required:tauri:strict:temp
```

For full contract details, see [docs/execution-contract.md](./docs/execution-contract.md).

## Operations Docs

- [Execution Contract](./docs/execution-contract.md)
- [Release Runbook](./docs/release-runbook.md)
- [Security Gates](./docs/security-gates.md)
- [Codex Feature Maturity Policy](./docs/codex-feature-maturity-policy.md)
- [Codex Docs Drift Checklist](./docs/codex-docs-drift-checklist.md)

## Production Build

```bash
npm run tauri build
```

Build artifacts are written to `src-tauri/target/release/bundle/`.

## Contributing

- [Contributing](./CONTRIBUTING.md)
