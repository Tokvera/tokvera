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
  const apiKey = process.env.TOKVERA_API_KEY;
  const ingestUrl = process.env.TOKVERA_INGEST_URL;
  const feature = process.env.TOKVERA_FEATURE || "sdk_example_node";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1200);

  if (!apiKey) throw new Error("TOKVERA_API_KEY is required");
  if (!ingestUrl) throw new Error("TOKVERA_INGEST_URL is required");

  const traceId = nextId("trc");
  const conversationId = nextId("conv");
  const rootSpanId = nextId("spn");

  const classifyClient = trackOpenAI(fakeOpenAI, {
    api_key: apiKey,
    ingest_url: ingestUrl,
    feature,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "example",
    trace_id: traceId,
    conversation_id: conversationId,
    span_id: rootSpanId,
    step_name: "classify_intent",
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
    trace_id: traceId,
    conversation_id: conversationId,
    span_id: draftSpanId,
    parent_span_id: rootSpanId,
    step_name: "draft_reply",
  });

  await draftClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "I cannot access billing, can you help?" }],
  });

  await new Promise((resolve) => setTimeout(resolve, waitMs));
  console.log("node example complete");
  console.log({ feature, traceId, conversationId, rootSpanId, draftSpanId, ingestUrl });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

