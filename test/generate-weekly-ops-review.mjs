import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const baseUrl = (process.env.TOKVERA_API_BASE_URL || "https://api.tokvera.org").replace(/\/+$/, "");
const adminToken = process.env.TOKVERA_ADMIN_TOKEN || "";
const email = process.env.TOKVERA_TEST_EMAIL || "";
const password = process.env.TOKVERA_TEST_PASSWORD || "";
const preferredTenantId = process.env.TOKVERA_TEST_TENANT_ID || "";
const preferredProjectId = process.env.TOKVERA_TEST_PROJECT_ID || "";
const activationWindowDays = Math.max(
  1,
  Math.min(365, Number(process.env.TOKVERA_WEEKLY_OPS_ACTIVATION_WINDOW_DAYS || "30") || 30)
);
const operatingWindowDays = Math.max(
  1,
  Math.min(30, Number(process.env.TOKVERA_WEEKLY_OPS_WINDOW_DAYS || "7") || 7)
);
const activationLimit = Math.max(
  1,
  Math.min(500, Number(process.env.TOKVERA_WEEKLY_OPS_ACTIVATION_LIMIT || "500") || 500)
);
const jsonPath = process.env.TOKVERA_WEEKLY_OPS_JSON || "test/artifacts/weekly-ops-review.json";
const markdownPath = process.env.TOKVERA_WEEKLY_OPS_MD || "test/artifacts/weekly-ops-review.md";
const fixturePath = process.env.TOKVERA_WEEKLY_OPS_FIXTURE || "";
const requireHealthy = ["1", "true", "yes", "on"].includes(
  String(process.env.TOKVERA_WEEKLY_OPS_REQUIRE_HEALTH || "").trim().toLowerCase()
);

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toISOString();
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric === 0) return "$0.0000";
  if (Math.abs(numeric) < 0.01) return `$${numeric.toFixed(6)}`;
  return `$${numeric.toFixed(4)}`;
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("en-US");
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function authHeaders(sessionToken, tenantId) {
  return {
    authorization: `Bearer ${sessionToken}`,
    "x-tenant-id": tenantId,
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

function assertApiOk(result, label) {
  if (!result.response.ok || result.json?.ok === false) {
    throw new Error(`${label} failed (${result.response.status}): ${result.text}`);
  }
}

async function login() {
  const result = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assertApiOk(result, "login");

  const sessionToken = result.json?.session?.session_token;
  const memberships = Array.isArray(result.json?.memberships) ? result.json.memberships : [];
  if (!sessionToken) throw new Error("login payload missing session_token");
  if (memberships.length === 0) throw new Error("login payload missing memberships");
  return { sessionToken, memberships };
}

function pickTenantId(memberships, preferred) {
  if (preferred) return preferred;
  if (!Array.isArray(memberships) || memberships.length === 0) return null;
  const first = memberships[0];
  return (
    (typeof first.tenant_id === "string" && first.tenant_id) ||
    (typeof first.tenantId === "string" && first.tenantId) ||
    (typeof first?.tenant?.id === "string" && first.tenant.id) ||
    null
  );
}

async function fetchProjects(sessionToken, tenantId) {
  const result = await requestJson(`${baseUrl}/v1/projects`, {
    headers: authHeaders(sessionToken, tenantId),
  });
  assertApiOk(result, "projects list");
  if (Array.isArray(result.json?.items)) return result.json.items;
  if (Array.isArray(result.json?.projects)) return result.json.projects;
  return [];
}

async function fetchActivationReport() {
  const url = new URL(`${baseUrl}/v1/admin/growth/activation-report`);
  url.searchParams.set("window_days", String(activationWindowDays));
  url.searchParams.set("limit", String(activationLimit));
  const result = await requestJson(url, {
    headers: { "x-admin-token": adminToken },
  });
  assertApiOk(result, "activation report");
  return result.json;
}

async function fetchBillingSummary(sessionToken, tenantId) {
  const result = await requestJson(`${baseUrl}/v1/billing/summary`, {
    headers: authHeaders(sessionToken, tenantId),
  });
  assertApiOk(result, "billing summary");
  return result.json;
}

async function fetchBillingHealth(sessionToken, tenantId) {
  const result = await requestJson(`${baseUrl}/v1/billing/health`, {
    headers: authHeaders(sessionToken, tenantId),
  });
  assertApiOk(result, "billing health");
  return result.json;
}

async function fetchBillingEntitlements(sessionToken, tenantId, projectId) {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const result = await requestJson(`${baseUrl}/v1/billing/entitlements${suffix}`, {
    headers: authHeaders(sessionToken, tenantId),
  });
  assertApiOk(result, "billing entitlements");
  return result.json;
}

async function fetchBillingMetering(sessionToken, tenantId, projectId) {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const result = await requestJson(`${baseUrl}/v1/billing/metering${suffix}`, {
    headers: authHeaders(sessionToken, tenantId),
  });
  assertApiOk(result, "billing metering");
  return result.json;
}

async function fetchTimeseries(sessionToken, tenantId, projectId) {
  const now = new Date();
  const from = new Date(now.getTime() - operatingWindowDays * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: now.toISOString(),
    granularity: "day",
    max_points: String(Math.max(operatingWindowDays, 7)),
  });
  if (projectId) params.set("project_id", projectId);
  const result = await requestJson(`${baseUrl}/v1/metrics/timeseries?${params.toString()}`, {
    headers: authHeaders(sessionToken, tenantId),
  });
  assertApiOk(result, "metrics timeseries");
  return result.json;
}

export function buildOperatingWindowStats(timeseries, windowDays = operatingWindowDays) {
  const points = Array.isArray(timeseries?.points) ? timeseries.points : [];
  const activePoints = points.filter((point) => Number(point?.request_count || 0) > 0);
  const totalRequests = points.reduce((sum, point) => sum + Number(point?.request_count || 0), 0);
  const totalCostUsd = points.reduce((sum, point) => sum + Number(point?.cost_usd || 0), 0);
  return {
    points_total: points.length,
    active_days: activePoints.length,
    total_requests: totalRequests,
    total_cost_usd: totalCostUsd,
    first_active_at: activePoints[0]?.bucket_start || null,
    last_active_at: activePoints.at(-1)?.bucket_start || null,
    meets_full_window: activePoints.length >= windowDays && totalRequests > 0,
  };
}

function buildReviewFlags({ activationItem, billingHealth, operatingWindowStats }) {
  const flags = [];

  if (!activationItem?.activation?.is_active_paid_tenant_30d) {
    flags.push("tenant_not_active_paid");
  }
  if (!activationItem?.activation?.has_live_trace_review_30d) {
    flags.push("no_live_trace_review_30d");
  }
  if (!activationItem?.activation?.has_trace_debug_session_30d) {
    flags.push("no_trace_debug_session_30d");
  }
  if (Number(billingHealth?.webhook?.unresolved_failed_total || 0) > 0) {
    flags.push("unresolved_failed_webhooks");
  }
  if (billingHealth?.webhook?.is_stale) {
    flags.push("webhook_stale");
  }
  if (!operatingWindowStats.meets_full_window) {
    flags.push("operating_window_incomplete");
  }

  return flags;
}

export function buildWeeklyOpsMarkdown(report) {
  const flags = Array.isArray(report.review_flags) ? report.review_flags : [];
  const activationItem = report.target_tenant?.activation_item || null;
  const blockers = activationItem?.activation?.blockers || [];
  const activePaidTenants = report.activation_gate?.target?.current ?? 0;
  const goal = report.activation_gate?.target?.goal ?? 20;

  return [
    "# Tokvera Weekly Ops Review",
    "",
    `Generated at: ${formatDate(report.generated_at)}`,
    `Tenant: ${report.target_tenant?.tenant_name || report.target_tenant?.tenant_id || "-"}`,
    `Project: ${report.target_tenant?.project_name || report.target_tenant?.project_id || "-"}`,
    "",
    "## Paid Tenant Gate",
    "",
    `- Active paid tenants: ${activePaidTenants}/${goal}`,
    `- Remaining to gate: ${report.activation_gate?.target?.remaining ?? Math.max(goal - activePaidTenants, 0)}`,
    "",
    "## Billing Reliability",
    "",
    `- Plan: ${report.billing?.summary?.plan?.id || "-"}`,
    `- Subscription status: ${report.billing?.summary?.subscription?.status || "-"}`,
    `- Webhook configured: ${report.billing?.health?.webhook?.configured ? "yes" : "no"}`,
    `- Webhook stale: ${report.billing?.health?.webhook?.is_stale ? "yes" : "no"}`,
    `- Unresolved failed webhooks: ${formatNumber(report.billing?.health?.webhook?.unresolved_failed_total || 0)}`,
    `- Failed webhooks last 24h: ${formatNumber(report.billing?.health?.alerts?.webhook_failure?.failed_last_24h || 0)}`,
    "",
    "## 7-Day Operating Window",
    "",
    `- Active days: ${report.operating_window?.active_days}/${report.operating_window?.window_days}`,
    `- Total requests: ${formatNumber(report.operating_window?.total_requests || 0)}`,
    `- Total cost: ${formatCurrency(report.operating_window?.total_cost_usd || 0)}`,
    `- Full-window evidence met: ${report.operating_window?.meets_full_window ? "yes" : "no"}`,
    `- First active day: ${formatDate(report.operating_window?.first_active_at)}`,
    `- Last active day: ${formatDate(report.operating_window?.last_active_at)}`,
    "",
    "## Activation Review",
    "",
    `- First event in 30d: ${activationItem?.activation?.has_first_event_30d ? "yes" : "no"}`,
    `- Live trace review in 30d: ${activationItem?.activation?.has_live_trace_review_30d ? "yes" : "no"}`,
    `- Trace debugging session in 30d: ${activationItem?.activation?.has_trace_debug_session_30d ? "yes" : "no"}`,
    `- Requests in 30d: ${formatNumber(activationItem?.request_count_30d || 0)}`,
    "",
    "## Review Flags",
    "",
    ...(flags.length > 0 ? flags.map((flag) => `- ${flag}`) : ["- none"]),
    "",
    "## Tenant Blockers",
    "",
    ...(blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
  ].join("\n");
}

async function loadFixture() {
  const raw = await fs.readFile(path.resolve(fixturePath), "utf8");
  return JSON.parse(raw);
}

function resolveProjectId(projects) {
  if (preferredProjectId) return preferredProjectId;
  if (!Array.isArray(projects)) return null;
  const activeProject = projects.find((project) => project?.is_active !== false);
  if (activeProject && typeof activeProject.id === "string" && activeProject.id.trim()) {
    return activeProject.id.trim();
  }
  return null;
}

async function collectLiveData() {
  if (!adminToken) throw new Error("TOKVERA_ADMIN_TOKEN is required.");
  if (!email || !password) {
    throw new Error("TOKVERA_TEST_EMAIL and TOKVERA_TEST_PASSWORD are required.");
  }

  const auth = await login();
  const tenantId = pickTenantId(auth.memberships, preferredTenantId);
  if (!tenantId) throw new Error("Unable to resolve tenant id.");

  const projects = await fetchProjects(auth.sessionToken, tenantId);
  const projectId = resolveProjectId(projects);

  const [activationReport, billingSummary, billingHealth, billingEntitlements, billingMetering, metricsTimeseries] =
    await Promise.all([
      fetchActivationReport(),
      fetchBillingSummary(auth.sessionToken, tenantId),
      fetchBillingHealth(auth.sessionToken, tenantId),
      fetchBillingEntitlements(auth.sessionToken, tenantId, projectId),
      fetchBillingMetering(auth.sessionToken, tenantId, projectId),
      fetchTimeseries(auth.sessionToken, tenantId, projectId),
    ]);

  const activationItem =
    activationReport?.items?.find((item) => item?.tenant_id === tenantId) || null;
  const project =
    Array.isArray(projects) && projectId ? projects.find((item) => item?.id === projectId) || null : null;

  return {
    tenant_id: tenantId,
    project_id: projectId,
    project_name: project?.name || null,
    activation_report: activationReport,
    billing_summary: billingSummary,
    billing_health: billingHealth,
    billing_entitlements: billingEntitlements,
    billing_metering: billingMetering,
    metrics_timeseries: metricsTimeseries,
    activation_item: activationItem,
  };
}

export function buildWeeklyOpsReport(data) {
  const operatingWindowStats = buildOperatingWindowStats(data.metrics_timeseries, operatingWindowDays);
  const reviewFlags = buildReviewFlags({
    activationItem: data.activation_item,
    billingHealth: data.billing_health,
    operatingWindowStats,
  });

  return {
    generated_at: new Date().toISOString(),
    operating_window: {
      window_days: operatingWindowDays,
      ...operatingWindowStats,
    },
    activation_gate: data.activation_report,
    target_tenant: {
      tenant_id: data.tenant_id,
      tenant_name: data.activation_item?.tenant_name || null,
      project_id: data.project_id,
      project_name: data.project_name,
      activation_item: data.activation_item,
    },
    billing: {
      summary: data.billing_summary,
      health: data.billing_health,
      entitlements: data.billing_entitlements,
      metering: data.billing_metering,
    },
    review_flags: reviewFlags,
    fixture_mode: Boolean(fixturePath),
  };
}

async function main() {
  const source = fixturePath ? await loadFixture() : await collectLiveData();
  const report = buildWeeklyOpsReport(source);
  const markdown = buildWeeklyOpsMarkdown(report);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  await fs.writeFile(markdownPath, markdown);

  console.log(
    `[weekly-ops-review] active_paid_tenants=${report.activation_gate?.target?.current ?? 0}/${report.activation_gate?.target?.goal ?? 20}`
  );
  console.log(`[weekly-ops-review] flags=${report.review_flags.length}`);
  console.log(`[weekly-ops-review] json=${jsonPath}`);
  console.log(`[weekly-ops-review] markdown=${markdownPath}`);

  if (requireHealthy && report.review_flags.length > 0) {
    throw new Error(`Weekly ops review has blocking flags: ${report.review_flags.join(", ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[weekly-ops-review] FAIL: ${error.message}`);
    process.exit(1);
  });
}
