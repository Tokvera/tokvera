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
const localJavaSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-java");
const localDotnetSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-dotnet");
const localPhpSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-php");
const localRustSdkDir = path.resolve(__dirname, "..", "..", "..", "tokvera-rust");

const mockPort = Number(process.env.MOCK_INGEST_PORT || 8787);
const ingestUrl = `http://127.0.0.1:${mockPort}/v1/events`;
const statsUrl = `http://127.0.0.1:${mockPort}/stats`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sharedEnv = {
  ...process.env,
  TOKVERA_INGEST_URL: ingestUrl,
  TOKVERA_API_BASE_URL: process.env.TOKVERA_API_BASE_URL || `http://127.0.0.1:${mockPort}`,
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
  javaExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_JAVA || "runtime_existing_app_java",
  javaProviders: process.env.TOKVERA_FEATURE_PROVIDERS_JAVA || "runtime_provider_wrappers_java",
  javaOTel: process.env.TOKVERA_FEATURE_OTEL_JAVA || "runtime_otel_java",
  dotnetExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_DOTNET || "runtime_existing_app_dotnet",
  dotnetProviders: process.env.TOKVERA_FEATURE_PROVIDERS_DOTNET || "runtime_provider_wrappers_dotnet",
  dotnetOTel: process.env.TOKVERA_FEATURE_OTEL_DOTNET || "runtime_otel_dotnet",
  phpExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_PHP || "runtime_existing_app_php",
  phpProviders: process.env.TOKVERA_FEATURE_PROVIDERS_PHP || "runtime_provider_wrappers_php",
  phpOTel: process.env.TOKVERA_FEATURE_OTEL_PHP || "runtime_otel_php",
  rustExistingApp: process.env.TOKVERA_FEATURE_EXISTING_APP_RUST || "runtime_existing_app_rust",
  rustProviders: process.env.TOKVERA_FEATURE_PROVIDERS_RUST || "runtime_provider_wrappers_rust",
  rustOTel: process.env.TOKVERA_FEATURE_OTEL_RUST || "runtime_otel_rust",
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
  console.log("[smoke] installing node example dependencies");
  await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });

  if (!hasLocalNodeSdk()) return;

  console.log(`[smoke] building local js sdk from ${localNodeSdkDir}`);
  await run(npmCommand, ["run", "build"], { cwd: localNodeSdkDir });

  console.log("[smoke] packing local js sdk tarball");
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

  console.log("[smoke] overriding node example with local js sdk checkout");
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
      await run(javaBin, ["-version"]);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  try {
    await run("java", ["-version"]);
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

    const javaHome = hasLocalJavaSdk() ? await resolveJavaHome() : null;
    const javaEnabled = hasLocalJavaSdk() && javaHome !== null;
    if (javaEnabled) {
      const javaEnv = {
        ...buildJavaEnv(sharedEnv, javaHome),
        TOKVERA_TENANT_ID: "tenant_demo_java",
        TOKVERA_ENVIRONMENT: "dev",
      };
      const gradleCommand = getGradleCommand();

      console.log("[smoke] running java manual tracer example");
      await run(gradleCommand, ["--quiet", "runManualExample"], {
        cwd: localJavaSdkDir,
        env: {
          ...javaEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.javaExistingApp,
        },
      });

      console.log("[smoke] running java provider wrappers example");
      await run(gradleCommand, ["--quiet", "runProviderWrappersExample"], {
        cwd: localJavaSdkDir,
        env: {
          ...javaEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.javaProviders,
        },
      });

      console.log("[smoke] running java otel bridge example");
      await run(gradleCommand, ["--quiet", "runOtelBridgeExample"], {
        cwd: localJavaSdkDir,
        env: {
          ...javaEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.javaOTel,
        },
      });
    } else {
      console.log("[smoke] skipping java examples (tokvera-java repo or java toolchain unavailable)");
    }

    const dotnet = hasLocalDotnetSdk() ? await resolveDotnetCommand() : null;
    const dotnetEnabled = Boolean(dotnet && hasLocalDotnetSdk());
    if (dotnetEnabled) {
      const dotnetEnv = {
        ...sharedEnv,
        TOKVERA_TENANT_ID: "tenant_demo_dotnet",
        TOKVERA_ENVIRONMENT: "dev",
      };

      console.log("[smoke] running dotnet manual tracer example");
      await run(dotnet, ["run", "--project", path.join("examples", "ManualTracer", "ManualTracer.csproj")], {
        cwd: localDotnetSdkDir,
        env: {
          ...dotnetEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.dotnetExistingApp,
        },
      });

      console.log("[smoke] running dotnet provider wrappers example");
      await run(dotnet, ["run", "--project", path.join("examples", "ProviderWrappers", "ProviderWrappers.csproj")], {
        cwd: localDotnetSdkDir,
        env: {
          ...dotnetEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.dotnetProviders,
        },
      });

      console.log("[smoke] running dotnet otel bridge example");
      await run(dotnet, ["run", "--project", path.join("examples", "OtelBridge", "OtelBridge.csproj")], {
        cwd: localDotnetSdkDir,
        env: {
          ...dotnetEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.dotnetOTel,
        },
      });
    } else {
      console.log("[smoke] skipping dotnet examples (tokvera-dotnet repo or dotnet toolchain unavailable)");
    }

    const php = hasLocalPhpSdk() ? await resolvePhpCommand() : null;
    const phpEnabled = Boolean(php && hasLocalPhpSdk());
    if (phpEnabled) {
      console.log("[smoke] running php manual tracer example");
      await run(php, [path.join("examples", "manual_tracer.php")], {
        cwd: localPhpSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.phpExistingApp,
          TOKVERA_TENANT_ID: "tenant_demo_php",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });

      console.log("[smoke] running php provider wrappers example");
      await run(php, [path.join("examples", "provider_wrappers.php")], {
        cwd: localPhpSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.phpProviders,
          TOKVERA_TENANT_ID: "tenant_demo_php",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });

      console.log("[smoke] running php otel bridge example");
      await run(php, [path.join("examples", "otel_bridge.php")], {
        cwd: localPhpSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.phpOTel,
          TOKVERA_TENANT_ID: "tenant_demo_php",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });
    } else {
      console.log("[smoke] skipping php examples (tokvera-php repo or php toolchain unavailable)");
    }

    const cargo = hasLocalRustSdk() ? await resolveCargoCommand() : null;
    const rustEnabled = Boolean(cargo && hasLocalRustSdk());
    if (rustEnabled) {
      console.log("[smoke] running rust manual tracer example");
      await run(cargo, ["run", "--example", "manual_tracer"], {
        cwd: localRustSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.rustExistingApp,
          TOKVERA_TENANT_ID: "tenant_demo_rust",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });

      console.log("[smoke] running rust provider wrappers example");
      await run(cargo, ["run", "--example", "provider_wrappers"], {
        cwd: localRustSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.rustProviders,
          TOKVERA_TENANT_ID: "tenant_demo_rust",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });

      console.log("[smoke] running rust otel bridge example");
      await run(cargo, ["run", "--example", "otel_bridge"], {
        cwd: localRustSdkDir,
        env: {
          ...sharedEnv,
          TOKVERA_FEATURE: runtimeHelperFeatures.rustOTel,
          TOKVERA_TENANT_ID: "tenant_demo_rust",
          TOKVERA_ENVIRONMENT: "dev",
        },
      });
    } else {
      console.log("[smoke] skipping rust examples (tokvera-rust repo or rust toolchain unavailable)");
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
    const javaFeatures = [
      runtimeHelperFeatures.javaExistingApp,
      runtimeHelperFeatures.javaProviders,
      runtimeHelperFeatures.javaOTel,
    ];
    const dotnetFeatures = [
      runtimeHelperFeatures.dotnetExistingApp,
      runtimeHelperFeatures.dotnetProviders,
      runtimeHelperFeatures.dotnetOTel,
    ];
    const phpFeatures = [
      runtimeHelperFeatures.phpExistingApp,
      runtimeHelperFeatures.phpProviders,
      runtimeHelperFeatures.phpOTel,
    ];
    const rustFeatures = [
      runtimeHelperFeatures.rustExistingApp,
      runtimeHelperFeatures.rustProviders,
      runtimeHelperFeatures.rustOTel,
    ];
    const missingFeatures = expectedFeatures.filter((feature) => Number(stats.features?.[feature] || 0) < 1);
    const relevantMissingFeatures = missingFeatures.filter((feature) => {
      if (goFeatures.includes(feature) && !goEnabled) return false;
      if (javaFeatures.includes(feature) && !javaEnabled) return false;
      if (dotnetFeatures.includes(feature) && !dotnetEnabled) return false;
      if (phpFeatures.includes(feature) && !phpEnabled) return false;
      if (rustFeatures.includes(feature) && !rustEnabled) return false;
      return true;
    });
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
