import type { IncomingMessage, ServerResponse } from "node:http";
import { nodeHandler } from "../server/node";
export const config = { api: { bodyParser: false } };
type PlatformRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
export default function handler(req: PlatformRequest, res: ServerResponse) {
  const route = req.query?.__route;
  if (typeof route === "string") {
    const url = new URL(
      req.url || "/",
      process.env.APP_ORIGIN || "http://localhost",
    );
    url.pathname = "/api/" + route;
    url.searchParams.delete("__route");
    req.url = url.pathname + url.search;
  }
  return nodeHandler(req, res);
}
