/**
 * Mock ADK server that returns 503 on /run_sse and /run endpoints.
 * Usage: node scripts/mock-adk-503.mjs
 * Then set NEXT_PUBLIC_ADK_BASE_URL=http://localhost:9503 in .env.local
 */
import { createServer } from "node:http";

const PORT = 9503;

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    console.log(`[mock-adk] ${req.method} ${req.url}`);

    // Session creation must succeed
    if (req.url?.includes("/sessions") && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "mock-session-001", app_name: "app", user_id: "mock" }));
      return;
    }

    // SSE and batch endpoints return 503
    if (req.url?.includes("/run_sse") || req.url?.includes("/run")) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: "UNAVAILABLE: high demand, please retry later" }));
      return;
    }

    // Fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: "Not found" }));
  });
});

server.listen(PORT, () => {
  console.log(`[mock-adk] 503 mock server running on http://localhost:${PORT}`);
  console.log("[mock-adk] Set NEXT_PUBLIC_ADK_BASE_URL=http://localhost:9503 in .env.local");
});
