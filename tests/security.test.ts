import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo } from "../server/config";
import { assertSameOrigin, password, uuid } from "../server/http";
import { handleAPI } from "../server/api";

test("return URLs stay within TermTrove even with encoded or backslash tricks", () => {
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\nevil.test",
    {},
    undefined,
  ])
    assert.equal(safeReturnTo(value), "/account");
  assert.equal(
    safeReturnTo("/checkout/123?from=books"),
    "/checkout/123?from=books",
  );
});
test("mutations require an exact Origin and reject cross-site browser requests", () => {
  for (const origin of [null, "https://evil.test", "http://termtrove.test"]) {
    const headers = new Headers();
    if (origin) headers.set("origin", origin);
    assert.throws(() =>
      assertSameOrigin(
        new Request("https://termtrove.test/api/me", {
          method: "PATCH",
          headers,
        }),
        "https://termtrove.test",
      ),
    );
  }
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://termtrove.test/api/me", {
        method: "PATCH",
        headers: { Origin: "https://termtrove.test" },
      }),
      "https://termtrove.test",
    ),
  );
});
test("password and record ID validation reject unsafe inputs", () => {
  for (const pass of ["short", " ".repeat(3), 123])
    assert.throws(() => password(pass));
  assert.equal(password("a-valid-password-123"), "a-valid-password-123");
  assert.throws(() => uuid("demo"));
  assert.equal(
    uuid("00000000-0000-4000-8000-000000000001"),
    "00000000-0000-4000-8000-000000000001",
  );
});
test("missing backend configuration fails clearly rather than creating a simulated user", async () => {
  const saved = { ...process.env };
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.APP_ORIGIN;
  try {
    const response = await handleAPI(
      new Request("http://localhost/api/me", {
        headers: { "oai-authenticated-user-id": "forged-admin" },
      }),
    );
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not configured/);
  } finally {
    process.env = saved;
  }
});
