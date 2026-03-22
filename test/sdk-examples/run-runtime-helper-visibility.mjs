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
const localJavaSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-java");
const localDotnetSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-dotnet");
const localPhpSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-php");
const localRustSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-rust");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const baseUrl = (process.env.TOKVERA_API_BASE_URL || "https://api.tokvera.org").replace(/\/$/, "");
const apiKey = process.env.TOKVERA_API_KEY;
const visibilityTimeoutMs = Number(process.env.SMOKE_VISIBILITY_TIMEOUT_SECONDS || 120) * 1000;
const pollIntervalMs = Number(process.env.SMOKE_VISIBILITY_POLL_SECONDS || 5) * 1000;
const enableGo = process.env.TOKVERA_VISIBILITY_ENABLE_GO !== "0";
const enableJava = process.env.TOKVERA_VISIBILITY_ENABLE_JAVA !== "0";
const enableDotnet = process.env.TOKVERA_VISIBILITY_ENABLE_DOTNET !== "0";
const enablePhp = process.env.TOKVERA_VISIBILITY_ENABLE_PHP !== "0";
const enableRust = process.env.TOKVERA_VISIBILITY_ENABLE_RUST !== "0";

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

const goFeatures = {
  existingApp: `vis_existing_app_go_${now}`,
  providers: `vis_provider_wrappers_go_${now}`,
  otel: `vis_otel_go_${now}`,
};

const javaFeatures = {
  existingApp: `vis_existing_app_java_${now}`,
  providers: `vis_provider_wrappers_java_${now}`,
  otel: `vis_otel_java_${now}`,
};

const dotnetFeatures = {
  existingApp: `vis_existing_app_dotnet_${now}`,
  providers: `vis_provider_wrappers_dotnet_${now}`,
  otel: `vis_otel_dotnet_${now}`,
};

const phpFeatures = {
  existingApp: `vis_existing_app_php_${now}`,
  providers: `vis_provider_wrappers_php_${now}`,
  otel: `vis_otel_php_${now}`,
};

const rustFeatures = {
  existingApp: `vis_existing_app_rust_${now}`,
  providers: `vis_provider_wrappers_rust_${now}`,
  otel: `vis_otel_rust_${now}`,
};

function getAllFeatures(goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled) {
  const features = [...Object.values(nodeFeatures), ...Object.values(pythonFeatures)];
  if (goEnabled) features.push(...Object.values(goFeatures));
  if (javaEnabled) features.push(...Object.values(javaFeatures));
  if (dotnetEnabled) features.push(...Object.values(dotnetFeatures));
  if (phpEnabled) features.push(...Object.values(phpFeatures));
  if (rustEnabled) features.push(...Object.values(rustFeatures));
  return features;
}

function getLiveFeatures(goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled) {
  return getAllFeatures(goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled).filter((feature) => !feature.includes("otel"));
}

