import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { ApiError, requestJSON } from "../app/http-client";

let origin = "",
  writes = 0;
const server = createServer((req, res) => {
  if (req.url === "/slow-write") {
    writes++;
    const timer = setTimeout(() => res.end('{"saved":true}'), 500);
    timer.unref();
    return;
  }
  if (req.url === "/bad-json") return res.end("Temporary upstream page");
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/private") {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "Please sign in to continue." }));
  }
  res.end(
    JSON.stringify({
      type: req.headers["content-type"],
      accept: req.headers.accept,
      custom: req.headers["x-test"],
    }),
  );
});
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

test("JSON requests retain caller headers and multipart uploads retain their boundary", async () => {
  const json = await requestJSON(origin, {
    method: "POST",
    body: "{}",
    headers: { "X-Test": "kept" },
  });
  assert.equal(json.type, "application/json");
  assert.equal(json.accept, "application/json");
  assert.equal(json.custom, "kept");
  const form = new FormData();
  form.set("image", new Blob(["fixture"], { type: "image/png" }), "test.png");
  const multipart = await requestJSON(origin, { method: "POST", body: form });
  assert.match(multipart.type, /^multipart\/form-data; boundary=/);
});
test("HTTP authentication failures retain their status and useful message", async () => {
  await assert.rejects(requestJSON(origin + "/private"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.match(error.message, /sign in/);
    return true;
  });
  await assert.rejects(
    requestJSON(origin + "/bad-json"),
    /unexpected response/,
  );
});
test("a timed-out write is never retried and explains that its outcome may be uncertain", async () => {
  await requestJSON(origin); // Warm up the loopback connection before the short deadline.
  await assert.rejects(
    requestJSON(origin + "/slow-write", { method: "POST", body: "{}" }, 100),
    /may have been saved/,
  );
  assert.equal(writes, 1);
});
test("caller cancellation is distinguishable from a failed request", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestJSON(origin, { signal: controller.signal }), {
    name: "AbortError",
  });
});
