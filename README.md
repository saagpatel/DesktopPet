# DesktopPet

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> A desktop companion that actually earns its place on your screen

DesktopPet is a Tauri-powered desktop companion that floats above your windows as an animated penguin. Focus sessions reward coins and XP, which feed directly into pet evolution, accessory unlocks, and quests — turning your Pomodoro timer into a progression loop.

## Features

- **Floating pet overlay** — transparent, always-on-top companion window that reacts to pats and care actions
- **Pomodoro integration** — 15/5, 25/5, and 50/10 presets with XP and coin rewards on completion
- **Pet progression** — evolution stages, care stats, personality state, and 20+ unlockable achievements
- **Shop + quests** — accessory catalog, rolling events, and active quests with completion rewards
- **Focus guardrails** — allowlist/blocklist host matching with intervention overlays and event history
- **Customization** — skins, scenes, themes, saved loadouts, and a photo booth for shareable pet cards

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.75+ and Cargo
- Tauri CLI: `cargo install tauri-cli`

### Installation
```bash
npm install
```

### Usage
```bash
# Development
npm run dev

# Production build
npm run build
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Shell | Tauri 2 (Rust backend) |
| Language | TypeScript + React |
| Bundler | Vite |
| Testing | Vitest |
| Styling | Tailwind CSS |

## Architecture

Two Tauri windows — a transparent always-on-top pet overlay (`pet.html`) and a controls panel (`panel.html`) — communicate via Tauri commands and events. The Rust backend manages focus session timers, focus guardrail enforcement, and SQLite persistence. Pet state, quest logic, and shop catalog live in TypeScript stores synced to the Rust layer on each session boundary.

## License

MIT