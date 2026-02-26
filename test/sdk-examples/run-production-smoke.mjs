import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodeExampleDir = path.join(__dirname, "node-example");
const pythonExamplePath = path.join(__dirname, "python-example", "example.py");

const baseUrl = (process.env.TOKVERA_API_BASE_URL || "https://api.tokvera.org").replace(/\/$/, "");
const ingestUrl = process.env.TOKVERA_INGEST_URL || `${baseUrl}/v1/events`;
const metricsUrl =
  process.env.TOKVERA_METRICS_URL || `${baseUrl}/v1/metrics/breakdown?group_by=feature`;
const healthUrl = process.env.TOKVERA_HEALTH_URL || `${baseUrl}/health`;

const apiKey = process.env.TOKVERA_API_KEY;
if (!apiKey) {
  console.error("[prod-smoke] TOKVERA_API_KEY is required");
  process.exit(1);
}

const ts = Date.now();
const nodeFeature = process.env.SMOKE_NODE_FEATURE || `sdk_smoke_node_${ts}`;
const pythonFeature = process.env.SMOKE_PYTHON_FEATURE || `sdk_smoke_python_${ts}`;
const metricsTimeoutMs = Number(process.env.SMOKE_METRICS_TIMEOUT_SECONDS || 90) * 1000;
const metricsPollMs = Number(process.env.SMOKE_METRICS_POLL_SECONDS || 5) * 1000;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const sharedEnv = {
  ...process.env,
  TOKVERA_API_KEY: apiKey,
  TOKVERA_INGEST_URL: ingestUrl,
  TOKVERA_WAIT_SECONDS: process.env.TOKVERA_WAIT_SECONDS || "4",
  TOKVERA_WAIT_MS: process.env.TOKVERA_WAIT_MS || "1800",
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
      if (!options.silent) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (!options.silent) {
        process.stderr.write(text);
      }
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

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Keep raw fallback for debugging.
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function checkHealth() {
  const data = await fetchJson(healthUrl);
  console.log(`[prod-smoke] health ok: ${JSON.stringify(data)}`);
}

function getFeatureCount(metrics, feature) {
  if (!metrics?.items || !Array.isArray(metrics.items)) {
    return 0;
  }
  const item = metrics.items.find((entry) => entry.group === feature);
  return Number(item?.request_count || 0);
}

async function getMetricsSnapshot() {
  return fetchJson(metricsUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

async function waitForCounts(targets) {
  const started = Date.now();
  let lastMetrics = null;

  while (Date.now() - started < metricsTimeoutMs) {
    const metrics = await getMetricsSnapshot();
    lastMetrics = metrics;
    const allReached = targets.every((target) => {
      const current = getFeatureCount(metrics, target.feature);
      return current >= target.expected;
    });

    if (allReached) {
      return metrics;
    }
    await sleep(metricsPollMs);
  }

  throw new Error(`metrics timeout (${metricsTimeoutMs}ms), last snapshot=${JSON.stringify(lastMetrics)}`);
}

async function resolveUvCommand() {
  const candidates = process.platform === "win32" ? ["uv.cmd", "uv"] : ["uv"];
  for (const command of candidates) {
    try {
      await run(command, ["--version"], { silent: true });
      return command;
    } catch {
      // try next candidate
    }
  }
  throw new Error("uv command not found. Install uv to run Python production smoke test.");
}

async function main() {
  console.log(`[prod-smoke] base=${baseUrl}`);
  console.log(`[prod-smoke] ingest=${ingestUrl}`);
  console.log(`[prod-smoke] metrics=${metricsUrl}`);
  console.log(`[prod-smoke] nodeFeature=${nodeFeature}`);
  console.log(`[prod-smoke] pythonFeature=${pythonFeature}`);

  await checkHealth();

  const before = await getMetricsSnapshot();
  const beforeNode = getFeatureCount(before, nodeFeature);
  const beforePython = getFeatureCount(before, pythonFeature);
  console.log(`[prod-smoke] before node=${beforeNode} python=${beforePython}`);

  console.log("[prod-smoke] installing node example dependencies");
  await run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: nodeExampleDir });

  console.log("[prod-smoke] running node sdk example");
  await run(npmCommand, ["run", "example"], {
    cwd: nodeExampleDir,
    env: {
      ...sharedEnv,
      TOKVERA_FEATURE: nodeFeature,
    },
  });

  console.log("[prod-smoke] running python sdk example");
  const uvCommand = await resolveUvCommand();
  await run(uvCommand, ["run", "--with", "tokvera", pythonExamplePath], {
    cwd: __dirname,
    env: {
      ...sharedEnv,
      TOKVERA_FEATURE: pythonFeature,
    },
  });

  console.log("[prod-smoke] waiting for aggregated metrics");
  const after = await waitForCounts([
    { feature: nodeFeature, expected: beforeNode + 2 },
    { feature: pythonFeature, expected: beforePython + 2 },
  ]);
  const afterNode = getFeatureCount(after, nodeFeature);
  const afterPython = getFeatureCount(after, pythonFeature);

  console.log(`[prod-smoke] after node=${afterNode} python=${afterPython}`);
  console.log("[prod-smoke] success: ingestion and analytics pipeline verified.");
}

main().catch((error) => {
  console.error(`[prod-smoke] failed: ${error.message}`);
  process.exit(1);
});
