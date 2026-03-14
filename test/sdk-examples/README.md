# SDK Example Test Folder

This folder contains smoke tests for both published Tokvera SDKs:

- JavaScript SDK from npm: `@tokvera/sdk`
- Python SDK from PyPI: `tokvera`

There are two runners:
- Local mock smoke (`run-smoke.mjs`): validates SDK emission to a local test server.
- Local integration soak (`run-integration-soak.mjs`): repeats the runtime-helper matrix against the local test server and verifies no duplicate `(trace_id, span_id, status)` emissions plus complete lifecycle pairs.
- Production smoke (`run-production-smoke.mjs`): validates deployed API + analytics metric increments.
- Runtime helper visibility (`run-runtime-helper-visibility.mjs`): emits existing-app/manual tracer, Mistral, OpenAI Agents, Claude Agent SDK, Google ADK, LangGraph, Instructor, PydanticAI, CrewAI, AutoGen, Mastra, Temporal, Pipecat, LiveKit, OpenAI-compatible gateway, and OTel bridge traces, then verifies overview/traces/live/detail/inspector/action-center visibility.
- First paying-user flow (`run-first-paying-user-flow.mjs`): validates login, project/key provisioning, SDK ingestion, metrics, and billing metering.

## Structure

- `mock-ingest-server.mjs`: local HTTP server for `POST /v1/events`
- `run-smoke.mjs`: orchestrates setup + example execution + verification
- `run-integration-soak.mjs`: repeats runtime helper execution and checks duplicate/lifecycle stability
- `run-production-smoke.mjs`: validates `health`, emits events, and checks feature breakdown increments
- `run-runtime-helper-visibility.mjs`: validates runtime helper visibility through dashboard-facing APIs
- `node-example/`: JavaScript SDK example app
- `python-example/`: Python SDK example app

## Run Local Mock Smoke

From this folder:

```bash
node run-smoke.mjs
```

Expected result:

- Node example sends `chat.completions.create` and `responses.create` events.
- Python example sends `chat.completions.create` and `responses.create` events.
- Node runtime helper example emits manual tracer, Mistral, OpenAI Agents, LangGraph, AutoGen, Mastra, Temporal, Pipecat, LiveKit, OpenAI-compatible gateway, and OTel bridge traces.
- Python runtime helper example emits manual tracer, Mistral, Claude Agent SDK, Google ADK, LangGraph, Instructor, PydanticAI, CrewAI, AutoGen, Mastra, Temporal, Pipecat, LiveKit, OpenAI-compatible gateway, and OTel bridge traces.
- Current SDK examples also emit lifecycle start events so `/dashboard/traces/live` can show in-progress rows before terminal success/failure lands.
- Both examples emit Trace Context v2 (`schema_version=2026-04-01`) with `trace_id`, `run_id`, `span_id`, `parent_span_id`, `step_name`.
- Both examples include v2 diagnostics fields: `span_kind`, `metrics`, `decision`, and `payload_blocks`.
- Final output confirms feature/provider/lifecycle coverage for the runtime helper matrix, not just a raw event count.

Python example notes:
- Uses a compatibility wrapper so smoke still runs with older published `tokvera` versions that do not yet accept every v2 keyword argument.
- Runtime helper smoke prefers a local sibling `../tokvera-python` checkout on `PYTHONPATH` when present so unreleased Python helper surfaces can still be verified before PyPI publish catches up.
- Runtime helper smoke also prefers a local sibling `../tokvera-js` checkout when present so unreleased JS helper surfaces can be verified before npm publish catches up.

## Run Local Integration Soak

From this folder:

```bash
node run-integration-soak.mjs
```

Optional:

```bash
export TOKVERA_SOAK_ROUNDS="2"
```

Expected result:

