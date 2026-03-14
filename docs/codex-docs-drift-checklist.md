# Codex Docs Drift Checklist

Run this once per week (or before a major release) to keep execution policy current.

## Official Sources to Check

- Codex changelog
- Codex config basics/reference
- Codex rules
- AGENTS guide
- Feature maturity docs
- Worktrees and automations docs

## Weekly Checklist

1. Review changelog for behavior changes that affect scripts, approvals, or tooling.
2. Confirm feature maturity assumptions (stable vs experimental) still hold.
3. Validate AGENTS layering behavior and instruction precedence assumptions.
4. Validate automation/worktree path and sandbox assumptions.
5. Record resulting changes in this repo's docs if contract changed.

## Triggered Follow-ups

Update these files when drift is found:

- `docs/execution-contract.md`
- `README.md`
- `CONTRIBUTING.md`
- `.codex/verify.commands`
- CI workflows under `.github/workflows/`
