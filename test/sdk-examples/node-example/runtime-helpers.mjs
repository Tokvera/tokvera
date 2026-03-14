import crypto from "node:crypto";
import {
  TokveraOTelSpanExporter,
  createTokveraAutoGenHooks,
  createTokveraLangGraphHooks,
  createTokveraLiveKitHooks,
  createTokveraMastraHooks,
  createTokveraOpenAIAgentsTracingProcessor,
  createTokveraOpenAICompatibleGatewayHooks,
  createTokveraPipecatHooks,
  createTokveraTemporalHooks,
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

async function runAutoGenFeature(baseOptions, feature) {
  const hooks = createTokveraAutoGenHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const conversation = hooks.onConversationStart({
    step_name: "autogen_conversation",
    model: "multi-agent-router",
    quality_label: "poor",
    feedback_score: 2.8,
    outcome: "success",
  });
  const agent = hooks.onAgentStart(conversation, {
    step_name: "planner_agent",
    routing_reason: "delegate_to_planner",
    route: "planner_agent",
  });
  hooks.onAgentEnd(agent, {
    response: { next: "search_docs" },
    quality_label: "poor",
    feedback_score: 2.9,
    outcome: "success",
  });
  hooks.onConversationEnd(conversation, {
    response: { status: "completed" },
    quality_label: "poor",
    feedback_score: 2.9,
    outcome: "success",
  });
}

async function runMastraFeature(baseOptions, feature) {
  const hooks = createTokveraMastraHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const workflow = hooks.onWorkflowStart({
    step_name: "mastra_workflow",
    model: "workflow-router",
    quality_label: "good",
    feedback_score: 4.3,
    outcome: "success",
  });
  const step = hooks.onStepStart(workflow, {
    step_name: "search_docs",
  });
  hooks.onStepEnd(step, {
    response: { matches: 4 },
    quality_label: "good",
    outcome: "success",
  });
  hooks.onWorkflowEnd(workflow, {
    response: { status: "completed" },
    quality_label: "good",
    feedback_score: 4.5,
    outcome: "success",
  });
}

async function runTemporalFeature(baseOptions, feature) {
  const hooks = createTokveraTemporalHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const workflow = hooks.onWorkflowStart({
    step_name: "temporal_workflow",
    model: "workflow-router",
    quality_label: "poor",
    feedback_score: 2.7,
    outcome: "success",
  });
  const activity = hooks.onActivityStart(workflow, {
    step_name: "lookup_account",
    tool_name: "lookup_account",
    retry_reason: "timeout_retry",
  });
  hooks.onActivityEnd(activity, {
    response: { account_status: "active" },
    quality_label: "poor",
    outcome: "success",
  });
  hooks.onWorkflowEnd(workflow, {
    response: { status: "completed" },
    quality_label: "poor",
    feedback_score: 2.9,
    outcome: "success",
  });
}

async function runPipecatFeature(baseOptions, feature) {
  const hooks = createTokveraPipecatHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const turn = hooks.onTurnStart({
    step_name: "voice_turn",
    model: "voice-router",
    quality_label: "good",
    feedback_score: 4.1,
    outcome: "success",
  });
  const transcript = hooks.onTranscriptionStart(turn, {
    step_name: "speech_to_text",
    provider: "openai",
    model: "gpt-4o-mini-transcribe",
  });
  hooks.onTranscriptionEnd(transcript, {
    response: { transcript: "Need account help" },
    usage: { prompt_tokens: 8, completion_tokens: 5, total_tokens: 13 },
    quality_label: "good",
    outcome: "success",
  });
  hooks.onTurnEnd(turn, {
    response: { status: "completed" },
    quality_label: "good",
    feedback_score: 4.2,
    outcome: "success",
  });
}

async function runLiveKitFeature(baseOptions, feature) {
  const hooks = createTokveraLiveKitHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const session = hooks.onSessionStart({
    step_name: "livekit_room_session",
    model: "voice-agent",
    quality_label: "good",
    feedback_score: 4.4,
    outcome: "success",
  });
  const turn = hooks.onTurnStart(session, {
    step_name: "voice_turn",
    provider: "openai",
    model: "gpt-4o-realtime-preview",
  });
  hooks.onTurnEnd(turn, {
    response: { transcript: "Upgrade my plan" },
    usage: { prompt_tokens: 9, completion_tokens: 6, total_tokens: 15 },
    quality_label: "good",
    outcome: "success",
  });
  hooks.onSessionEnd(session, {
    response: { status: "completed" },
    quality_label: "good",
    feedback_score: 4.5,
    outcome: "success",
  });
}

async function runGatewayFeature(baseOptions, feature) {
  const hooks = createTokveraOpenAICompatibleGatewayHooks({
    ...baseOptions,
    feature,
    emit_lifecycle_events: true,
    capture_content: true,
  });

  const request = hooks.onRequestStart({
    step_name: "gateway_request",
    model: "router",
    quality_label: "poor",
    feedback_score: 2.5,
    outcome: "success",
  });
  const downstream = hooks.onDownstreamStart(request, {
    step_name: "downstream_provider_call",
    provider: "openai",
    model: "gpt-4o-mini",
  });
  hooks.onDownstreamEnd(downstream, {
    response: { output_text: "ok" },
    usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
    quality_label: "poor",
    outcome: "success",
  });
  const fallback = hooks.onFallbackStart(request, {
    step_name: "fallback_route",
    fallback_reason: "rate_limit",
    routing_reason: "budget_aware_escalation",
    route: "anthropic:claude-3.5-haiku",
    decision: {
      fallback_reason: "rate_limit",
      routing_reason: "budget_aware_escalation",
      route: "anthropic:claude-3.5-haiku",
      outcome: "success",
    },
  });
  hooks.onFallbackEnd(fallback, {
    response: { route: "anthropic:claude-3.5-haiku" },
    quality_label: "poor",
    feedback_score: 2.6,
    outcome: "success",
  });
  hooks.onRequestEnd(request, {
    response: { status: "completed" },
    quality_label: "poor",
    feedback_score: 2.7,
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
    autogen: process.env.TOKVERA_FEATURE_AUTOGEN_JS || "runtime_autogen_js",
    mastra: process.env.TOKVERA_FEATURE_MASTRA_JS || "runtime_mastra_js",
    temporal: process.env.TOKVERA_FEATURE_TEMPORAL_JS || "runtime_temporal_js",
    pipecat: process.env.TOKVERA_FEATURE_PIPECAT_JS || "runtime_pipecat_js",
    livekit: process.env.TOKVERA_FEATURE_LIVEKIT_JS || "runtime_livekit_js",
    gateway: process.env.TOKVERA_FEATURE_GATEWAY_JS || "runtime_gateway_js",
    otel: process.env.TOKVERA_FEATURE_OTEL_JS || "runtime_otel_js",
  };

  await runExistingAppFeature(baseOptions, features.existingApp);
  await runMistralFeature(baseOptions, features.mistral);
  await runOpenAIAgentsFeature(baseOptions, features.openaiAgents);
  await runLangGraphFeature(baseOptions, features.langgraph);
  await runAutoGenFeature(baseOptions, features.autogen);
  await runMastraFeature(baseOptions, features.mastra);
  await runTemporalFeature(baseOptions, features.temporal);
  await runPipecatFeature(baseOptions, features.pipecat);
  await runLiveKitFeature(baseOptions, features.livekit);
  await runGatewayFeature(baseOptions, features.gateway);
  await runOTelFeature(baseOptions, features.otel);

  await new Promise((resolve) => setTimeout(resolve, Number(process.env.TOKVERA_WAIT_MS || 1200)));

  console.log("node runtime helper smoke complete");
  console.log(JSON.stringify({ features }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
