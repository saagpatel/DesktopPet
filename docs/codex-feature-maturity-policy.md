# Codex Feature Maturity Policy

This repository defaults to stable Codex capabilities for autonomous execution.

## Default Policy

- Stable features: allowed by default.
- Beta features: allowed only with explicit task-level reason.
- Experimental features: disabled by default for delivery-critical paths.

## Practical Rules

1. Required-check and release workflows must not depend on experimental features.
2. Experimental features may be used for read-only discovery lanes.
3. If an experimental feature is used, document fallback commands in the same change.
4. If behavior changes are detected, update execution docs before continuing autonomous runs.

## Ownership

Execution owner reviews this policy during weekly docs drift checks.
