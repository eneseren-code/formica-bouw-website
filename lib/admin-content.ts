import type { ContentMetadata, ContentType } from "./types";

export const contentTypes: ContentType[] = ["page", "service", "project", "partner", "settings", "claim"];
export const creatableContentTypes: ContentType[] = ["project", "partner"];
export const fixedSlugContentTypes: ContentType[] = ["page", "service", "settings", "claim"];

const commonFields = ["image", "mediaId", "seoTitleNl", "seoTitleEn", "seoDescriptionNl", "seoDescriptionEn"] as const;
const allowedFields: Record<ContentType, ReadonlySet<string>> = {
  page: new Set(commonFields),
  service: new Set([...commonFields, "category"]),
  project: new Set([...commonFields, "category", "featured"]),
  partner: new Set([...commonFields, "href", "verified"]),
  settings: new Set([
    "phone", "phoneDisplay", "whatsapp", "email", "kvk", "instagram", "serviceAreaNl", "serviceAreaEn",
    "seoTitleNl", "seoTitleEn", "seoDescriptionNl", "seoDescriptionEn",
  ]),
  claim: new Set(["seoTitleNl", "seoTitleEn", "seoDescriptionNl", "seoDescriptionEn"]),
};

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function limitedString(value: unknown, field: string, max: number) {
  if (typeof value !== "string") throw new Error(`${field} must be text`);
  return value.trim().slice(0, max);
}

function webUrl(value: unknown, field: string) {
  const text = limitedString(value, field, 1000);
  if (!text) return "";
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${field} must be a valid web address`);
  }
}

export function normalizeContentMetadata(value: unknown, contentType: ContentType): ContentMetadata {
  if (value === undefined || value === null) return {};
  if (!plainObject(value)) throw new Error("Metadata must be an object");

  const metadata: ContentMetadata = {};
  for (const [field, raw] of Object.entries(value)) {
    if (!allowedFields[contentType].has(field)) throw new Error(`${field} is not valid for ${contentType} content`);
    if (raw === undefined || raw === null) continue;

    if (field === "featured" || field === "verified") {
      if (typeof raw !== "boolean") throw new Error(`${field} must be true or false`);
      metadata[field] = raw;
      continue;
    }

    if (field === "href" || field === "instagram") {
      metadata[field] = webUrl(raw, field);
      continue;
    }

    if (field === "image") {
      const image = limitedString(raw, field, 1000);
      if (image && !image.startsWith("/media/") && !image.startsWith("/api/media/")) {
        throw new Error("image must reference an uploaded or local website image");
      }
      metadata.image = image;
      continue;
    }

    if (field === "mediaId") {
      const mediaId = limitedString(raw, field, 100);
      if (mediaId && !/^[a-zA-Z0-9_-]+$/.test(mediaId)) throw new Error("mediaId is invalid");
      metadata.mediaId = mediaId;
      continue;
    }

    if (field === "category") {
      const category = limitedString(raw, field, 80).toLowerCase();
      if (category && !/^[a-z0-9-]+$/.test(category)) throw new Error("category must contain only letters, numbers and hyphens");
      metadata.category = category;
      continue;
    }

    if (field === "email") {
      const email = limitedString(raw, field, 320).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("email is invalid");
      metadata.email = email;
      continue;
    }

    const max = field.startsWith("seoDescription") ? 500 : field.startsWith("seoTitle") ? 240 : 500;
    metadata[field] = limitedString(raw, field, max);
  }
  return metadata;
}
