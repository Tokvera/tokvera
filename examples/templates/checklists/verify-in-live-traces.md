# Verify In Live Traces

Run this checklist after sending the first request from any starter template.

## Before You Run

- Confirm the project key belongs to the project selected in the dashboard.
- Confirm `TOKVERA_INGEST_URL` points to `https://api.tokvera.org/v1/events` unless you are using another deployment.
- Keep lifecycle events enabled during setup.

## Checklist

1. Send one request from the starter app.
2. Open `/dashboard/traces/live`.
3. Confirm a new row appears for your feature.
4. If lifecycle events are enabled, confirm the row appears before completion and transitions to a terminal state.
5. Open the row drawer or detail page.
6. Confirm:
   - status is correct
   - latency is present
   - cost and token usage are present when available
   - metadata shows `trace_id`, `run_id`, and `span_id`
7. Open `/dashboard/traces`.
8. Confirm the run list, span tree, and inspector reflect the same trace.
9. Open full trace detail and inspect:
   - input
   - output
   - metadata
   - cost
10. Confirm the trace structure matches what the app just did.

## If No Row Appears

- Check that the project key is valid and belongs to the selected project.
- Check the feature name you emitted and search for it in traces.
- Confirm `emitLifecycleEvents` or `emit_lifecycle_events` is enabled.
- Confirm the app can reach the ingest URL.
- If you used a fake client, confirm the Tokvera wrapper or manual tracer still executed.

## Success Signal

The starter is considered verified only when you can move from:

- request execution
- to `/dashboard/traces/live`
- to trace detail
- to payload and metadata inspection

without losing the run context.
