import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokvera-seo-run-"));
const trackerOut = path.join(tmpDir, "weekly-gsc-ctr-tracker.csv");
const reportOut = path.join(tmpDir, "weekly-seo-priority-report.md");

execFileSync(
  process.execPath,
  [
    path.join(repoRoot, "ops", "seo", "scripts", "run-weekly-seo-review.mjs"),
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
    "--out-tracker",
    trackerOut,
    "--out-report",
    reportOut,
  ],
  { stdio: "pipe" },
);

const tracker = fs.readFileSync(trackerOut, "utf8");
const report = fs.readFileSync(reportOut, "utf8");
assert.match(tracker, /\/compare\/tokvera-vs-langsmith,[^\n]*,yes,[^\n]*81,980,8\.27%,9\.60,[^\n]*tokvera vs langsmith,[^\n]*langsmith vs tokvera,[^\n]*tokvera langsmith comparison/);
assert.match(report, /## Immediate Refresh[\s\S]*`\/use-cases\/rag-observability`/);
assert.match(report, /## Promotion Queue[\s\S]*`\/compare\/tokvera-vs-langsmith`/);
console.log("run-weekly-seo-review test passed");
