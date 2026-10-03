# Contributing

## Development Setup

Follow the [README setup](README.md#quick-start) for the locked npm installation and the distinction between frontend preview and native desktop development.

## Required Verification

Use the [execution contract](docs/execution-contract.md) for focused tests, broader required checks, formatting/typechecking, platform prerequisites and skip/strict-mode behavior. The broad required entrypoint remains `npm run verify:required`; focused checks help while editing and do not waive required CI gates. Report unavailable or skipped checks explicitly. UI changes also need the conditional browser/desktop checks described there.

## Engineering Rules

- Keep changes minimal and scoped.
- Validate command inputs defensively.
- Use `StoreLock` for read-modify-write store operations.
- Emit events when backend mutations should update UI.
- Add or update tests for new logic paths.

## Security Rules

- Do not commit secrets.
- Do not weaken capability boundaries in `src-tauri/capabilities/default.json`.
- Do not add remote data dependencies without explicit review.

## PR Expectations

- Explain what changed and why.
- Include verification command output summary.
- Call out any user-facing behavior changes.
