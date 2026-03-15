import test from "node:test";
import assert from "node:assert/strict";

import {
  getNewlyCompletedTodoItems,
  validateManifest,
} from "./check-release-evidence.mjs";

test("getNewlyCompletedTodoItems detects unchecked to checked transitions", () => {
  const before = [
    "- [ ] First item",
    "- [x] Already done",
    "- [ ] Another item",
  ].join("\n");

  const after = [
    "- [x] First item",
    "- [x] Already done",
    "- [ ] Another item",
  ].join("\n");

  assert.deepEqual(getNewlyCompletedTodoItems(before, after), ["First item"]);
});

test("validateManifest accepts a complete release evidence manifest", () => {
  const manifest = {
    id: "2026-03-15-release-evidence-gate",
    title: "Enforce release evidence gate",
    date: "2026-03-15",
    summary: "Adds CI validation for release evidence before TODO items are marked complete.",
    completed_todo_items: [
      "Enforce release checklist rule: code + tests + docs + example + smoke/visibility gate before marking items done",
    ],
    evidence: {
      code: [{ repo: "tokvera", paths: [".github/workflows/release-evidence.yml", "test/check-release-evidence.mjs"] }],
      tests: [{ repo: "tokvera", commands: ["node --test test/check-release-evidence.test.mjs"] }],
      docs: [{ repo: "tokvera", paths: ["README.md", "CONTRIBUTING.md", "release-evidence/README.md"] }],
      examples: [{ repo: "tokvera", paths: ["release-evidence/2026-03-15-release-rule-enforcement.json"] }],
      smoke_or_visibility: [{ repo: "tokvera", commands: ["node test/check-release-evidence.mjs --base HEAD~1 --head HEAD"] }],
    },
    ops: {
      deployment_env_reviewed: true,
      rollback_plan_documented: true,
      rollback_plan: "Revert the workflow, validator, tests, and evidence manifest if the gate misfires.",
    },
  };

  assert.deepEqual(validateManifest(manifest), []);
});

test("validateManifest rejects missing smoke evidence", () => {
  const manifest = {
    id: "bad-manifest",
    title: "Broken manifest",
    date: "2026-03-15",
    summary: "Invalid example",
    completed_todo_items: ["Checklist item"],
    evidence: {
      code: [{ repo: "tokvera", paths: ["file.js"] }],
      tests: [{ repo: "tokvera", commands: ["node --test"] }],
      docs: [{ repo: "tokvera", paths: ["README.md"] }],
      examples: [{ repo: "tokvera", paths: ["release-evidence/example.json"] }],
      smoke_or_visibility: [],
    },
    ops: {
      deployment_env_reviewed: true,
      rollback_plan_documented: true,
      rollback_plan: "Rollback note",
    },
  };

  const errors = validateManifest(manifest, "release-evidence/bad.json");
  assert.ok(errors.some((error) => error.includes("evidence.smoke_or_visibility must be a non-empty array")));
});
