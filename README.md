# DesktopPet

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> A desktop companion that actually earns its place on your screen

DesktopPet is a Tauri-powered desktop companion that floats above your windows as an animated penguin. Focus sessions reward coins and XP, which feed directly into pet evolution, accessory unlocks, and quests — turning your Pomodoro timer into a progression loop.

## Features

- **Floating pet overlay** — transparent, always-on-top companion window that reacts to pats and care actions
- **Pomodoro integration** — 15/5, 25/5, and 50/10 presets with XP and coin rewards on completion
- **Pet progression** — evolution stages, care stats, personality state, and 20+ unlockable achievements
- **Shop + quests** — accessory catalog, rolling events, and active quests with completion rewards
- **Focus guardrails** — allowlist/blocklist host matching with timer messages, pause interventions, and event history
- **Customization** — skins, scenes, themes, saved loadouts, and a photo booth for shareable pet cards

## Quick Start

### Prerequisites

- Node.js 22.13+ on the 22.x line and npm (the CI runtime; required by the locked Vite/jsdom toolchain).
- For native desktop work: Rust `stable`, Cargo, and the [Tauri prerequisites for your OS](https://v2.tauri.app/start/prerequisites/). `Cargo.toml` declares Rust 1.77.2, but the locked dependency graph may require a newer toolchain.
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

See the [execution contract](docs/execution-contract.md) for focused tests, format/typecheck checks, native builds, strict verification and conditional browser/desktop checks.

## Tech Stack

| Layer    | Technology             |
| -------- | ---------------------- |
| Shell    | Tauri 2 (Rust backend) |
| Language | TypeScript + React     |
| Bundler  | Vite                   |
| Testing  | Vitest                 |
| Styling  | Tailwind CSS           |

## Architecture

Two Tauri windows — a transparent always-on-top pet overlay (`pet.html`) and a controls panel (`panel.html`) — communicate via Tauri commands and events. The React Pomodoro hook runs the countdown; the Rust backend persists timer runtime, evaluates focus guardrails, and stores app state in `store.json` through the Tauri store plugin. Pet state and quest logic are managed by Rust commands and exposed through React hooks via commands and events. The shop catalog is defined in both TypeScript constants and Rust commands; purchases are handled in Rust.

## License

MIT
