# SDK Example Test Folder

This folder contains a simple end-to-end smoke test for both published Tokvera SDKs:

- JavaScript SDK from npm: `@tokvera/sdk`
- Python SDK from PyPI: `tokvera`

The smoke runner starts a local mock ingest server, runs both example apps, and verifies events were received.

## Structure

- `mock-ingest-server.mjs`: local HTTP server for `POST /v1/events`
- `run-smoke.mjs`: orchestrates setup + example execution + verification
- `node-example/`: JavaScript SDK example app
- `python-example/`: Python SDK example app

## Run

From this folder:

```bash
node run-smoke.mjs
```

Expected result:

- Node example sends `chat.completions.create` and `responses.create` events.
- Python example sends `chat.completions.create` and `responses.create` events.
- Final output confirms at least 4 total ingested events.
