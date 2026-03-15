# Tokvera Starter Templates

These starter packs are intended for teams evaluating Tokvera before they build a full integration.

Each template is designed to get a team from:

1. project key
2. first traced request
3. live traces verification
4. trace detail inspection

without needing to understand the entire platform up front.

## Starter Packs

- `node-existing-app/`
  - Manual tracing substrate + one tracked provider call
  - Best for custom apps and existing services
- `python-existing-app/`
  - Python version of the manual-tracer starter
  - Best for FastAPI, Django, Celery, and custom Python services
- `node-multi-model-router/`
  - One root trace with multiple provider calls under one run
  - Best for router, fallback, and hybrid provider setups

## Shared Verification Checklist

Use `checklists/verify-in-live-traces.md` after you run any starter.

The goal is to verify:

- the request appears in `/dashboard/traces/live`
- the trace opens in detail
- the selected run shows input/output/metadata/cost
- the trace structure matches your app mental model

## How to Use These Templates

1. Copy the starter directory into a new repo or app folder.
2. Rename the feature names and tenant/customer identifiers for your environment.
3. Replace the fake provider client with your real client if you want live provider calls.
4. Keep lifecycle events on during initial rollout so `/dashboard/traces/live` shows work immediately.

## Related Docs

- `https://tokvera.org/docs/get-started`
- `https://tokvera.org/docs/quickstart`
- `https://tokvera.org/docs/live-tracing`
- `https://tokvera.org/docs/multi-model-tracing`
