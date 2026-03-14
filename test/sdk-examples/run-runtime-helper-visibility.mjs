import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodeExampleDir = path.join(__dirname, "node-example");
const pythonRuntimeHelpersPath = path.join(__dirname, "python-example", "runtime_helpers.py");
const localNodeSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-js");
const localPythonSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-python");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const baseUrl = (process.env.TOKVERA_API_BASE_URL || "https://api.tokvera.org").replace(/\/$/, "");
const apiKey = process.env.TOKVERA_API_KEY;
const visibilityTimeoutMs = Number(process.env.SMOKE_VISIBILITY_TIMEOUT_SECONDS || 120) * 1000;
const pollIntervalMs = Number(process.env.SMOKE_VISIBILITY_POLL_SECONDS || 5) * 1000;

if (!apiKey) {
  console.error("[runtime-visibility] TOKVERA_API_KEY is required");
  process.exit(1);
}

const now = Date.now();
const from = new Date(now - 4 * 60 * 60 * 1000).toISOString();
const to = new Date(now + 5 * 60 * 1000).toISOString();
const actionCenterFrom = new Date(now - 2 * 60 * 1000).toISOString();
const actionCenterTo = to;

const nodeFeatures = {
  existingApp: `vis_existing_app_js_${now}`,
  mistral: `vis_mistral_js_${now}`,
  openaiAgents: `vis_openai_agents_js_${now}`,
  langgraph: `vis_langgraph_js_${now}`,
  autogen: `vis_autogen_js_${now}`,
  mastra: `vis_mastra_js_${now}`,
  temporal: `vis_temporal_js_${now}`,
  pipecat: `vis_pipecat_js_${now}`,
  livekit: `vis_livekit_js_${now}`,
  gateway: `vis_gateway_js_${now}`,
  otel: `vis_otel_js_${now}`,
};

const pythonFeatures = {
  existingApp: `vis_existing_app_py_${now}`,
  mistral: `vis_mistral_py_${now}`,
  claudeAgent: `vis_claude_agent_py_${now}`,
  googleAdk: `vis_google_adk_py_${now}`,
  langgraph: `vis_langgraph_py_${now}`,
  instructor: `vis_instructor_py_${now}`,
  pydanticai: `vis_pydanticai_py_${now}`,
  crewai: `vis_crewai_py_${now}`,
  autogen: `vis_autogen_py_${now}`,
  mastra: `vis_mastra_py_${now}`,
  temporal: `vis_temporal_py_${now}`,
  pipecat: `vis_pipecat_py_${now}`,
  livekit: `vis_livekit_py_${now}`,
  gateway: `vis_gateway_py_${now}`,
  otel: `vis_otel_py_${now}`,
};

const allFeatures = [...Object.values(nodeFeatures), ...Object.values(pythonFeatures)];
const liveFeatures = allFeatures.filter((feature) => !feature.includes("otel"));
const actionCenterFeatures = [
  nodeFeatures.autogen,
  nodeFeatures.temporal,
  nodeFeatures.gateway,
  pythonFeatures.autogen,
  pythonFeatures.temporal,
  pythonFeatures.gateway,
];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (!options.silent) process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (!options.silent) process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });
  });
}

