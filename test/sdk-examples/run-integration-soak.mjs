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
const localGoSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-go");

const mockPort = Number(process.env.MOCK_INGEST_PORT || 8788);
const ingestUrl = `http://127.0.0.1:${mockPort}/v1/events`;
const eventsUrl = `http://127.0.0.1:${mockPort}/events`;
const statsUrl = `http://127.0.0.1:${mockPort}/stats`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const soakRounds = Number(process.env.TOKVERA_SOAK_ROUNDS || 2);

const sharedEnv = {
  ...process.env,
  TOKVERA_INGEST_URL: ingestUrl,
  TOKVERA_API_KEY: process.env.TOKVERA_API_KEY || "tokvera_project_key",
  TOKVERA_WAIT_MS: process.env.TOKVERA_WAIT_MS || "1200",
  TOKVERA_WAIT_SECONDS: process.env.TOKVERA_WAIT_SECONDS || "4",
};

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
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
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

async function waitForServer(url, maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready
    }
    await sleep(200);
  }
  throw new Error("mock ingest server did not start in time");
}

function hasLocalPythonSdk() {
  return fs.existsSync(path.join(localPythonSdkDir, "tokvera", "__init__.py"));
}

function hasLocalNodeSdk() {
  return fs.existsSync(path.join(localNodeSdkDir, "package.json"));
}

function hasLocalGoSdk() {
  return fs.existsSync(path.join(localGoSdkDir, "go.mod"));
}

function buildPythonEnv(baseEnv) {
  if (!hasLocalPythonSdk()) return { ...baseEnv };
  return {
    ...baseEnv,
    PYTHONPATH: [localPythonSdkDir, baseEnv.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };
}

async function resolvePythonCommand() {
  const candidates = [
    { command: "python", prefix: [] },
    { command: "py", prefix: ["-3"] },
  ];

  for (const candidate of candidates) {
    try {
      await run(candidate.command, [...candidate.prefix, "--version"]);
      return candidate;
    } catch {
      // try next
    }
  }

  throw new Error("Python interpreter not found (tried: python, py -3)");
}

async function installNodeExampleDependencies() {
  await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });
  if (!hasLocalNodeSdk()) return;
  await run(npmCommand, ["run", "build"], { cwd: localNodeSdkDir });
  fs.rmSync(path.join(nodeExampleDir, "node_modules", "@tokvera", "sdk"), {
    recursive: true,
    force: true,
  });
  await run(npmCommand, ["install", "--no-audit", "--no-fund", "--no-save", localNodeSdkDir], {
    cwd: nodeExampleDir,
  });
}

