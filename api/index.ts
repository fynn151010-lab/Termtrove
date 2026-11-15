import type { VercelRequest, VercelResponse } from "@vercel/node";
import { nodeHandler } from "../server/node";
export const config = { api: { bodyParser: false } };
export default function handler(req: VercelRequest, res: VercelResponse) {
  const route = req.query.__route;
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
