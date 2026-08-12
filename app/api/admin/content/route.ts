import { ensureDatabase } from "@/db/bootstrap";
import { authorizeAdmin, safeJson, unauthorized } from "@/lib/admin-api";
import {
  contentTypes,
  creatableContentTypes,
  fixedSlugContentTypes,
  normalizeContentMetadata,
} from "@/lib/admin-content";
import { rowToEntry } from "@/lib/content-store";
import type { ContentMetadata, ContentType, PublicationStatus } from "@/lib/types";

const statuses: PublicationStatus[] = ["draft", "published"];

type ContentRow = Parameters<typeof rowToEntry>[0];
type ExistingContent = { id: string; content_type: ContentType; slug: string };

function textValue(value: unknown, max = 6000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugValue(value: unknown) {
  return textValue(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizedPayload(raw: Record<string, unknown>, id?: string) {
  const contentType = textValue(raw.contentType) as ContentType;
  const status = textValue(raw.status) as PublicationStatus;
  if (!contentTypes.includes(contentType) || !statuses.includes(status)) {
    throw new Error("Invalid content type or publication status");
  }
  const slug = slugValue(raw.slug);
  if (!slug) throw new Error("A slug is required");

  const titleNl = textValue(raw.titleNl, 240);
  const titleEn = textValue(raw.titleEn, 240);
  if (status === "published" && (!titleNl || !titleEn)) {
    throw new Error("Published content requires a Dutch and English title");
  }
  const metadata = normalizeContentMetadata(raw.metadata, contentType);
  const sortOrderValue = Number(raw.sortOrder);

  return {
    id: id || crypto.randomUUID(),
    contentType,
    slug,
    status,
    titleNl,
    titleEn,
    summaryNl: textValue(raw.summaryNl),
    summaryEn: textValue(raw.summaryEn),
    bodyNl: textValue(raw.bodyNl, 20000),
    bodyEn: textValue(raw.bodyEn, 20000),
    metadata,
    metadataJson: JSON.stringify(metadata).slice(0, 20000),
    sortOrder: Number.isFinite(sortOrderValue) ? Math.max(0, Math.min(9999, Math.round(sortOrderValue))) : 0,
  };
}

async function validateMediaReference(db: D1Database, metadata: ContentMetadata, status: PublicationStatus) {
  let mediaId = metadata.mediaId;
  if (!mediaId && metadata.image?.startsWith("/api/media/")) {
    mediaId = metadata.image.slice("/api/media/".length).split(/[?#/]/, 1)[0];
  }
  if (!mediaId) return;
  const media = await db.prepare("SELECT is_public FROM media_assets WHERE id = ?").bind(mediaId).first<{ is_public: number }>();
  if (!media) throw new Error("The selected media asset no longer exists");
  if (status === "published" && !media.is_public) throw new Error("Published content must use a public media asset");
}

function protectedResponse(message: string) {
  return Response.json({ error: message }, { status: 409 });
}

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ContentType | null;
  if (type && !contentTypes.includes(type)) {
    return Response.json({ error: "Invalid content type" }, { status: 400 });
  }
  const db = await ensureDatabase();
  const query = type
    ? db.prepare("SELECT * FROM content_entries WHERE content_type = ? ORDER BY sort_order, updated_at DESC").bind(type)
    : db.prepare("SELECT * FROM content_entries ORDER BY content_type, sort_order, updated_at DESC");
  const result = await query.all<ContentRow>();
  return Response.json({ entries: result.results.map(rowToEntry) });
}

export async function POST(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  try {
    const raw = safeJson(await request.json());
    if (!raw) throw new Error("Invalid content payload");
    const value = normalizedPayload(raw);
    if (!creatableContentTypes.includes(value.contentType)) {
      return protectedResponse("Only projects and partners can be created. Core pages, services and settings are fixed records.");
    }
    const db = await ensureDatabase();
    await validateMediaReference(db, value.metadata, value.status);
    await db.prepare(`INSERT INTO content_entries
      (id, content_type, slug, status, title_nl, title_en, summary_nl, summary_en, body_nl, body_en, metadata_json, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(value.id, value.contentType, value.slug, value.status, value.titleNl, value.titleEn, value.summaryNl, value.summaryEn, value.bodyNl, value.bodyEn, value.metadataJson, value.sortOrder, new Date().toISOString()).run();
    return Response.json({ ok: true, id: value.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create content" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  try {
    const raw = safeJson(await request.json());
    const id = textValue(raw?.id, 80);
    if (!raw || !id) throw new Error("A content id is required");
    const db = await ensureDatabase();
    const existing = await db.prepare("SELECT id, content_type, slug FROM content_entries WHERE id = ?")
      .bind(id).first<ExistingContent>();
    if (!existing) return Response.json({ error: "Content entry not found" }, { status: 404 });

    const value = normalizedPayload(raw, id);
    if (value.contentType !== existing.content_type) {
      return protectedResponse("The content type of an existing record cannot be changed");
    }
    if (fixedSlugContentTypes.includes(existing.content_type) && value.slug !== existing.slug) {
      return protectedResponse("The slug of this fixed content record cannot be changed");
    }
    if (existing.content_type === "claim" && value.status === "published") {
      return protectedResponse("Claims must remain drafts until a reviewed-claims workflow is configured");
    }
    await validateMediaReference(db, value.metadata, value.status);
    await db.prepare(`UPDATE content_entries SET slug = ?, status = ?, title_nl = ?, title_en = ?,
      summary_nl = ?, summary_en = ?, body_nl = ?, body_en = ?, metadata_json = ?, sort_order = ?, updated_at = ? WHERE id = ?`)
      .bind(value.slug, value.status, value.titleNl, value.titleEn, value.summaryNl, value.summaryEn, value.bodyNl, value.bodyEn, value.metadataJson, value.sortOrder, new Date().toISOString(), id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update content" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  const raw = safeJson(await request.json());
  const id = textValue(raw?.id, 80);
  if (!id || raw?.confirmation !== "DELETE") return Response.json({ error: "Type DELETE to confirm" }, { status: 400 });
  const db = await ensureDatabase();
  const existing = await db.prepare("SELECT id, content_type, slug FROM content_entries WHERE id = ?")
    .bind(id).first<ExistingContent>();
  if (!existing) return Response.json({ error: "Content entry not found" }, { status: 404 });
  if (!creatableContentTypes.includes(existing.content_type)) {
    return protectedResponse("Core pages, services, settings and claims cannot be deleted");
  }
  await db.prepare("DELETE FROM content_entries WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