const actionCenterFeatures = [
  nodeFeatures.autogen,
  nodeFeatures.gateway,
  pythonFeatures.autogen,
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

function hasLocalGoSdk() {
  return fs.existsSync(path.join(localGoSdkDir, "go.mod"));
}

function hasLocalJavaSdk() {
  return fs.existsSync(path.join(localJavaSdkDir, "build.gradle.kts"));
}

function hasLocalDotnetSdk() {
  return fs.existsSync(path.join(localDotnetSdkDir, "Tokvera.sln"));
}

function hasLocalPhpSdk() {
  return fs.existsSync(path.join(localPhpSdkDir, "composer.json"));
}

function hasLocalRustSdk() {
  return fs.existsSync(path.join(localRustSdkDir, "Cargo.toml"));
}

function buildPythonEnv(baseEnv) {
  if (!hasLocalPythonSdk()) return { ...baseEnv };
  return {
    ...baseEnv,
    PYTHONPATH: [localPythonSdkDir, baseEnv.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };
}

function buildJavaEnv(baseEnv, javaHome) {
  if (!javaHome) return { ...baseEnv };
  return {
    ...baseEnv,
    JAVA_HOME: javaHome,
    PATH: [path.join(javaHome, "bin"), baseEnv.PATH].filter(Boolean).join(path.delimiter),
  };
}

async function installNodeExampleDependencies() {
  console.log("[runtime-visibility] installing node example dependencies");
  await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });

  if (!hasLocalNodeSdk()) return;

  console.log(`[runtime-visibility] building local js sdk from ${localNodeSdkDir}`);
  await run(npmCommand, ["run", "build"], { cwd: localNodeSdkDir });

  console.log("[runtime-visibility] packing local js sdk tarball");
  const packResult = await run(npmCommand, ["pack", "--silent"], { cwd: localNodeSdkDir });
  const tarballName = packResult.stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();

  if (!tarballName) {
    throw new Error("npm pack did not return a tarball name for the local js sdk");
  }

  const tarballPath = path.join(localNodeSdkDir, tarballName);

  console.log("[runtime-visibility] overriding node example with local js sdk checkout");
  fs.rmSync(path.join(nodeExampleDir, "node_modules", "@tokvera", "sdk"), {
    recursive: true,
    force: true,
  });
  try {
    await run(npmCommand, ["install", "--no-audit", "--no-fund", "--no-save", tarballPath], {
      cwd: nodeExampleDir,
    });
  } finally {
    fs.rmSync(tarballPath, { force: true });
  }
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

function getPortableJavaExecutableName() {
  return process.platform === "win32" ? "java.exe" : "java";
}

function getGradleCommand() {
  return process.platform === "win32" ? "gradlew.bat" : "./gradlew";
}

async function resolveJavaHome() {
  const portableName = getPortableJavaExecutableName();
  const candidates = [
    process.env.TOKVERA_JAVA_HOME,
    process.env.JAVA_HOME,
    path.resolve(__dirname, "..", "..", "..", ".tools", "jdk-21.0.6+7"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const javaBin = path.join(candidate, "bin", portableName);
    if (!fs.existsSync(javaBin)) continue;
    try {
      await run(javaBin, ["-version"], { silent: true });
      return candidate;
    } catch {
      // try next candidate
    }
  }

  try {
    await run("java", ["-version"], { silent: true });
    return "";
  } catch {
    return null;
  }
}

async function resolveDotnetCommand() {
  try {
    await run("dotnet", ["--version"], { silent: true });
    return "dotnet";
  } catch {
    return null;
  }
}

async function resolvePhpCommand() {
  const candidates = [process.env.TOKVERA_PHP_BIN, "php"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await run(candidate, ["-v"], { silent: true });
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function resolveCargoCommand() {
  const candidates = [process.env.TOKVERA_CARGO_BIN, "cargo"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await run(candidate, ["--version"], { silent: true });
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
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

async function emitRuntimeHelpers(go, dotnet) {
  const sharedEnv = {
    ...process.env,
    TOKVERA_API_KEY: apiKey,
    TOKVERA_INGEST_URL: process.env.TOKVERA_INGEST_URL || `${baseUrl}/v1/events`,
    TOKVERA_API_BASE_URL: baseUrl,
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

  if (enableGo && hasLocalGoSdk() && go) {
    console.log("[runtime-visibility] emitting go manual tracer traces");
    await run(go, ["run", "./examples/manual_tracer"], {
      cwd: localGoSdkDir,
      env: {
        ...sharedEnv,
        TOKVERA_FEATURE: goFeatures.existingApp,
        TOKVERA_TENANT_ID: "tenant_demo_go",
        TOKVERA_ENVIRONMENT: "prod",
      },
    });

    console.log("[runtime-visibility] emitting go provider wrapper traces");
    await run(go, ["run", "./examples/provider_wrappers"], {
      cwd: localGoSdkDir,
      env: {
        ...sharedEnv,
        TOKVERA_FEATURE: goFeatures.providers,
        TOKVERA_TENANT_ID: "tenant_demo_go",
        TOKVERA_ENVIRONMENT: "prod",
      },
    });

    console.log("[runtime-visibility] emitting go otel bridge traces");
    await run(go, ["run", "./examples/otel_bridge"], {
      cwd: localGoSdkDir,
      env: {
        ...sharedEnv,
        TOKVERA_FEATURE: goFeatures.otel,
        TOKVERA_TENANT_ID: "tenant_demo_go",
        TOKVERA_ENVIRONMENT: "prod",
      },
    });
  } else {
    console.log("[runtime-visibility] skipping go traces (tokvera-go repo or go toolchain unavailable)");
  }

  const javaHome = enableJava && hasLocalJavaSdk() ? await resolveJavaHome() : null;
  const javaEnabled = enableJava && hasLocalJavaSdk() && javaHome !== null;
  if (javaEnabled) {
    const gradleCommand = getGradleCommand();
    const javaEnv = {
      ...buildJavaEnv(sharedEnv, javaHome),
      TOKVERA_TENANT_ID: "tenant_demo_java",
      TOKVERA_ENVIRONMENT: "prod",
    };

    console.log("[runtime-visibility] emitting java manual tracer traces");
    await run(gradleCommand, ["--quiet", "runManualExample"], {
      cwd: localJavaSdkDir,
      env: {
        ...javaEnv,
        TOKVERA_FEATURE: javaFeatures.existingApp,
      },
    });

    console.log("[runtime-visibility] emitting java provider wrapper traces");
    await run(gradleCommand, ["--quiet", "runProviderWrappersExample"], {
      cwd: localJavaSdkDir,
      env: {
        ...javaEnv,
        TOKVERA_FEATURE: javaFeatures.providers,
      },
    });

    console.log("[runtime-visibility] emitting java otel bridge traces");
    await run(gradleCommand, ["--quiet", "runOtelBridgeExample"], {
      cwd: localJavaSdkDir,
      env: {
        ...javaEnv,
        TOKVERA_FEATURE: javaFeatures.otel,
      },
    });
  } else {
    console.log("[runtime-visibility] skipping java traces (tokvera-java repo or java toolchain unavailable)");
  }

  const dotnetEnabled = enableDotnet && Boolean(dotnet && hasLocalDotnetSdk());
  if (dotnetEnabled) {
    const dotnetEnv = {
      ...sharedEnv,
      TOKVERA_TENANT_ID: "tenant_demo_dotnet",
      TOKVERA_ENVIRONMENT: "prod",
    };

    console.log("[runtime-visibility] emitting dotnet manual tracer traces");
    await run(dotnet, ["run", "--project", path.join("examples", "ManualTracer", "ManualTracer.csproj")], {
      cwd: localDotnetSdkDir,
      env: {
        ...dotnetEnv,
        TOKVERA_FEATURE: dotnetFeatures.existingApp,
      },
    });

    console.log("[runtime-visibility] emitting dotnet provider wrapper traces");
    await run(dotnet, ["run", "--project", path.join("examples", "ProviderWrappers", "ProviderWrappers.csproj")], {
      cwd: localDotnetSdkDir,
      env: {
        ...dotnetEnv,
        TOKVERA_FEATURE: dotnetFeatures.providers,
      },
    });

    console.log("[runtime-visibility] emitting dotnet otel bridge traces");
    await run(dotnet, ["run", "--project", path.join("examples", "OtelBridge", "OtelBridge.csproj")], {
      cwd: localDotnetSdkDir,
      env: {
        ...dotnetEnv,
        TOKVERA_FEATURE: dotnetFeatures.otel,
      },
    });
  } else {
    console.log("[runtime-visibility] skipping dotnet traces (tokvera-dotnet repo or dotnet toolchain unavailable)");
  }

  const php = hasLocalPhpSdk() ? await resolvePhpCommand() : null;
  const phpEnabled = enablePhp && Boolean(php && hasLocalPhpSdk());
  if (phpEnabled) {
    const phpEnv = {
      ...sharedEnv,
      TOKVERA_TENANT_ID: "tenant_demo_php",
      TOKVERA_ENVIRONMENT: "prod",
    };

    console.log("[runtime-visibility] emitting php manual tracer traces");
    await run(php, [path.join("examples", "manual_tracer.php")], {
      cwd: localPhpSdkDir,
      env: {
        ...phpEnv,
        TOKVERA_FEATURE: phpFeatures.existingApp,
      },
    });

    console.log("[runtime-visibility] emitting php provider wrapper traces");
    await run(php, [path.join("examples", "provider_wrappers.php")], {
      cwd: localPhpSdkDir,
      env: {
        ...phpEnv,
        TOKVERA_FEATURE: phpFeatures.providers,
      },
    });

    console.log("[runtime-visibility] emitting php otel bridge traces");
    await run(php, [path.join("examples", "otel_bridge.php")], {
      cwd: localPhpSdkDir,
      env: {
        ...phpEnv,
        TOKVERA_FEATURE: phpFeatures.otel,
      },
    });
  } else {
    console.log("[runtime-visibility] skipping php traces (tokvera-php repo or php toolchain unavailable)");
  }

  const cargo = hasLocalRustSdk() ? await resolveCargoCommand() : null;
  const rustEnabled = enableRust && Boolean(cargo && hasLocalRustSdk());
  if (rustEnabled) {
    const rustEnv = {
      ...sharedEnv,
      TOKVERA_TENANT_ID: "tenant_demo_rust",
      TOKVERA_ENVIRONMENT: "prod",
    };

    console.log("[runtime-visibility] emitting rust manual tracer traces");
    await run(cargo, ["run", "--example", "manual_tracer"], {
      cwd: localRustSdkDir,
      env: {
        ...rustEnv,
        TOKVERA_FEATURE: rustFeatures.existingApp,
      },
    });

    console.log("[runtime-visibility] emitting rust provider wrapper traces");
    await run(cargo, ["run", "--example", "provider_wrappers"], {
      cwd: localRustSdkDir,
      env: {
        ...rustEnv,
        TOKVERA_FEATURE: rustFeatures.providers,
      },
    });

    console.log("[runtime-visibility] emitting rust otel bridge traces");
    await run(cargo, ["run", "--example", "otel_bridge"], {
      cwd: localRustSdkDir,
      env: {
        ...rustEnv,
        TOKVERA_FEATURE: rustFeatures.otel,
      },
    });
  } else {
    console.log("[runtime-visibility] skipping rust traces (tokvera-rust repo or rust toolchain unavailable)");
  }
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

async function waitForVisibility(beforeOverviewRequests, goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled) {
  const allFeatures = getAllFeatures(goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled);
  const liveFeatures = getLiveFeatures(goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled);
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

  const go = enableGo && hasLocalGoSdk() ? await resolveGoCommand() : null;
  const goEnabled = enableGo && Boolean(go && hasLocalGoSdk());
  const javaHome = enableJava && hasLocalJavaSdk() ? await resolveJavaHome() : null;
  const javaEnabled = enableJava && hasLocalJavaSdk() && javaHome !== null;
  const dotnet = enableDotnet && hasLocalDotnetSdk() ? await resolveDotnetCommand() : null;
  const dotnetEnabled = enableDotnet && Boolean(dotnet && hasLocalDotnetSdk());
  const php = enablePhp && hasLocalPhpSdk() ? await resolvePhpCommand() : null;
  const phpEnabled = enablePhp && Boolean(php && hasLocalPhpSdk());
  const cargo = enableRust && hasLocalRustSdk() ? await resolveCargoCommand() : null;
  const rustEnabled = enableRust && Boolean(cargo && hasLocalRustSdk());

  await emitRuntimeHelpers(go, dotnet);

  console.log("[runtime-visibility] waiting for dashboard visibility across overview, traces, live, detail, inspector, and action center");
  const state = await waitForVisibility(beforeOverviewRequests, goEnabled, javaEnabled, dotnetEnabled, phpEnabled, rustEnabled);

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
