# Phase 1 Execution Board (4 Weeks)

## Scope

This board operationalizes Phase 1 (Observability SDK) into concrete deliverables across:
- `tokvera-js`
- `tokvera-python`
- `tokvera-api`

Phase 1 success criteria:
- JS SDK and Python SDK reach stable baseline.
- Shared ingestion contract is versioned and enforced.
- Ingestion API accepts production-like traffic reliably.
- First dashboard-ready aggregates are available.

## Milestones

- M1: SDK API freeze + stable event schema (`end of week 1`)
- M2: End-to-end ingest from both SDKs into API (`end of week 2`)
- M3: Reliability hardening + observability (`end of week 3`)
- M4: Design partner pilot readiness (`end of week 4`)

## Week-by-Week Plan

## Week 1: Contract Freeze and Baseline Stability

Goals:
- Freeze minimal public SDK APIs.
- Define one canonical event contract.
- Stand up validation path in `tokvera-api`.

Issue list:

### tokvera-js
- `[JS-001]` Freeze minimal SDK API (`init`, wrapper entrypoint, tag setters, `flush`, `shutdown`).
- `[JS-002]` Add TypeScript public types for event payload + config.
- `[JS-003]` Add contract unit tests for payload shape and required fields.

### tokvera-python
- `[PY-001]` Freeze minimal SDK API (`init`, wrapper entrypoint, tag setters, `flush`, `shutdown`).
- `[PY-002]` Add typed models/dataclasses for event payload + config.
- `[PY-003]` Add contract unit tests for payload shape and required fields.

### tokvera-api
- `[API-001]` Create `POST /v1/events` endpoint with API key authentication.
- `[API-002]` Add request schema validation with explicit error codes/messages.
- `[API-003]` Add schema version gate (`schema_version`) and rejection rules.

Acceptance checks:
- Both SDKs generate matching payloads for common request scenarios.
- API validates and stores/rejects events deterministically.
- Contract documentation exists and is linked from all three repos.

## Week 2: Ingestion Reliability and Queue Path

Goals:
- Move from simple submit to resilient ingest behavior.
- Ensure retries, batching, and backpressure paths are safe.

Issue list:

### tokvera-js
- `[JS-004]` Implement bounded batching queue with flush interval + max batch size.
- `[JS-005]` Add retry policy with exponential backoff and jitter.
- `[JS-006]` Add process lifecycle safety (`beforeExit`/`SIGTERM`) to flush queued telemetry.

### tokvera-python
- `[PY-004]` Implement bounded batching queue with flush interval + max batch size.
- `[PY-005]` Add retry policy with exponential backoff and jitter.
- `[PY-006]` Add process lifecycle safety (`atexit`/signal handling) to flush queued telemetry.

### tokvera-api
- `[API-004]` Persist raw accepted events (append-only table/bucket).
- `[API-005]` Add queue fanout for accepted events.
- `[API-006]` Add idempotency key support for at-least-once SDK delivery.

Acceptance checks:
- Simulated transient API failures do not lose events beyond configured queue limits.
- API fanout receives and acknowledges validated events.
- Duplicate sends are deduplicated or safely tolerated.

## Week 3: Hardening, Metrics, and Developer Experience

Goals:
- Make SDK behavior predictable under stress.
- Expose ingestion service-level telemetry.
- Reduce integration friction.

Issue list:

### tokvera-js
- `[JS-007]` Add stress tests for queue overflow policy and flush latency.
- `[JS-008]` Add lightweight middleware/hooks for feature/customer tagging defaults.
- `[JS-009]` Publish complete quickstart docs with copy-paste examples.

### tokvera-python
- `[PY-007]` Add stress tests for queue overflow policy and flush latency.
- `[PY-008]` Add lightweight middleware/hooks for feature/customer tagging defaults.
- `[PY-009]` Publish complete quickstart docs with copy-paste examples.

### tokvera-api
- `[API-007]` Add ingestion metrics: accepted, rejected, auth failures, p95 latency.
- `[API-008]` Add per-tenant rate limits and quota guardrails.
- `[API-009]` Add runbook for common ingest failures (invalid schema, auth, throttling).

Acceptance checks:
- SDK install-to-first-event path is under 10 minutes (fresh project).
- API has dashboard-ready ingestion KPIs.
- Error responses are actionable and documented.

## Week 4: Pilot Readiness and Release Discipline

Goals:
- Prepare stable releases.
- Validate end-to-end with real usage patterns.
- Lock a support and feedback loop for first users.

Issue list:

### tokvera-js
- `[JS-010]` Cut `v0.1.0` release candidate and changelog.
- `[JS-011]` Add CI matrix for supported Node runtimes.
- `[JS-012]` Create migration notes for pre-stable adopters.

### tokvera-python
- `[PY-010]` Cut `v0.1.0` release candidate and changelog.
- `[PY-011]` Add CI matrix for supported Python runtimes.
- `[PY-012]` Create migration notes for pre-stable adopters.

### tokvera-api
- `[API-010]` Add staging env smoke tests for ingest endpoint and queue path.
- `[API-011]` Add API key management baseline (create/revoke/rotate).
- `[API-012]` Publish API usage guide + example curl payloads.

Acceptance checks:
- End-to-end path (`SDK -> API -> queue -> storage`) passes smoke tests.
- Stable RCs for JS and Python are published internally.
- Design partner onboarding checklist is complete.

## Cross-Repo Backlog (Create in Week 1)

- `[X-001]` Canonical event schema file and versioning policy.
- `[X-002]` Shared conformance test vectors used by JS and Python.
- `[X-003]` Data privacy defaults checklist (PII minimization, explicit opt-in fields).
- `[X-004]` SLO draft for ingestion service (`availability`, `p95 latency`, `data loss tolerance`).
- `[X-005]` Incident response checklist for telemetry pipeline failures.

## Definition of Done (Phase 1)

- JS and Python SDKs:
  - Stable minimal API documented and tested.
  - Queue, retry, flush, shutdown semantics verified.
  - Quickstart and migration docs available.
- API:
  - Auth + schema validation + rate limits enabled.
  - Raw storage + queue fanout functioning.
  - Operational metrics and runbook in place.
- Product readiness:
  - At least 3 design partners can instrument and send production-like traffic.
  - Dashboard can consume aggregated spend/tokens/latency/errors from pipeline outputs.

## Suggested GitHub Project Columns

- Backlog
- Ready
- In Progress
- In Review
- Done
- Blocked

## Suggested Labels

- `repo:tokvera-js`
- `repo:tokvera-python`
- `repo:tokvera-api`
- `phase:phase-1`
- `type:backend`
- `type:sdk`
- `type:docs`
- `priority:p0`
- `priority:p1`
