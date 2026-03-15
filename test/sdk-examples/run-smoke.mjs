import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodeExampleDir = path.join(__dirname, "node-example");
const pythonExamplePath = path.join(__dirname, "python-example", "example.py");
const pythonRuntimeHelpersPath = path.join(__dirname, "python-example", "runtime_helpers.py");
const localNodeSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-js");
const localPythonSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-python");
const localGoSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-go");

const mockPort = Number(process.env.MOCK_INGEST_PORT || 8787);
const ingestUrl = `http://127.0.0.1:${mockPort}/v1/events`;
const statsUrl = `http://127.0.0.1:${mockPort}/stats`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sharedEnv = {
  ...process.env,
  TOKVERA_INGEST_URL: ingestUrl,
  TOKVERA_API_KEY: process.env.TOKVERA_API_KEY || "tokvera_project_key",
};

const runtimeHelperFeatures = {
  nodeExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_JS || "runtime_existing_app_js",
  nodeMistral: process.env.TOKVERA_FEATURE_MISTRAL_JS || "runtime_mistral_js",
  nodeOpenAIAgents: process.env.TOKVERA_FEATURE_OPENAI_AGENTS_JS || "runtime_openai_agents_js",
  nodeLangGraph: process.env.TOKVERA_FEATURE_LANGGRAPH_JS || "runtime_langgraph_js",
  nodeAutoGen: process.env.TOKVERA_FEATURE_AUTOGEN_JS || "runtime_autogen_js",
  nodeMastra: process.env.TOKVERA_FEATURE_MASTRA_JS || "runtime_mastra_js",
  nodeTemporal: process.env.TOKVERA_FEATURE_TEMPORAL_JS || "runtime_temporal_js",
  nodePipecat: process.env.TOKVERA_FEATURE_PIPECAT_JS || "runtime_pipecat_js",
  nodeLiveKit: process.env.TOKVERA_FEATURE_LIVEKIT_JS || "runtime_livekit_js",
  nodeGateway: process.env.TOKVERA_FEATURE_GATEWAY_JS || "runtime_gateway_js",
  nodeOTel: process.env.TOKVERA_FEATURE_OTEL_JS || "runtime_otel_js",
  pythonExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_PY || "runtime_existing_app_py",
  pythonMistral: process.env.TOKVERA_FEATURE_MISTRAL_PY || "runtime_mistral_py",
  pythonClaudeAgent: process.env.TOKVERA_FEATURE_CLAUDE_AGENT_PY || "runtime_claude_agent_py",
  pythonGoogleADK: process.env.TOKVERA_FEATURE_GOOGLE_ADK_PY || "runtime_google_adk_py",
  pythonLangGraph: process.env.TOKVERA_FEATURE_LANGGRAPH_PY || "runtime_langgraph_py",
  pythonInstructor: process.env.TOKVERA_FEATURE_INSTRUCTOR_PY || "runtime_instructor_py",
  pythonPydanticAI: process.env.TOKVERA_FEATURE_PYDANTICAI_PY || "runtime_pydanticai_py",
  pythonCrewAI: process.env.TOKVERA_FEATURE_CREWAI_PY || "runtime_crewai_py",
  pythonAutoGen: process.env.TOKVERA_FEATURE_AUTOGEN_PY || "runtime_autogen_py",
  pythonMastra: process.env.TOKVERA_FEATURE_MASTRA_PY || "runtime_mastra_py",
  pythonTemporal: process.env.TOKVERA_FEATURE_TEMPORAL_PY || "runtime_temporal_py",
  pythonPipecat: process.env.TOKVERA_FEATURE_PIPECAT_PY || "runtime_pipecat_py",
  pythonLiveKit: process.env.TOKVERA_FEATURE_LIVEKIT_PY || "runtime_livekit_py",
  pythonGateway: process.env.TOKVERA_FEATURE_GATEWAY_PY || "runtime_gateway_py",
  pythonOTel: process.env.TOKVERA_FEATURE_OTEL_PY || "runtime_otel_py",
  goExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_GO || "runtime_existing_app_go",
  goProviders: process.env.TOKVERA_FEATURE_PROVIDERS_GO || "runtime_provider_wrappers_go",
  goOTel: process.env.TOKVERA_FEATURE_OTEL_GO || "runtime_otel_go",
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

async function installNodeExampleDependencies() {
  console.log("[smoke] installing node example dependencies");
  await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });

  if (!hasLocalNodeSdk()) return;

  console.log(`[smoke] building local js sdk from ${localNodeSdkDir}`);
  await run(npmCommand, ["run", "build"], { cwd: localNodeSdkDir });

  console.log("[smoke] overriding node example with local js sdk checkout");
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

