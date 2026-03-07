# Tokvera Tracing Vision (M4.5 Beta)

## Why this exists

Cost observability shows where money was spent, but not why multi-step agent flows became expensive or unreliable.  
Tracing adds chain-level context so teams can optimize prompts, tools, retries, and routing decisions.

## Product split

Tokvera should expose two product pillars on one shared telemetry foundation:

1. Cost Intelligence
- Usage, spend, overage, budgets, hard caps, anomaly alerts.

2. Trace Intelligence
- Request chains, step-level spans, failure points, latency hotspots, and run quality.

## Architecture decision

Keep one ingest pipeline and one SDK instrumentation layer.

`SDK -> /v1/events -> queue -> analytics engine -> cost read model + trace read model`

Do not create separate cost/tracing SDKs or separate ingest APIs.

## Shared event envelope

Required envelope fields:

- `tenant_id`
- `project_id`
- `request_id`
- `trace_id`
- `span_id`
- `parent_span_id`
- `run_id`
- `timestamp`
- `provider`
- `model`
- `endpoint`
- `status`
- `latency_ms`
- `usage`
- `tags`

Event kinds:

- `usage`: model/tool request usage records
- `span_start`: begin of a logical step
- `span_end`: completion of a step
- `eval`: quality/evaluation result attached to a run/span
- `feedback`: human or automated feedback signal

## Initial API surface (beta)

- `GET /v1/traces`: list traces with filters and summary stats
- `GET /v1/traces/:traceId`: trace detail with span tree/timeline
- `GET /v1/traces/:traceId/spans`: flattened span list (optional optimization endpoint)

## Dashboard IA recommendation

Use grouped navigation (Google Analytics style) for faster scanning:

1. Overview
- `/dashboard`

2. Cost Intelligence
- `/dashboard/analytics`
- `/dashboard/billing`
- `/dashboard/budgets`
- `/dashboard/anomalies`
- `/dashboard/savings`

3. Trace Intelligence
- `/dashboard/traces`
- `/dashboard/error-heatmap`
- `/dashboard/model-comparison`

4. Workspace
- `/dashboard/projects`
- `/dashboard/api-keys`
- `/dashboard/settings`

## M4.5 beta scope (strict)

Must have:

1. Trace list and detail pages with project filters.
2. Span timeline with per-step latency, status, and token/cost attribution.
3. Links from high-cost/failed metrics to corresponding traces.
4. SDK option to enable tracing with low-overhead defaults.

Not in beta:

- Full LangSmith parity
- Prompt replay engine
- Advanced eval orchestration
- Cross-trace ML ranking

## Success metrics

1. 80% of failed requests can be inspected with full span chain context.
2. Top-10 expensive chains identified per project.
3. At least one optimization action per pilot tenant driven by trace evidence.
