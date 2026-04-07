import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokvera-seo-import-"));
const trackerOut = path.join(tmpDir, "tracker.csv");

execFileSync(
  process.execPath,
  [
    path.join(repoRoot, "ops", "seo", "scripts", "import-gsc-export.mjs"),
    "--tracker",
    path.join(repoRoot, "test", "fixtures", "seo", "tracker.csv"),
    "--pages",
    path.join(repoRoot, "test", "fixtures", "seo", "pages-7d.csv"),
    "--queries",
    path.join(repoRoot, "test", "fixtures", "seo", "queries-7d.csv"),
    "--period",
    "7d",
    "--out",
    trackerOut,
  ],
  { stdio: "pipe" },
);

const output = fs.readFileSync(trackerOut, "utf8");
assert.match(output, /\/compare\/langfuse-alternative,[^\n]*,yes,42,840,5\.00%,8\.30,[^\n]*langfuse alternative,[^\n]*best langfuse alternative,[^\n]*langfuse competitor/);
assert.match(output, /\/integrations\/fastapi-ai-tracing,[^\n]*,yes,18,720,2\.50%,11\.40,[^\n]*fastapi ai tracing,[^\n]*fastapi ai observability,[^\n]*python ai tracing fastapi/);
console.log("import-gsc-export test passed");
