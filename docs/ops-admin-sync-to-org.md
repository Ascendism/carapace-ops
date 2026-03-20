# Ops Admin: Single-Click "Sync to Org" (Scaffold)

Date: 2026-03-19  
Owner: carapace-ops  
Status: Draft v1 (implementation scaffold; aligned to Windows-first release MVP)

## Goal

Provide a safe backend/UI contract for a future one-click admin action that syncs the current branch to the `org` remote:

`git push org <branch>:<branch>`

This is intended for non-technical operators, so it must be explicit, reversible in understanding, and fail fast with plain-language guidance.

## Release/Update Mode Policy Alignment

To match the single-click release contract:
- **MVP default is Windows-only release lane** (`target: "win"`).
- **Multi-OS release remains deferred** and hidden behind a future Advanced toggle.
- Operator run order for release/update remains: **dry run → release readiness → Windows release**.

Reference: `docs/ops-admin-single-click-release-plan.md`.

## Current Migration Context (private -> org)

- Current private source path: `Ascendism/*`
- Org target path: `CarapaceUDE/*`
- Expected behavior during transition: occasional `fetch first` push rejection if org remote has newer commits.

When that happens, do **not** force-push by default. Reconcile remote history first, then retry sync.

## UX Flow (Operator-Facing)

### 1) Entry Point
- Button label: **Sync to Org**
- Helper text: "Checks branch + remote safety first, then syncs this branch to org."

### 2) Confirmation Modal
Title: **Confirm branch sync to org**

Body summary:
- "You are about to sync this branch to the organization remote."
- "If any safety check fails, no push is performed."

Display values (read-only):
- Branch: `<branch>`
- Source remote (context): `origin`
- Target remote: `org`
- Push refspec: `<branch>:<branch>`

Options:
- [ ] Dry run only (recommended)
- [ ] Allow dirty working tree (advanced)

Primary CTA:
- **Run Sync** (or **Run Dry Run**)

Secondary CTA:
- Cancel

### 3) Live Run Status
Steps shown in order:
1. Resolve branch
2. Verify remotes
3. Verify remote reachability
4. Verify working tree cleanliness
5. Push to org

Each step status: `pending | running | passed | failed`.

### 4) Completion
On success:
- "Branch synced to org successfully."
- Show branch, remote, refspec, dry-run state, and elapsed time.

On failure:
- Show failed step + plain-language reason.
- Show suggested retry command.

---

## Confirmation Copy (Exact Suggested UI Text)

Use this copy directly:

- "This action syncs the selected branch to the organization remote (`org`)."
- "Safety checks run first. If a check fails, nothing is pushed."
- "Dry run validates push behavior without changing the remote branch."
- "Allow dirty working tree should only be used for advanced troubleshooting."

Failure helper copy:
- "No changes were pushed because a safety check failed."
- "Fix the issue below, then retry."

---

## API Contract

### POST `/api/admin/sync-to-org/run`

Request:

```json
{
  "dryRun": true,
  "allowDirty": false,
  "branch": "main"
}
```

Rules:
- `dryRun` optional, default `false`
- `allowDirty` optional, default `false`
- `branch` optional; when omitted backend resolves current branch and rejects detached HEAD

Success response:

```json
{
  "ok": true,
  "runId": "sync_20260319_182800_ab12",
  "status": "passed",
  "mode": "dry-run",
  "result": {
    "branch": "main",
    "remote": "org",
    "refspec": "main:main",
    "allowDirty": false,
    "dryRun": true,
    "durationMs": 842
  }
}
```

Failure response:

```json
{
  "ok": false,
  "runId": "sync_20260319_182800_ab12",
  "status": "failed",
  "failedStep": "verify-remotes",
  "message": "Missing required remote 'org'.",
  "hint": "Run: git remote add org <org-repo-url>",
  "result": {
    "branch": "main",
    "dryRun": true,
    "allowDirty": false
  }
}
```

### GET `/api/admin/sync-to-org/run/:runId`

Returns latest status for polling or refresh-safe UI restores.

---

## Run Status Schema

```json
{
  "runId": "string",
  "ok": true,
  "status": "pending|running|passed|failed",
  "mode": "dry-run|live",
  "startedAt": "ISO-8601",
  "finishedAt": "ISO-8601|null",
  "durationMs": 0,
  "input": {
    "branch": "string|null",
    "dryRun": false,
    "allowDirty": false
  },
  "resolved": {
    "branch": "string",
    "refspec": "string",
    "remote": "org"
  },
  "steps": [
    {
      "id": "resolve-branch|verify-remotes|verify-remote-reachability|verify-clean-tree|push-org",
      "status": "pending|running|passed|failed",
      "startedAt": "ISO-8601|null",
      "finishedAt": "ISO-8601|null",
      "message": "string|null"
    }
  ],
  "failedStep": "string|null",
  "message": "string|null",
  "hint": "string|null"
}
```

---

## Backend Runner Contract

Reference implementation scaffold is in:
- `scripts/sync-to-org-runner.js`

CLI usage:
- `node scripts/sync-to-org-runner.js --dry-run`
- `node scripts/sync-to-org-runner.js --branch main`
- `node scripts/sync-to-org-runner.js --allow-dirty --dry-run`

Behavior requirements:
- Fail fast on first preflight failure
- Machine-readable JSON output to stdout
- Human-readable failure message + hint fields in JSON

---

## Failure Messages (Operator-Friendly)

1. **Not on a branch / detached HEAD**
   - Message: "Cannot sync because this repository is not currently on a named branch."
   - Hint: "Checkout a branch, then retry. Example: git checkout main"

2. **Branch does not exist locally**
   - Message: "Selected branch does not exist in this local repository."
   - Hint: "Use an existing branch or create it before syncing."

3. **Missing remote `org`**
   - Message: "Cannot sync because required remote 'org' is not configured."
   - Hint: "Run: git remote add org <org-repo-url>"

4. **Missing remote `origin`**
   - Message: "Cannot sync because expected remote 'origin' is not configured."
   - Hint: "Run: git remote add origin <repo-url>"

5. **Remote unreachable**
   - Message: "Cannot reach one or more required remotes right now."
   - Hint: "Check network/auth access, then retry."

6. **Dirty working tree (when allowDirty=false)**
   - Message: "Working tree has uncommitted changes; sync blocked for safety."
   - Hint: "Commit/stash changes, or retry with allow-dirty if explicitly intended."

7. **Push rejected / failed**
   - Message: "Push to org failed. No local data was removed."
   - Hint: "Review remote permissions/branch protections, then retry."

---

## Fallback for package scripts

This repository currently has no top-level `package.json`. Until one exists, invoke the runner directly:

- `node scripts/sync-to-org-runner.js`
- `node scripts/sync-to-org-runner.js --dry-run`
