import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodeExampleDir = path.join(__dirname, "node-example");
const pythonExamplePath = path.join(__dirname, "python-example", "example.py");

const mockPort = Number(process.env.MOCK_INGEST_PORT || 8787);
const ingestUrl = `http://127.0.0.1:${mockPort}/v1/events`;
const statsUrl = `http://127.0.0.1:${mockPort}/stats`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sharedEnv = {
  ...process.env,
  TOKVERA_INGEST_URL: ingestUrl,
  TOKVERA_API_KEY: process.env.TOKVERA_API_KEY || "tokvera_project_key",
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

    const python = await resolvePythonCommand();
    console.log("[smoke] ensuring python sdk is installed");
    await run(python.command, [...python.prefix, "-m", "pip", "install", "--quiet", "tokvera"], {
      env: sharedEnv,
    });

    console.log("[smoke] running python sdk example");
    await run(python.command, [...python.prefix, pythonExamplePath], {
      cwd: __dirname,
      env: sharedEnv,
    });

    // Allow final async sends to complete.
    await sleep(1000);
    const statsResponse = await fetch(statsUrl);
    const stats = await statsResponse.json();
    console.log(`[smoke] ingested events: ${stats.count}`);
    console.log(`[smoke] endpoints: ${JSON.stringify(stats.endpoints)}`);

    if (!stats.count || stats.count < 4) {
      throw new Error(`expected at least 4 ingested events, got ${stats.count}`);
    }

    console.log("[smoke] success: both SDK examples emitted events.");
  } finally {
    mockServer.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`[smoke] failed: ${error.message}`);
  process.exit(1);
});
