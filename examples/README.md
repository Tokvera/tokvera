# Tokvera SDK Examples

This folder contains simple, runnable examples for both published SDKs:

- JavaScript SDK (`@tokvera/sdk`)
- Python SDK (`tokvera`)

Each example uses a fake OpenAI-shaped client so you can validate Tokvera event emission without provider credentials.

## Prerequisites

- A Tokvera project API key
- Ingestion URL

Example values:

```bash
TOKVERA_API_KEY=tkv_your_project_key
TOKVERA_INGEST_URL=https://api.tokvera.org/v1/events
```

## Node Example

```bash
cd examples/node
npm install
npm run example
```

## Python Example

```bash
cd examples/python
pip install -r requirements.txt
python example.py
```

## Trace Context

Both examples emit Trace Context v1 tags:

- `trace_id`
- `conversation_id`
- `span_id`
- `parent_span_id`
- `step_name`

