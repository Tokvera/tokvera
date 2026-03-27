# Tokvera Execution TODO (Mar 11, 2026 -> Mar 31, 2027)

Last updated: 2026-03-16
Owner: product + engineering
Cadence: 2-week releases (API-first, dashboard follows API contracts)

## Documentation Discipline (Mandatory)

- For every completed TODO item that changes behavior, update documentation in the same delivery cycle.
- Documentation scope must match the change:
  - Dashboard/public UX change -> update `tokvera-dashboard` `/docs` pages (user-facing guide + API usage references where needed).
  - API contract/ops change -> update `tokvera-api/docs` (runbook, endpoint contracts, operational guides).
  - SDK contract/integration change -> update `tokvera-js`/`tokvera-python` README + examples (and `tokvera/test/sdk-examples` when relevant).
- "Done" means code + tests + docs together. No checklist item is complete with stale docs.

## Milestone Targets

- [ ] M4 First paying user by 2026-05-31
- [x] M4.4 Integration Platform v1 (12 official integrations) by 2026-08-31
- [ ] M4.5 Tracing beta completion by 2026-06-30
- [ ] M4.6 Evaluation signals v1 by 2026-06-30
- [ ] M4.8 Product-Led Adoption: 20 active paid tenants before gateway starts
- [ ] M5 Gateway alpha (strictly blocked until M4.8 is complete)
- [ ] M6 Savings demo by 2026-12-15
- [ ] M7 Sustain 20 active SaaS users with healthy activation and retention loops
- [ ] M8 $10k MRR by 2027-03-31

## Current Baseline (already in code)

- [x] JS and Python SDKs published
- [x] Billing plans + Paddle checkout + webhook idempotency
- [x] Trace explorer, trace detail, trace reason analytics endpoint
- [x] Action center and retention pipeline
- [x] Webhook ops/admin endpoints
- [x] Lifecycle billing emails wired

## Phase A (Monetization Hardening + M4) - Mar 11 to May 31, 2026

### API and Enforcement
- [x] Add `GET /v1/billing/entitlements`
- [x] Add `GET /v1/billing/health`
- [x] Complete 402 blocked-state contract audit on all ingest/mutation paths
- [x] Ensure hard-cap/retention/raw-capture limits are enforced server-side on all paths

### Billing Reliability
- [x] Webhook idempotency by Paddle `event_id`
- [x] Webhook health endpoint
- [x] Expose unresolved failed webhook totals in billing health + readiness checks
- [x] Webhook failure lifecycle alert emails
- [x] Add stale-processing alerting runbook execution checklist

### Smoke and Ops
- [x] Post-deploy smoke script validates checkout + ingest + traces + billing
- [x] Smoke extended to validate `billing/entitlements` and `billing/health`
- [x] Add weekly manual replay drill for webhook failure recovery
- [x] Add weekly automated M4 readiness workflow (billing health + sync consistency)
- [x] Add daily 7-day operating-window evidence report workflow (artifact + optional strict gate)
- [x] Operating-window report now gates webhook lifecycle health via `billing/health` (no admin token dependency)
- [x] Operating-window webhook freshness check made policy-driven (`M4_WINDOW_REQUIRE_WEBHOOK_FRESHNESS`)

### Dashboard
- [x] Billing page consumes summary/metering/invoice/retention
- [x] Billing page shows entitlements + billing health panels
- [x] Add explicit blocked-state UX (`402` contract mapping for user-friendly CTAs)
- [x] Add team seat-limit visibility to billing and settings

### Exit Criteria for M4
- [ ] One tenant active on paid plan for full 7-day operating window
- [ ] Webhook lifecycle state stays healthy (no unresolved failed events)
- [x] Usage and limits stay in sync between API and dashboard

## Phase B (M4.5 + M4.6) - Jun 1 to Jun 30, 2026

### Trace Debugging Closure
- [x] Deep-link from Action Center/Anomalies to exact trace + span context
- [x] Trace detail shows per-span and per-tool cost consistently
- [x] Retry/fallback reason and decision chain fully visible

### Eval Signals v1
- [x] Normalize feedback/outcome/quality signals end-to-end
- [x] Cost-to-quality KPI at trace and feature level
- [x] Add API contract tests for eval signal fields

