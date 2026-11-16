import assert from "node:assert/strict";

// Read-only checks: no signup, emails, uploads, orders or database writes.
let origin;
try {
  const url = new URL(process.argv[2]);
  assert.equal(url.protocol, "https:");
  assert.equal(url.username + url.password + url.search + url.hash, "");
  assert.equal(url.pathname, "/");
  origin = url.origin;
} catch {
  console.error("Usage: npm run check:deployment -- https://YOUR-PUBLIC-HOST");
  process.exit(1);
}

let failures = 0;
async function check(label, path, status, inspect) {
  try {
    const response = await fetch(origin + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Accept: path.startsWith("/api/") ? "application/json" : "*/*",
      },
    });
    assert.equal(
      response.status,
      status,
      `expected HTTP ${status}, received ${response.status}`,
    );
    await inspect(response);
    console.log(`PASS ${label}`);
  } catch (error) {
    failures++;
    // Do not print response bodies, headers, redirects, tokens or user records.
    console.error(
      `FAIL ${label}: ${error instanceof Error ? error.message : "request failed"}`,
    );
  }
}
function headers(response) {
  assert.ok(
    response.headers.get("x-content-type-options") === "nosniff",
    "missing nosniff header",
  );
  assert.ok(
    /frame-ancestors 'none'/.test(
      response.headers.get("content-security-policy") || "",
    ),
    "missing frame protection",
  );
}
async function json(response) {
  assert.ok(
    /^application\/json\b/.test(response.headers.get("content-type") || ""),
    "expected JSON content type",
  );
  try {
    return await response.json();
  } catch {
    throw Error("expected valid JSON");
  }
}

await check(
  "Public homepage and security headers",
  "/",
  200,
  async (response) => {
    headers(response);
    assert.match(response.headers.get("content-type") || "", /^text\/html\b/);
    assert.match(await response.text(), /id="root"/);
  },
);
await check(
  "Production script, stylesheet and local fonts",
  "/",
  200,
  async (response) => {
    const html = await response.text();
    const assets = [
      ...[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => [
        match[1],
        /(?:java|ecma)script/,
      ]),
      ...[
        ...html.matchAll(
          /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g,
        ),
      ].map((match) => [match[1], /text\/css/]),
    ];
    assert.ok(
      assets.length >= 2 && assets.length <= 10,
      "expected the built application assets",
    );
    let fontCount = 0;
    for (const [path, mime] of assets) {
      const url = new URL(path, origin);
      assert.ok(
        url.origin === origin,
        "application assets must use the same host",
      );
      const asset = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(45_000),
      });
      assert.ok(asset.status === 200, "a built application asset is missing");
      assert.ok(
        mime.test(asset.headers.get("content-type") || ""),
        "a built application asset has an incorrect content type",
      );
      if (mime.test("text/css")) {
        const css = await asset.text();
        assert.ok(
          !css.includes("fonts.googleapis.com"),
          "stylesheet still depends on remote font loading",
        );
        const fonts = [
          ...css.matchAll(/url\(["']?([^\s\)"']+\.woff2)["']?\)/g),
        ];
        for (const match of fonts) {
          const fontUrl = new URL(match[1], url);
          assert.ok(fontUrl.origin === origin, "fonts must use the same host");
          const font = await fetch(fontUrl, {
            redirect: "manual",
            signal: AbortSignal.timeout(45_000),
          });
          assert.ok(font.status === 200, "a local font is missing");
          const bytes = new Uint8Array(await font.arrayBuffer());
          assert.ok(
            new TextDecoder().decode(bytes.slice(0, 4)) === "wOF2",
            "expected a WOFF2 font",
          );
          fontCount++;
        }
      } else await asset.arrayBuffer();
    }
    assert.ok(fontCount >= 2, "expected both self-hosted typefaces");
  },
);
await check(
  "Database health and API routing",
  "/api/health",
  200,
  async (response) => {
    headers(response);
    assert.ok(
      (await json(response))?.status === "ok",
      "database health is not ready",
    );
  },
);
await check(
  "Anonymous session stays signed out",
  "/api/me",
  200,
  async (response) => {
    assert.ok(
      (await json(response))?.user === null,
      "anonymous request received a user session",
    );
  },
);
await check(
  "Private dashboard requires authentication",
  "/api/dashboard",
  401,
  async (response) => {
    assert.equal(typeof (await json(response)).error, "string");
  },
);
await check("Public listings API", "/api/listings", 200, async (response) => {
  assert.ok(
    Array.isArray((await json(response)).listings),
    "expected a listings array",
  );
});
await check("Direct login navigation", "/login", 200, async (response) => {
  assert.match(response.headers.get("content-type") || "", /^text\/html\b/);
  assert.match(await response.text(), /id="root"/);
});
await check(
  "Approved logo asset",
  "/brand/termtrove-logo.png",
  200,
  async (response) => {
    assert.match(response.headers.get("content-type") || "", /^image\/png\b/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(
      Array.from(bytes.slice(0, 8)),
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
  },
);
await check(
  "Sitemap uses the production host",
  "/sitemap.xml",
  200,
  async (response) => {
    const xml = await response.text();
    assert.match(xml, /<urlset\b/);
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    assert.ok(locations.length >= 5, "expected public page URLs");
    for (const location of locations)
      assert.equal(new URL(location).origin, origin);
  },
);
await check(
  "Search crawler configuration",
  "/robots.txt",
  200,
  async (response) => {
    const robots = await response.text();
    assert.ok(
      robots.includes(`Sitemap: ${origin}/sitemap.xml`),
      "expected production sitemap reference",
    );
    assert.ok(
      !/^Disallow:\s*\/\s*$/m.test(robots),
      "site-wide crawling is disabled",
    );
  },
);

console.log(
  "These read-only checks do not verify email delivery, logged-in transactions, legal content or phone usability.",
);
process.exitCode = failures ? 1 : 0;
