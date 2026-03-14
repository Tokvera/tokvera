# Tokvera

Tokvera is the AI Cost and Trace Intelligence control plane for SaaS.

This repository is the public coordination and documentation entry point for the Tokvera platform.

## What Is Shipped

- JavaScript SDK (`@tokvera/sdk`) and Python SDK (`tokvera`) with OpenAI, Anthropic, and Gemini tracking
- Canonical telemetry schema support (event envelope v1 and v2)
- Trace context + evaluation signal capture for cost and quality analysis
- Integration expansion coverage across web frameworks, job workers, and agent stacks
- Billing and entitlement model with project-level controls

## Repositories

- `tokvera`: public roadmap, docs links, examples, execution checklist
- `tokvera-js`: JavaScript SDK
- `tokvera-python`: Python SDK
- `tokvera-api`: ingestion, auth, billing, traces, integrations API
- `tokvera-dashboard`: app + docs + onboarding UX
- `tokvera-analytics-engine`: async aggregation, budgets, anomalies

## SDKs

- JavaScript: `https://www.npmjs.com/package/@tokvera/sdk`
- Python: `https://pypi.org/project/tokvera/`

## Examples

- `examples/node`
- `examples/python`
- `test/sdk-examples` (smoke and production-gate helpers)

These include trace context, evaluation signals, and framework integration patterns.
They also now demonstrate lifecycle-enabled live tracing so runs can appear immediately in
`/dashboard/traces/live` while calls are still in progress.

## Strategy Docs

- Product roadmap: `ROADMAP.md`
- 12-month execution checklist: `EXECUTION_TODO.md`

## Product Links

- App and docs: `https://tokvera.org`
- API base: `https://api.tokvera.org`
