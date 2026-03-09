# Tokvera SDK Examples

This folder contains simple, runnable examples for both published SDKs:

- JavaScript SDK (`@tokvera/sdk`)
- Python SDK (`tokvera`)

Each example uses fake provider-shaped clients/callback payloads so you can validate Tokvera event emission without provider credentials.

## Prerequisites

- A Tokvera project API key
- Ingestion URL

Example values:

```bash
TOKVERA_API_KEY=tkv_your_project_key
TOKVERA_INGEST_URL=https://api.tokvera.org/v1/events
```

## Node Example

Create local env file first:

```bash
cd examples/node
cp .env.example .env
```

Then run:

```bash
cd examples/node
npm install
npm run example
```

### Node Integrations Example

```bash
cd examples/node
npm install
npm run example:integrations
```

This runs:
- Express middleware context propagation
- LangChain callback helper
- Vercel AI SDK `generateText` wrapper

## Python Example

Create local env file first:

```bash
cd examples/python
cp .env.example .env
```

Then run:

```bash
cd examples/python
pip install -r requirements.txt
python example.py
```

### Python Integrations Example

```bash
cd examples/python
pip install -r requirements.txt
python integrations.py
```

This runs:
- FastAPI middleware context propagation
- LangChain callback helper
- LlamaIndex callback helper

## Telemetry Coverage

All examples emit Trace Context v1 tags:

- `trace_id`
- `conversation_id`
- `span_id`
- `parent_span_id`
- `step_name`

Examples also emit Trace Context v2 fields:

- `schema_version=2026-04-01`
- `span_kind`
- `metrics` (step-level token/cost/latency metadata)
- `decision` (routing/retry outcome markers)
- `payload_blocks` (redacted/encrypted server-side when raw capture is enabled)

The updated examples also emit Evaluation Signals v1:

- `outcome`
- `retry_reason`
- `fallback_reason`
- `quality_label`
- `feedback_score`

Python compatibility:
- Python example filters track kwargs against the installed SDK signature, so it remains runnable on slightly older PyPI builds while still demonstrating v2 fields when available.
