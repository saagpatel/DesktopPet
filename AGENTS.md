<!-- comm-contract:start -->

## Communication Contract

- Inherit global Codex communication and reporting rules from `/Users/d/.codex/AGENTS.override.md` and `/Users/d/.codex/policies/communication/BigPictureReportingV1.md`.
- Repo-specific instructions below add project constraints only; do not restate global voice or status-reporting rules here.
<!-- comm-contract:end -->

## Inherited Operating Rules

- Inherit global git, review/fix, testing, docs, skill-use, and reporting gates from `/Users/d/.codex/AGENTS.md` and active session instructions.
- Use `.codex/verify.commands` and `.codex/scripts/run_verify_commands.sh` as this repo-local verification authority when present.
- Keep the project-specific portfolio constraints below as the source of truth for runtime, privacy, and release risks.

<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

DesktopPet is a Tauri desktop companion that turns focus sessions into a pet progression loop. A transparent always-on-top pet overlay, controls panel, Pomodoro presets, XP/coins, quests, shop unlocks, and focus guardrails work together as a local desktop productivity game.

## Current State

The repo is active desktop product work. Existing local changes are PR-template metadata, so context recovery should stay documentation-only.

## Stack

| Layer | Technology |
|-------|------------|
| Shell | Tauri 2 (Rust backend) |
| Language | TypeScript + React |
| Bundler | Vite |
| Testing | Vitest |
| Styling | Tailwind CSS |

## How To Run

```bash
# Development
npm run dev

# Production build
npm run build
```

## Known Risks

- Focus guardrails affect user workflow; avoid blocking behavior without clear controls and tests.
- Pet, quest, shop, and focus-session state crosses TypeScript stores and the Rust layer, so keep persistence boundaries explicit.
- Transparent always-on-top windows can be fragile on desktop platforms; verify overlay behavior after UI changes.
- Keep PR-template drift separate from product changes.

## Next Recommended Move

Resolve the PR-template drift separately, then verify overlay, Pomodoro, quest/shop, and focus-guardrail flows before shipping behavior changes.

<!-- portfolio-context:end -->
