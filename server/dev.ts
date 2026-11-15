import "dotenv/config";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { nodeHandler } from "./node";
import { productionHeaders } from "./security";
const port = Number(process.env.PORT || 5173),
  production = process.env.NODE_ENV === "production";
const vite = production
  ? null
  : await (
      await import("vite")
    ).createServer({ server: { middlewareMode: true }, appType: "spa" });
const root = resolve("dist/client");
const mime: Record<string, string> = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  if (production)
    for (const [name, value] of Object.entries(productionHeaders))
      res.setHeader(name, value);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.url?.startsWith("/api/")) return nodeHandler(req, res);
  if (vite) return vite.middlewares(req, res);
  if (!["GET", "HEAD"].includes(req.method || "GET")) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const requested = resolve(
      root,
      "." + new URL(req.url || "/", "http://localhost").pathname,
    );
    if (!requested.startsWith(root + sep) && requested !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    let file = requested;
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, "index.html");
    } catch {
      if (extname(file)) {
        res.writeHead(404);
        res.end();
        return;
      }
      file = resolve(root, "index.html");
    }
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      file.endsWith("index.html")
        ? "no-cache"
        : "public,max-age=31536000,immutable",
    );
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    res.writeHead(500);
    res.end("Build the application first with npm run build.");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`TermTrove running at http://localhost:${port}`),
);
