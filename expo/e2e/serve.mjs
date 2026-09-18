/**
 * Zero-dependency static server for the Expo web export, used by the Playwright
 * smoke test and the store-screenshot script.
 *
 *   node e2e/serve.mjs [dist-dir] [port]
 *
 * Deep routes fall back to index.html so client-side routing works when a test
 * navigates straight to e.g. /toxins instead of clicking its way there.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "dist-web");
const port = Number(process.argv[3] ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

async function readIfFile(path) {
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  // normalize() + the prefix check keep ../ traversal out of the served root.
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const target = join(root, rel);
  if (!target.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let body = await readIfFile(target);
  let ext = extname(target);
  if (body === null && !ext) {
    body = await readIfFile(join(target, "index.html"));
    ext = ".html";
  }
  if (body === null) {
    // SPA fallback: unknown path → let the client router resolve it.
    body = await readIfFile(join(root, "index.html"));
    ext = ".html";
  }
  if (body === null) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(body);
});

server.listen(port, () => {
  console.log(`[e2e] serving ${root} at http://localhost:${port}`);
});
