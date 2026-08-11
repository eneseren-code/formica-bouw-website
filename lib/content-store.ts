import { ensureDatabase } from "@/db/bootstrap";
import { defaultSettings, seedContent } from "./site-data";
import type { ContentEntry } from "./types";

type ContentRow = {
  id: string;
  content_type: ContentEntry["contentType"];
  slug: string;
  status: ContentEntry["status"];
  title_nl: string;
  title_en: string;
  summary_nl: string;
  summary_en: string;
  body_nl: string;
  body_en: string;
  metadata_json: string;
  sort_order: number;
  updated_at: string;
};

export function rowToEntry(row: ContentRow): ContentEntry {
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata_json || "{}");
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    contentType: row.content_type,
    slug: row.slug,
    status: row.status,
    titleNl: row.title_nl,
    titleEn: row.title_en,
    summaryNl: row.summary_nl,
    summaryEn: row.summary_en,
    bodyNl: row.body_nl,
    bodyEn: row.body_en,
    metadata,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

export async function loadAllContent(includeDrafts = false): Promise<ContentEntry[]> {
  try {
    const db = await ensureDatabase();
    const query = includeDrafts
      ? "SELECT * FROM content_entries ORDER BY content_type, sort_order, updated_at DESC"
      : "SELECT * FROM content_entries WHERE status = 'published' ORDER BY content_type, sort_order";
    const result = await db.prepare(query).all<ContentRow>();
    return result.results.map(rowToEntry);
  } catch {
    return seedContent.filter((entry) => includeDrafts || entry.status === "published");
  }
}

export async function loadPublicContent() {
  const entries = await loadAllContent(false);
  const settingsEntry = entries.find((entry) => entry.contentType === "settings");
  return {
    entries,
    pages: entries.filter((entry) => entry.contentType === "page"),
    services: entries.filter((entry) => entry.contentType === "service"),
    projects: entries.filter((entry) => entry.contentType === "project"),
    partners: entries.filter((entry) => entry.contentType === "partner"),
    settings: { ...defaultSettings, ...(settingsEntry?.metadata ?? {}) },
  };
}

