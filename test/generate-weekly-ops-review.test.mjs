import test from "node:test";
import assert from "node:assert/strict";

import { buildOperatingWindowStats, buildWeeklyOpsMarkdown, buildWeeklyOpsReport } from "./generate-weekly-ops-review.mjs";

test("buildOperatingWindowStats summarizes active days and totals", () => {
  const stats = buildOperatingWindowStats(
    {
      points: [
        { bucket_start: "2026-03-09T00:00:00.000Z", request_count: 2, cost_usd: 0.12 },
        { bucket_start: "2026-03-10T00:00:00.000Z", request_count: 0, cost_usd: 0 },
        { bucket_start: "2026-03-11T00:00:00.000Z", request_count: 4, cost_usd: 0.31 },
      ],
    },
    3
  );

  assert.equal(stats.active_days, 2);
  assert.equal(stats.total_requests, 6);
  assert.equal(stats.meets_full_window, false);
});

test("buildWeeklyOpsReport flags webhook and activation gaps", () => {
  const report = buildWeeklyOpsReport({
    tenant_id: "ten_123",
    project_id: "proj_123",
    project_name: "Test",
    activation_report: {
      target: { current: 3, goal: 20, remaining: 17 },
    },
    activation_item: {
      tenant_id: "ten_123",
      tenant_name: "Acme",
      request_count_30d: 2,
      activation: {
        is_active_paid_tenant_30d: false,
        has_first_event_30d: true,
        has_live_trace_review_30d: false,
        has_trace_debug_session_30d: false,
        blockers: ["no_trace_debug_session"],
      },
    },
    billing_summary: {
      plan: { id: "growth" },
      subscription: { status: "past_due" },
    },
    billing_health: {
      webhook: { configured: true, is_stale: true, unresolved_failed_total: 2 },
      alerts: { webhook_failure: { failed_last_24h: 1 } },
    },
    billing_entitlements: {},
    billing_metering: {},
    metrics_timeseries: {
      points: [
        { bucket_start: "2026-03-09T00:00:00.000Z", request_count: 2, cost_usd: 0.1 },
      ],
    },
  });

  assert.ok(report.review_flags.includes("tenant_not_active_paid"));
  assert.ok(report.review_flags.includes("webhook_stale"));
  assert.ok(report.review_flags.includes("operating_window_incomplete"));
});

test("buildWeeklyOpsMarkdown includes the review sections", () => {
  const markdown = buildWeeklyOpsMarkdown({
    generated_at: "2026-03-15T00:00:00.000Z",
    operating_window: {
      window_days: 7,
      active_days: 7,
      total_requests: 42,
      total_cost_usd: 1.23,
      meets_full_window: true,
      first_active_at: "2026-03-08T00:00:00.000Z",
      last_active_at: "2026-03-14T00:00:00.000Z",
    },
    activation_gate: {
      target: { current: 6, goal: 20, remaining: 14 },
    },
    target_tenant: {
      tenant_id: "ten_123",
      tenant_name: "Acme",
      project_id: "proj_123",
      project_name: "Test",
      activation_item: {
        request_count_30d: 12,
        activation: {
          has_first_event_30d: true,
          has_live_trace_review_30d: true,
          has_trace_debug_session_30d: true,
          blockers: [],
        },
      },
    },
    billing: {
      summary: { plan: { id: "growth" }, subscription: { status: "active" } },
      health: { webhook: { configured: true, is_stale: false, unresolved_failed_total: 0 }, alerts: { webhook_failure: { failed_last_24h: 0 } } },
    },
    review_flags: [],
  });

  assert.match(markdown, /# Tokvera Weekly Ops Review/);
  assert.match(markdown, /## Billing Reliability/);
  assert.match(markdown, /## 7-Day Operating Window/);
});
