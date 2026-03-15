import crypto from "node:crypto";
import { createTokveraTracer, finishSpan, getTrackOptionsFromTraceContext, startSpan, startTrace, trackAnthropic, trackOpenAI } from "@tokvera/sdk";
import { loadLocalEnv } from "./env.mjs";

const fakeOpenAI = {
  responses: {
    async create(payload) {
      return {
        id: `resp_${crypto.randomUUID().replace(/-/g, "")}`,
        model: payload.model || "gpt-4o-mini",
        usage: {
          prompt_tokens: 12,
          completion_tokens: 14,
          total_tokens: 26,
        },
      };
    },
  },
};

const fakeAnthropic = {
  messages: {
    async create(payload) {
      return {
        id: `msg_${crypto.randomUUID().replace(/-/g, "")}`,
        model: payload.model || "claude-3-5-sonnet-latest",
        usage: {
          input_tokens: 16,
          output_tokens: 22,
          total_tokens: 38,
        },
      };
    },
  },
};

async function main() {
  loadLocalEnv();

  const apiKey = process.env.TOKVERA_API_KEY;
  const ingestUrl = process.env.TOKVERA_INGEST_URL;
  const feature = process.env.TOKVERA_FEATURE || "node_multi_model_router_template";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1400);

  if (!apiKey) throw new Error("TOKVERA_API_KEY is required");
  if (!ingestUrl) throw new Error("TOKVERA_INGEST_URL is required");

  const tracer = createTokveraTracer({
    api_key: apiKey,
    ingest_url: ingestUrl,
    feature,
    tenant_id: "starter_tenant",
    customer_id: "starter_customer",
    environment: "starter",
    emitLifecycleEvents: true,
  });

  const root = startTrace(tracer.baseOptions, {
    step_name: "route_request",
    model: "multi-model-router",
    span_kind: "orchestrator",
  });

  const routeDecision = startSpan(root, {
    step_name: "route_decision",
    span_kind: "orchestrator",
  });
  finishSpan(routeDecision, { response: { selected_provider: "openai", fallback_provider: "anthropic" } });

  const openaiSpan = startSpan(root, {
    step_name: "draft_with_openai",
    provider: "openai",
    model: "gpt-4o-mini",
    span_kind: "model",
  });

  const openai = trackOpenAI(fakeOpenAI, {
    ...getTrackOptionsFromTraceContext(openaiSpan, {
      step_name: "draft_with_openai",
      span_kind: "model",
      capture_content: true,
    }),
  });

  const openaiResponse = await openai.responses.create({
    model: "gpt-4o-mini",
    input: "Draft a support reply for a billing-card update issue.",
  });
  finishSpan(openaiSpan, { response: openaiResponse, model: "gpt-4o-mini" });

  const anthropicSpan = startSpan(root, {
    step_name: "fallback_with_anthropic",
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    span_kind: "model",
  });

  const anthropic = trackAnthropic(fakeAnthropic, {
    ...getTrackOptionsFromTraceContext(anthropicSpan, {
      step_name: "fallback_with_anthropic",
      span_kind: "model",
      capture_content: true,
      fallback_reason: "quality_review",
    }),
  });

  const anthropicResponse = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 256,
    messages: [{ role: "user", content: "Improve the reply tone for a billing support answer." }],
  });
  finishSpan(anthropicSpan, {
    response: anthropicResponse,
    model: "claude-3-5-sonnet-latest",
    fallback_reason: "quality_review",
  });

  finishSpan(root, { response: { final_provider: "anthropic", route: "billing_support" } });

  await new Promise((resolve) => setTimeout(resolve, waitMs));
  console.log("node multi-model router starter complete");
  console.log({
    feature,
    traceId: root.trace_id,
    runId: root.run_id,
    liveTraces: "/dashboard/traces/live",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
