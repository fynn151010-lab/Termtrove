import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import handler from "../api/index";

const appOrigin = "http://localhost:5173";
const keys = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "APP_ORIGIN",
] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
let origin = "";
const server = createServer((req, res) => {
  const url = new URL(req.url || "/", appOrigin);
  const request = Object.assign(req, {
    query: Object.fromEntries(url.searchParams),
    body: undefined as unknown,
  });
  if (url.searchParams.has("parsed"))
    request.body = "x".repeat(4 * 1024 * 1024 + 1);
  void handler(request, res);
});
before(async () => {
  // Anonymous /me and input validation do not contact this unreachable backend.
  process.env.SUPABASE_URL = "http://127.0.0.1:65534";
  process.env.SUPABASE_PUBLISHABLE_KEY = "non-secret-local-adapter-fixture";
  process.env.APP_ORIGIN = appOrigin;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test("the serverless adapter rewrites its route into the real API", async () => {
  const response = await fetch(origin + "/?__route=me");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: null });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("the HTTP adapter preserves origin checks and request-body validation", async () => {
  const forbidden = await fetch(origin + "/?__route=auth/login", {
    method: "POST",
    headers: { Origin: "https://elsewhere.invalid" },
    body: "{}",
  });
  assert.equal(forbidden.status, 403);
  const malformed = await fetch(origin + "/?__route=auth/login", {
    method: "POST",
    headers: { Origin: appOrigin, "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, "Invalid JSON request.");
});
test("the body limit covers both raw streams and platform-preparsed payloads", async () => {
  const streamed = await fetch(origin + "/?__route=auth/login", {
    method: "POST",
    headers: { Origin: appOrigin },
    body: "x".repeat(4 * 1024 * 1024 + 1),
  });
  assert.equal(streamed.status, 413);
  const parsed = await fetch(origin + "/?__route=auth/login&parsed=1", {
    method: "POST",
    headers: { Origin: appOrigin },
    body: "",
  });
  assert.equal(parsed.status, 413);
});
