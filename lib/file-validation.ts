const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function validateImage(file: File, maxBytes = 8 * 1024 * 1024) {
  if (!allowedTypes.has(file.type)) throw new Error("Only JPEG, PNG and WebP images are accepted");
  if (file.size <= 0 || file.size > maxBytes) throw new Error("Each image must be smaller than 8 MB");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!(jpeg || png || webp)) throw new Error("The uploaded file content is not a valid image");
  return allowedTypes.get(file.type) ?? "bin";
}

export async function hashIp(ip: string) {
  const secret = process.env.RATE_LIMIT_SECRET || "formicabouw-local-development";
  const payload = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

