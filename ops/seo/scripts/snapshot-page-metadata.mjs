#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

function parseArgs(argv) {
  const args = { out: path.join("ops", "seo", "weekly-gsc-ctr-tracker.csv"), baseUrl: "https://tokvera.org" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--tracker") args.tracker = next, i += 1;
    else if (arg === "--out") args.out = next, i += 1;
    else if (arg === "--base-url") args.baseUrl = next, i += 1;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log(`Usage:\n  node ops/seo/scripts/snapshot-page-metadata.mjs --tracker <tracker.csv> [--base-url <url>] [--out <output.csv>]`);
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
  if (!input) return "/";
  let pathname = input.trim();
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return pathname;
}

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim().replace(/\s+/g, " ") : "";
}

async function fetchPage(baseUrl, pagePath) {
  const url = new URL(normalizePath(pagePath), baseUrl);
  const html = await new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(
      url,
      {
        method: "GET",
        headers: { Connection: "close" },
      },
      (response) => {
        if ((response.statusCode ?? 0) >= 300 && (response.statusCode ?? 0) < 400 && response.headers.location) {
          response.resume();
          fetchPage(baseUrl, response.headers.location).then(resolve, reject);
          return;
        }
        if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
          response.resume();
          reject(new Error(`Failed to fetch ${url.toString()}: ${response.statusCode}`));
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      },
    );
    request.on("error", reject);
    request.end();
  });
  return {
    title: extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    meta: extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.tracker) {
    usage();
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const trackerPath = path.resolve(args.tracker);
  const outPath = path.resolve(args.out || trackerPath);
  const rows = parseCsv(fs.readFileSync(trackerPath, "utf8"));
  const headers = Object.keys(rows[0] || {});

  for (const row of rows) {
    const { title, meta } = await fetchPage(args.baseUrl, row.page);
    row.current_title = title;
    row.current_meta = meta;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, stringifyCsv(rows, headers), "utf8");
  console.log(`Updated tracker metadata: ${path.relative(process.cwd(), outPath)}`);
}

await main();
