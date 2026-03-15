import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = (process.env.TOKVERA_API_BASE_URL || "https://api.tokvera.org").replace(/\/+$/, "");
const adminToken = process.env.TOKVERA_ADMIN_TOKEN || "";
const windowDays = Math.max(1, Math.min(365, Number(process.env.TOKVERA_ACTIVATION_WINDOW_DAYS || "30") || 30));
const limit = Math.max(1, Math.min(500, Number(process.env.TOKVERA_ACTIVATION_LIMIT || "500") || 500));
const jsonPath = process.env.TOKVERA_ACTIVATION_REPORT_JSON || "test/artifacts/activation-report.json";
const markdownPath = process.env.TOKVERA_ACTIVATION_REPORT_MD || "test/artifacts/activation-report.md";
const requireTarget = ["1", "true", "yes", "on"].includes(
  String(process.env.TOKVERA_ACTIVATION_REQUIRE_TARGET || "").trim().toLowerCase()
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

function tallyBlockers(items) {
  const counts = new Map();
  for (const item of items) {
    for (const blocker of item.activation?.blockers || []) {
      counts.set(blocker, (counts.get(blocker) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function buildMarkdown(report) {
  const blockerRows = tallyBlockers(report.items);
  const blockedTenants = report.items
    .filter((item) => !item.activation?.is_active_paid_tenant_30d)
    .slice(0, 10);

  return [
    "# Tokvera Activation Report",
    "",
    `Generated at: ${formatDate(report.generated_at)}`,
    `Window: ${report.window.days} days (${formatDate(report.window.start)} -> ${formatDate(report.window.end)})`,
    "",
    "## Gate Status",
    "",
    `- Goal: ${report.target.goal} active paid tenants`,
    `- Current: ${report.target.current}`,
    `- Remaining: ${report.target.remaining}`,
    `- Truncated: ${report.truncated ? "yes" : "no"}`,
    "",
    "## Funnel Summary",
    "",
    `- Users created (window): ${report.summary.users_created_30d}`,
    `- Tenants total: ${report.summary.tenants_total}`,
    `- Tenants included: ${report.summary.tenants_included}`,
    `- Tenants created (window): ${report.summary.tenants_created_30d}`,
    `- Projects created (window): ${report.summary.projects_created_30d}`,
    `- API keys created (window): ${report.summary.api_keys_created_30d}`,
    `- Tenants with project: ${report.summary.tenants_with_project}`,
    `- Tenants with active key: ${report.summary.tenants_with_active_key}`,
    `- Tenants with first event in window: ${report.summary.tenants_with_first_event_30d}`,
    `- Non-free tenants: ${report.summary.non_free_tenants}`,
    `- Paid tenants in good standing: ${report.summary.paid_tenants_in_good_standing}`,
    `- Active paid tenants in window: ${report.summary.active_paid_tenants_30d}`,
    "",
    "## Top Activation Blockers",
    "",
    ...(blockerRows.length
      ? blockerRows.map(([blocker, count]) => `- ${blocker}: ${count}`)
      : ["- none"]),
    "",
    "## Tenants Needing Attention",
    "",
    ...(blockedTenants.length
      ? blockedTenants.map(
          (item) =>
            `- ${item.tenant_name} (${item.tenant_id}) | plan=${item.plan?.id || "free"} | status=${item.subscription?.status || "none"} | requests_30d=${item.request_count_30d} | blockers=${(item.activation?.blockers || []).join(", ") || "none"}`
        )
      : ["- none"]),
    "",
    "## Active Paid Tenants",
    "",
    ...report.items
      .filter((item) => item.activation?.is_active_paid_tenant_30d)
      .map(
        (item) =>
          `- ${item.tenant_name} | requests_30d=${item.request_count_30d} | cost_30d=${formatCurrency(item.total_cost_usd_30d)} | last_event_at=${formatDate(item.last_event_at)}`
      ),
    "",
  ].join("\n");
}

async function main() {
  if (!adminToken) {
    throw new Error("TOKVERA_ADMIN_TOKEN is required.");
  }

  const url = new URL(`${baseUrl}/v1/admin/growth/activation-report`);
  url.searchParams.set("window_days", String(windowDays));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: {
      "x-admin-token": adminToken,
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message || `Activation report failed (${response.status}).`);
  }

  const markdown = buildMarkdown(payload);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2));
  await fs.writeFile(markdownPath, markdown);

  console.log(`[activation-report] current=${payload.target.current} goal=${payload.target.goal} remaining=${payload.target.remaining}`);
  console.log(`[activation-report] json=${jsonPath}`);
  console.log(`[activation-report] markdown=${markdownPath}`);

  if (requireTarget && payload.target.remaining > 0) {
    throw new Error(`Active paid tenant gate not met: current=${payload.target.current}, goal=${payload.target.goal}`);
  }
}

main().catch((error) => {
  console.error(`[activation-report] FAIL: ${error.message}`);
  process.exit(1);
});
