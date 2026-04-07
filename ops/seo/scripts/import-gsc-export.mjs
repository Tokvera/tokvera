#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { out: path.join("ops", "seo", "weekly-gsc-ctr-tracker.csv") };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--pages") args.pages = next, i += 1;
    else if (arg === "--queries") args.queries = next, i += 1;
    else if (arg === "--tracker") args.tracker = next, i += 1;
    else if (arg === "--out") args.out = next, i += 1;
    else if (arg === "--period") args.period = next, i += 1;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log(`Usage:\n  node ops/seo/scripts/import-gsc-export.mjs --tracker <tracker.csv> --pages <pages.csv> --queries <queries.csv> --period <7d|28d> [--out <output.csv>]\n\nNotes:\n- Run once for 7d and once for 28d.\n- Page export must include: Page, Clicks, Impressions, CTR, Position.\n- Query export must include: Query, Page, Clicks, Impressions.`);
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

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function stringifyCsv(rows, headers) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  return `${lines.join("\n")}\n`;
}

function normalizePath(input) {
  if (!input) return "";
  let pathname = input.trim();
  if (/^https?:\/\//i.test(pathname)) {
    pathname = new URL(pathname).pathname;
  }
  pathname = pathname.replace(/[?#].*$/, "");
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return pathname || "/";
}

function parsePercent(input) {
  if (!input) return "";
  const clean = input.replace(/%/g, "").trim();
  const number = Number(clean);
  if (!Number.isFinite(number)) return input;
  return `${number.toFixed(2)}%`;
}

function parseNumberString(input, decimals = 2) {
  if (!input) return "";
  const number = Number(String(input).replace(/,/g, "").trim());
  if (!Number.isFinite(number)) return input;
  return decimals === 0 ? String(Math.round(number)) : number.toFixed(decimals);
}

function topQueriesByPage(queryRows) {
  const byPage = new Map();
  for (const row of queryRows) {
    const page = normalizePath(row.Page || row.page || row.URL || row.Url);
    const query = row.Query || row.query || row.TopQuery || row["Top queries"];
    if (!page || !query) continue;
    const impressions = Number(String(row.Impressions || row.impressions || "0").replace(/,/g, "")) || 0;
    const clicks = Number(String(row.Clicks || row.clicks || "0").replace(/,/g, "")) || 0;
    const items = byPage.get(page) || [];
    items.push({ query, impressions, clicks });
    byPage.set(page, items);
  }
  for (const [page, items] of byPage.entries()) {
    items.sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.query.localeCompare(b.query));
    byPage.set(page, items.slice(0, 3).map((item) => item.query));
  }
  return byPage;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!args.tracker || !args.pages || !args.queries || !args.period) {
    usage();
    process.exitCode = 1;
    return;
  }
  if (!["7d", "28d"].includes(args.period)) {
    throw new Error(`Unsupported period: ${args.period}`);
  }

  const trackerPath = path.resolve(args.tracker);
  const pagesPath = path.resolve(args.pages);
  const queriesPath = path.resolve(args.queries);
  const outPath = path.resolve(args.out || trackerPath);

  const trackerRows = parseCsv(fs.readFileSync(trackerPath, "utf8"));
  const pageRows = parseCsv(fs.readFileSync(pagesPath, "utf8"));
  const queryRows = parseCsv(fs.readFileSync(queriesPath, "utf8"));
  const topQueries = topQueriesByPage(queryRows);

  const prefix = args.period === "7d" ? "last_7d" : "last_28d";
  const headers = Object.keys(trackerRows[0] || {});

  for (const trackerRow of trackerRows) {
    const trackerPage = normalizePath(trackerRow.page);
    const pageMatch = pageRows.find((row) => normalizePath(row.Page || row.page || row.URL || row.Url) === trackerPage);
    if (pageMatch) {
      trackerRow[`${prefix}_clicks`] = parseNumberString(pageMatch.Clicks || pageMatch.clicks, 0);
      trackerRow[`${prefix}_impressions`] = parseNumberString(pageMatch.Impressions || pageMatch.impressions, 0);
      trackerRow[`${prefix}_ctr`] = parsePercent(pageMatch.CTR || pageMatch.ctr);
      trackerRow[`${prefix}_position`] = parseNumberString(pageMatch.Position || pageMatch.position, 2);
      trackerRow.indexed = "yes";
    }

    const queries = topQueries.get(trackerPage);
    if (queries) {
      trackerRow.top_query_1 = queries[0] || trackerRow.top_query_1 || "";
      trackerRow.top_query_2 = queries[1] || trackerRow.top_query_2 || "";
      trackerRow.top_query_3 = queries[2] || trackerRow.top_query_3 || "";
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, stringifyCsv(trackerRows, headers), "utf8");
  console.log(`Updated tracker: ${path.relative(process.cwd(), outPath)}`);
}

main();
