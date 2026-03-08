import crypto from "node:crypto";
import {
  createTokveraExpressMiddleware,
  createTokveraLangChainCallback,
  getTrackOptionsFromExpressRequest,
  trackOpenAI,
  wrapVercelAIGenerateText,
} from "@tokvera/sdk";
import { loadLocalEnv } from "./env.mjs";

const fakeOpenAI = {
  chat: {
    completions: {
      async create(payload) {
        return {
          id: "chat_integration_1",
          model: payload.model || "gpt-4o-mini",
          usage: {
            prompt_tokens: 14,
            completion_tokens: 18,
            total_tokens: 32,
          },
        };
      },
    },
  },
  responses: {
    async create(payload) {
      return {
        id: "resp_integration_1",
        model: payload.model || "gpt-4o-mini",
        usage: {
          prompt_tokens: 9,
          completion_tokens: 11,
          total_tokens: 20,
        },
      };
    },
  },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nextId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function runExpressMiddlewareExample({ apiKey, ingestUrl, feature }) {
  const middleware = createTokveraExpressMiddleware({
    feature: `${feature}_express`,
    tenant_id: (request) => request.user?.tenantId,
    customer_id: (request) => request.user?.customerId,
    environment: "example",
    quality_label: "good",
    feedback_score: 4.5,
  });

  const request = {
    headers: {
      "x-tokvera-trace-id": nextId("trc"),
      "x-tokvera-run-id": nextId("run"),
      "x-tokvera-conversation-id": nextId("conv"),
    },
    method: "POST",
    path: "/api/reply",
    user: {
      tenantId: "example_tenant",
      customerId: "example_customer",
    },
  };

  const response = {
    locals: {},
    setHeader() {},
  };

  middleware(request, response, () => {});

  const client = trackOpenAI(
    fakeOpenAI,
    getTrackOptionsFromExpressRequest(request, {
      api_key: apiKey,
      ingest_url: ingestUrl,
      step_name: "draft_reply",
    })
  );

  await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello from Express middleware example" }],
  });

  return request.tokvera;
}

async function runLangChainCallbackExample({ apiKey, ingestUrl, feature }) {
  const callback = createTokveraLangChainCallback({
    api_key: apiKey,
    ingest_url: ingestUrl,
    feature: `${feature}_langchain`,
    tenant_id: "example_tenant",
    conversation_id: nextId("conv"),
    quality_label: "good",
    feedback_score: 5,
  });

  const runId = nextId("run");

  await callback.handleLLMStart(
    { kwargs: { model: "gpt-4o-mini" } },
    ["Summarize account status"],
    runId,
    undefined,
    { invocation_params: { model: "gpt-4o-mini" } },
    [],
    { step_name: "summarize_status" },
    "SummarizeStatus"
  );

  await callback.handleLLMEnd(
    {
      llmOutput: {
        tokenUsage: {
          promptTokens: 16,
          completionTokens: 10,
          totalTokens: 26,
        },
      },
    },
    runId
  );
}

async function runVercelAIHelperExample({ apiKey, ingestUrl, feature }) {
  const fakeGenerateText = async ({ model }) => ({
    text: "Synthetic response from wrapped Vercel helper",
    model,
    usage: {
      promptTokens: 8,
      completionTokens: 12,
      totalTokens: 20,
    },
  });

  const trackedGenerateText = wrapVercelAIGenerateText(fakeGenerateText, {
    api_key: apiKey,
    ingest_url: ingestUrl,
    feature: `${feature}_vercel_ai`,
    tenant_id: "example_tenant",
    environment: "example",
    trace_id: nextId("trc"),
    run_id: nextId("run"),
    span_id: nextId("spn"),
    step_name: "vercel_answer",
    quality_label: "good",
    feedback_score: 4,
  });

  await trackedGenerateText({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello from Vercel AI helper example" }],
  });
}

async function main() {
  loadLocalEnv();

  const apiKey = process.env.TOKVERA_API_KEY;
  const ingestUrl = process.env.TOKVERA_INGEST_URL;
  const feature = process.env.TOKVERA_FEATURE || "sdk_integrations_node";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1500);

  if (!apiKey) throw new Error("TOKVERA_API_KEY is required");
  if (!ingestUrl) throw new Error("TOKVERA_INGEST_URL is required");

  const middlewareContext = await runExpressMiddlewareExample({ apiKey, ingestUrl, feature });
  await runLangChainCallbackExample({ apiKey, ingestUrl, feature });
  await runVercelAIHelperExample({ apiKey, ingestUrl, feature });

  await wait(waitMs);
  console.log("node integrations example complete");
  console.log({
    feature,
    ingestUrl,
    middlewareTraceId: middlewareContext?.trace_id,
    middlewareRunId: middlewareContext?.run_id,
    examples: ["express_middleware", "langchain_callback", "vercel_ai_wrapper"],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
