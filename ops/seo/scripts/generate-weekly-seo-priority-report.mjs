#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { out: path.join("ops", "seo", "weekly-seo-priority-report.md") };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--tracker") args.tracker = next, i += 1;
    else if (arg === "--out") args.out = next, i += 1;
    else if (arg === "--top") args.top = Number(next), i += 1;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log(`Usage:\n  node ops/seo/scripts/generate-weekly-seo-priority-report.mjs --tracker <tracker.csv> [--out <report.md>] [--top <n>]`);
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((cells) => {
    const record = {};
    header.forEach((name, index) => {
      record[name.trim()] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

function num(value) {
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[% ,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function priorityWeight(priority) {
  if (priority === "P1") return 30;
  if (priority === "P2") return 15;
  return 0;
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "from",
  "how",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "with",
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function scoreAlignment(query, text) {
  const queryTokens = [...new Set(tokenize(query))];
  const textTokens = new Set(tokenize(text));
  if (queryTokens.length === 0 || textTokens.size === 0) {
    return { label: "unknown", ratio: 0, matched: [] };
  }
  const matched = queryTokens.filter((token) => textTokens.has(token));
  const ratio = matched.length / queryTokens.length;
  if (ratio >= 0.75) return { label: "strong", ratio, matched };
  if (ratio >= 0.4) return { label: "partial", ratio, matched };
  return { label: "weak", ratio, matched };
}

function classify(row) {
  const i7 = num(row.last_7d_impressions);
  const ctr7 = num(row.last_7d_ctr);
  const pos7 = num(row.last_7d_position);
  const c28 = num(row.last_28d_clicks);
  const i28 = num(row.last_28d_impressions);
  const ctr28 = num(row.last_28d_ctr);
  const pos28 = num(row.last_28d_position);
  const base = priorityWeight(row.priority);
  const topQuery = row.top_query_1 || row.target_keyword || "";
  const titleAlignment = scoreAlignment(topQuery, row.current_title);
  const metaAlignment = scoreAlignment(topQuery, row.current_meta);

  if (i28 > 100 && titleAlignment.label === "weak") {
    return {
      section: "Immediate Refresh",
      score: 115 + base + i28 / 20,
      reason: "top query is weakly reflected in the current title",
      action: "rewrite title/meta",
      titleAlignment,
      metaAlignment,
    };
  }

  if (i28 > 0 && c28 === 0) {
    return { section: "Immediate Refresh", score: 120 + base + i28 / 10, reason: "impressions with zero clicks over 28 days", action: "rewrite title/meta", titleAlignment, metaAlignment };
  }
  if (i7 > 100 && ctr7 > 0 && ctr7 < 2.5) {
    return { section: "Immediate Refresh", score: 110 + base + i7 / 10, reason: "high 7-day impressions with weak CTR", action: "rewrite title/meta", titleAlignment, metaAlignment };
  }
  if (i28 > 300 && ctr28 > 0 && ctr28 < 3.5) {
    return { section: "Immediate Refresh", score: 105 + base + i28 / 20, reason: "high 28-day impressions with weak CTR", action: "rewrite title/meta", titleAlignment, metaAlignment };
  }
  if ((pos7 >= 8 && pos7 <= 20) || (pos28 >= 8 && pos28 <= 20)) {
    return { section: "Promotion Queue", score: 80 + base, reason: "ranking in positions 8-20", action: row.recommended_action || "add internal links", titleAlignment, metaAlignment };
  }
  if ((pos7 > 20) || (pos28 > 20)) {
    return { section: "Intent Correction", score: 60 + base, reason: "ranking below position 20", action: "inspect SERP intent and narrow the page framing", titleAlignment, metaAlignment };
  }
  return { section: "Need Data", score: base, reason: "tracker has no meaningful search data yet", action: row.recommended_action || "review", titleAlignment, metaAlignment };
}

function formatMetric(value, suffix = "") {
  return value ? `${value}${suffix}` : "-";
}

function buildRow(row) {
  const classification = classify(row);
  const topQueries = [row.top_query_1, row.top_query_2, row.top_query_3].filter(Boolean).join("; ") || "-";
  return {
    ...row,
    ...classification,
    last7: `${formatMetric(row.last_7d_clicks)} clicks / ${formatMetric(row.last_7d_impressions)} imp / ${formatMetric(row.last_7d_ctr)}`,
    last28: `${formatMetric(row.last_28d_clicks)} clicks / ${formatMetric(row.last_28d_impressions)} imp / ${formatMetric(row.last_28d_ctr)}`,
    topQueries,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.tracker) {
    usage();
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const trackerPath = path.resolve(args.tracker);
  const outPath = path.resolve(args.out);
  const rows = parseCsv(fs.readFileSync(trackerPath, "utf8")).map(buildRow);
  rows.sort((a, b) => b.score - a.score || a.page.localeCompare(b.page));

  const sections = ["Immediate Refresh", "Promotion Queue", "Intent Correction", "Need Data"];
  const topN = Number.isFinite(args.top) && args.top > 0 ? args.top : rows.length;
  const lines = [
    "# Weekly SEO Priority Report",
    "",
    `Generated from: \`${path.relative(process.cwd(), trackerPath).replace(/\\/g, "/")}\``,
    "",
  ];

  for (const section of sections) {
    const group = rows.filter((row) => row.section === section).slice(0, topN);
    if (group.length === 0) continue;
    lines.push(`## ${section}`, "");
    for (const row of group) {
      lines.push(
        `- \`${row.page}\``,
        `  - keyword: ${row.target_keyword}`,
        `  - reason: ${row.reason}`,
        `  - action: ${row.action}`,
        `  - 7d: ${row.last7}`,
        `  - 28d: ${row.last28}`,
        `  - top queries: ${row.topQueries}`,
        `  - title alignment: ${row.titleAlignment.label}`,
        `  - meta alignment: ${row.metaAlignment.label}`,
        row.current_title ? `  - current title: ${row.current_title}` : "  - current title: -",
        row.current_meta ? `  - current meta: ${row.current_meta}` : "  - current meta: -",
        "",
      );
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Generated report: ${path.relative(process.cwd(), outPath)}`);
}

main();
