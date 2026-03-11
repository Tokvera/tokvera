# Tokvera Execution TODO (Mar 11, 2026 -> Mar 31, 2027)

Last updated: 2026-03-11
Owner: product + engineering
Cadence: 2-week releases (API-first, dashboard follows API contracts)

## Milestone Targets

- [ ] M4 First paying user by 2026-05-31
- [ ] M4.5 Tracing beta completion by 2026-06-30
- [ ] M4.6 Evaluation signals v1 by 2026-06-30
- [ ] M5 Gateway alpha by 2026-09-30
- [ ] M6 Savings demo by 2026-12-15
- [ ] M7 10 active SaaS users by 2027-03-31
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
- [ ] Complete 402 blocked-state contract audit on all ingest/mutation paths
- [ ] Ensure hard-cap/retention/raw-capture limits are enforced server-side on all paths

### Billing Reliability
- [x] Webhook idempotency by Paddle `event_id`
- [x] Webhook health endpoint
- [x] Webhook failure lifecycle alert emails
- [x] Add stale-processing alerting runbook execution checklist

### Smoke and Ops
- [x] Post-deploy smoke script validates checkout + ingest + traces + billing
- [x] Smoke extended to validate `billing/entitlements` and `billing/health`
- [x] Add weekly manual replay drill for webhook failure recovery

### Dashboard
- [x] Billing page consumes summary/metering/invoice/retention
- [x] Billing page shows entitlements + billing health panels
- [x] Add explicit blocked-state UX (`402` contract mapping for user-friendly CTAs)

### Exit Criteria for M4
- [ ] One tenant active on paid plan for full 7-day operating window
- [ ] Webhook lifecycle state stays healthy (no unresolved failed events)
- [ ] Usage and limits stay in sync between API and dashboard

## Phase B (M4.5 + M4.6) - Jun 1 to Jun 30, 2026

### Trace Debugging Closure
- [ ] Deep-link from Action Center/Anomalies to exact trace + span context
- [ ] Trace detail shows per-span and per-tool cost consistently
- [ ] Retry/fallback reason and decision chain fully visible

### Eval Signals v1
- [ ] Normalize feedback/outcome/quality signals end-to-end
- [ ] Cost-to-quality KPI at trace and feature level
- [ ] Add API contract tests for eval signal fields

### Exit Criteria
- [ ] Alert -> root cause -> trace evidence workflow under 5 minutes
- [ ] No sampled/partial mismatch for trace reason and quality metrics

## Phase C (Gateway Alpha / M5) - Jul 1 to Sep 30, 2026

- [ ] Stand up `tokvera-gateway` service
- [ ] Implement `/v1/chat/completions` proxy compatibility
- [ ] Implement `/v1/responses` proxy compatibility
- [ ] Policy engine v1 (cheap-first, allowlist, budget-aware escalation)
- [ ] Emit canonical telemetry from gateway path
- [ ] p95 proxy overhead target (<80ms non-streaming)
- [ ] Two tenants on real traffic through gateway alpha

## Phase D (Savings Demo / M6) - Oct 1 to Dec 15, 2026

- [ ] Recommendation-only prompt compression suggestions
- [ ] Model downgrade recommendation engine
- [ ] Retry/dead-end loop savings recommendations
- [ ] Dashboard split: potential savings vs captured savings
- [ ] Confidence + quality-risk bands for recommendations
- [ ] 3 production tenants with measurable savings dashboards

## Phase E (M7 + M8 Growth) - Dec 16, 2026 to Mar 31, 2027

- [ ] Maintain integration packs (JS/Python, Express/FastAPI, LangChain/LlamaIndex)
- [ ] Monthly docs refresh with incident-to-fix workflows
- [ ] Weekly action-center digest for account owners
- [ ] Churn/upgrade review loop based on usage + billing signals
- [ ] Reach 10 active SaaS users
- [ ] Reach $10k MRR

## Release Checklist Template (use each 2-week cycle)

- [ ] API contract added/updated
- [ ] Unit/integration tests added
- [ ] Dashboard type + API client updated
- [ ] Smoke scripts updated
- [ ] Docs/runbook updated
- [ ] Deployment env variables reviewed
- [ ] Rollback plan documented

## Repo Mapping

- `tokvera-api`: billing/tracing enforcement, contracts, smoke, lifecycle, gateway prep
- `tokvera-dashboard`: operational UX, billing/tracing visibility, explainability
- `tokvera-js` and `tokvera-python`: telemetry compatibility + gateway mode support
- `tokvera-analytics-engine`: aggregation/detectors/savings scoring
- `tokvera-gateway`: phase C proxy + routing control plane
