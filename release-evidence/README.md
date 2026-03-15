# Release Evidence

When a checklist item in `EXECUTION_TODO.md` moves from `- [ ]` to `- [x]`, the same change must include a release evidence manifest under `release-evidence/`.

This is the enforcement point for the Phase C rule:

- code
- tests
- docs
- example
- smoke or visibility gate

without all five, the item is not considered done.

## Required process

1. Add a JSON manifest in `release-evidence/` named like `YYYY-MM-DD-short-slug.json`.
2. Reference the exact `EXECUTION_TODO.md` line text in `completed_todo_items`.
3. Record the proof for:
   - code changes
   - tests
   - docs
   - examples
   - smoke or visibility validation
4. Record operational review:
   - deployment environment review status
   - rollback plan
5. Run:

```bash
node --test test/check-release-evidence.test.mjs
node test/check-release-evidence.mjs --base HEAD~1 --head HEAD
```

## Manifest shape

```json
{
  "id": "2026-03-15-release-rule-enforcement",
  "title": "Enforce release checklist rule in tooling",
  "date": "2026-03-15",
  "summary": "Adds automated release evidence validation before checklist items are marked complete.",
  "completed_todo_items": [
    "Enforce release checklist rule: code + tests + docs + example + smoke/visibility gate before marking items done"
  ],
  "evidence": {
    "code": [{ "repo": "tokvera", "paths": ["test/check-release-evidence.mjs"] }],
    "tests": [{ "repo": "tokvera", "commands": ["node --test test/check-release-evidence.test.mjs"] }],
    "docs": [{ "repo": "tokvera", "paths": ["README.md", "EXECUTION_TODO.md"] }],
    "examples": [{ "repo": "tokvera", "paths": ["release-evidence/2026-03-15-release-rule-enforcement.json"] }],
    "smoke_or_visibility": [{ "repo": "tokvera", "commands": ["node test/check-release-evidence.mjs --base HEAD~1 --head HEAD"] }]
  },
  "ops": {
    "deployment_env_reviewed": true,
    "rollback_plan_documented": true,
    "rollback_plan": "Revert the workflow, validator, tests, and release evidence manifest."
  }
}
```
