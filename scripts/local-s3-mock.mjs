// Minimal in-memory S3-compatible server for the isolated studio stack (no auth checks, loopback only).
// Usage: node scripts/local-s3-mock.mjs  -> http://127.0.0.1:9199 (path-style /bucket/key)
import http from "node:http";

const store = new Map();
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,DELETE,HEAD,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "etag,content-range,content-length,accept-ranges",
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const key = decodeURIComponent(url.pathname);
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  // When published through a tunnel, only presigned requests are served (the web app signs every URL it hands out).
  if (process.env.S3_MOCK_REQUIRE_SIGNATURE === "1" && !url.searchParams.get("X-Amz-Signature") && !String(req.headers.authorization ?? "").startsWith("AWS4-HMAC-SHA256") && url.pathname !== "/healthz") { res.writeHead(403, cors); return res.end(); }
  if (url.pathname === "/healthz") { res.writeHead(200, cors); return res.end("ok"); }
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
    const headers = { ...cors, "content-type": obj.type, "accept-ranges": "bytes", etag: '"mock"', "cache-control": "private, max-age=300" };
    const cd = url.searchParams.get("response-content-disposition");
    if (cd) headers["content-disposition"] = cd;
    // Phones' download managers send Range requests; answer them properly (206) like real object storage does.
    const range = /^bytes=([0-9]*)-([0-9]*)$/.exec(String(req.headers.range ?? ""));
    if (range && (range[1] || range[2])) {
      const size = obj.body.length;
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) { res.writeHead(416, { ...cors, "content-range": `bytes */${size}` }); return res.end(); }
      res.writeHead(206, { ...headers, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${size}` });
      return res.end(req.method === "HEAD" ? undefined : obj.body.subarray(start, end + 1));
    }
    res.writeHead(200, { ...headers, "content-length": obj.body.length });
    return res.end(req.method === "HEAD" ? undefined : obj.body);
  }
  res.writeHead(405, cors); res.end();
}).listen(9199, process.env.S3_MOCK_HOST || "127.0.0.1", () => console.log(`local S3 mock on ${process.env.S3_MOCK_HOST || "127.0.0.1"}:9199`));
