import { test } from "node:test";
import assert from "node:assert/strict";
import { fitPhotoDimensions, preparePhoto } from "../app/photos";

test("phone photos fit the upload bounds without stretching or upscaling", () => {
  assert.deepEqual(fitPhotoDimensions(6000, 4000), {
    width: 2000,
    height: 1333,
  });
  assert.deepEqual(fitPhotoDimensions(3000, 6000), {
    width: 1000,
    height: 2000,
  });
  assert.deepEqual(fitPhotoDimensions(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitPhotoDimensions(1, 10_000), { width: 1, height: 2000 });
  for (const dimensions of [
    [0, 2],
    [2, -1],
    [Infinity, 10],
    [NaN, 20],
  ])
    assert.throws(
      () => fitPhotoDimensions(dimensions[0], dimensions[1]),
      /invalid dimensions/,
    );
});
test("unsupported, empty and excessive source files are rejected before browser decoding", async () => {
  await assert.rejects(
    preparePhoto(new File(["svg"], "book.svg", { type: "image/svg+xml" })),
    /Choose a JPG/,
  );
  await assert.rejects(
    preparePhoto(new File([], "empty.png", { type: "image/png" })),
    /empty/,
  );
  await assert.rejects(
    preparePhoto(
      new File([new Uint8Array(20 * 1024 * 1024 + 1)], "huge.jpg", {
        type: "image/jpeg",
      }),
    ),
    /under 20 MB/,
  );
});
