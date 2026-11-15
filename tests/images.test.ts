import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizePhoto } from "../server/images";

test("uploaded photographs are resized and stripped of EXIF metadata", async () => {
  const source = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#173e30" },
  })
    .withMetadata({
      exif: { IFD0: { ImageDescription: "Private location metadata" } },
    })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(source).metadata()).exif);
  const output = await normalizePhoto(source);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 2000);
  assert.equal(metadata.height, 1000);
  assert.equal(metadata.exif, undefined);
});
test("invalid and disguised SVG images cannot enter photo storage through the API", async () => {
  await assert.rejects(normalizePhoto(Buffer.from("not an image")));
  await assert.rejects(
    normalizePhoto(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
      ),
    ),
  );
});
