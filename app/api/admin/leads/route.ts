import { ensureDatabase, getUploads } from "@/db/bootstrap";
import { authorizeAdmin, safeJson, unauthorized } from "@/lib/admin-api";
import { toLead, toLeadSummary, type LeadRow } from "@/lib/admin-leads";
import { sendLeadNotification } from "@/lib/resend";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function withDetails(db: D1Database, row: LeadRow) {
  const [notes, media] = await Promise.all([
    db.prepare("SELECT id, lead_id AS leadId, note, created_at AS createdAt FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC")
      .bind(row.id).all(),
    db.prepare(`SELECT m.id, m.key, m.file_name AS fileName, m.content_type AS contentType, m.size,
      m.is_public AS isPublic, m.alt_nl AS altNl, m.alt_en AS altEn, m.created_at AS createdAt
      FROM media_assets m INNER JOIN lead_media lm ON lm.media_id = m.id WHERE lm.lead_id = ?`)
      .bind(row.id).all(),
  ]);
  return { ...toLead(row), notes: notes.results, media: media.results };
}

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);
  const id = (url.searchParams.get("id") ?? "").trim().slice(0, 80);
  const mode = url.searchParams.get("mode") === "list" ? "list" : "full";
  const limit = Math.floor(Math.max(1, Math.min(250, Number(url.searchParams.get("limit")) || 250)));
  const offset = Math.floor(Math.max(0, Math.min(10000, Number(url.searchParams.get("offset")) || 0)));
  if (status !== "all" && !["new", "contacted", "closed"].includes(status)) {
    return Response.json({ error: "Invalid lead status" }, { status: 400 });
  }
  const db = await ensureDatabase();
  if (id) {
    const row = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first<LeadRow>();
    if (!row) return Response.json({ error: "Lead not found" }, { status: 404 });
    return Response.json({ lead: await withDetails(db, row) });
  }

  const conditions: string[] = [];
  const bindings: Array<string | number> = [];
  if (["new", "contacted", "closed"].includes(status)) { conditions.push("status = ?"); bindings.push(status); }
  if (search) {
    conditions.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR postcode LIKE ? ESCAPE '\\' OR service LIKE ? ESCAPE '\\')");
    for (let index = 0; index < 5; index += 1) bindings.push(`%${escapeLike(search)}%`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const [result, countRow] = await Promise.all([
    db.prepare(`SELECT * FROM leads${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset).all<LeadRow>(),
    db.prepare(`SELECT COUNT(*) AS total FROM leads${where}`).bind(...bindings).first<{ total: number }>(),
  ]);
  if (mode === "list") {
    return Response.json({ leads: result.results.map(toLeadSummary), total: Number(countRow?.total ?? 0) });
  }
  const leads = await Promise.all(result.results.map((row) => withDetails(db, row)));
  return Response.json({ leads, total: Number(countRow?.total ?? 0) });
}

export async function PATCH(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  const raw = safeJson(await request.json());
  const id = typeof raw?.id === "string" ? raw.id.trim().slice(0, 80) : "";
  const action = typeof raw?.action === "string" ? raw.action.trim() : "";
  if (!id) return Response.json({ error: "Lead id is required" }, { status: 400 });
  const db = await ensureDatabase();
  const lead = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first<LeadRow>();
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

  if (action === "status") {
    const status = typeof raw?.status === "string" ? raw.status : "";
    if (!["new", "contacted", "closed"].includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    const now = new Date().toISOString();
    await db.prepare("UPDATE leads SET status = ?, closed_at = ?, updated_at = ? WHERE id = ?")
      .bind(status, status === "closed" ? lead.closed_at ?? now : null, now, id).run();
  } else if (action === "note") {
    const note = typeof raw?.note === "string" ? raw.note.trim().slice(0, 4000) : "";
    if (!note) return Response.json({ error: "A note is required" }, { status: 400 });
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("INSERT INTO lead_notes (id, lead_id, note, created_at) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), id, note, now),
      db.prepare("UPDATE leads SET updated_at = ? WHERE id = ?").bind(now, id),
    ]);
  } else if (action === "resend") {
    if (lead.notification_status === "sent") return Response.json({ error: "The notification was already sent" }, { status: 409 });
    try {
      const result = await sendLeadNotification({
        id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, postcode: lead.postcode,
        service: lead.service, projectDescription: lead.project_description, preferredContact: lead.preferred_contact,
      }, lead.idempotency_key);
      await db.prepare("UPDATE leads SET notification_status = ?, updated_at = ? WHERE id = ?").bind(result.status, new Date().toISOString(), id).run();
      if (result.status !== "sent") {
        return Response.json({ error: "Email is not configured yet; the lead remains saved and needs attention" }, { status: 503 });
      }
    } catch {
      await db.prepare("UPDATE leads SET notification_status = 'failed', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
      return Response.json({ error: "Email notification failed again; the lead remains saved" }, { status: 502 });
    }
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  const raw = safeJson(await request.json());
  const id = typeof raw?.id === "string" ? raw.id : "";
  if (!id || raw?.confirmation !== "PERMANENTLY DELETE") return Response.json({ error: "Type PERMANENTLY DELETE to confirm" }, { status: 400 });
  const db = await ensureDatabase();
  const row = await db.prepare("SELECT status, closed_at FROM leads WHERE id = ?").bind(id).first<{ status: string; closed_at: string | null }>();
  const eligible = row?.status === "closed" && row.closed_at && new Date(row.closed_at).getTime() <= Date.now() - 365 * 24 * 60 * 60 * 1000;
  if (!eligible) return Response.json({ error: "Only leads closed for more than 12 months can be permanently deleted" }, { status: 409 });
  const media = await db.prepare("SELECT m.id, m.key FROM media_assets m INNER JOIN lead_media lm ON lm.media_id = m.id WHERE lm.lead_id = ?").bind(id).all<{ id: string; key: string }>();
  for (const item of media.results) await getUploads().delete(item.key);
  await db.batch([
    db.prepare("DELETE FROM lead_notes WHERE lead_id = ?").bind(id),
    db.prepare("DELETE FROM lead_media WHERE lead_id = ?").bind(id),
    ...media.results.map((item: { id: string; key: string }) => db.prepare("DELETE FROM media_assets WHERE id = ?").bind(item.id)),
    db.prepare("DELETE FROM leads WHERE id = ?").bind(id),
  ]);
  return Response.json({ ok: true });
}
