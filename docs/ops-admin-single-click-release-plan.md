# Ops Admin: Single-Click Release & Update (Dummy-Proof Plan)

Date: 2026-03-19
Owner: carapace-ops
Status: Draft v1 (implementation-ready, Windows-first MVP)

## Goal

Make release/update operation in `ops.carapaceai.org` a **single button + confirmation dialog** that is safe for first-time maintainers.

**Mode policy (required):**
- **MVP mode (default): Windows build lane only** (`target: "win"`).
- **Multi-OS mode is deferred** and must stay hidden behind a future **Advanced** toggle.

The button should:
1. run guardrails first,
2. perform release only if all prechecks pass,
3. return a plain-English result card with next steps.

## Design Principles

1. **No hidden magic**: every major step shown in UI.
2. **Fail closed**: any failed check blocks release.
3. **No partial release**: all-or-nothing flow.
4. **Plain language**: avoid Git jargon in operator-facing copy.
5. **Recovery-first**: always show rollback/help links.

## User Flow (UI)

### A) Entry
Button label: **Release & Update**

Subtext: "Runs safety checks, then creates the next release if all checks pass."

### B) Confirmation Dialog
Title: **Confirm release run**

Checklist (must acknowledge):
- I understand this will attempt a release if checks pass.
- I confirmed this is the branch I want to release from.
- I confirmed CI is healthy for this branch.

Optional toggles:
- [ ] Dry run only (recommended first)
- [ ] Allow dirty working tree (advanced; off by default)
- [ ] Skip push (advanced; off by default)

Target selection:
- **Default/fixed in MVP:** Windows (`win`) only.
- **Advanced (future):** expose multi-OS targets only after MVP hardening.

Primary CTA:
- **Run Release** (or **Run Dry-Run**) 

### C) Live Progress Panel
Show step-by-step statuses:
1. Release metadata check
2. Updater contract check (offline)
3. Release dry-run plan
4. Release ship (real run only)

Each step can be: Pending / Running / Passed / Failed.

### D) Completion Card
On success show:
- version
- tag
- branch
- commit SHA
- pushed (yes/no)
- links: GitHub tag, workflow run, rollback guide

On failure show:
- failed step
- reason (plain language)
- exact retry instruction (single command)

## API Contract (ops backend)

## POST `/api/admin/release/run`

Request body:
```json
{
  "dryRun": true,
  "allowDirty": false,
  "noPush": false,
  "bump": "patch",
  "target": "win"
}
```

Response (stream or polled status):
```json
{
  "ok": true,
  "runId": "rel_20260319_181500_ab12",
  "mode": "dry-run",
  "steps": [
    { "id": "verify-release-metadata", "status": "passed" },
    { "id": "verify-update-flow-offline", "status": "passed" },
    { "id": "release-ship-dry", "status": "passed" }
  ],
  "summary": {
    "nextVersion": "1.2.5",
    "tag": "v1.2.5",
    "branch": "main",
    "pushTarget": "origin/main"
  }
}
```

## GET `/api/admin/release/run/:runId`
Returns latest run progress/results for polling-based UI.

## Operator Run Sequence (required)

Run in this exact order:
1. **Dry run**
   - `npm run verify:release-readiness`
2. **Release readiness check** (explicit rerun before live ship)
   - `npm run verify:release-readiness`
3. **Windows release (live)**
   - `npm run release:ship -- --bump <x> --target win`

## Backend Execution Mapping

- Dry-run path:
  - `npm run verify:release-readiness`

- Real run path (MVP):
  1. `npm run verify:release-readiness`
  2. `npm run release:ship -- --bump <x> --target win`

Recommended: execute in a controlled worker process with timeout + line-buffered logs.

## Canonical Repo Routing (important)

Use the correct repo for each action:

- **Carapace app release/build/updater behavior** → `carapace` repo (`profiles` branch while in active development).
- **ops.carapaceai.org admin button/API docs and ops orchestration** → `carapace-ops` repo.

Do not mix implementation locations:
- If it changes app release/update scripts, it belongs in `carapace`.
- If it changes admin UI flow/contracts/runbooks, it belongs in `carapace-ops`.

## Idiot-Proof Operator Path (Windows-first MVP)

This is the tested sequence to run from the **carapace app repo** before/during release:

1. `npm run release:test:win`
   - Runs release-readiness in allow-dirty mode for active dev workspaces.
2. `npm run release:ship:dry:dirty`
   - Produces dry-run release plan (no tag/push mutation).
3. Optional remote sync preflight:
   - `node scripts/push-dual-remotes.js --dry-run --allow-dirty`
4. Live release (Windows target only for MVP):
   - `npm run release:ship -- --bump patch --target win`

Policy:
- `npm run build:win` is the MVP build lane.
- `build:all` remains deferred until post-MVP multi-OS hardening.

## How auto-update works (general)

Carapace updater is runtime-mode aware:

1. **Dev mode**
   - Checks Git divergence against upstream.
   - Apply path can pull/rebuild when safety conditions pass.

2. **Installed mode**
   - Checks external updater endpoint (`/updates/check`) with updater token.
   - Apply is delegated to desktop updater flow (no in-process binary self-mutation).

3. **Docker mode**
   - Apply strategy is redeploy/handoff-oriented, not in-place file patching.
   - Apply is blocked unless Docker persistence preflight is explicitly confirmed.

## Safety Guardrails

1. **Branch allowlist**: default permit only `main` (and optionally `release/*`).
2. **Mutex lock**: one release run at a time.
3. **Timeouts**:
   - readiness checks: 10 min
   - release ship: 20 min
4. **Audit trail**:
   - who clicked
   - when
   - options used
   - final result
5. **Secret hygiene**:
   - no token output in logs
   - redact matching patterns

## Dummy-Proof Copy (UI)

Use these exact plain-language snippets:

- "This checks everything first. If any check fails, no release is made."
- "Dry run is safe: it plans the release without creating tags or pushing changes."
- "If this fails, copy the suggested retry command and run it exactly."

## Phased Implementation

### Phase 1 (fast)
- Add release run API endpoint (`dryRun` + `realRun`)
- Wire button + confirmation dialog
- Polling progress UI
- Success/failure summary card

### Phase 2 (hardening)
- Add run history table (last 20 runs)
- Add role/permission gate for release button
- Add one-click "copy retry command"

### Phase 3 (operator quality)
- Add webhook/Discord notification on completion
- Add release rollback assistant panel
- Add branch protection status preview in dialog

## Acceptance Criteria

1. New operator can execute dry-run release without CLI.
2. Real release is blocked on any precheck failure.
3. UI clearly explains what happened and what to do next.
4. No tags/releases are created in dry-run mode.
5. Every run is auditable via run history.

## Immediate Next Tasks

1. Implement `/api/admin/release/run` + `/api/admin/release/run/:id`.
2. Build confirmation modal + progress panel in admin UI.
3. Wire backend runner to `verify:release-readiness` + `release:ship`.
4. Add basic run history persistence (JSON file or DB table).
5. Add docs link in UI to this plan.
