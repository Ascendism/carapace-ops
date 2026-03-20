# Update Note — 2026-03-19 — Sync to Org Scaffold

Added a practical scaffold for a future one-click **Sync to Org** admin action.

## Added

- `docs/ops-admin-sync-to-org.md`
  - UX flow for non-technical operators
  - confirmation copy
  - API contract (`POST/GET /api/admin/sync-to-org/run`)
  - run status schema
  - operator-friendly failure messages
- `scripts/sync-to-org-runner.js`
  - preflight checks (branch, remotes, reachability, clean tree)
  - supports `--dry-run`, `--allow-dirty`, `--branch`
  - executes/dry-runs `git push org <branch>:<branch>`
  - fail-fast with JSON output

## Policy Update (same-day)

Aligned admin release/update docs to a strict Windows-first contract:
- **MVP mode defaults to Windows build lane only** (`target: "win"`).
- **Multi-OS release is deferred** and should be hidden behind a future Advanced toggle.
- **Required operator run sequence:** dry run → release readiness → Windows release.

Updated references:
- `docs/ops-admin-single-click-release-plan.md`
- `docs/ops-admin-sync-to-org.md`

## Notes

- No top-level `package.json` exists in this repo, so npm script aliases (`sync:org`, `sync:org:dry`) were not added.
- Fallback command:
  - `node scripts/sync-to-org-runner.js`
  - `node scripts/sync-to-org-runner.js --dry-run`
