import { ensureDatabase, getUploads } from "@/db/bootstrap";
import { authorizeAdmin, safeJson, unauthorized } from "@/lib/admin-api";
import { validateImage } from "@/lib/file-validation";

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const db = await ensureDatabase();
  const result = await db.prepare(`SELECT id, key, file_name AS fileName, content_type AS contentType, size,
    is_public AS isPublic, alt_nl AS altNl, alt_en AS altEn, created_at AS createdAt
    FROM media_assets ORDER BY created_at DESC`).all();
  return Response.json({ media: result.results });
}

export async function POST(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image to upload");
    const extension = await validateImage(file);
    const id = crypto.randomUUID();
    const key = `cms/${id}.${extension}`;
    const altNl = String(form.get("altNl") ?? "").trim().slice(0, 300);
    const altEn = String(form.get("altEn") ?? "").trim().slice(0, 300);
    const isPublic = form.get("isPublic") === "true" ? 1 : 0;
    await getUploads().put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    const db = await ensureDatabase();
    await db.prepare(`INSERT INTO media_assets
      (id, key, file_name, content_type, size, is_public, alt_nl, alt_en, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, key, file.name.slice(0, 200), file.type, file.size, isPublic, altNl, altEn, new Date().toISOString()).run();
    return Response.json({ ok: true, id, url: `/api/media/${id}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to upload media" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  const raw = safeJson(await request.json());
  const id = typeof raw?.id === "string" ? raw.id : "";
  if (!id) return Response.json({ error: "Media id is required" }, { status: 400 });
  if (typeof raw?.isPublic !== "boolean") return Response.json({ error: "Media visibility must be true or false" }, { status: 400 });
  const db = await ensureDatabase();
  const exists = await db.prepare("SELECT id FROM media_assets WHERE id = ?").bind(id).first<{ id: string }>();
  if (!exists) return Response.json({ error: "Media asset not found" }, { status: 404 });
  if (!raw.isPublic) {
    const imageUrl = `/api/media/${id}`;
    const publishedReference = await db.prepare(`SELECT id FROM content_entries
      WHERE status = 'published' AND (
        CASE WHEN json_valid(metadata_json) THEN json_extract(metadata_json, '$.mediaId') END = ?
        OR CASE WHEN json_valid(metadata_json) THEN json_extract(metadata_json, '$.image') END = ?
      ) LIMIT 1`).bind(id, imageUrl).first<{ id: string }>();
    if (publishedReference) {
      return Response.json({ error: "Media used by published content must remain public" }, { status: 409 });
    }
  }
  await db.prepare("UPDATE media_assets SET alt_nl = ?, alt_en = ?, is_public = ? WHERE id = ?")
    .bind(String(raw.altNl ?? "").trim().slice(0, 300), String(raw.altEn ?? "").trim().slice(0, 300), raw.isPublic ? 1 : 0, id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  const raw = safeJson(await request.json());
  const id = typeof raw?.id === "string" ? raw.id : "";
  if (!id || raw?.confirmation !== "DELETE") return Response.json({ error: "Type DELETE to confirm" }, { status: 400 });
  const db = await ensureDatabase();
  const media = await db.prepare("SELECT key FROM media_assets WHERE id = ?").bind(id).first<{ key: string }>();
  if (!media) return Response.json({ error: "Media asset not found" }, { status: 404 });

  const imageUrl = `/api/media/${id}`;
  const [contentReferences, leadReferences] = await Promise.all([
    db.prepare(`SELECT id, content_type AS contentType, slug, title_en AS title
      FROM content_entries
      WHERE CASE WHEN json_valid(metadata_json) THEN json_extract(metadata_json, '$.mediaId') END = ?
         OR CASE WHEN json_valid(metadata_json) THEN json_extract(metadata_json, '$.image') END = ?`)
      .bind(id, imageUrl).all<{ id: string; contentType: string; slug: string; title: string }>(),
    db.prepare("SELECT COUNT(*) AS total FROM lead_media WHERE media_id = ?").bind(id).first<{ total: number }>(),
  ]);
  const leadCount = Number(leadReferences?.total ?? 0);
  if (contentReferences.results.length || leadCount) {
    return Response.json({
      error: "This media asset is still in use. Remove it from the referenced content or lead before deleting it.",
      references: [
        ...contentReferences.results.map((reference) => ({ kind: "content", ...reference })),
        ...(leadCount ? [{ kind: "lead", count: leadCount }] : []),
      ],
    }, { status: 409 });
  }

  await getUploads().delete(media.key);
  await db.prepare("DELETE FROM media_assets WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
