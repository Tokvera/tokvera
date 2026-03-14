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
const localPythonSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-python");

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
  nodeOTel: process.env.TOKVERA_FEATURE_OTEL_JS || "runtime_otel_js",
  pythonExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_PY || "runtime_existing_app_py",
  pythonMistral: process.env.TOKVERA_FEATURE_MISTRAL_PY || "runtime_mistral_py",
  pythonClaudeAgent: process.env.TOKVERA_FEATURE_CLAUDE_AGENT_PY || "runtime_claude_agent_py",
  pythonGoogleADK: process.env.TOKVERA_FEATURE_GOOGLE_ADK_PY || "runtime_google_adk_py",
  pythonLangGraph: process.env.TOKVERA_FEATURE_LANGGRAPH_PY || "runtime_langgraph_py",
  pythonInstructor: process.env.TOKVERA_FEATURE_INSTRUCTOR_PY || "runtime_instructor_py",
  pythonPydanticAI: process.env.TOKVERA_FEATURE_PYDANTICAI_PY || "runtime_pydanticai_py",
  pythonCrewAI: process.env.TOKVERA_FEATURE_CREWAI_PY || "runtime_crewai_py",
  pythonOTel: process.env.TOKVERA_FEATURE_OTEL_PY || "runtime_otel_py",
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

function buildPythonEnv(baseEnv) {
  if (!hasLocalPythonSdk()) return { ...baseEnv };
  return {
    ...baseEnv,
    PYTHONPATH: [localPythonSdkDir, baseEnv.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };
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

    console.log("[smoke] installing node example dependencies");
    await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });

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
        TOKVERA_FEATURE_OTEL_PY: runtimeHelperFeatures.pythonOTel,
      },
    });

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
    const missingFeatures = expectedFeatures.filter(
      (feature) => Number(stats.features?.[feature] || 0) < 1
    );
    if (missingFeatures.length) {
      throw new Error(`missing expected feature coverage: ${missingFeatures.join(", ")}`);
    }

    const missingProviders = ["openai", "mistral", "tokvera"].filter(
      (provider) => Number(stats.providers?.[provider] || 0) < 1
    );
    if (missingProviders.length) {
      throw new Error(`missing expected provider coverage: ${missingProviders.join(", ")}`);
    }

    if (Number(stats.statuses?.in_progress || 0) < 6) {
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
