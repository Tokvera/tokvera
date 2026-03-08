# Roadmap

## Phase 1: Observability SDK

- Ship baseline JS and Python SDKs
- Capture per-request token, model, and cost metadata
- Define stable event schema and ingestion contract

## Phase 2: Streaming & Advanced Metrics

- Add streaming ingestion pipeline
- Support near-real-time cost aggregation
- Introduce tenant, feature, and endpoint-level breakdowns
- Add self-serve onboarding: signup/login, project CRUD, API key provisioning
- Add first-event onboarding wizard with SDK setup snippets and live verification
- Add baseline trace context support (`trace_id`, `span_id`, `parent_span_id`)
- Add Action Center v1 (cost spikes, noisy workflows, abnormal customer spend, repeated trace failures, monthly overrun projection, routing opportunities)

## Phase 2.25: Canonical Telemetry Foundation

- Freeze canonical telemetry schema v1
- Finalize event envelope v1
- Normalize provider usage fields across OpenAI/Anthropic/Gemini
- Freeze trace/run/span conventions (`trace_id`, `run_id`, `span_id`, `parent_span_id`)
- Standardize feature and customer tags
- Add schema compatibility tests for JS/Python SDKs in CI

## Phase 2.5: Tracing Beta

- Add run/span schema on shared event foundation
- Add trace list + trace detail explorer in dashboard
- Attribute latency/error/cost to each span step
- Add trace quality indicators (slow spans, failures, retry loops)

## Cross-Phase: Opinionated Integrations (starts in Phase 2)

- OpenAI-compatible wrapper
- Vercel AI SDK helper
- LangChain callback integration
- LlamaIndex integration
- FastAPI and Express middleware
- Background job instrumentation helpers
- Milestone status: `M3.8` completed on March 8, 2026

## Phase 3: Budget Alerts & Anomaly Detection

- Configure budgets by project, tenant, and environment
- Add threshold and trend-based alerting
- Detect anomalous usage and cost spikes

## Phase 4: AI Gateway Mode

- Route requests through a managed gateway layer
- Enforce policy controls and usage limits
- Add provider fallback and model routing primitives

## Phase 5: Optimization & Control Plane

- Recommend cost-performance optimizations
- Provide centralized policy and spend controls
- Expose control plane APIs for automation

## Data Retention Strategy (v1)

- Raw event retention policy
- Trace retention policy
- Aggregate retention policy
- Cold storage/archive policy
- Enterprise custom retention windows

## Evaluation Signals Roadmap

- User feedback events
- Fallback markers
- Retry reason markers
- Response quality labels
- Success/failure linkage
- Cost-to-quality ratio views