async function main() {
  console.log(`[smoke] starting mock ingest server on ${ingestUrl}`);
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

    console.log("[smoke] running node sdk example");
    await run(npmCommand, ["run", "example"], {
      cwd: nodeExampleDir,
      env: sharedEnv,
    });

    console.log("[smoke] running node runtime helper example");
    await run(npmCommand, ["run", "runtime-helpers"], {
      cwd: nodeExampleDir,
      env: {
        ...sharedEnv,
        TOKVERA_FEATURE_EXISTING_APP_JS: runtimeHelperFeatures.nodeExistingApp,
        TOKVERA_FEATURE_MISTRAL_JS: runtimeHelperFeatures.nodeMistral,
        TOKVERA_FEATURE_OPENAI_AGENTS_JS: runtimeHelperFeatures.nodeOpenAIAgents,
        TOKVERA_FEATURE_LANGGRAPH_JS: runtimeHelperFeatures.nodeLangGraph,
        TOKVERA_FEATURE_AUTOGEN_JS: runtimeHelperFeatures.nodeAutoGen,
        TOKVERA_FEATURE_MASTRA_JS: runtimeHelperFeatures.nodeMastra,
        TOKVERA_FEATURE_TEMPORAL_JS: runtimeHelperFeatures.nodeTemporal,
        TOKVERA_FEATURE_PIPECAT_JS: runtimeHelperFeatures.nodePipecat,
        TOKVERA_FEATURE_LIVEKIT_JS: runtimeHelperFeatures.nodeLiveKit,
        TOKVERA_FEATURE_GATEWAY_JS: runtimeHelperFeatures.nodeGateway,
        TOKVERA_FEATURE_OTEL_JS: runtimeHelperFeatures.nodeOTel,
      },
    });

    const python = await resolvePythonCommand();
    const pythonEnv = buildPythonEnv(sharedEnv);
    if (hasLocalPythonSdk()) {
      console.log(`[smoke] using local python sdk from ${localPythonSdkDir}`);
    } else {
      console.log("[smoke] ensuring python sdk is installed");
      await run(python.command, [...python.prefix, "-m", "pip", "install", "--quiet", "tokvera"], {
        env: pythonEnv,
      });
    }

    console.log("[smoke] running python sdk example");
    await run(python.command, [...python.prefix, pythonExamplePath], {
      cwd: __dirname,
      env: pythonEnv,
    });

    console.log("[smoke] running python runtime helper example");
    await run(python.command, [...python.prefix, pythonRuntimeHelpersPath], {
      cwd: __dirname,
      env: {
        ...pythonEnv,
        TOKVERA_FEATURE_EXISTING_APP_PY: runtimeHelperFeatures.pythonExistingApp,
        TOKVERA_FEATURE_MISTRAL_PY: runtimeHelperFeatures.pythonMistral,
        TOKVERA_FEATURE_CLAUDE_AGENT_PY: runtimeHelperFeatures.pythonClaudeAgent,
        TOKVERA_FEATURE_GOOGLE_ADK_PY: runtimeHelperFeatures.pythonGoogleADK,
        TOKVERA_FEATURE_LANGGRAPH_PY: runtimeHelperFeatures.pythonLangGraph,
        TOKVERA_FEATURE_INSTRUCTOR_PY: runtimeHelperFeatures.pythonInstructor,
        TOKVERA_FEATURE_PYDANTICAI_PY: runtimeHelperFeatures.pythonPydanticAI,
        TOKVERA_FEATURE_CREWAI_PY: runtimeHelperFeatures.pythonCrewAI,
        TOKVERA_FEATURE_AUTOGEN_PY: runtimeHelperFeatures.pythonAutoGen,
        TOKVERA_FEATURE_MASTRA_PY: runtimeHelperFeatures.pythonMastra,
        TOKVERA_FEATURE_TEMPORAL_PY: runtimeHelperFeatures.pythonTemporal,
        TOKVERA_FEATURE_PIPECAT_PY: runtimeHelperFeatures.pythonPipecat,
        TOKVERA_FEATURE_LIVEKIT_PY: runtimeHelperFeatures.pythonLiveKit,
        TOKVERA_FEATURE_GATEWAY_PY: runtimeHelperFeatures.pythonGateway,
        TOKVERA_FEATURE_OTEL_PY: runtimeHelperFeatures.pythonOTel,
      },
    });

    const go = hasLocalGoSdk() ? await resolveGoCommand() : null;
    const goEnabled = Boolean(go && hasLocalGoSdk());
    if (goEnabled) {
      console.log("[smoke] running go manual tracer example");
      await run(go, ["run", "./examples/manual_tracer"], {
        cwd: localGoSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.goExistingApp,
          TOKVERA_TENANT_ID: "tenant_demo_go",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });

      console.log("[smoke] running go provider wrappers example");
      await run(go, ["run", "./examples/provider_wrappers"], {
        cwd: localGoSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.goProviders,
          TOKVERA_TENANT_ID: "tenant_demo_go",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });

      console.log("[smoke] running go otel bridge example");
      await run(go, ["run", "./examples/otel_bridge"], {
        cwd: localGoSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.goOTel,
          TOKVERA_TENANT_ID: "tenant_demo_go",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });
    } else {
      console.log("[smoke] skipping go examples (tokvera-go repo or go toolchain unavailable)");
    }

    // Allow final async sends to complete.
    await sleep(1000);
    const statsResponse = await fetch(statsUrl);
    const stats = await statsResponse.json();
    console.log(`[smoke] ingested events: ${stats.count}`);
    console.log(`[smoke] endpoints: ${JSON.stringify(stats.endpoints)}`);
    console.log(`[smoke] features: ${JSON.stringify(stats.features)}`);
    console.log(`[smoke] providers: ${JSON.stringify(stats.providers)}`);
    console.log(`[smoke] statuses: ${JSON.stringify(stats.statuses)}`);

    const expectedFeatures = [
      "sdk_smoke_node",
      "sdk_smoke_python",
      ...Object.values(runtimeHelperFeatures),
    ];
    const goFeatures = [
      runtimeHelperFeatures.goExistingApp,
      runtimeHelperFeatures.goProviders,
      runtimeHelperFeatures.goOTel,
    ];
    const shouldExpectGo = goEnabled;
    const missingFeatures = expectedFeatures.filter(
      (feature) => Number(stats.features?.[feature] || 0) < 1
    );
    const relevantMissingFeatures = shouldExpectGo
      ? missingFeatures
      : missingFeatures.filter((feature) => !goFeatures.includes(feature));
    if (relevantMissingFeatures.length) {
      throw new Error(`missing expected feature coverage: ${relevantMissingFeatures.join(", ")}`);
    }

    const missingProviders = ["openai", "mistral", "tokvera"].filter(
      (provider) => Number(stats.providers?.[provider] || 0) < 1
    );
    if (missingProviders.length) {
      throw new Error(`missing expected provider coverage: ${missingProviders.join(", ")}`);
    }

    if (Number(stats.statuses?.in_progress || 0) < 12) {
      throw new Error(
        `expected multiple lifecycle start events, got statuses=${JSON.stringify(stats.statuses)}`
      );
    }

    console.log("[smoke] success: SDK examples and runtime helper matrix emitted expected coverage.");
  } finally {
    mockServer.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`[smoke] failed: ${error.message}`);
  process.exit(1);
});
