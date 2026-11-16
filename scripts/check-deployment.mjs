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
      headers: { Accept: path.startsWith("/api/") ? "application/json" : "*/*" },
    });
    assert.equal(response.status, status, `expected HTTP ${status}, received ${response.status}`);
    await inspect(response);
    console.log(`PASS ${label}`);
  } catch (error) {
    failures++;
    // Do not print response bodies, headers, redirects, tokens or user records.
    console.error(`FAIL ${label}: ${error instanceof Error ? error.message : "request failed"}`);
  }
}
function headers(response) {
  assert.ok(response.headers.get("x-content-type-options") === "nosniff", "missing nosniff header");
  assert.ok(/frame-ancestors 'none'/.test(response.headers.get("content-security-policy") || ""), "missing frame protection");
}
async function json(response) {
  assert.ok(/^application\/json\b/.test(response.headers.get("content-type") || ""), "expected JSON content type");
  try {
    return await response.json();
  } catch {
    throw Error("expected valid JSON");
  }
}

await check("Public homepage and security headers", "/", 200, async (response) => {
  headers(response);
  assert.match(response.headers.get("content-type") || "", /^text\/html\b/);
  assert.match(await response.text(), /id="root"/);
});
await check("Database health and API routing", "/api/health", 200, async (response) => {
  headers(response);
  assert.ok((await json(response))?.status === "ok", "database health is not ready");
});
await check("Anonymous session stays signed out", "/api/me", 200, async (response) => {
  assert.ok((await json(response))?.user === null, "anonymous request received a user session");
});
await check("Private dashboard requires authentication", "/api/dashboard", 401, async (response) => {
  assert.equal(typeof (await json(response)).error, "string");
});
await check("Public listings API", "/api/listings", 200, async (response) => {
  assert.ok(Array.isArray((await json(response)).listings), "expected a listings array");
});
await check("Direct login navigation", "/login", 200, async (response) => {
  assert.match(response.headers.get("content-type") || "", /^text\/html\b/);
  assert.match(await response.text(), /id="root"/);
});
await check("Approved logo asset", "/brand/termtrove-logo.png", 200, async (response) => {
  assert.match(response.headers.get("content-type") || "", /^image\/png\b/);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});
await check("Sitemap uses the production host", "/sitemap.xml", 200, async (response) => {
  const xml = await response.text();
  assert.match(xml, /<urlset\b/);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locations.length >= 5, "expected public page URLs");
  for (const location of locations) assert.equal(new URL(location).origin, origin);
});
await check("Search crawler configuration", "/robots.txt", 200, async (response) => {
  const robots = await response.text();
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`), "expected production sitemap reference");
  assert.ok(!/^Disallow:\s*\/\s*$/m.test(robots), "site-wide crawling is disabled");
});

console.log("These read-only checks do not verify email delivery, logged-in transactions, legal content or phone usability.");
process.exitCode = failures ? 1 : 0;
