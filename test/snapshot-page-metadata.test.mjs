import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokvera-seo-metadata-"));
const trackerOut = path.join(tmpDir, "tracker.csv");

const pages = new Map([
  ["/compare/langfuse-alternative", '<html><head><title>Langfuse Alternative for Production AI Ops and Live Tracing | Tokvera</title><meta name="description" content="Compare Tokvera and Langfuse for live tracing, tenant-aware cost control, and production AI operations." /></head><body></body></html>'],
  ["/integrations/fastapi-ai-tracing", '<html><head><title>FastAPI AI Tracing and Observability for Production Python | Tokvera</title><meta name="description" content="Trace FastAPI handlers, downstream model calls, and workflow paths under one root trace." /></head><body></body></html>'],
]);

const server = http.createServer((req, res) => {
  const html = pages.get(req.url || "");
  if (!html) {
    res.statusCode = 404;
    res.setHeader("Connection", "close");
    res.end("not found");
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Connection", "close");
  res.end(html);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  await runNode(path.join(repoRoot, "ops", "seo", "scripts", "snapshot-page-metadata.mjs"), [
    "--tracker",
    path.join(repoRoot, "test", "fixtures", "seo", "tracker.csv"),
    "--base-url",
    baseUrl,
    "--out",
    trackerOut,
  ]);
} finally {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const output = fs.readFileSync(trackerOut, "utf8");
assert.match(output, /\/compare\/langfuse-alternative,[^\n]*Langfuse Alternative for Production AI Ops and Live Tracing \| Tokvera,[^\n]*Compare Tokvera and Langfuse for live tracing, tenant-aware cost control, and production AI operations\./);
assert.match(output, /\/integrations\/fastapi-ai-tracing,[^\n]*FastAPI AI Tracing and Observability for Production Python \| Tokvera,[^\n]*Trace FastAPI handlers, downstream model calls, and workflow paths under one root trace\./);
console.log("snapshot-page-metadata test passed");
function runNode(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Process exited with code ${code}`));
    });
  });
}
