import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const zeroShaPattern = /^0+$/;

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

export function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    base: process.env.RELEASE_EVIDENCE_BASE || "",
    head: process.env.RELEASE_EVIDENCE_HEAD || "HEAD",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      parsed.base = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--head") {
      parsed.head = argv[index + 1] || "HEAD";
      index += 1;
    }
  }

  if (!parsed.base || zeroShaPattern.test(parsed.base)) {
    parsed.base = "HEAD~1";
  }

  if (!parsed.head || zeroShaPattern.test(parsed.head)) {
    parsed.head = "HEAD";
  }

  return parsed;
}

function parseChecklist(content) {
  const items = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^- \[([ x])\] (.+)$/);
    if (!match) continue;
    items.set(match[2].trim(), match[1] === "x");
  }
  return items;
}

export function getNewlyCompletedTodoItems(baseContent, headContent) {
  const before = parseChecklist(baseContent);
  const after = parseChecklist(headContent);
  const completed = [];

  for (const [item, isChecked] of after.entries()) {
    if (!isChecked) continue;
    if (before.get(item) === true) continue;
    if (!before.has(item)) continue;
    completed.push(item);
  }

  return completed.sort();
}

export function validateManifest(manifest, filePath = "<inline>") {
  const errors = [];

  const requireString = (value, label) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${filePath}: ${label} must be a non-empty string`);
    }
  };

  const requireArray = (value, label) => {
    if (!Array.isArray(value) || value.length === 0) {
      errors.push(`${filePath}: ${label} must be a non-empty array`);
      return false;
    }
    return true;
  };

  requireString(manifest.id, "id");
  requireString(manifest.title, "title");
  requireString(manifest.date, "date");
  requireString(manifest.summary, "summary");

  if (typeof manifest.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(manifest.date)) {
    errors.push(`${filePath}: date must be YYYY-MM-DD`);
  }

  if (requireArray(manifest.completed_todo_items, "completed_todo_items")) {
    for (const [index, item] of manifest.completed_todo_items.entries()) {
      if (typeof item !== "string" || item.trim().length === 0) {
        errors.push(`${filePath}: completed_todo_items[${index}] must be a non-empty string`);
      }
    }
  }

  const evidence = manifest.evidence;
  if (!evidence || typeof evidence !== "object") {
    errors.push(`${filePath}: evidence must be an object`);
  } else {
    const entryRules = [
      ["code", true, "paths"],
      ["tests", true, "commands"],
      ["docs", true, "paths"],
      ["examples", true, "paths"],
      ["smoke_or_visibility", true, "commands"],
    ];

    for (const [section, required, key] of entryRules) {
      const entries = evidence[section];
      if (!requireArray(entries, `evidence.${section}`)) {
        continue;
      }
      for (const [index, entry] of entries.entries()) {
        if (!entry || typeof entry !== "object") {
          errors.push(`${filePath}: evidence.${section}[${index}] must be an object`);
          continue;
        }
        requireString(entry.repo, `evidence.${section}[${index}].repo`);
        if (required) {
          const values = entry[key];
          if (!Array.isArray(values) || values.length === 0) {
            errors.push(`${filePath}: evidence.${section}[${index}].${key} must be a non-empty array`);
          }
        }
      }
    }
  }

  const ops = manifest.ops;
  if (!ops || typeof ops !== "object") {
    errors.push(`${filePath}: ops must be an object`);
  } else {
    if (typeof ops.deployment_env_reviewed !== "boolean") {
      errors.push(`${filePath}: ops.deployment_env_reviewed must be boolean`);
    }
    if (typeof ops.rollback_plan_documented !== "boolean") {
      errors.push(`${filePath}: ops.rollback_plan_documented must be boolean`);
    }
    requireString(ops.rollback_plan, "ops.rollback_plan");
  }

  return errors;
}

export async function loadManifest(filePath) {
  const absolutePath = path.resolve(repoRoot, filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  return JSON.parse(raw);
}

function getChangedFiles(base, head) {
  const args = head === "WORKTREE" ? ["diff", "--name-only", base] : ["diff", "--name-only", base, head];
  const output = runGit(args);
  const changed = output ? output.split(/\r?\n/).filter(Boolean) : [];

  if (head !== "WORKTREE") {
    return changed;
  }

  const untrackedOutput = runGit(["ls-files", "--others", "--exclude-standard"]);
  const untracked = untrackedOutput ? untrackedOutput.split(/\r?\n/).filter(Boolean) : [];
  return [...new Set([...changed, ...untracked])];
}

async function loadTodoContent(ref) {
  if (ref === "WORKTREE") {
    return fs.readFile(path.resolve(repoRoot, "EXECUTION_TODO.md"), "utf8");
  }
  return runGit(["show", `${ref}:EXECUTION_TODO.md`]);
}

function gatherEvidenceFiles(changedFiles) {
  return changedFiles.filter((file) => file.startsWith("release-evidence/") && file.endsWith(".json"));
}

function ensureCoverage(newlyCompletedItems, manifests) {
  const covered = new Set();
  for (const manifest of manifests) {
    for (const item of manifest.completed_todo_items || []) {
      covered.add(item);
    }
  }

  return newlyCompletedItems.filter((item) => !covered.has(item));
}

export async function validateReleaseEvidence({ base, head }) {
  const changedFiles = getChangedFiles(base, head);
  const evidenceFiles = gatherEvidenceFiles(changedFiles);
  const results = [];

  let newlyCompletedItems = [];
  if (changedFiles.includes("EXECUTION_TODO.md")) {
    const [before, after] = await Promise.all([loadTodoContent(base), loadTodoContent(head)]);
    newlyCompletedItems = getNewlyCompletedTodoItems(before, after);
  }

  if (newlyCompletedItems.length > 0 && evidenceFiles.length === 0) {
    throw new Error(
      `Newly completed TODO items require a release evidence manifest under release-evidence/. Missing evidence for: ${newlyCompletedItems.join("; ")}`
    );
  }

  for (const file of evidenceFiles) {
    const manifest = await loadManifest(file);
    const errors = validateManifest(manifest, file);
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
    results.push({ file, manifest });
  }

  if (newlyCompletedItems.length > 0) {
    const uncovered = ensureCoverage(
      newlyCompletedItems,
      results.map((item) => item.manifest)
    );
    if (uncovered.length > 0) {
      throw new Error(
        `Release evidence does not cover all newly completed TODO items. Missing: ${uncovered.join("; ")}`
      );
    }
  }

  return {
    changedFiles,
    evidenceFiles,
    newlyCompletedItems,
  };
}

async function main() {
  const { base, head } = parseArgs();
  const result = await validateReleaseEvidence({ base, head });

  console.log(`[release-evidence] base=${base} head=${head}`);
  console.log(`[release-evidence] changed files=${result.changedFiles.length}`);
  console.log(`[release-evidence] manifests validated=${result.evidenceFiles.length}`);
  if (result.newlyCompletedItems.length > 0) {
    console.log(`[release-evidence] newly completed TODO items covered=${result.newlyCompletedItems.length}`);
  } else {
    console.log("[release-evidence] no newly completed TODO items detected");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[release-evidence] FAIL: ${error.message}`);
    process.exit(1);
  });
}
