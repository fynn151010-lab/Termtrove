import sharp from "sharp";
import { fail } from "./http";
/** Decode, cap dimensions and remove embedded EXIF/GPS data before storage. */
export async function normalizePhoto(input: Uint8Array): Promise<Buffer> {
  try {
    const image = sharp(input, {
      limitInputPixels: 20_000_000,
      failOn: "error",
      animated: false,
    });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
      fail(400, "Choose a JPG, PNG or WebP photograph.");
    return await image
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    fail(
      400,
      "This image could not be read. Choose a valid JPG, PNG or WebP under 3 MB and 20 megapixels.",
    );
  }
}
