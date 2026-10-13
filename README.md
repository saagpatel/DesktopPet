# DesktopPet

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> A desktop companion that actually earns its place on your screen

DesktopPet is a Tauri-powered desktop companion that floats above your windows as an animated penguin. Focus sessions reward coins and XP, which feed directly into pet evolution, accessory unlocks, and quests — turning your Pomodoro timer into a progression loop.

## Features

- **Floating pet overlay** — transparent, always-on-top companion window that reacts to pats and care actions
- **Pomodoro integration** — 15/5, 25/5, and 50/10 presets with XP and coin rewards on completion
- **Pet progression** — evolution stages, care stats, personality state, and 20+ unlockable achievements
- **Shop + quests** — accessory catalog, rolling events, and active quests with completion rewards
- **Focus guardrails** — explicit evaluation of supplied host observations against allowlists and blocklists
- **Customization** — skins, scenes, themes, saved loadouts, and a photo booth for shareable pet cards

## Quick Start

### Prerequisites

- Node.js 22.23.3 and npm 12.2.0.
- Rust 1.98.1 with Cargo, `rustfmt`, and `clippy` for native checks.
- For native desktop work, install the [Tauri prerequisites for your OS](https://v2.tauri.app/start/prerequisites/).
- Use the Tauri CLI pinned in `package.json` through `npm run tauri`; no global CLI installation is needed.

### Installation

Run from the repository root:

```bash
npm ci
```

For an isolated verification worktree, use `npm ci --ignore-scripts` to avoid the Husky `prepare` step changing shared Git hook configuration. This skips lifecycle scripts; it does not install hooks.

### Usage

```bash
# Frontend preview only
npm run dev

# Native desktop development (launches the app and uses local app state)
npm run tauri -- dev

# Frontend production build only
npm run build
```

Run `make check` for the repository checks. Run `npm run security:scan` separately for network-dependent security scans.

## Status

### Stack

| Layer   | Technology                  |
| ------- | --------------------------- |
| Shell   | Tauri 2 with a Rust backend |
| UI      | React 19 and TypeScript 7   |
| Bundler | Vite 8                      |
| Tests   | Vitest                      |
| Styling | Tailwind CSS                |

### Known risks

- Focus guardrails evaluate only hosts explicitly provided by the application. The desktop app does not detect activity in other apps or browsers.
- Transparent, always-on-top windows can vary across desktop environments and need platform-specific manual verification.
- Backup imports replace local application state after schema validation; keep a separate backup before importing important data.

### Next steps

- Run `make check` before proposing changes.
- Verify overlay behavior and focus-session flows on the target desktop platform before a release.
- CI builds the macOS `.app` bundle; DMG creation, signing, and notarization are release-only work.

## Architecture

Two Tauri windows — a transparent always-on-top pet overlay (`pet.html`) and a controls panel (`panel.html`) — communicate via Tauri commands and events. The React Pomodoro hook runs the countdown; the Rust backend persists timer runtime, evaluates focus guardrails, and stores app state in `store.json` through the Tauri store plugin. Pet state and quest logic are managed by Rust commands and exposed through React hooks via commands and events. The shop catalog is defined in both TypeScript constants and Rust commands; purchases are handled in Rust.

## License

MIT
