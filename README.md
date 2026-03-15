# Tokvera

Tokvera is the AI Cost and Trace Intelligence control plane for SaaS.

This repository is the public coordination and documentation entry point for the Tokvera platform.

## What Is Shipped

- JavaScript SDK (`@tokvera/sdk`) and Python SDK (`tokvera`) with OpenAI, Anthropic, Gemini, and Mistral tracking
- Canonical telemetry schema support (event envelope v1 and v2)
- Trace context + evaluation signal capture for cost and quality analysis
- Manual tracing substrate for existing apps, custom routers, and mixed-provider orchestration
- Integration expansion coverage across web frameworks, job workers, agent/runtime helpers, and OpenTelemetry bridge flows
- Billing and entitlement model with project-level controls

## Repositories

- `tokvera`: public roadmap, docs links, examples, execution checklist
- `tokvera-js`: JavaScript SDK
- `tokvera-python`: Python SDK
- `tokvera-go`: Go SDK
- `tokvera-api`: ingestion, auth, billing, traces, integrations API
- `tokvera-dashboard`: app + docs + onboarding UX
- `tokvera-analytics-engine`: async aggregation, budgets, anomalies

## SDKs

- JavaScript: `https://www.npmjs.com/package/@tokvera/sdk`
- Python: `https://pypi.org/project/tokvera/`
- Go: `tokvera-go` Wave 1 SDK with manual tracing, provider wrappers, OTel bridge, and live traces compatibility

## Examples

- `examples/node`
- `examples/python`
- `examples/templates` (copy-ready starter packs + live-trace checklists)
- `test/sdk-examples` (smoke and production-gate helpers)
- `test/generate-activation-report.mjs` (weekly paid-tenant and activation gate report)
- `test/generate-weekly-ops-review.mjs` (weekly billing reliability + operating-window review)

These include trace context, evaluation signals, and framework integration patterns.
They also now demonstrate lifecycle-enabled live tracing so runs can appear immediately in
`/dashboard/traces/live` while calls are still in progress.

Starter templates currently include:

- Node existing app starter
- Python existing app starter
- Node multi-model router starter

Each starter links to a shared `verify in live traces` checklist before rollout.

## Strategy Docs

- Product roadmap: `ROADMAP.md`
- 12-month execution checklist: `EXECUTION_TODO.md`
- Release evidence manifests: `release-evidence/`

## Product Links

- App and docs: `https://tokvera.org`
- API base: `https://api.tokvera.org`

## Current Strategic Gate

Tokvera is explicitly deferring gateway implementation until the platform reaches:
- **20 active paid tenants**
- stable billing, usage, and live tracing operations
- verified integration compatibility and docs quality gates

The current focus is product-led adoption for SaaS app teams:
- easier onboarding and API key setup
- stronger existing-app and multi-model tracing flows
- broader docs, blog, and comparison content
- phased new SDK waves: Go, then Java + .NET, then PHP + Rust

The current Go wave is now qualified for Wave 1:
- `tokvera-go` passes CI and local Go validation
- canonical contract verification passes
- Go lifecycle rows and trace detail visibility pass in the dashboard
- smoke, soak, and production visibility checks pass with Go examples included

## Operating Reports

Run the paid-tenant activation report against production or staging:

```bash
set TOKVERA_API_BASE_URL=https://api.tokvera.org
set TOKVERA_ADMIN_TOKEN=...
node test/generate-activation-report.mjs
```

This writes JSON and Markdown artifacts under `test/artifacts/` and tracks the current
pre-gateway funnel:
- `active_paid_tenants_30d`
- tenants with first event
- tenants that opened live traces with real rows
- tenants that reached a real trace-debugging session

Run the weekly ops review against production or staging:

```bash
set TOKVERA_API_BASE_URL=https://api.tokvera.org
set TOKVERA_ADMIN_TOKEN=...
set TOKVERA_TEST_EMAIL=verified-user@example.com
set TOKVERA_TEST_PASSWORD=...
node test/generate-weekly-ops-review.mjs
```

This writes JSON and Markdown artifacts under `test/artifacts/` and combines:

- active paid tenant gate status
- billing health and webhook reliability
- 7-day operating-window evidence
- target-tenant activation review flags

## Release Rule Enforcement

Checklist items in `EXECUTION_TODO.md` are only considered done when the change set includes
release evidence for:

- code
- tests
- docs
- example
- smoke or visibility validation

The coordination repo enforces that with:

- `test/check-release-evidence.mjs`
- `test/check-release-evidence.test.mjs`
- `.github/workflows/release-evidence.yml`

Use `release-evidence/YYYY-MM-DD-short-slug.json` to record the proof for each completed item.