### Exit Criteria
- [x] Add automated trace workflow smoke gate (alert -> trace -> detail timing)
- [x] Add automated parity checks for trace-reasons and evaluation signal consistency
- [x] Alert -> root cause -> trace evidence workflow under 5 minutes
- [x] No sampled/partial mismatch for trace reason and quality metrics

## Phase B.5 (Integration Expansion / M4.4) - Jul 1 to Aug 31, 2026

### Official Integration Catalog (12 surfaces)
- [x] Express middleware
- [x] Next.js route handler + server action helper
- [x] NestJS interceptor/middleware
- [x] FastAPI middleware
- [x] Django middleware
- [x] Celery task instrumentation
- [x] BullMQ worker instrumentation
- [x] LangChain integration (JS + Python)
- [x] LlamaIndex integration (Python)
- [x] Vercel AI SDK helper
- [x] OpenTelemetry export integration
- [x] Outbound webhook integration

### API and Connector Surfaces
- [x] Add `GET /v1/projects/:projectId/integrations`
- [x] Add `GET/POST/PATCH/DELETE /v1/projects/:projectId/integrations/webhooks`
- [x] Add `GET/PATCH /v1/projects/:projectId/integrations/otel`
- [x] Add `GET /v1/projects/:projectId/integrations/health`
- [x] Enforce connector entitlements in API (paid plans only)
- [x] Add retries/backoff + dead-letter/error visibility state for connectors

### Integration Quality Gate (required for "official")
- [x] Docs page published and linked under `/docs/integrations`
- [x] Runnable example available
- [x] Integration tests added
- [x] Add local runtime-helper smoke matrix in `tokvera/test/sdk-examples/run-smoke.mjs`
- [x] Add production visibility gate in `tokvera/test/sdk-examples/run-runtime-helper-visibility.mjs`
- [x] Smoke validation passes
- [x] Dashboard visibility verified (overview + traces + action center)

### Docs and DX
- [x] `/docs/integrations` status matrix shows `official | beta | planned`
- [x] Matrix includes language support, example links, and test coverage badge
- [x] Add "choose your stack" onboarding path in docs

### Integration Superset (Existing-App First)
- [x] Ship JS/Python manual tracer substrate for custom apps and multi-model runs
- [x] Add Mistral provider wrapper on the canonical telemetry contract
- [x] Add OpenTelemetry bridge helpers that convert spans into canonical Tokvera trace events
- [x] Add thin runtime helper APIs for OpenAI Agents, Claude Agent SDK, Google ADK, LangGraph, Instructor, PydanticAI, and CrewAI
- [x] Expand tracing setup + docs to group integrations by existing app, providers, agent SDKs, frameworks, workflows, voice/realtime, and connectors
- [x] Local smoke validates the new runtime helper matrix end-to-end
- [x] Complete smoke validation and dashboard visibility verification for every newly added runtime helper
- [x] Promote Wave 1 runtime helpers (OpenAI Agents, Claude Agent SDK, Google ADK, LangGraph, Instructor, PydanticAI, CrewAI) to `official`
- [x] Add Wave 2 beta helper APIs in JS/Python for AutoGen, Mastra, Temporal, Pipecat, LiveKit, and OpenAI-compatible gateway
- [x] Add SDK examples, tests, and README coverage for Wave 2 beta helpers
- [x] Promote Wave 2 beta integrations (AutoGen, Mastra, Temporal, Pipecat, LiveKit, OpenAI-compatible gateway) after contract + lifecycle gate
- [x] Add duplicate-emission regression tests for mixed manual/wrapper/runtime-helper compositions
- [x] Add local integration soak gate for lifecycle completeness and duplicate `(trace_id, span_id, status)` detection

## Phase C (Product-Led Adoption / M4.8) - before any gateway implementation

### Product Usability and Conversion
- [x] Rework signup -> project -> API key -> first event -> live trace into one guided first-run path
- [x] Standardize empty states across Overview, Traces, Live Traces, Trace Detail, API Keys, and Billing
- [x] Add persistent beginner guidance on core dashboard pages
- [x] Strengthen integration chooser flows in home page, integrations page, docs quickstart, tracing setup workspace, and API Keys setup
- [x] Add guided setup variants for existing app, multi-model, provider-wrapper-first, framework, and agent-runtime teams
- [x] Add basic team collaboration for paying tenants:
  - owner/admin invite, resend, revoke, and remove flows
  - free plan restricted to solo access by default
  - paid tiers enforce seat caps by entitlement
  - upgrade prompts when the seat limit is reached
  - one verified user can join multiple workspaces and switch active workspace
  - workspace roles ship before gateway: owner, admin, member, viewer, finance
  - project-scoped access controls follow the workspace-role rollout for non-admin users

