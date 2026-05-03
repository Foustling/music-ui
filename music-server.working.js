const http = require("http");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const PORT = 8090;
const NAVIDROME = "http://127.0.0.1:4533";

function contentTypeFor(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "no-store",
    });

    res.end(data);
  });
}

function cleanProxyHeaders(upstreamHeaders) {
  const headers = {};

  upstreamHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding" ||
      lower === "connection" ||
      lower === "keep-alive"
    ) {
      return;
    }

    headers[key] = value;
  });

  headers["Cache-Control"] = "no-store";

  return headers;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/rest/")) {
      const targetUrl = NAVIDROME + req.url;

      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "user-agent": "custom-music-ui",
        },
      });

      const headers = cleanProxyHeaders(upstream.headers);

      res.writeHead(upstream.status, headers);

      if (upstream.body) {
        Readable.fromWeb(upstream.body).pipe(res);
      } else {
        res.end();
      }

      return;
    }

    let requestedPath = req.url.split("?")[0];

    if (requestedPath === "/") {
      requestedPath = "/index.html";
    }

    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const publicDir = path.join(__dirname, "public");
    const filePath = path.join(publicDir, safePath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    sendFile(res, filePath);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error: " + err.message);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Music UI running at http://127.0.0.1:${PORT}`);
  console.log(`Proxying Navidrome from ${NAVIDROME}`);
});
