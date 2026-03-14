import crypto from "node:crypto";
import {
  TokveraOTelSpanExporter,
  createTokveraLangGraphHooks,
  createTokveraOpenAIAgentsTracingProcessor,
  createTokveraTracer,
  finishSpan,
  getTrackOptionsFromTraceContext,
  startSpan,
  startTrace,
  trackMistral,
} from "@tokvera/sdk";
import { loadLocalEnv } from "./env.mjs";

function nextId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function createFakeMistralClient() {
  return {
    chat: {
      async complete(payload) {
        return {
          id: "mistral_resp_1",
          model: payload.model || "mistral-small-latest",
          usage: {
            prompt_tokens: 13,
            completion_tokens: 11,
            total_tokens: 24,
          },
          choices: [
            {
              message: {
                content: "Drafted a short answer for the customer.",
              },
            },
          ],
        };
      },
    },
  };
}

async function runExistingAppFeature(baseOptions, feature) {
  const tracer = createTokveraTracer({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const root = startTrace(tracer.baseOptions, {
    step_name: "existing_app_router",
    model: "custom-router",
    span_kind: "orchestrator",
    payload_blocks: [
      {
        payload_type: "context",
        content: "Support router policy: prefer direct answer unless escalation is required.",
      },
    ],
    quality_label: "good",
    feedback_score: 4.8,
    outcome: "success",
  });

  const policy = startSpan(root, {
    step_name: "route_policy",
    provider: "tokvera",
    model: "policy-engine",
    span_kind: "guardrail",
    routing_reason: "default_policy",
    route: "openai:gpt-4o-mini",
    decision: {
      routing_reason: "default_policy",
      route: "openai:gpt-4o-mini",
      outcome: "success",
    },
    metrics: {
      cost_usd: 0.00001,
    },
    quality_label: "good",
  });

  finishSpan(policy, {
    response: { selected_route: "openai:gpt-4o-mini" },
    quality_label: "good",
    outcome: "success",
  });
  finishSpan(root, {
    response: { completed: true },
    quality_label: "good",
    feedback_score: 4.9,
    outcome: "success",
  });
}

async function runMistralFeature(baseOptions, feature) {
  const tracer = createTokveraTracer({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });
  const root = startTrace(tracer.baseOptions, {
    step_name: "mistral_support_flow",
    model: "mistral-router",
    span_kind: "orchestrator",
    quality_label: "poor",
    feedback_score: 2.2,
    outcome: "success",
  });
  const client = trackMistral(createFakeMistralClient(), {
    ...getTrackOptionsFromTraceContext(root, {
      step_name: "mistral_reply",
      span_kind: "model",
      provider: "mistral",
      model: "mistral-small-latest",
      quality_label: "poor",
      feedback_score: 2.1,
      outcome: "success",
      emit_lifecycle_events: true,
      capture_content: true,
    }),
    payload_blocks: [
      {
        payload_type: "context",
        content: "Priority user profile: respond in under three sentences and include the refund policy.",
      },
    ],
  });

  const response = await client.chat.complete({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: "Draft a concise refund policy reply." }],
  });
  finishSpan(root, {
    response: { completed: true, provider_response: response.choices?.[0]?.message?.content ?? null },
    quality_label: "poor",
    feedback_score: 2.2,
    outcome: "success",
  });
}

