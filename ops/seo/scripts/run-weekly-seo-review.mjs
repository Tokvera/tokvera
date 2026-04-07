#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    outTracker: path.join("ops", "seo", "weekly-gsc-ctr-tracker.csv"),
    outReport: path.join("ops", "seo", "weekly-seo-priority-report.md"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--tracker") args.tracker = next, i += 1;
    else if (arg === "--pages-7d") args.pages7d = next, i += 1;
    else if (arg === "--queries-7d") args.queries7d = next, i += 1;
    else if (arg === "--pages-28d") args.pages28d = next, i += 1;
    else if (arg === "--queries-28d") args.queries28d = next, i += 1;
    else if (arg === "--out-tracker") args.outTracker = next, i += 1;
    else if (arg === "--out-report") args.outReport = next, i += 1;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log(`Usage:\n  node ops/seo/scripts/run-weekly-seo-review.mjs --tracker <tracker.csv> --pages-7d <pages.csv> --queries-7d <queries.csv> --pages-28d <pages.csv> --queries-28d <queries.csv> [--out-tracker <tracker.csv>] [--out-report <report.md>]`);
}

function runScript(script, args) {
  execFileSync(process.execPath, [script, ...args], { stdio: "inherit" });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const required = ["tracker", "pages7d", "queries7d", "pages28d", "queries28d"];
  for (const key of required) {
    if (!args[key]) {
      usage();
      process.exitCode = 1;
      return;
    }
  }

  const repoRoot = process.cwd();
  const trackerPath = path.resolve(args.tracker);
  const outTrackerPath = path.resolve(args.outTracker);
  const outReportPath = path.resolve(args.outReport);
  const importScript = path.join(repoRoot, "ops", "seo", "scripts", "import-gsc-export.mjs");
  const reportScript = path.join(repoRoot, "ops", "seo", "scripts", "generate-weekly-seo-priority-report.mjs");

  fs.mkdirSync(path.dirname(outTrackerPath), { recursive: true });
  fs.copyFileSync(trackerPath, outTrackerPath);

  runScript(importScript, [
    "--tracker", outTrackerPath,
    "--pages", path.resolve(args.pages7d),
    "--queries", path.resolve(args.queries7d),
    "--period", "7d",
    "--out", outTrackerPath,
  ]);

  runScript(importScript, [
    "--tracker", outTrackerPath,
    "--pages", path.resolve(args.pages28d),
    "--queries", path.resolve(args.queries28d),
    "--period", "28d",
    "--out", outTrackerPath,
  ]);

  runScript(reportScript, [
    "--tracker", outTrackerPath,
    "--out", outReportPath,
  ]);

  console.log(`Weekly SEO review artifacts updated:\n- tracker: ${path.relative(repoRoot, outTrackerPath)}\n- report: ${path.relative(repoRoot, outReportPath)}`);
}

main();
