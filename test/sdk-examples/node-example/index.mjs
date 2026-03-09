import crypto from "node:crypto";
import { trackOpenAI } from "@tokvera/sdk";

const fakeOpenAI = {
  chat: {
    completions: {
      async create(payload) {
        return {
          id: "chat_1",
          model: payload.model || "gpt-4o-mini",
          usage: {
            prompt_tokens: 12,
            completion_tokens: 18,
            total_tokens: 30,
          },
        };
      },
    },
  },
  responses: {
    async create(payload) {
      return {
        id: "resp_1",
        model: payload.model || "gpt-4o-mini",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };
    },
  },
};

function nextId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function main() {
  const feature = process.env.TOKVERA_FEATURE || "sdk_smoke_node";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1200);
  const traceId = nextId("trc");
  const runId = nextId("run");
  const conversationId = nextId("conv");
  const rootSpanId = nextId("spn");
  const replySpanId = nextId("spn");

  const plannerClient = trackOpenAI(fakeOpenAI, {
    api_key: process.env.TOKVERA_API_KEY,
    ingest_url: process.env.TOKVERA_INGEST_URL,
    feature,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "test",
    schema_version: "2026-04-01",
    trace_id: traceId,
    run_id: runId,
    conversation_id: conversationId,
    span_id: rootSpanId,
    step_name: "plan_response",
    span_kind: "orchestrator",
    capture_content: true,
    payload_blocks: [
      {
        payload_type: "context",
        content: "Policy snapshot: refund for invoice mismatch allowed within 7 days after verification.",
      },
    ],
    metrics: {
      cost_usd: 0.00008,
    },
    decision: {
      outcome: "success",
      routing_reason: "default_policy",
      route: "openai:gpt-4o-mini",
    },
    outcome: "success",
    quality_label: "good",
    feedback_score: 4.6,
  });

  await plannerClient.responses.create({
    model: "gpt-4o-mini",
    input:
      "Plan a support answer for an invoice mismatch request. Keep response short and safe.",
  });

  const replyClient = trackOpenAI(fakeOpenAI, {
    api_key: process.env.TOKVERA_API_KEY,
    ingest_url: process.env.TOKVERA_INGEST_URL,
    feature,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "test",
    schema_version: "2026-04-01",
    trace_id: traceId,
    run_id: runId,
    conversation_id: conversationId,
    span_id: replySpanId,
    parent_span_id: rootSpanId,
    step_name: "draft_response",
    span_kind: "model",
    capture_content: true,
    payload_blocks: [
      {
        payload_type: "context",
        content: "Customer tier: pro. Account state: verified. Ticket priority: normal.",
      },
    ],
    metrics: {
      cost_usd: 0.00011,
    },
    decision: {
      outcome: "success",
      retry_reason: "none",
    },
    outcome: "success",
    quality_label: "good",
    feedback_score: 4.8,
  });

  await replyClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "hello from node trace v2 example" }],
  });

  // SDK sends ingestion in fire-and-forget mode.
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  console.log(
    `node example complete (feature=${feature}, ingest=${process.env.TOKVERA_INGEST_URL}, trace_id=${traceId})`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
