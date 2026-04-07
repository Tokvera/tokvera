import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokvera-seo-run-"));
const trackerOut = path.join(tmpDir, "weekly-gsc-ctr-tracker.csv");
const reportOut = path.join(tmpDir, "weekly-seo-priority-report.md");

const pages = new Map([
  ["/compare/langfuse-alternative", '<html><head><title>Langfuse Alternative for Production AI Ops and Live Tracing | Tokvera</title><meta name="description" content="Compare Tokvera and Langfuse for live tracing, tenant-aware cost control, and production AI operations." /></head><body></body></html>'],
  ["/integrations/fastapi-ai-tracing", '<html><head><title>FastAPI AI Tracing and Observability for Production Python | Tokvera</title><meta name="description" content="Trace FastAPI handlers, downstream model calls, and workflow paths under one root trace." /></head><body></body></html>'],
  ["/compare/tokvera-vs-langsmith", '<html><head><title>Tokvera vs LangSmith: Live Ops, Evals, and Cost Control | Tokvera</title><meta name="description" content="Compare live tracing, evaluation workflows, cost control, and customer-aware operational visibility for production AI systems." /></head><body></body></html>'],
  ["/use-cases/rag-observability", '<html><head><title>RAG Observability and Tracing for Production Retrieval Systems | Tokvera</title><meta name="description" content="Trace retrieval, reranking, context assembly, model calls, and answer quality under one root trace with Tokvera." /></head><body></body></html>'],
  ["/compare/langsmith-alternative", '<html><head><title>LangSmith Alternative for Production AI Operations | Tokvera</title><meta name="description" content="Compare Tokvera and LangSmith for live operations, customer-aware cost ownership, and production review loops." /></head><body></body></html>'],
  ["/integrations/python-ai-workflow-tracing", '<html><head><title>Python AI Workflow Tracing for Production Systems | Tokvera</title><meta name="description" content="Trace Python AI workflow steps, model calls, and downstream operations under one root trace." /></head><body></body></html>'],
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
  await runNode(path.join(repoRoot, "ops", "seo", "scripts", "run-weekly-seo-review.mjs"), [
    "--tracker",
    path.join(repoRoot, "test", "fixtures", "seo", "tracker-populated.csv"),
    "--pages-7d",
    path.join(repoRoot, "test", "fixtures", "seo", "pages-7d.csv"),
    "--queries-7d",
    path.join(repoRoot, "test", "fixtures", "seo", "queries-7d.csv"),
    "--pages-28d",
    path.join(repoRoot, "test", "fixtures", "seo", "pages-28d.csv"),
    "--queries-28d",
    path.join(repoRoot, "test", "fixtures", "seo", "queries-28d.csv"),
    "--base-url",
    baseUrl,
    "--out-tracker",
    trackerOut,
    "--out-report",
    reportOut,
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

const tracker = fs.readFileSync(trackerOut, "utf8");
const report = fs.readFileSync(reportOut, "utf8");
assert.match(tracker, /\/compare\/langfuse-alternative,[^\n]*Langfuse Alternative for Production AI Ops and Live Tracing \| Tokvera,[^\n]*Compare Tokvera and Langfuse for live tracing, tenant-aware cost control, and production AI operations\./);
assert.match(tracker, /\/compare\/tokvera-vs-langsmith,[^\n]*,yes,[^\n]*81,980,8\.27%,9\.60,[^\n]*tokvera vs langsmith,[^\n]*langsmith vs tokvera,[^\n]*tokvera langsmith comparison/);
assert.match(report, /## Immediate Refresh[\s\S]*`\/use-cases\/rag-observability`/);
assert.match(report, /## Promotion Queue[\s\S]*`\/compare\/tokvera-vs-langsmith`/);
console.log("run-weekly-seo-review test passed");
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
