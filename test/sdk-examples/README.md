# SDK Example Test Folder

This folder contains smoke tests for both published Tokvera SDKs:

- JavaScript SDK from npm: `@tokvera/sdk`
- Python SDK from PyPI: `tokvera`

There are two runners:
- Local mock smoke (`run-smoke.mjs`): validates SDK emission to a local test server.
- Production smoke (`run-production-smoke.mjs`): validates deployed API + analytics metric increments.

## Structure

- `mock-ingest-server.mjs`: local HTTP server for `POST /v1/events`
- `run-smoke.mjs`: orchestrates setup + example execution + verification
- `run-production-smoke.mjs`: validates `health`, emits events, and checks feature breakdown increments
- `node-example/`: JavaScript SDK example app
- `python-example/`: Python SDK example app

## Run Local Mock Smoke

From this folder:

```bash
node run-smoke.mjs
```

Expected result:

- Node example sends `chat.completions.create` and `responses.create` events.
- Python example sends `chat.completions.create` and `responses.create` events.
- Final output confirms at least 4 total ingested events.

## Run Production Smoke

Required:

```bash
export TOKVERA_API_KEY="tkv_your_project_key"
```

Optional (defaults shown):

```bash
export TOKVERA_API_BASE_URL="https://api.tokvera.org"
export SMOKE_METRICS_TIMEOUT_SECONDS="90"
export SMOKE_METRICS_POLL_SECONDS="5"
```

Run:

```bash
node run-production-smoke.mjs
```

Expected result:

- `GET /health` returns success.
- Node and Python examples each emit 2 events to `/v1/events`.
- `/v1/metrics/breakdown?group_by=feature` shows both generated smoke features incrementing.
