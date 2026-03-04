# Tokvera

AI Cost Intelligence for SaaS

## What Tokvera Is

Tokvera is infrastructure for measuring, understanding, and controlling AI spend in production SaaS systems.  
It focuses on request-level cost telemetry, model usage visibility, and operational guardrails.

## Why It Exists

AI usage costs are often fragmented across providers, teams, and services.  
Without consistent cost instrumentation, teams cannot answer basic questions:

- Which features drive spend?
- Which users or tenants are most expensive to serve?
- Where are cost anomalies introduced?

Tokvera exists to make those answers observable by default.

## SDKs

- JavaScript SDK: [`@tokvera/sdk` on npm](https://www.npmjs.com/package/@tokvera/sdk)
- Python SDK: [`tokvera` on PyPI](https://pypi.org/project/tokvera/)

## Examples

Public runnable examples are available in [`examples/`](examples/README.md):

- Node SDK example: [`examples/node`](examples/node)
- Python SDK example: [`examples/python`](examples/python)

Both examples include Trace Context v1 fields (`trace_id`, `conversation_id`, `span_id`, `parent_span_id`, `step_name`).

## Privacy-First Approach

- No training on customer data
- Data minimization by default
- Clear control over what telemetry is collected
- Designed for production compliance requirements

## Roadmap

- Observability SDKs for JS and Python
- Streaming ingestion and advanced cost metrics
- Budget alerts and anomaly detection
- AI gateway mode for policy and routing control
- Optimization workflows and control plane tooling

See `ROADMAP.md` for details.

## Contributing

Contributions are welcome.  
Read `CONTRIBUTING.md` before opening issues or pull requests.

## Contact

- Security: `security@tokvera.com`
- General: open a GitHub issue in this repository