### Documentation and Acquisition Content
- [x] Maintain canonical docs tracks for quickstart, existing app/manual tracing, multi-model tracing, live tracing, trace debugging, billing/ops, and integration matrix
- [ ] Ship 2 practical blog posts every sprint
- [x] Add comparison and acquisition pages for Tokvera vs LangSmith, Tokvera vs generic dashboards, and SaaS app teams
- [x] Keep marketing, docs, and dashboard setup content on one shared integration/content model
- [x] Add public `/announcements` page with chronological archive and stable detail routes
- [x] Add public `/changelog` page with chronological archive and stable detail routes
- [x] Add SEO-ready detail pages for SDK releases, feature launches, and milestone completions with backlinks to docs, integrations, and related product pages
- [x] Hook release evidence / milestone completion into announcement + changelog generation so those pages update consistently after meaningful ship events

### E2E, Smoke, and Release Gates
- [x] Add product-path Playwright coverage for onboarding, traces/live traces, trace detail, API key setup, and docs/integration navigation
- [x] Keep public smoke/soak suite current with local smoke, production smoke, runtime visibility, integration soak, duplicate-emission detection, and lifecycle completeness
- [x] Add official integration compatibility matrix gate for overview, traces, live traces, trace detail/inspector, and Action Center visibility
- [x] Enforce release checklist rule: code + tests + docs + example + smoke/visibility gate before marking items done

### SDK Expansion Before Gateway
- [x] Wave 1: ship `tokvera-go` with manual tracer substrate, provider wrappers, OTel exporter/bridge, docs, examples, contract tests, and live traces compatibility
  - Go CI, canonical contract checks, local smoke/soak, production lifecycle visibility, and dashboard visibility now pass
- [x] Wave 2: ship `tokvera-java` and `tokvera-dotnet` with the same parity bar after Go is stable
  - Java and `.NET` now both pass local build/tests, canonical contract checks, shared smoke, integration soak, production lifecycle visibility, and dashboard visibility
- [x] Wave 3: ship `tokvera-php` and `tokvera-rust` with the same parity bar after Java/.NET are stable
  - PHP and Rust now both pass local/native tests, canonical contract checks, shared smoke, integration soak, production lifecycle visibility, and dashboard visibility
  - `tokvera/.github/workflows/sdk-shared-gates.yml` installs PHP and Rust in CI and runs the shared smoke + soak gates across all SDK repos
  - `tokvera/.github/workflows/sdk-runtime-visibility.yml` keeps production lifecycle visibility wired through the shared gate path
- [ ] Do not promote any new language SDK to official until docs, examples, canonical contract, lifecycle/live traces, and dashboard visibility all pass

### Commercial Readiness
- [x] Add weekly customer activation review using signup, project creation, key creation, first event, first live trace, first trace-debugging session, and paid conversion metrics
- [x] Add sample apps, template repos, and "verify in live traces" checklists for acquisition
- [x] Keep weekly operating-window evidence and billing reliability review in place while paid tenant count grows
- [x] Generate automated report for 20 active paid tenants gate
- [x] Track team adoption metrics alongside paid conversion:
  - tenants with 2+ members
  - invite acceptance rate
  - seat-cap upgrade pressure by plan
- [x] Add customer usage intelligence for SaaS builders before gateway:
  - first-class usage dimensions for `customer_id`, `end_user_id`, `organization_id`, and optional `credit_bucket`
  - customer-wise token/cost rollups in dashboard and export APIs
  - webhook delivery for usage sync, credit decrement triggers, and threshold alerts
  - finance/reporting flows for reconciliation and top-customer cost review

## Phase D (Gateway Alpha / M5) - starts only after M4.8

