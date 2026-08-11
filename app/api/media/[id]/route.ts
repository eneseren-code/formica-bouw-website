import { ensureDatabase, getUploads } from "@/db/bootstrap";
import { requireAdmin } from "@/lib/admin-auth";

type MediaRow = { key: string; content_type: string; file_name: string; is_public: number };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await ensureDatabase();
  const media = await db.prepare("SELECT key, content_type, file_name, is_public FROM media_assets WHERE id = ?").bind(id).first<MediaRow>();
  if (!media) return new Response("Not found", { status: 404 });
  if (!media.is_public && !(await requireAdmin(request))) return new Response("Unauthorized", { status: 401 });
  const object = await getUploads().get(media.key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", media.content_type);
  headers.set("Content-Disposition", `inline; filename="${media.file_name.replace(/["\r\n]/g, "")}"`);
  headers.set("Cache-Control", media.is_public ? "public, max-age=31536000, immutable" : "private, no-store");
  return new Response(object.body, { headers });
}
