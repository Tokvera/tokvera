import crypto from "node:crypto";
import { createTokveraTracer, finishSpan, getTrackOptionsFromTraceContext, startSpan, startTrace, trackOpenAI } from "@tokvera/sdk";
import { loadLocalEnv } from "./env.mjs";

const fakeOpenAI = {
  responses: {
    async create(payload) {
      return {
        id: `resp_${crypto.randomUUID().replace(/-/g, "")}`,
        model: payload.model || "gpt-4o-mini",
        usage: {
          prompt_tokens: 14,
          completion_tokens: 18,
          total_tokens: 32,
        },
      };
    },
  },
};

async function main() {
  loadLocalEnv();

  const apiKey = process.env.TOKVERA_API_KEY;
  const ingestUrl = process.env.TOKVERA_INGEST_URL;
  const feature = process.env.TOKVERA_FEATURE || "node_existing_app_template";
  const waitMs = Number(process.env.TOKVERA_WAIT_MS || 1200);

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
    step_name: "handle_request",
    model: "existing-app-template",
    span_kind: "orchestrator",
  });

  const classify = startSpan(root, {
    step_name: "classify_ticket",
    provider: "openai",
    model: "gpt-4o-mini",
    span_kind: "model",
  });

  const client = trackOpenAI(fakeOpenAI, {
    ...getTrackOptionsFromTraceContext(classify, {
      step_name: "classify_ticket",
      span_kind: "model",
      capture_content: true,
    }),
  });

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: "Classify this ticket: customer cannot update billing card.",
  });

  finishSpan(classify, { response, model: "gpt-4o-mini" });
  finishSpan(root, { response: { route: "billing_support" } });

  await new Promise((resolve) => setTimeout(resolve, waitMs));
  console.log("node existing-app starter complete");
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
