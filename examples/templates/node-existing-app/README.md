# Node Existing-App Starter

This starter is for teams with a custom Node service that want:

- one coherent trace
- manual control over the root span
- one tracked provider call
- immediate verification in `/dashboard/traces/live`

## Run

```bash
cp .env.example .env
npm install
npm start
```

## What It Does

- creates a manual root trace
- opens a child model span
- wraps one OpenAI-shaped call with Tokvera
- emits lifecycle events so the run appears in live traces immediately

## Replace Next

- `fakeOpenAI` with your real OpenAI client
- `starter_tenant` and `starter_customer` with real identifiers
- `feature` with a feature name used by your app

## Verify

Follow `../checklists/verify-in-live-traces.md`
