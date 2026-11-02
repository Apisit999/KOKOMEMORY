// Minimal in-memory S3-compatible server for the isolated studio stack (no auth checks, loopback only).
// Usage: node scripts/local-s3-mock.mjs  -> http://127.0.0.1:9199 (path-style /bucket/key)
import http from "node:http";

const store = new Map();
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,DELETE,HEAD,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "etag",
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const key = decodeURIComponent(url.pathname);
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.method === "PUT") {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => { store.set(key, { body: Buffer.concat(chunks), type: req.headers["content-type"] || "application/octet-stream" }); res.writeHead(200, { ...cors, etag: '"mock"' }); res.end(); });
    return;
  }
  if (req.method === "DELETE") { store.delete(key); res.writeHead(204, cors); return res.end(); }
  if (req.method === "GET" || req.method === "HEAD") {
    const obj = store.get(key);
    if (!obj) {
      res.writeHead(404, { ...cors, "content-type": "application/xml" });
      return res.end('<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>');
    }
    const headers = { ...cors, "content-type": obj.type, "content-length": obj.body.length, etag: '"mock"' };
    const cd = url.searchParams.get("response-content-disposition");
    if (cd) headers["content-disposition"] = cd;
    res.writeHead(200, headers);
    return res.end(req.method === "HEAD" ? undefined : obj.body);
  }
  res.writeHead(405, cors); res.end();
}).listen(9199, "127.0.0.1", () => console.log("local S3 mock on http://127.0.0.1:9199"));
