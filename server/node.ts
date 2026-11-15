import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAPI } from "./api";
export async function nodeHandler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers))
      if (value)
        headers.set(name, Array.isArray(value) ? value.join(",") : value);
    let payload: Buffer | undefined;
    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      if (req.body !== undefined)
        payload = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(
              typeof req.body === "string"
                ? req.body
                : JSON.stringify(req.body),
            );
      else {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4 * 1024 * 1024) {
            res.writeHead(413, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Request too large. Photos must be under 3 MB.",
              }),
            );
            return;
          }
          chunks.push(Buffer.from(chunk));
        }
        payload = Buffer.concat(chunks);
      }
    }
    const origin =
      process.env.APP_ORIGIN ||
      "http://localhost:" + (process.env.PORT || 5173);
    const request = new Request(new URL(req.url || "/", origin), {
      method: req.method,
      headers,
      body: payload ? new Uint8Array(payload).buffer : undefined,
    });
    const response = await handleAPI(request);
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      if (name !== "set-cookie") res.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "The server could not complete this request." }),
    );
  }
}
