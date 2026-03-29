import { loadLocalEnv } from "./env.mjs";

function buildWindow(days) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

async function requestJson({ baseUrl, sessionToken, tenantId, path }) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "x-tenant-id": tenantId,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }

  return response.json();
}

function toLedgerSnapshot(customer) {
  return {
    customer_id: customer.customer_id,
    billable_units: customer.total_tokens,
    estimated_cost_usd: customer.total_cost_usd,
    request_count: customer.request_count,
    project_count: customer.project_count,
    sync_note: "Map billable_units to your own credit formula before persisting.",
  };
}

function toWebhookLedgerEvent(payload) {
  return {
    customer_id: payload.customer_id,
    event_type: payload.event_type,
    billable_units: payload.overview.total_tokens,
    estimated_cost_usd: payload.overview.total_cost_usd,
    credit_bucket: payload.credit_bucket,
    remaining_credits: payload.remaining_credits,
    threshold: payload.threshold,
    metadata: payload.metadata || null,
    metadata_observed_at: payload.metadata_observed_at || null,
  };
}

async function main() {
  loadLocalEnv();

  const baseUrl = process.env.TOKVERA_API_BASE_URL;
  const sessionToken = process.env.TOKVERA_SESSION_TOKEN;
  const tenantId = process.env.TOKVERA_TENANT_ID;
  const projectId = process.env.TOKVERA_PROJECT_ID || "";
  const preferredCustomerId = process.env.TOKVERA_CUSTOMER_ID || "";
  const days = Math.max(1, Number(process.env.TOKVERA_CUSTOMER_USAGE_DAYS || "30") || 30);

  if (!baseUrl) throw new Error("TOKVERA_API_BASE_URL is required");
  if (!sessionToken) throw new Error("TOKVERA_SESSION_TOKEN is required");
  if (!tenantId) throw new Error("TOKVERA_TENANT_ID is required");

  const windowRange = buildWindow(days);
  const params = new URLSearchParams({
    from: windowRange.from,
    to: windowRange.to,
  });
  if (projectId) params.set("project_id", projectId);

  const list = await requestJson({
    baseUrl,
    sessionToken,
    tenantId,
    path: `/v1/usage/customers?${params.toString()}`,
  });

  const selectedCustomer =
    list.items.find((item) => item.customer_id === preferredCustomerId) || list.items[0] || null;

  if (!selectedCustomer) {
    console.log("No customer-attributed usage found in this window.");
    return;
  }

  const detail = await requestJson({
    baseUrl,
    sessionToken,
    tenantId,
    path: `/v1/usage/customers/${encodeURIComponent(selectedCustomer.customer_id)}?${params.toString()}`,
  });

  const webhookPayload = {
    schema_version: "customer_usage.v1",
    event_type: "customer.usage.updated",
    customer_id: selectedCustomer.customer_id,
    credit_bucket: detail.by_credit_bucket?.[0]?.group || null,
    remaining_credits: null,
    threshold: null,
    metadata: detail.metadata || null,
    metadata_observed_at: detail.metadata_observed_at || null,
    overview: detail.overview,
  };

  console.log("customer usage sync example complete");
  console.log({
    window: windowRange,
    selected_customer: selectedCustomer.customer_id,
    ledger_snapshot: toLedgerSnapshot(selectedCustomer),
    webhook_projection: toWebhookLedgerEvent(webhookPayload),
    next_step:
      "Persist ledger_snapshot in your own billing store and validate webhook_projection against your webhook handler before enabling automated customer_usage webhooks.",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
