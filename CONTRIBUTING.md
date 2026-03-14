# Contributing

## Development Setup

```bash
npm install
npm run tauri dev
```

## Required Verification

Run this before opening a PR:

```bash
npm run verify:required
```

Equivalent checks:

```bash
npm run verify:required:frontend
npm run verify:required:tauri
```

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