async function requestJson(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${JSON.stringify(body)}`);
  }
  return body;
}

function hasLocalPythonSdk() {
  return fs.existsSync(path.join(localPythonSdkDir, "tokvera", "__init__.py"));
}

function hasLocalNodeSdk() {
  return fs.existsSync(path.join(localNodeSdkDir, "package.json"));
}

function buildPythonEnv(baseEnv) {
  if (!hasLocalPythonSdk()) return { ...baseEnv };
  return {
    ...baseEnv,
    PYTHONPATH: [localPythonSdkDir, baseEnv.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };
}

async function installNodeExampleDependencies() {
  console.log("[runtime-visibility] installing node example dependencies");
  await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });

  if (!hasLocalNodeSdk()) return;

  console.log(`[runtime-visibility] building local js sdk from ${localNodeSdkDir}`);
  await run(npmCommand, ["run", "build"], { cwd: localNodeSdkDir });

  console.log("[runtime-visibility] overriding node example with local js sdk checkout");
  await run(npmCommand, ["install", "--no-audit", "--no-fund", "--no-save", localNodeSdkDir], {
    cwd: nodeExampleDir,
  });
}

async function resolvePythonCommand() {
  const candidates = [
    { command: "python", prefix: [] },
    { command: "py", prefix: ["-3"] },
  ];

  for (const candidate of candidates) {
    try {
      await run(candidate.command, [...candidate.prefix, "--version"], { silent: true });
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error("Python interpreter not found (tried: python, py -3)");
}

async function fetchOverview() {
  return requestJson(`${baseUrl}/v1/metrics/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

async function fetchBreakdown() {
  return requestJson(
    `${baseUrl}/v1/metrics/breakdown?group_by=feature&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

async function fetchTraceMetrics(feature) {
  return requestJson(
    `${baseUrl}/v1/metrics/traces?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=10&feature=${encodeURIComponent(feature)}`
  );
}

async function fetchTraceLive() {
  return requestJson(
    `${baseUrl}/v1/traces/live?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=100&status=all`
  );
}

async function fetchTraceDetail(traceId) {
  return requestJson(
    `${baseUrl}/v1/traces/${encodeURIComponent(traceId)}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=50`
  );
}

async function fetchTraceInspector(traceId) {
  return requestJson(
    `${baseUrl}/v1/traces/${encodeURIComponent(traceId)}/inspector?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&scope=trace&limit=50`
  );
}

async function fetchActionCenter() {
  return requestJson(
    `${baseUrl}/v1/metrics/action-center?from=${encodeURIComponent(actionCenterFrom)}&to=${encodeURIComponent(actionCenterTo)}`
  );
}

async function emitRuntimeHelpers() {
  const sharedEnv = {
    ...process.env,
    TOKVERA_API_KEY: apiKey,
    TOKVERA_INGEST_URL: process.env.TOKVERA_INGEST_URL || `${baseUrl}/v1/events`,
    TOKVERA_WAIT_MS: process.env.TOKVERA_WAIT_MS || "1800",
    TOKVERA_WAIT_SECONDS: process.env.TOKVERA_WAIT_SECONDS || "4",
  };

  await installNodeExampleDependencies();

  console.log("[runtime-visibility] emitting node runtime helper traces");
  await run(npmCommand, ["run", "runtime-helpers"], {
    cwd: nodeExampleDir,
    env: {
      ...sharedEnv,
      TOKVERA_FEATURE_EXISTING_APP_JS: nodeFeatures.existingApp,
      TOKVERA_FEATURE_MISTRAL_JS: nodeFeatures.mistral,
      TOKVERA_FEATURE_OPENAI_AGENTS_JS: nodeFeatures.openaiAgents,
      TOKVERA_FEATURE_LANGGRAPH_JS: nodeFeatures.langgraph,
      TOKVERA_FEATURE_AUTOGEN_JS: nodeFeatures.autogen,
      TOKVERA_FEATURE_MASTRA_JS: nodeFeatures.mastra,
      TOKVERA_FEATURE_TEMPORAL_JS: nodeFeatures.temporal,
      TOKVERA_FEATURE_PIPECAT_JS: nodeFeatures.pipecat,
      TOKVERA_FEATURE_LIVEKIT_JS: nodeFeatures.livekit,
      TOKVERA_FEATURE_GATEWAY_JS: nodeFeatures.gateway,
      TOKVERA_FEATURE_OTEL_JS: nodeFeatures.otel,
    },
  });

  const pythonEnv = {
    ...buildPythonEnv(sharedEnv),
    TOKVERA_FEATURE_EXISTING_APP_PY: pythonFeatures.existingApp,
    TOKVERA_FEATURE_MISTRAL_PY: pythonFeatures.mistral,
    TOKVERA_FEATURE_CLAUDE_AGENT_PY: pythonFeatures.claudeAgent,
    TOKVERA_FEATURE_GOOGLE_ADK_PY: pythonFeatures.googleAdk,
    TOKVERA_FEATURE_LANGGRAPH_PY: pythonFeatures.langgraph,
    TOKVERA_FEATURE_INSTRUCTOR_PY: pythonFeatures.instructor,
    TOKVERA_FEATURE_PYDANTICAI_PY: pythonFeatures.pydanticai,
    TOKVERA_FEATURE_CREWAI_PY: pythonFeatures.crewai,
    TOKVERA_FEATURE_AUTOGEN_PY: pythonFeatures.autogen,
    TOKVERA_FEATURE_MASTRA_PY: pythonFeatures.mastra,
    TOKVERA_FEATURE_TEMPORAL_PY: pythonFeatures.temporal,
    TOKVERA_FEATURE_PIPECAT_PY: pythonFeatures.pipecat,
    TOKVERA_FEATURE_LIVEKIT_PY: pythonFeatures.livekit,
    TOKVERA_FEATURE_GATEWAY_PY: pythonFeatures.gateway,
    TOKVERA_FEATURE_OTEL_PY: pythonFeatures.otel,
  };

  const python = await resolvePythonCommand();
  if (!hasLocalPythonSdk()) {
    console.log("[runtime-visibility] installing python sdk from PyPI");
    await run(python.command, [...python.prefix, "-m", "pip", "install", "--quiet", "tokvera"], {
      env: pythonEnv,
    });
  } else {
    console.log(`[runtime-visibility] using local python sdk from ${localPythonSdkDir}`);
  }

  console.log("[runtime-visibility] emitting python runtime helper traces");
  await run(python.command, [...python.prefix, pythonRuntimeHelpersPath], {
    cwd: __dirname,
    env: pythonEnv,
  });
}

function getFeatureCounts(breakdown) {
  const items = Array.isArray(breakdown?.items) ? breakdown.items : [];
  return items.reduce((acc, item) => {
    if (typeof item?.group === "string") {
      acc[item.group] = Number(item?.request_count || 0);
    }
    return acc;
  }, {});
}

async function waitForVisibility(beforeOverviewRequests) {
  const started = Date.now();
  let lastState = null;

  while (Date.now() - started < visibilityTimeoutMs) {
    const [overview, breakdown, live, actionCenter] = await Promise.all([
      fetchOverview(),
      fetchBreakdown(),
      fetchTraceLive(),
      fetchActionCenter(),
    ]);

    const featureCounts = getFeatureCounts(breakdown);
    const missingBreakdown = allFeatures.filter((feature) => Number(featureCounts[feature] || 0) < 1);
    const liveFeaturesSeen = new Set((live.items || []).map((item) => item.feature).filter(Boolean));
    const missingLive = liveFeatures.filter((feature) => !liveFeaturesSeen.has(feature));
    const actionCenterFeaturesSeen = new Set(
      ((actionCenter?.action_center?.evaluation_signals?.by_feature || [])).map((item) => item.feature)
    );
    const missingActionCenter = actionCenterFeatures.filter((feature) => !actionCenterFeaturesSeen.has(feature));

    const traceChecks = {};
    const missingTraceCoverage = [];
    for (const feature of allFeatures) {
      const traceMetrics = await fetchTraceMetrics(feature);
      const traceId =
        traceMetrics?.summary?.groups?.[0]?.trace_id ||
        traceMetrics?.items?.[0]?.tags?.trace_id ||
        null;
      if (!traceId) {
        missingTraceCoverage.push(feature);
        continue;
      }
      const [detail, inspector] = await Promise.all([
        fetchTraceDetail(traceId),
        fetchTraceInspector(traceId),
      ]);
      const detailOk = detail?.trace?.trace_id === traceId;
      const inspectorOk = inspector?.selection?.trace_id === traceId && inspector?.metadata;
      if (!detailOk || !inspectorOk) {
        missingTraceCoverage.push(feature);
        continue;
      }
      traceChecks[feature] = traceId;
    }

    const overviewRequests = Number(overview?.overview?.request_count || overview?.request_count || 0);
    const overviewOk = overviewRequests > beforeOverviewRequests;

    lastState = {
      overviewRequests,
      featureCounts,
      liveFeaturesSeen: Array.from(liveFeaturesSeen),
      actionCenterFeaturesSeen: Array.from(actionCenterFeaturesSeen),
      traceChecks,
      missingBreakdown,
      missingLive,
      missingActionCenter,
      missingTraceCoverage,
    };

    if (
      overviewOk &&
      missingBreakdown.length === 0 &&
      missingLive.length === 0 &&
      missingActionCenter.length === 0 &&
      missingTraceCoverage.length === 0
    ) {
      return lastState;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `visibility timeout (${visibilityTimeoutMs}ms). Last state=${JSON.stringify(lastState, null, 2)}`
  );
}

async function main() {
  console.log(`[runtime-visibility] base=${baseUrl}`);
  console.log(`[runtime-visibility] from=${from}`);
  console.log(`[runtime-visibility] to=${to}`);
  console.log(`[runtime-visibility] action-center-from=${actionCenterFrom}`);
  console.log(`[runtime-visibility] action-center-to=${actionCenterTo}`);

  const beforeOverview = await fetchOverview();
  const beforeOverviewRequests = Number(
    beforeOverview?.overview?.request_count || beforeOverview?.request_count || 0
  );
  console.log(`[runtime-visibility] overview before=${beforeOverviewRequests}`);

  await emitRuntimeHelpers();

  console.log("[runtime-visibility] waiting for dashboard visibility across overview, traces, live, detail, inspector, and action center");
  const state = await waitForVisibility(beforeOverviewRequests);

  console.log("[runtime-visibility] success");
  console.log(
    JSON.stringify(
      {
        overview_request_count: state.overviewRequests,
        verified_trace_ids: state.traceChecks,
        breakdown_features: state.featureCounts,
        live_features: state.liveFeaturesSeen,
        action_center_features: state.actionCenterFeaturesSeen,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[runtime-visibility] failed: ${error.message}`);
  process.exit(1);
});
