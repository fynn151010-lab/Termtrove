import { test } from "node:test";
import assert from "node:assert/strict";
import { serverlessHandler } from "../server/serverless";
import { handleAPI } from "../server/api";
import { productionHeaders } from "../server/security";

const origin = "https://termtrove.example";
const config = {
  origin,
  supabaseUrl: "http://127.0.0.1:65534",
  supabaseKey: "non-secret-local-adapter-fixture",
};
const api = (request: Request) => handleAPI(request, config);

test("serverless API keeps routing, private responses and CSRF protection", async () => {
  const me = await serverlessHandler(new Request(origin + "/api/me"), api);
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { user: null });
  assert.equal(me.headers.get("cache-control"), "private, no-store");
  for (const [name, value] of Object.entries(productionHeaders))
    assert.equal(me.headers.get(name), value);
  const forbidden = await serverlessHandler(
    new Request(origin + "/api/auth/login", {
      method: "POST",
      headers: { origin: "https://elsewhere.invalid" },
      body: "{}",
    }),
    api,
  );
  assert.equal(forbidden.status, 403);
  const unknown = await serverlessHandler(new Request(origin + "/browse"), api);
  assert.equal(unknown.status, 404);
});

test("serverless adapter preserves query strings, multipart bytes and separate auth cookies", async () => {
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array([0, 127, 255])]), "book.jpg");
  const response = await serverlessHandler(
    new Request(origin + "/api/images?next=%2Faccount%3Ftab%3Dorders", {
      method: "POST",
      headers: { origin, cookie: "existing=session" },
      body: form,
    }),
    async (request) => {
      assert.equal(
        new URL(request.url).searchParams.get("next"),
        "/account?tab=orders",
      );
      assert.equal(request.headers.get("cookie"), "existing=session");
      assert.equal(request.headers.get("origin"), origin);
      const upload = (await request.formData()).get("file") as File;
      assert.deepEqual(
        new Uint8Array(await upload.arrayBuffer()),
        new Uint8Array([0, 127, 255]),
      );
      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        "session.0=first; Path=/; HttpOnly; Secure; SameSite=Lax",
      );
      headers.append(
        "Set-Cookie",
        "session.1=second; Path=/; HttpOnly; Secure; SameSite=Lax",
      );
      headers.set("Location", "/account");
      return new Response(null, { status: 303, headers });
    },
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/account");
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.match(response.headers.getSetCookie()[1], /^session\.1=second;/);
});

test("serverless adapter caps streamed uploads without trusting Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request(origin + "/api/images", {
    method: "POST",
    body: stream,
    duplex: "half",
    headers: { "Content-Length": "1" },
  } as RequestInit);
  const response = await serverlessHandler(request, async () => {
    assert.fail("oversized request reached the API");
  });
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("serverless failures return a private, generic JSON error", async () => {
  const response = await serverlessHandler(
    new Request(origin + "/api/me"),
    async () => {
      throw new Error("internal secret detail");
    },
  );
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    error: "The server could not complete this request.",
  });
});