async function resolveGoCommand() {
  const portableName = process.platform === "win32" ? "go.exe" : "go";
  const candidates = [
    process.env.TOKVERA_GO_BIN,
    path.resolve(__dirname, "..", "..", "..", ".tools", "go126b", "go", "bin", portableName),
    path.resolve(__dirname, "..", "..", "..", ".tools", "go126", "go", "bin", portableName),
    "go",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await run(candidate, ["version"], { silent: true });
      return candidate;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function buildFeatureEnv(round) {
  return {
    TOKVERA_FEATURE_EXISTING_APP_JS: `soak_existing_app_js_${round}`,
    TOKVERA_FEATURE_MISTRAL_JS: `soak_mistral_js_${round}`,
    TOKVERA_FEATURE_OPENAI_AGENTS_JS: `soak_openai_agents_js_${round}`,
    TOKVERA_FEATURE_LANGGRAPH_JS: `soak_langgraph_js_${round}`,
    TOKVERA_FEATURE_AUTOGEN_JS: `soak_autogen_js_${round}`,
    TOKVERA_FEATURE_MASTRA_JS: `soak_mastra_js_${round}`,
    TOKVERA_FEATURE_TEMPORAL_JS: `soak_temporal_js_${round}`,
    TOKVERA_FEATURE_PIPECAT_JS: `soak_pipecat_js_${round}`,
    TOKVERA_FEATURE_LIVEKIT_JS: `soak_livekit_js_${round}`,
    TOKVERA_FEATURE_GATEWAY_JS: `soak_gateway_js_${round}`,
    TOKVERA_FEATURE_OTEL_JS: `soak_otel_js_${round}`,
    TOKVERA_FEATURE_EXISTING_APP_PY: `soak_existing_app_py_${round}`,
    TOKVERA_FEATURE_MISTRAL_PY: `soak_mistral_py_${round}`,
    TOKVERA_FEATURE_CLAUDE_AGENT_PY: `soak_claude_agent_py_${round}`,
    TOKVERA_FEATURE_GOOGLE_ADK_PY: `soak_google_adk_py_${round}`,
    TOKVERA_FEATURE_LANGGRAPH_PY: `soak_langgraph_py_${round}`,
    TOKVERA_FEATURE_INSTRUCTOR_PY: `soak_instructor_py_${round}`,
    TOKVERA_FEATURE_PYDANTICAI_PY: `soak_pydanticai_py_${round}`,
    TOKVERA_FEATURE_CREWAI_PY: `soak_crewai_py_${round}`,
    TOKVERA_FEATURE_AUTOGEN_PY: `soak_autogen_py_${round}`,
    TOKVERA_FEATURE_MASTRA_PY: `soak_mastra_py_${round}`,
    TOKVERA_FEATURE_TEMPORAL_PY: `soak_temporal_py_${round}`,
    TOKVERA_FEATURE_PIPECAT_PY: `soak_pipecat_py_${round}`,
    TOKVERA_FEATURE_LIVEKIT_PY: `soak_livekit_py_${round}`,
    TOKVERA_FEATURE_GATEWAY_PY: `soak_gateway_py_${round}`,
    TOKVERA_FEATURE_OTEL_PY: `soak_otel_py_${round}`,
    TOKVERA_FEATURE_EXISTING_APP_GO: `soak_existing_app_go_${round}`,
    TOKVERA_FEATURE_PROVIDERS_GO: `soak_provider_wrappers_go_${round}`,
    TOKVERA_FEATURE_OTEL_GO: `soak_otel_go_${round}`,
  };
}

function eventField(event, topLevelKey, nestedTagKey = topLevelKey) {
  if (typeof event?.[topLevelKey] === "string" && event[topLevelKey].trim().length > 0) {
    return event[topLevelKey].trim();
  }
  if (typeof event?.tags?.[nestedTagKey] === "string" && event.tags[nestedTagKey].trim().length > 0) {
    return event.tags[nestedTagKey].trim();
  }
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json();
}

function analyzeEvents(items) {
  const duplicates = [];
  const seen = new Set();
  const statusBySpan = new Map();

  for (const event of items) {
    const traceId = eventField(event, "trace_id");
    const spanId = eventField(event, "span_id");
    const status = event?.status;
    if (!traceId || !spanId || !status) continue;

    const key = `${traceId}:${spanId}:${status}`;
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }

    const spanKey = `${traceId}:${spanId}`;
    const current = statusBySpan.get(spanKey) ?? new Set();
    current.add(status);
    statusBySpan.set(spanKey, current);
  }

  const invalidLifecycle = [];
  for (const [spanKey, statuses] of statusBySpan.entries()) {
    const hasStart = statuses.has("in_progress");
    const hasSuccess = statuses.has("success");
    const hasFailure = statuses.has("failure");
    if (hasSuccess && hasFailure) {
      invalidLifecycle.push(`${spanKey}:success+failure`);
      continue;
    }
    if (hasStart && !(hasSuccess || hasFailure)) {
      invalidLifecycle.push(`${spanKey}:start_without_terminal`);
      continue;
    }
    if (!hasStart && !hasSuccess && !hasFailure) {
      invalidLifecycle.push(`${spanKey}:no_known_status`);
    }
  }

  return {
    duplicates,
    invalidLifecycle,
  };
}

async function main() {
  console.log(`[soak] starting mock ingest server on ${ingestUrl}`);
  const mockServer = spawn(process.execPath, ["mock-ingest-server.mjs"], {
    cwd: __dirname,
    env: { ...process.env, MOCK_INGEST_PORT: String(mockPort) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  mockServer.stdout.on("data", (chunk) => process.stdout.write(chunk.toString()));
  mockServer.stderr.on("data", (chunk) => process.stderr.write(chunk.toString()));

  try {
    await waitForServer(`http://127.0.0.1:${mockPort}/health`);
    await fetch(statsUrl, { method: "DELETE" });

    await installNodeExampleDependencies();

    const python = await resolvePythonCommand();
    const pythonEnvBase = buildPythonEnv(sharedEnv);
    const go = hasLocalGoSdk() ? await resolveGoCommand() : null;
    const goEnabled = Boolean(go && hasLocalGoSdk());

    for (let round = 1; round <= soakRounds; round += 1) {
      const featureEnv = buildFeatureEnv(round);
      console.log(`[soak] round ${round}/${soakRounds}: node runtime helpers`);
      await run(npmCommand, ["run", "runtime-helpers"], {
        cwd: nodeExampleDir,
        env: {
          ...sharedEnv,
          ...featureEnv,
        },
      });

      console.log(`[soak] round ${round}/${soakRounds}: python runtime helpers`);
      await run(python.command, [...python.prefix, pythonRuntimeHelpersPath], {
        cwd: __dirname,
        env: {
          ...pythonEnvBase,
          ...featureEnv,
        },
      });

      if (goEnabled) {
        console.log(`[soak] round ${round}/${soakRounds}: go manual tracer`);
        await run(go, ["run", "./examples/manual_tracer"], {
          cwd: localGoSdkDir,
          env: {
            ...sharedEnv,
            TOKVERA_FEATURE: featureEnv.TOKVERA_FEATURE_EXISTING_APP_GO,
            TOKVERA_TENANT_ID: "tenant_demo_go",
            TOKVERA_ENVIRONMENT: "soak",
          },
        });

        console.log(`[soak] round ${round}/${soakRounds}: go provider wrappers`);
        await run(go, ["run", "./examples/provider_wrappers"], {
          cwd: localGoSdkDir,
          env: {
            ...sharedEnv,
            TOKVERA_FEATURE: featureEnv.TOKVERA_FEATURE_PROVIDERS_GO,
            TOKVERA_TENANT_ID: "tenant_demo_go",
            TOKVERA_ENVIRONMENT: "soak",
          },
        });

        console.log(`[soak] round ${round}/${soakRounds}: go otel bridge`);
        await run(go, ["run", "./examples/otel_bridge"], {
          cwd: localGoSdkDir,
          env: {
            ...sharedEnv,
            TOKVERA_FEATURE: featureEnv.TOKVERA_FEATURE_OTEL_GO,
            TOKVERA_TENANT_ID: "tenant_demo_go",
            TOKVERA_ENVIRONMENT: "soak",
          },
        });
      }
    }

    await sleep(1500);
    const rawEvents = await fetchJson(eventsUrl);
    const stats = await fetchJson(statsUrl);
    const { duplicates, invalidLifecycle } = analyzeEvents(rawEvents.items || []);

    console.log(`[soak] ingested events: ${stats.count}`);
    console.log(`[soak] lifecycle summary: ${JSON.stringify(stats.lifecycle)}`);

    if (duplicates.length > 0) {
      throw new Error(`duplicate trace/span/status keys detected: ${duplicates.slice(0, 10).join(", ")}`);
    }

    if (invalidLifecycle.length > 0) {
      throw new Error(`invalid lifecycle spans detected: ${invalidLifecycle.slice(0, 10).join(", ")}`);
    }

    if (Number(stats.lifecycle?.with_start_and_terminal || 0) < 40) {
      throw new Error(`expected broad lifecycle coverage, got ${JSON.stringify(stats.lifecycle)}`);
    }

    console.log("[soak] success: no duplicate span-status emissions and lifecycle pairs are complete.");
  } finally {
    mockServer.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`[soak] failed: ${error.message}`);
  process.exit(1);
});
