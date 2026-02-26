import http from "node:http";

const port = Number(process.env.MOCK_INGEST_PORT || 8787);
const events = [];

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
    return sendJson(res, 200, {
      ok: true,
      count: events.length,
      endpoints: events.map((item) => item.endpoint),
    });
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
