import { ensureDatabase } from "@/db/bootstrap";
import { authorizeAdmin, safeJson, unauthorized } from "@/lib/admin-api";
import { rowToEntry } from "@/lib/content-store";
import type { ContentType, PublicationStatus } from "@/lib/types";

const contentTypes: ContentType[] = ["page", "service", "project", "partner", "settings", "claim"];
const statuses: PublicationStatus[] = ["draft", "published"];

type ContentRow = Parameters<typeof rowToEntry>[0];

function textValue(value: unknown, max = 6000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizedPayload(raw: Record<string, unknown>, id?: string) {
  const contentType = textValue(raw.contentType) as ContentType;
  const status = textValue(raw.status) as PublicationStatus;
  const metadata = safeJson(raw.metadata) ?? {};
  if (!contentTypes.includes(contentType) || !statuses.includes(status)) throw new Error("Invalid content type or publication status");
  const slug = textValue(raw.slug, 120).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("A slug is required");
  return {
    id: id || crypto.randomUUID(), contentType, slug, status,
    titleNl: textValue(raw.titleNl, 240), titleEn: textValue(raw.titleEn, 240),
    summaryNl: textValue(raw.summaryNl), summaryEn: textValue(raw.summaryEn),
    bodyNl: textValue(raw.bodyNl, 20000), bodyEn: textValue(raw.bodyEn, 20000),
    metadataJson: JSON.stringify(metadata).slice(0, 20000),
    sortOrder: Math.max(0, Math.min(9999, Number(raw.sortOrder) || 0)),
  };
}

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const db = await ensureDatabase();
  const result = await db.prepare("SELECT * FROM content_entries ORDER BY content_type, sort_order, updated_at DESC").all<ContentRow>();
  return Response.json({ entries: result.results.map(rowToEntry) });
}

export async function POST(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  try {
    const raw = safeJson(await request.json());
    if (!raw) throw new Error("Invalid content payload");
    const value = normalizedPayload(raw);
    const db = await ensureDatabase();
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
    const value = normalizedPayload(raw, id);
    const db = await ensureDatabase();
    await db.prepare(`UPDATE content_entries SET content_type = ?, slug = ?, status = ?, title_nl = ?, title_en = ?,
      summary_nl = ?, summary_en = ?, body_nl = ?, body_en = ?, metadata_json = ?, sort_order = ?, updated_at = ? WHERE id = ?`)
      .bind(value.contentType, value.slug, value.status, value.titleNl, value.titleEn, value.summaryNl, value.summaryEn, value.bodyNl, value.bodyEn, value.metadataJson, value.sortOrder, new Date().toISOString(), id).run();
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
  await db.prepare("DELETE FROM content_entries WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
