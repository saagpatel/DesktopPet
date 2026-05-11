# DesktopPEt — Portfolio Disposition

**Status:** Release frozen pending operator-only Apple signing setup.
Do not surface for routine review.

---

## Why this file exists

The portfolio operating system was surfacing DesktopPEt as an overdue
review item, but the repo is not stalled in any technically actionable
way — it is a clean release candidate waiting on a single external
input. This file gives the portfolio operating system an unambiguous
signal about how to treat the row so it stops cycling.

---

## Current state in one paragraph

DesktopPEt is at an **unsigned macOS release candidate** (commit
`d7fcfd3` on `main`, dated 2026-03-14). All canonical verify gates
pass, the unsigned `.app` and DMG build cleanly, packaged-app smoke
tests pass, release artifacts and checksums are generated, pack QA
report is captured. The only material blocker for shipping is **Apple
Developer ID signing + notarization credentials**, which is
operator-only work.

For the full detail, see (in this order):
- `docs/release-candidate-status.md`
- `docs/macos-signing-handoff.md`
- `docs/release-runbook.md`

This file does not duplicate those — it tells the portfolio operating
system what to do given those.

---

## Portfolio operating system instructions

| Aspect | Posture |
|---|---|
| Portfolio status | `Release Frozen` (not `Cold Storage`, not `Active`) |
| Review cadence | Suspend overdue counting |
| Next review trigger | When Apple signing credentials become available, or when the operator explicitly decides to ship unsigned (not currently planned) |
| Resurface conditions | (a) signing credentials configured in CI, or (b) operator decides to abandon ship and switch to `Cold Storage` with disposition `RC reached, ship abandoned` |

---

## What "release frozen" means here (vs other dispositions)

- **Active** — wrong. There is no productive code work to do; pushing
  more features without signing first just compounds the unsigned-RC
  backlog.
- **Cold Storage** — wrong. The product is finished, tested, and
  packaged. Calling it "cold" misrepresents the state.
- **Archived / Wind-down** — wrong. The author has not decided to
  stop; only the credentialing work is paused.
- **Release Frozen** — correct. The artifact exists; only the gate
  between artifact and distribution is held by an external dependency.

The distinction matters because portfolio reviews should treat these
differently. Active projects get attention. Cold projects get
ignored. Frozen projects get *neither* — they sit until the unblocking
condition flips, then move quickly.

---

## Unblock trigger (operator)

When the operator is ready to ship, the work is mechanical and lives
in `docs/macos-signing-handoff.md`. Summarized:

1. Obtain Developer ID Application certificate; export to base64.
2. Set up notarization credentials (Apple ID + app-specific password,
   or API key).
3. Wire CI secrets per the handoff checklist.
4. Set `REQUIRE_MACOS_SIGNING=1` and `REQUIRE_MACOS_NOTARIZATION=1`.
5. Run one signed/notarized build; verify the DMG.
6. Cut a public release.

Estimated operator time once credentials are in hand: ~2 hours including a fresh notarization round-trip.

---

## Reactivation procedure (for the next code session)

When portfolio operating system flips this row to `Active`:

1. Delete the abandoned `codex/*` WIP branches that accumulated during
   the freeze — they don't reflect the shipping artifact.
2. Re-verify on current toolchain: `npm install && npm run
   verify:required && npm run verify:required:tauri`.
3. Re-run the packaged-app smoke checks listed in
   `release-candidate-status.md`.
4. Only then proceed to signing — do not assume the 2026-03-14 build
   evidence is still valid after a long pause.

---

## Last known reference

| Field | Value |
|---|---|
| Last commit on `main` | `d7fcfd3` docs(release): add pre-signing handoff |
| Date | 2026-03-14 |
| Build verification status | green |
| Smoke test status | green |
| Blocker | Apple signing + notarization (operator-only) |
| Local WIP branches | several `codex/*` branches, not reflected in shipping artifact, safe to delete on reactivation |
