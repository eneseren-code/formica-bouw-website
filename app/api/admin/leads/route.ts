import { ensureDatabase, getUploads } from "@/db/bootstrap";
import { authorizeAdmin, safeJson, unauthorized } from "@/lib/admin-api";
import { sendLeadNotification } from "@/lib/resend";

type LeadRow = {
  id: string; name: string; email: string; phone: string; postcode: string; service: string;
  project_description: string; preferred_contact: string; status: string; notification_status: string;
  consent_at: string; idempotency_key: string; created_at: string; updated_at: string; closed_at: string | null;
};

function toLead(row: LeadRow) {
  const deletionDate = row.closed_at ? new Date(row.closed_at) : null;
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone, postcode: row.postcode,
    service: row.service, projectDescription: row.project_description, preferredContact: row.preferred_contact,
    status: row.status, notificationStatus: row.notification_status, consentAt: row.consent_at,
    createdAt: row.created_at, updatedAt: row.updated_at, closedAt: row.closed_at,
    eligibleForDeletion: row.status === "closed" && Boolean(deletionDate && deletionDate.getTime() <= Date.now() - 365 * 24 * 60 * 60 * 1000),
  };
}

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const search = (url.searchParams.get("search") ?? "").slice(0, 120);
  const conditions: string[] = [];
  const bindings: string[] = [];
  if (["new", "contacted", "closed"].includes(status)) { conditions.push("status = ?"); bindings.push(status); }
  if (search) {
    conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ? OR postcode LIKE ? OR service LIKE ?)");
    for (let index = 0; index < 5; index += 1) bindings.push(`%${search}%`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const db = await ensureDatabase();
  const result = await db.prepare(`SELECT * FROM leads${where} ORDER BY created_at DESC LIMIT 250`).bind(...bindings).all<LeadRow>();
  const leads = [];
  for (const row of result.results) {
    const notes = await db.prepare("SELECT id, lead_id AS leadId, note, created_at AS createdAt FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC").bind(row.id).all();
    const media = await db.prepare(`SELECT m.id, m.key, m.file_name AS fileName, m.content_type AS contentType, m.size,
      m.is_public AS isPublic, m.alt_nl AS altNl, m.alt_en AS altEn, m.created_at AS createdAt
      FROM media_assets m INNER JOIN lead_media lm ON lm.media_id = m.id WHERE lm.lead_id = ?`).bind(row.id).all();
    leads.push({ ...toLead(row), notes: notes.results, media: media.results });
  }
  return Response.json({ leads });
}

export async function PATCH(request: Request) {
  if (!(await authorizeAdmin(request, true))) return unauthorized();
  const raw = safeJson(await request.json());
  const id = typeof raw?.id === "string" ? raw.id : "";
  const action = typeof raw?.action === "string" ? raw.action : "";
  if (!id) return Response.json({ error: "Lead id is required" }, { status: 400 });
  const db = await ensureDatabase();

  if (action === "status") {
    const status = typeof raw?.status === "string" ? raw.status : "";
    if (!["new", "contacted", "closed"].includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    const now = new Date().toISOString();
    await db.prepare("UPDATE leads SET status = ?, closed_at = ?, updated_at = ? WHERE id = ?")
      .bind(status, status === "closed" ? now : null, now, id).run();
  } else if (action === "note") {
    const note = typeof raw?.note === "string" ? raw.note.trim().slice(0, 4000) : "";
    if (!note) return Response.json({ error: "A note is required" }, { status: 400 });
    await db.prepare("INSERT INTO lead_notes (id, lead_id, note, created_at) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), id, note, new Date().toISOString()).run();
  } else if (action === "resend") {
    const row = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first<LeadRow>();
    if (!row) return Response.json({ error: "Lead not found" }, { status: 404 });
    if (row.notification_status === "sent") return Response.json({ error: "The notification was already sent" }, { status: 409 });
    try {
      const result = await sendLeadNotification({
        id: row.id, name: row.name, email: row.email, phone: row.phone, postcode: row.postcode,
        service: row.service, projectDescription: row.project_description, preferredContact: row.preferred_contact,
      }, row.idempotency_key);
      await db.prepare("UPDATE leads SET notification_status = ?, updated_at = ? WHERE id = ?").bind(result.status, new Date().toISOString(), id).run();
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
