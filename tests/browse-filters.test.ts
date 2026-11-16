import { test } from "node:test";
import assert from "node:assert/strict";
import { browseQuery, readBrowseFilters } from "../app/browse-filters";

test("a shared browse URL restores every filter and sort order", () => {
  const filters = readBrowseFilters(
    "?q=biology&curriculum=IGCSE&subject=Biology&condition=Good&min=10.50&max=500&status=reserved&sort=low",
  );
  assert.deepEqual(readBrowseFilters("?" + browseQuery(filters)), filters);
  assert.equal(filters.condition, "Good");
  assert.equal(filters.min, "10.50");
  assert.equal(filters.status, "reserved");
  assert.equal(filters.sort, "low");
});
test("all availability survives reload without sending an invalid status filter to the API", () => {
  const filters = readBrowseFilters("?status=");
  assert.equal(readBrowseFilters("?" + browseQuery(filters)).status, "");
  assert.equal(browseQuery(filters, true).has("status"), false);
  assert.equal(readBrowseFilters("").status, "available");
});
test("untrusted query values cannot introduce invalid sorting, negative prices or unbounded search text", () => {
  const filters = readBrowseFilters(
    "?sort=unknown&status=archived&min=-10&max=Infinity&q=" + "x".repeat(500),
  );
  assert.equal(filters.sort, "recent");
  assert.equal(filters.status, "available");
  assert.equal(filters.min, "");
  assert.equal(filters.max, "");
  assert.equal(filters.q.length, 200);
});
