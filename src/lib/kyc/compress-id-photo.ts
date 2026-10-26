/** Shrink an ID photo in the browser so the upload stays small enough for the server. */
export async function compressIdPhoto(file: File): Promise<{ name: string; dataUrl: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Use a JPG or PNG photo of your ID.");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Could not read that photo. Use a JPG or PNG.");
  });

  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not read that photo.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.72;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 700_000 && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > 900_000) {
    throw new Error("That photo is still too large. Try a closer crop.");
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "government-id";
  return { name: `${base.slice(0, 60)}.jpg`, dataUrl };
}