- Repeats the full runtime-helper matrix for Node and Python.
- Verifies there are no duplicate `(trace_id, span_id, status)` emissions.
- Verifies lifecycle pairs are complete (`in_progress -> success|failure`) for lifecycle-enabled spans.
- Allows success-only spans for OTel bridge coverage.

## Run Production Smoke

Required:

```bash
export TOKVERA_API_KEY="tkv_your_project_key"
```

Optional (defaults shown):

```bash
export TOKVERA_API_BASE_URL="https://api.tokvera.org"
export SMOKE_METRICS_TIMEOUT_SECONDS="90"
export SMOKE_METRICS_POLL_SECONDS="5"
```

Run:

```bash
node run-production-smoke.mjs
```

Expected result:

- `GET /health` returns success.
- Node and Python examples each emit 2 events to `/v1/events`.
- When using the current SDK releases, lifecycle start events also feed `/v1/traces/live` for realtime verification.
- `/v1/metrics/breakdown?group_by=feature` shows both generated smoke features incrementing.
- `/v1/traces` and `/v1/traces/:traceId` can be used to inspect emitted trace chains.

## Run Runtime Helper Visibility Gate

Required:

```bash
export TOKVERA_API_KEY="tkv_your_project_key"
```

Optional:

```bash
export TOKVERA_API_BASE_URL="https://api.tokvera.org"
export SMOKE_VISIBILITY_TIMEOUT_SECONDS="120"
export SMOKE_VISIBILITY_POLL_SECONDS="5"
```

Run:

```bash
node run-runtime-helper-visibility.mjs
```

Expected result:

- Emits runtime-helper traces for:
  - existing app / manual tracer
  - Mistral
  - OpenAI Agents SDK
  - Claude Agent SDK
  - Google ADK
  - LangGraph
  - Instructor
  - PydanticAI
  - CrewAI
  - AutoGen
  - Mastra
  - Temporal
  - Pipecat
  - LiveKit
  - OpenAI-compatible gateway
  - OTel bridge
- Verifies visibility through:
  - `/v1/metrics/overview`
  - `/v1/metrics/breakdown?group_by=feature`
  - `/v1/metrics/traces`
  - `/v1/traces/live`
  - `/v1/traces/:traceId`
  - `/v1/traces/:traceId/inspector`
  - `/v1/metrics/action-center`

Operational notes:

- This gate assumes the target project key belongs to a plan with Trace Explorer and Action Center entitlements.
- If a local sibling `../tokvera-python` checkout is present, the script uses it automatically so unreleased Python helper surfaces can still be validated.
- If a local sibling `../tokvera-js` checkout is present, the script builds and installs it into the node example so unreleased JS helper surfaces can still be validated.
- The runner uses a broad metrics window for overview/breakdown checks and a short current-run window for Action Center so global top-N ranking does not hide the newly emitted helper batch.

## Run First Paying-User Flow Smoke

Required:

```bash
export TOKVERA_SMOKE_EMAIL="verified-user@example.com"
export TOKVERA_SMOKE_PASSWORD="your-password"
```

Optional (defaults shown):

```bash
export TOKVERA_API_BASE_URL="https://api.tokvera.org"
export TOKVERA_SMOKE_TENANT_ID=""      # required only if user has multiple tenants
export TOKVERA_SMOKE_PROJECT_ID=""     # set to reuse an existing project
export TOKVERA_SMOKE_PROJECT_NAME="smoke-first-paying-user-<timestamp>"
export SMOKE_METRICS_TIMEOUT_SECONDS="90"
export SMOKE_METRICS_POLL_SECONDS="5"
export SMOKE_CLEANUP="0"               # set 1 to archive project created by script
```

Run:

```bash
node run-first-paying-user-flow.mjs
```

Expected result:

- Auth/login succeeds for a verified user.
- A target project is resolved (existing or newly created) and a project API key is provisioned.
- Node and Python SDK examples both emit events successfully.
- Billing metering for the project reflects request usage.
- Invoice preview endpoint returns current and projected month-end estimate.
