# Cortex Content Pipeline Plan (ComfyUI-first) — 2026-03-07

## Scope
Conditional follow-on after Cortex lane is testable: define practical architecture for content generation pipeline centered on ComfyUI, with Cortex orchestrating planning + execution.

## Phased plan

### Phase 0 — MVP (tomorrow-startable)
1. **Objective contract**
   - Input: user prompt + style controls + output count.
   - Output: artifact list (image paths/URLs), run metadata, and normalized execution trace.
2. **Cortex tool lane integration**
   - Add one tool contract: `content.generate_image`.
   - Cortex plan step shape: `validate_request -> build_comfy_workflow -> submit_job -> await_result -> summarize`.
3. **ComfyUI adapter shim**
   - HTTP wrapper around ComfyUI prompt API + history polling.
   - Normalize statuses (`queued|running|done|failed`) and errors.
4. **Artifact persistence**
   - Store metadata JSON + output image references under `artifacts/content/<run-id>/`.

### Phase 1 — Reliability hardening
1. Deterministic retry policy (idempotency key + bounded retries on transient failures).
2. Timeout budgets and cancellation support per generation run.
3. Input/schema validation + safe default workflow fallback.
4. Snapshot tests for adapter normalization and Cortex planning traces.

### Phase 2 — Quality + scaling
1. Multi-model/workflow profiles (fast draft vs quality render).
2. Queue controls + concurrent-run limits.
3. Optional post-processing lane (upscale/face-fix/background removal).
4. Cost/perf telemetry for tuning.

## Tool/integration options

### Primary path
- **ComfyUI HTTP API** (prompt submission + queue/history polling)
- Local adapter module in `services/` for normalized contract
- Cortex dispatch via existing tool-call path (`executeSlashTool`)

### Alternate path (fallback)
- Direct script runner (`python`/CLI bridge) for offline or non-HTTP environments
- Same normalized adapter output contract to keep Cortex stable

## Risks and unknowns
1. **Workflow drift risk**: ComfyUI node graph updates can break expected inputs.
2. **Model availability risk**: required checkpoints/VAEs may be missing on target host.
3. **Latency variance**: generation times can be highly non-deterministic across hardware.
4. **Artifact storage policy**: retention and cleanup rules are not finalized.
5. **Safety/policy surface**: prompt moderation and content filtering policy needs explicit definition.

## Concrete next tasks (tomorrow)
1. Define `content.generate_image` request/response schema (v1 JSON contract).
2. Implement minimal ComfyUI adapter with mocked tests (submit + poll + normalize).
3. Wire adapter into Cortex tool dispatch path behind a feature flag.
4. Add one endpoint smoke test proving `converse -> plan -> content.generate_image dispatch`.
5. Add runbook section for local ComfyUI validation command + artifact verification.

## Proposed v1 architecture slice (implementation-ready)
- **Entry:** Cortex tool dispatch (`tool_call` intent) -> `content.generate_image`
- **Planner contract:**
  - `validate_request`
  - `resolve_profile` (workflow + model profile)
  - `submit_comfy_job`
  - `poll_comfy_job`
  - `finalize_artifacts`
- **Adapter contract (normalized):**
  - Input: `{ runId, prompt, negativePrompt?, width?, height?, seed?, count?, profile? }`
  - Output: `{ ok, status, artifacts[], timings, providerMeta, error?, code? }`
- **Determinism guardrails:**
  - Idempotency key = hash(runId + normalized input)
  - Retry only transient transport/status failures (`dispatch_timeout`, HTTP 502/503, polling timeout)
  - Finalization always sets one terminal status (`done|failed`) + completion timestamp

## Tonight prep / quick triage hooks
1. Add feature flag name now: `CARAPACE_CORTEX_CONTENT_PIPELINE_V1=1` (no-op until wiring lands).
2. Pre-create artifact path convention: `artifacts/content/<runId>/` with `result.json` + generated files.
3. Capture minimum diagnostics on failure:
   - adapter `code` + `error`
   - last polled ComfyUI status payload
   - retry count / timeout budget consumed
4. Keep one manual smoke command template in runbook so operators can isolate adapter vs planner failures quickly.