async function runOpenAIAgentsFeature(baseOptions, feature) {
  const processor = createTokveraOpenAIAgentsTracingProcessor({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const run = processor.onAgentStart({
    step_name: "support_agent",
    model: "agent-router",
    payload_blocks: [
      {
        payload_type: "context",
        content: "Agent policy: call crm_lookup before drafting any loyalty-related answer.",
      },
    ],
    quality_label: "good",
    feedback_score: 4.6,
    outcome: "success",
  });
  const tool = processor.onToolStart(run, {
    step_name: "crm_lookup",
    tool_name: "crm_lookup",
    input: { customer_id: "cust_100" },
  });
  processor.onToolEnd(tool, {
    response: { customer_tier: "priority" },
    quality_label: "good",
    outcome: "success",
  });
  const model = processor.onModelStart(run, {
    step_name: "draft_reply",
    provider: "openai",
    model: "gpt-4o-mini",
    input: { role: "user", content: "How do loyalty refunds work?" },
    quality_label: "good",
    feedback_score: 4.9,
    outcome: "success",
  });
  processor.onModelEnd(model, {
    response: { output_text: "Priority customers can request refunds within 30 days." },
    usage: { prompt_tokens: 14, completion_tokens: 12, total_tokens: 26 },
    quality_label: "good",
    feedback_score: 5,
    outcome: "success",
  });
  processor.onAgentEnd(run, {
    response: { status: "completed" },
    quality_label: "good",
    feedback_score: 5,
    outcome: "success",
  });
}

async function runLangGraphFeature(baseOptions, feature) {
  const hooks = createTokveraLangGraphHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const graph = hooks.onGraphStart({
    step_name: "langgraph_support_flow",
    model: "planner-graph",
    quality_label: "good",
    feedback_score: 4.5,
    outcome: "success",
  });
  const planner = hooks.onNodeStart(graph, {
    step_name: "planner",
  });
  hooks.onNodeEnd(planner, {
    response: { next: "kb_lookup" },
    quality_label: "good",
    outcome: "success",
  });
  const branch = hooks.onBranchStart(graph, {
    step_name: "confidence_gate",
    routing_reason: "confidence_below_threshold",
    route: "fallback_path",
  });
  hooks.onBranchEnd(branch, {
    response: { selected_branch: "fallback_path" },
    quality_label: "good",
    feedback_score: 4.4,
    outcome: "success",
  });
  hooks.onGraphEnd(graph, {
    response: { status: "completed" },
    quality_label: "good",
    feedback_score: 4.8,
    outcome: "success",
  });
}

async function runOTelFeature(baseOptions, feature) {
  const exporter = new TokveraOTelSpanExporter({
    ...baseOptions,
    feature,
  });
  const nowSeconds = Math.floor(Date.now() / 1000);
  exporter.export(
    [
      {
        name: "retrieval.plan",
        startTime: [nowSeconds, 0],
        endTime: [nowSeconds, 180_000_000],
        attributes: {
          "tokvera.provider": "openai",
          "tokvera.feature": feature,
          "tokvera.step_name": "retrieval_plan",
          "tokvera.endpoint": "responses.create",
          "tokvera.cost_usd": 0.00002,
          "gen_ai.response.model": "gpt-4o-mini",
          "gen_ai.usage.input_tokens": 7,
          "gen_ai.usage.output_tokens": 4,
        },
        resource: {
          attributes: {
            "service.name": "vector-router",
            "deployment.environment": "test",
          },
        },
        spanContext() {
          return {
            traceId: nextId("trc"),
            spanId: nextId("spn"),
          };
        },
        status: { code: 1 },
      },
    ],
    () => undefined
  );
}

async function main() {
  loadLocalEnv();

  const baseOptions = {
    api_key: process.env.TOKVERA_API_KEY,
    ingest_url: process.env.TOKVERA_INGEST_URL,
    tenant_id: "example_tenant",
    customer_id: "example_customer",
    environment: "test",
    schema_version: "2026-04-01",
  };

  if (!baseOptions.api_key) throw new Error("TOKVERA_API_KEY is required");
  if (!baseOptions.ingest_url) throw new Error("TOKVERA_INGEST_URL is required");

  const features = {
    existingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_JS || "runtime_existing_app_js",
    mistral: process.env.TOKVERA_FEATURE_MISTRAL_JS || "runtime_mistral_js",
    openaiAgents: process.env.TOKVERA_FEATURE_OPENAI_AGENTS_JS || "runtime_openai_agents_js",
    langgraph: process.env.TOKVERA_FEATURE_LANGGRAPH_JS || "runtime_langgraph_js",
    otel: process.env.TOKVERA_FEATURE_OTEL_JS || "runtime_otel_js",
  };

  await runExistingAppFeature(baseOptions, features.existingApp);
  await runMistralFeature(baseOptions, features.mistral);
  await runOpenAIAgentsFeature(baseOptions, features.openaiAgents);
  await runLangGraphFeature(baseOptions, features.langgraph);
  await runOTelFeature(baseOptions, features.otel);

  await new Promise((resolve) => setTimeout(resolve, Number(process.env.TOKVERA_WAIT_MS || 1200)));

  console.log("node runtime helper smoke complete");
  console.log(JSON.stringify({ features }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
