# Node Multi-Model Router Starter

This starter is for teams that want one trace to contain routing, fallback, and multiple provider calls.

## Run

```bash
cp .env.example .env
npm install
npm start
```

## What It Does

- creates one root trace for the request
- records a routing decision span
- executes one OpenAI-shaped model call
- executes one Anthropic-shaped fallback call
- finishes the run with the final route decision

## Why Use This Starter

Use this when your app:

- routes between providers
- retries or falls back across models
- needs one coherent trace for debugging and cost review

## Verify

Follow `../checklists/verify-in-live-traces.md`
