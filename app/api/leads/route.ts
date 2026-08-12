import { ensureDatabase, getUploads } from "@/db/bootstrap";
import { hashIp, validateImage } from "@/lib/file-validation";
import { sendLeadNotification } from "@/lib/resend";
import { defaultSettings } from "@/lib/site-data";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stringValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

async function configuredWhatsApp(db: D1Database) {
  const settings = await db.prepare("SELECT metadata_json FROM content_entries WHERE id = 'settings-global' AND content_type = 'settings' LIMIT 1")
    .first<{ metadata_json: string }>();
  try {
    const metadata = JSON.parse(settings?.metadata_json || "{}") as { whatsapp?: unknown; phone?: unknown };
    return String(metadata.whatsapp || metadata.phone || defaultSettings.whatsapp || defaultSettings.phone).replace(/\D/g, "");
  } catch {
    return String(defaultSettings.whatsapp || defaultSettings.phone).replace(/\D/g, "");
  }
}

function whatsappUrl(number: string, name: string, service: string, postcode: string, id: string) {
  const text = `Hallo Formica Bouw, ik heb zojuist een offerteaanvraag verstuurd.\nNaam: ${name}\nDienst: ${service}\nPostcode: ${postcode || "—"}\nReferentie: ${id}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export async function POST(request: Request) {
  let leadInserted = false;
  let leadId = "";
  try {
    const form = await request.formData();
    if (stringValue(form, "company")) return Response.json({ error: "Unable to process this request" }, { status: 400 });

    const startedAt = Number(stringValue(form, "startedAt"));
    const elapsed = Date.now() - startedAt;
    if (!Number.isFinite(startedAt) || elapsed < 2500 || elapsed > 2 * 60 * 60 * 1000) {
      return Response.json({ error: "Please reload the form and try again" }, { status: 400 });
    }

    const lead = {
      name: stringValue(form, "name"),
      email: stringValue(form, "email").toLowerCase(),
      phone: stringValue(form, "phone"),
      postcode: stringValue(form, "postcode"),
      service: stringValue(form, "service"),
      projectDescription: stringValue(form, "projectDescription"),
      preferredContact: stringValue(form, "preferredContact"),
    };
    if (
      lead.name.length < 2 || lead.name.length > 120 ||
      !emailPattern.test(lead.email) || lead.email.length > 160 ||
      lead.phone.length < 6 || lead.phone.length > 40 ||
      lead.postcode.length > 16 || lead.service.length < 2 || lead.service.length > 100 ||
      lead.projectDescription.length < 20 || lead.projectDescription.length > 4000 ||
      !["phone", "email", "whatsapp"].includes(lead.preferredContact) ||
      stringValue(form, "consent") !== "yes"
    ) return Response.json({ error: "Please check the required fields" }, { status: 400 });

    const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    if (photos.length > 5) return Response.json({ error: "A maximum of 5 photos is allowed" }, { status: 400 });
    const extensions = await Promise.all(photos.map((file) => validateImage(file)));

    const db = await ensureDatabase();
    const whatsappNumber = await configuredWhatsApp(db);
    const ipHash = await hashIp(clientIp(request));
    const recent = await db.prepare("SELECT COUNT(*) AS count FROM leads WHERE ip_hash = ? AND created_at >= datetime('now', '-15 minutes')").bind(ipHash).first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 5) return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });

    const idempotencyKey = (request.headers.get("idempotency-key") || crypto.randomUUID()).slice(0, 120);
    const existing = await db.prepare("SELECT id FROM leads WHERE idempotency_key = ?").bind(idempotencyKey).first<{ id: string }>();
    if (existing?.id) {
      return Response.json({ ok: true, id: existing.id, whatsappUrl: whatsappUrl(whatsappNumber, lead.name, lead.service, lead.postcode, existing.id) });
    }

    leadId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO leads
      (id, name, email, phone, postcode, service, project_description, preferred_contact, status, notification_status, consent_at, idempotency_key, ip_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', 'pending', ?, ?, ?, ?, ?)`)
      .bind(leadId, lead.name, lead.email, lead.phone, lead.postcode, lead.service, lead.projectDescription, lead.preferredContact, now, idempotencyKey, ipHash, now, now).run();
    leadInserted = true;

    if (photos.length) {
      const bucket = getUploads();
      for (let index = 0; index < photos.length; index += 1) {
        const file = photos[index];
        const mediaId = crypto.randomUUID();
        const key = `leads/${leadId}/${mediaId}.${extensions[index]}`;
        await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        await db.batch([
          db.prepare(`INSERT INTO media_assets (id, key, file_name, content_type, size, is_public, alt_nl, alt_en, created_at)
            VALUES (?, ?, ?, ?, ?, 0, '', '', ?)`)
            .bind(mediaId, key, file.name.slice(0, 200), file.type, file.size, now),
          db.prepare("INSERT INTO lead_media (lead_id, media_id) VALUES (?, ?)").bind(leadId, mediaId),
        ]);
      }
    }

    let notificationStatus = "pending_configuration";
    try {
      notificationStatus = (await sendLeadNotification({ id: leadId, ...lead }, idempotencyKey)).status;
    } catch {
      notificationStatus = "failed";
    }
    await db.prepare("UPDATE leads SET notification_status = ?, updated_at = ? WHERE id = ?").bind(notificationStatus, new Date().toISOString(), leadId).run();

    return Response.json({ ok: true, id: leadId, notificationStatus, whatsappUrl: whatsappUrl(whatsappNumber, lead.name, lead.service, lead.postcode, leadId) }, { status: 201 });
  } catch (error) {
    return Response.json({
      error: leadInserted ? "Your request was saved, but an attachment could not be processed. Please contact us with your reference." : (error instanceof Error ? error.message : "Unable to submit your request"),
      id: leadId || undefined,
    }, { status: leadInserted ? 202 : 500 });
  }
}
