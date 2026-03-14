import http from "node:http";

const port = Number(process.env.MOCK_INGEST_PORT || 8787);
const events = [];

function toNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function summarizeCounts(items, selector) {
  return items.reduce((acc, item) => {
    const value = selector(item);
    if (!value) return acc;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function uniqueValues(items, selector) {
  return Array.from(
    new Set(
      items
        .map((item) => selector(item))
        .filter((value) => typeof value === "string" && value.length > 0)
    )
  );
}

function buildStats() {
  return {
    ok: true,
    count: events.length,
    endpoints: events.map((item) => item.endpoint),
    features: summarizeCounts(events, (item) => toNonEmptyString(item?.tags?.feature)),
    providers: summarizeCounts(events, (item) => toNonEmptyString(item?.provider)),
    statuses: summarizeCounts(events, (item) => toNonEmptyString(item?.status)),
    event_types: summarizeCounts(events, (item) => toNonEmptyString(item?.event_type)),
    step_names: summarizeCounts(events, (item) => toNonEmptyString(item?.tags?.step_name)),
    trace_ids: uniqueValues(events, (item) => toNonEmptyString(item?.tags?.trace_id)),
    run_ids: uniqueValues(events, (item) => toNonEmptyString(item?.tags?.run_id)),
  };
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && req.url === "/stats") {
    return sendJson(res, 200, buildStats());
  }

  if (req.method === "DELETE" && req.url === "/stats") {
    events.length = 0;
    return sendJson(res, 200, { ok: true, reset: true });
  }

  if (req.method === "POST" && req.url === "/v1/events") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        const event = JSON.parse(raw || "{}");
        events.push(event);
        return sendJson(res, 202, { ok: true, accepted: true });
      } catch {
        return sendJson(res, 400, { ok: false, error: "invalid_json" });
      }
    });
    return;
  }

  return sendJson(res, 404, { ok: false, error: "not_found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-ingest] listening on http://127.0.0.1:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
