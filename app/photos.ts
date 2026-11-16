const sourceLimit = 20 * 1024 * 1024;
const uploadLimit = 3 * 1024 * 1024;

export function fitPhotoDimensions(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("This photo has invalid dimensions.");
  const scale = Math.min(1, 2000 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Resize on the owner's device; the server still decodes and validates every upload. */
export async function preparePhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG or WebP photo. If your phone uses HEIC, export the photo as JPEG first.",
    );
  if (!file.size) throw new Error("This photo is empty. Choose another image.");
  if (file.size > sourceLimit) throw new Error("Choose a photo under 20 MB.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    try {
      await image.decode();
    } catch {
      throw new Error(
        "We couldn’t read this photo. Choose another JPG, PNG or WebP image.",
      );
    }
    const { naturalWidth: width, naturalHeight: height } = image;
    if (width * height > 60_000_000)
      throw new Error(
        "This photo is too large to prepare safely. Choose a smaller version.",
      );
    const dimensions = fitPhotoDimensions(width, height);
    if (
      file.size <= uploadLimit &&
      width === dimensions.width &&
      height === dimensions.height
    )
      return file;
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Your browser couldn’t prepare this photo. Choose a smaller image.",
      );
    // Match the white page background when a transparent PNG needs resizing.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encode = (quality: number) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(
                  new Error(
                    "Your browser couldn’t prepare this photo. Choose another image.",
                  ),
                ),
          "image/jpeg",
          quality,
        );
      });
    let blob = await encode(0.86);
    if (blob.size > uploadLimit) blob = await encode(0.72);
    canvas.width = canvas.height = 1;
    if (blob.size > uploadLimit)
      throw new Error(
        "This photo is still too large. Choose a smaller version.",
      );
    return new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    image.src = "";
    URL.revokeObjectURL(url);
  }
}
