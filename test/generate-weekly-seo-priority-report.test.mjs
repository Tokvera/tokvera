import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokvera-seo-report-"));
const reportOut = path.join(tmpDir, "weekly-seo-priority-report.md");

execFileSync(
  process.execPath,
  [
    path.join(repoRoot, "ops", "seo", "scripts", "generate-weekly-seo-priority-report.mjs"),
    "--tracker",
    path.join(repoRoot, "test", "fixtures", "seo", "tracker-populated.csv"),
    "--out",
    reportOut,
  ],
  { stdio: "pipe" },
);

const output = fs.readFileSync(reportOut, "utf8");
assert.match(output, /## Immediate Refresh/);
assert.match(output, /`\/use-cases\/rag-observability`[\s\S]*reason: top query is weakly reflected in the current title/);
assert.match(output, /`\/compare\/langfuse-alternative`[\s\S]*reason: top query is weakly reflected in the current title/);
assert.match(output, /`\/compare\/langfuse-alternative`[\s\S]*title alignment: weak/);
assert.match(output, /`\/compare\/tokvera-vs-langsmith`[\s\S]*title alignment: strong/);
assert.match(output, /## Promotion Queue[\s\S]*`\/compare\/tokvera-vs-langsmith`/);
assert.match(output, /## Intent Correction[\s\S]*`\/compare\/langsmith-alternative`/);
assert.match(output, /## Need Data[\s\S]*`\/integrations\/python-ai-workflow-tracing`/);
console.log("generate-weekly-seo-priority-report test passed");
