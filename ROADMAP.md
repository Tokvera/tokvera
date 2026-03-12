# Tokvera Roadmap

## Product Direction

Tokvera is a unified **Cost + Trace Intelligence** control plane.  
Execution priority before gateway: broaden integration coverage with strict quality gates so adoption compounds faster.

## Delivery Phases

### Phase 1: Observability SDK

- Ship baseline JS and Python SDKs
- Capture per-request token, model, and cost metadata
- Define stable event schema and ingestion contract

### Phase 2: Streaming & Advanced Metrics

- Add streaming ingestion pipeline
- Support near-real-time cost aggregation
- Introduce tenant, feature, and endpoint-level breakdowns
- Add self-serve onboarding: signup/login, project CRUD, API key provisioning
- Add first-event onboarding wizard with SDK setup snippets and live verification
- Add baseline trace context support (`trace_id`, `span_id`, `parent_span_id`)
- Add Action Center v1 (cost spikes, noisy workflows, abnormal customer spend, repeated trace failures, monthly overrun projection, routing opportunities)

### Phase 2.25: Canonical Telemetry Foundation

- Freeze canonical telemetry schema v1
- Finalize event envelope v1
- Normalize provider usage fields across OpenAI/Anthropic/Gemini
- Freeze trace/run/span conventions (`trace_id`, `run_id`, `span_id`, `parent_span_id`)
- Standardize feature and customer tags
- Add schema compatibility tests for JS/Python SDKs in CI

### Phase 2.5: Tracing Beta

- Add run/span schema on shared event foundation
- Add trace list + trace detail explorer in dashboard
- Attribute latency/error/cost to each span step
- Add trace quality indicators (slow spans, failures, retry loops)

### Phase 2.75: Integration Expansion (Jul 1, 2026 -> Aug 31, 2026)

Goal: broaden integration space before gateway to maximize real production adoption.

- Ship **12 official integrations** with CI-gated quality bar:
  - Express middleware
  - Next.js route handler + server action helper
  - NestJS interceptor/middleware
  - FastAPI middleware
  - Django middleware
  - Celery task instrumentation
  - BullMQ worker instrumentation
  - LangChain integration (JS + Python)
  - LlamaIndex integration (Python)
  - Vercel AI SDK helper
  - OpenTelemetry export integration
  - Outbound webhook integration
- Add API surfaces for project-scoped integration config and health:
  - `/v1/projects/:projectId/integrations`
  - `/v1/projects/:projectId/integrations/webhooks`
  - `/v1/projects/:projectId/integrations/otel`
  - `/v1/projects/:projectId/integrations/health`
- Expand docs integration matrix to `official | beta | planned` with language, examples, and test coverage status.
- Add integration qualification gates:
  - docs page
  - runnable example
  - integration tests
  - smoke visibility in overview/traces/action center
  - dashboard verification

### Phase 3: Gateway Alpha (M5)

- Stand up `tokvera-gateway` service
- Implement `/v1/chat/completions` proxy compatibility
- Implement `/v1/responses` proxy compatibility
- Policy engine v1 (cheap-first, allowlist, budget-aware escalation)
- Emit canonical telemetry from gateway path
- p95 proxy overhead target `<80ms` (non-streaming)

### Phase 4: Savings Demo (M6)

- Recommendation-only prompt compression suggestions
- Model downgrade recommendation engine
- Retry/dead-end loop savings recommendations
- Dashboard split: potential savings vs captured savings
- Confidence + quality-risk bands for recommendations

### Phase 5: Optimization & Growth

- Move from recommendation to controlled automation
- Expand tenant adoption and retention loops
- Reach M7 and M8 commercial targets

## Cross-Phase: Opinionated Integrations (started in Phase 2)

- OpenAI-compatible wrapper
- Vercel AI SDK helper
- LangChain callback integration
- LlamaIndex integration
- FastAPI and Express middleware
- Background job instrumentation helpers
- Milestone status: `M3.8` completed on March 8, 2026

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

## Milestone Date Commitments

- M4 First paying user: **by May 31, 2026**
- M4.4 Integration Platform v1 (12 official integrations): **by Aug 31, 2026**
- M4.5 Tracing beta completion: **by Jun 30, 2026**
- M4.6 Evaluation signals v1: **by Jun 30, 2026**
- M5 Gateway alpha: **by Oct 31, 2026**
- M6 Savings feature demo: **by Dec 15, 2026**
- M7 10 active SaaS users: **by Mar 31, 2027**
- M8 $10k MRR: **by Mar 31, 2027**
