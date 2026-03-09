import crypto from "node:crypto";
import { trackOpenAI } from "@tokvera/sdk";
import { loadLocalEnv } from "./env.mjs";

const fakeOpenAI = {
  chat: {
    completions: {
      async create(payload) {
        return {
          id: "chat_1",
          model: payload.model || "gpt-4o-mini",
          usage: {
            prompt_tokens: 18,
            completion_tokens: 22,
            total_tokens: 40,
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
          completion_tokens: 16,
          total_tokens: 26,
        },
      };
    },
  },
};

function nextId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function main() {
  loadLocalEnv();

  const apiKey = process.env.TOKVERA_API_KEY;
  const ingestUrl = process.env.TOKVERA_INGEST_URL;
  const feature = process.env.TOKVERA_FEATURE || "sdk_example_node";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1200);

  if (!apiKey) throw new Error("TOKVERA_API_KEY is required");
  if (!ingestUrl) throw new Error("TOKVERA_INGEST_URL is required");

  const traceId = nextId("trc");
  const runId = nextId("run");
  const conversationId = nextId("conv");
  const rootSpanId = nextId("spn");

  const classifyClient = trackOpenAI(fakeOpenAI, {
    api_key: apiKey,
    ingest_url: ingestUrl,
    feature,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "example",
    schema_version: "2026-04-01",
    trace_id: traceId,
    run_id: runId,
    conversation_id: conversationId,
    span_id: rootSpanId,
    step_name: "classify_intent",
    span_kind: "orchestrator",
    capture_content: true,
    payload_blocks: [
      {
        payload_type: "context",
        content: "Support policy context: classify ticket type before drafting response.",
      },
    ],
    metrics: {
      cost_usd: 0.00007,
    },
    decision: {
      outcome: "success",
      route: "openai:gpt-4o-mini",
      routing_reason: "default_policy",
    },
    outcome: "success",
    quality_label: "good",
    feedback_score: 5,
  });

  await classifyClient.responses.create({
    model: "gpt-4o-mini",
    input: "Classify this support request: user cannot access billing page.",
  });

  const draftSpanId = nextId("spn");
  const draftClient = trackOpenAI(fakeOpenAI, {
    api_key: apiKey,
    ingest_url: ingestUrl,
    feature,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "example",
    schema_version: "2026-04-01",
    trace_id: traceId,
    run_id: runId,
    conversation_id: conversationId,
    span_id: draftSpanId,
    parent_span_id: rootSpanId,
    step_name: "draft_reply",
    span_kind: "model",
    capture_content: true,
    payload_blocks: [
      {
        payload_type: "context",
        content: "Customer profile: pro tier, account verified, issue severity medium.",
      },
    ],
    metrics: {
      cost_usd: 0.00012,
    },
    decision: {
      outcome: "success",
      retry_reason: "none",
    },
    outcome: "success",
    retry_reason: "none",
    fallback_reason: "none",
    quality_label: "good",
    feedback_score: 5,
  });

  await draftClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "I cannot access billing, can you help?" }],
  });

  await new Promise((resolve) => setTimeout(resolve, waitMs));
  console.log("node example complete");
  console.log({
    feature,
    traceId,
    runId,
    conversationId,
    rootSpanId,
    draftSpanId,
    ingestUrl,
    evaluationSignals: {
      outcome: "success",
      quality_label: "good",
      feedback_score: 5,
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