- [ ] Stand up `tokvera-gateway` service
- [ ] Implement `/v1/chat/completions` proxy compatibility
- [ ] Implement `/v1/responses` proxy compatibility
- [ ] Policy engine v1 (cheap-first, allowlist, budget-aware escalation)
- [ ] Emit canonical telemetry from gateway path
- [ ] p95 proxy overhead target (<80ms non-streaming)
- [ ] Two tenants on real traffic through gateway alpha
- [ ] Start Phase D only after M4.8 product-led adoption gate is complete

## Phase E (Savings Demo / M6) - Oct 1 to Dec 15, 2026

- [ ] Recommendation-only prompt compression suggestions
- [ ] Model downgrade recommendation engine
- [ ] Retry/dead-end loop savings recommendations
- [ ] Dashboard split: potential savings vs captured savings
- [ ] Confidence + quality-risk bands for recommendations
- [ ] 3 production tenants with measurable savings dashboards

## Phase F (M7 + M8 Growth) - Dec 16, 2026 to Mar 31, 2027

- [ ] Maintain integration packs (JS/Python, Express/FastAPI, LangChain/LlamaIndex)
- [ ] Monthly docs refresh with incident-to-fix workflows
- [ ] Weekly action-center digest for account owners
- [ ] Churn/upgrade review loop based on usage + billing signals
- [ ] Sustain 20 active SaaS users
- [ ] Reach $10k MRR

## Team / Seat Management Scope (pre-enterprise)

- [x] Add `teams`, `team_members`, and `team_invitations` data model support
- [x] Add `tenant_memberships` so one verified user can belong to multiple workspaces
- [x] Add owner/admin-only invite and removal API
- [x] Add workspace switcher support in the dashboard session model
- [x] Add workspace roles: `owner`, `admin`, `member`, `viewer`, `finance`
- [x] Add project-scoped access policies for `member`, `viewer`, and `finance` roles
- [x] Enforce team seat caps through billing entitlements
- [x] Free plan: 1 member by default
- [x] Paid plans: capped members by tier
- [ ] Enterprise/custom plans: configurable seat allowance
- [x] Add Team settings page with invite, resend, revoke, and remove actions
- [x] Add invite email flow and acceptance path
- [x] Add finance role views for invoices, usage totals, customer rollups, and exports without API-key or raw-payload admin access
- [ ] Add E2E coverage for invite, accept, over-seat rejection, and upgrade CTA
- [x] Add docs for team management, seat limits, and admin responsibilities

## Customer Usage / Webhooks / Reporting

- [x] Add first-class event dimensions for `customer_id`, `end_user_id`, `organization_id`, and optional `credit_bucket`
- [ ] Keep metadata support for extra context, but do not depend on free-form metadata for billing-grade aggregation
- [x] Add customer-wise token/cost read models and export-ready aggregates
- [x] Add `GET /v1/usage/customers` and detail/export surfaces for customer usage reconciliation
- [x] Add customer usage webhook events for usage sync, credit decrement, quota reached, and threshold alerts
- [x] Add docs/examples for SaaS builders to mirror Tokvera usage into their own customer credit systems
- [x] Add contract tests and E2E coverage for customer-usage APIs and webhook delivery

## Release Checklist Template (use each 2-week cycle)

- [ ] Release evidence manifest added under `release-evidence/`
- [ ] API contract added/updated
- [ ] Unit/integration tests added
- [ ] Dashboard type + API client updated
- [ ] Smoke scripts updated
- [ ] Public `/docs` pages updated for all user-facing behavior changes
- [ ] API docs/runbook updated for backend contract/ops changes
- [x] SDK README/examples updated for SDK contract/integration changes
- [ ] Deployment env variables reviewed
- [ ] Rollback plan documented

## Repo Mapping

- `tokvera-api`: billing/tracing enforcement, contracts, smoke, lifecycle, gateway prep
- `tokvera-go`: Wave 1 Go SDK scaffold and qualification path
- `tokvera-java`: Wave 2 Java SDK qualification path
- `tokvera-dotnet`: Wave 2 .NET SDK qualification path
- `tokvera-php`: Wave 3 PHP SDK preview and qualification path
- `tokvera-rust`: Wave 3 Rust SDK preview and qualification path
- `tokvera-dashboard`: operational UX, billing/tracing visibility, explainability
- `tokvera-js` and `tokvera-python`: telemetry compatibility + gateway mode support
- `tokvera-analytics-engine`: aggregation/detectors/savings scoring
- `tokvera-gateway`: phase C proxy + routing control plane
