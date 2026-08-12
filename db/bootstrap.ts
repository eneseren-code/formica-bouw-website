import { env } from "cloudflare:workers";
import { seedContent } from "@/lib/site-data";

let ready = false;

const statements = [
  `CREATE TABLE IF NOT EXISTS site_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip_hash TEXT PRIMARY KEY,
    failures INTEGER NOT NULL DEFAULT 0,
    last_attempt TEXT NOT NULL,
    blocked_until TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS content_entries (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    title_nl TEXT NOT NULL DEFAULT '',
    title_en TEXT NOT NULL DEFAULT '',
    summary_nl TEXT NOT NULL DEFAULT '',
    summary_en TEXT NOT NULL DEFAULT '',
    body_nl TEXT NOT NULL DEFAULT '',
    body_en TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_content_type_slug ON content_entries(content_type, slug)`,
  `CREATE INDEX IF NOT EXISTS idx_content_status_sort ON content_entries(status, content_type, sort_order)`,
  `CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    alt_nl TEXT NOT NULL DEFAULT '',
    alt_en TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_media_public_created ON media_assets(is_public, created_at)`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    postcode TEXT NOT NULL DEFAULT '',
    service TEXT NOT NULL,
    project_description TEXT NOT NULL,
    preferred_contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    notification_status TEXT NOT NULL DEFAULT 'pending',
    consent_at TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_idempotency ON leads(idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_ip_created ON leads(ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS lead_notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_created ON lead_notes(lead_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS lead_media (
    lead_id TEXT NOT NULL,
    media_id TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_media_pair ON lead_media(lead_id, media_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lead_media_lead ON lead_media(lead_id)`,
];

export function getRawDb(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB as D1Database;
}

export function getUploads(): R2Bucket {
  const uploads = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;
  if (!uploads) throw new Error("R2 binding UPLOADS is unavailable");
  return uploads;
}

export async function ensureDatabase() {
  if (ready) return getRawDb();
  const db = getRawDb();
  await db.batch(statements.map((statement) => db.prepare(statement)));
  await db.batch(
    seedContent.map((entry) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO content_entries
          (id, content_type, slug, status, title_nl, title_en, summary_nl, summary_en, body_nl, body_en, metadata_json, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          entry.id,
          entry.contentType,
          entry.slug,
          entry.status,
          entry.titleNl,
          entry.titleEn,
          entry.summaryNl,
          entry.summaryEn,
          entry.bodyNl,
          entry.bodyEn,
          JSON.stringify(entry.metadata),
          entry.sortOrder,
        ),
    ),
  );
  const seedRevision = await db.prepare("SELECT value FROM site_meta WHERE key = 'seed_revision'").first<{ value: string }>();
  const revision = Number(seedRevision?.value ?? 0);
  if (revision < 1) {
    const settings = seedContent.find((entry) => entry.id === "settings-global");
    const cookies = seedContent.find((entry) => entry.id === "page-cookies");
    await db.batch([
      db.prepare("UPDATE content_entries SET metadata_json = ?, updated_at = ? WHERE id = 'settings-global' AND metadata_json LIKE '%+31617480856%'")
        .bind(JSON.stringify(settings?.metadata ?? {}), new Date().toISOString()),
      db.prepare("UPDATE content_entries SET body_nl = ?, body_en = ?, updated_at = ? WHERE id = 'page-cookies' AND (body_nl LIKE '%taalkeuze kan lokaal%' OR body_en LIKE '%language choice may%')")
        .bind(cookies?.bodyNl ?? "", cookies?.bodyEn ?? "", new Date().toISOString()),
      db.prepare(`INSERT INTO site_meta (key, value, updated_at) VALUES ('seed_revision', '1', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(new Date().toISOString()),
    ]);
  }
  if (revision < 2) {
    const privacy = seedContent.find((entry) => entry.id === "page-privacy");
    const cookies = seedContent.find((entry) => entry.id === "page-cookies");
    await db.batch([
      db.prepare("UPDATE content_entries SET body_nl = ?, body_en = ?, updated_at = ? WHERE id = 'page-privacy' AND (body_nl LIKE '%Supabase%' OR body_en LIKE '%Supabase%')")
        .bind(privacy?.bodyNl ?? "", privacy?.bodyEn ?? "", new Date().toISOString()),
      db.prepare("UPDATE content_entries SET body_nl = ?, body_en = ?, updated_at = ? WHERE id = 'page-cookies' AND (body_nl LIKE '%Supabase%' OR body_en LIKE '%Supabase%')")
        .bind(cookies?.bodyNl ?? "", cookies?.bodyEn ?? "", new Date().toISOString()),
      db.prepare(`INSERT INTO site_meta (key, value, updated_at) VALUES ('seed_revision', '2', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(new Date().toISOString()),
    ]);
  }
  if (revision < 4) {
    const bathroomContentIds = ["page-home", "page-services", "page-contact", "page-quote", "service-renovations"];
    const bathroomContent = seedContent.filter((entry) => bathroomContentIds.includes(entry.id));
    await db.batch([
      ...bathroomContent.map((entry) =>
        db.prepare(`UPDATE content_entries SET
          title_nl = ?, title_en = ?, summary_nl = ?, summary_en = ?, body_nl = ?, body_en = ?,
          metadata_json = ?, updated_at = ? WHERE id = ?`)
          .bind(
            entry.titleNl,
            entry.titleEn,
            entry.summaryNl,
            entry.summaryEn,
            entry.bodyNl,
            entry.bodyEn,
            JSON.stringify(entry.metadata),
            new Date().toISOString(),
            entry.id,
          ),
      ),
      db.prepare(`INSERT INTO site_meta (key, value, updated_at) VALUES ('seed_revision', '4', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(new Date().toISOString()),
    ]);
  }
  if (revision < 5) {
    const settings = seedContent.find((entry) => entry.id === "settings-global");
    const contact = seedContent.find((entry) => entry.id === "page-contact");
    await db.batch([
      db.prepare("UPDATE content_entries SET metadata_json = ?, updated_at = ? WHERE id = 'settings-global'")
        .bind(JSON.stringify(settings?.metadata ?? {}), new Date().toISOString()),
      db.prepare(`UPDATE content_entries SET
        title_nl = ?, title_en = ?, summary_nl = ?, summary_en = ?, updated_at = ? WHERE id = 'page-contact'`)
        .bind(
          contact?.titleNl ?? "",
          contact?.titleEn ?? "",
          contact?.summaryNl ?? "",
          contact?.summaryEn ?? "",
          new Date().toISOString(),
        ),
      db.prepare(`INSERT INTO site_meta (key, value, updated_at) VALUES ('seed_revision', '5', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(new Date().toISOString()),
    ]);
  }
  if (revision < 6) {
    const partners = seedContent.filter((entry) => entry.contentType === "partner");
    await db.batch([
      ...partners.map((entry) =>
        db.prepare(`UPDATE content_entries SET
          title_nl = ?, title_en = ?, updated_at = ? WHERE id = ? AND content_type = 'partner'`)
          .bind(entry.titleNl, entry.titleEn, new Date().toISOString(), entry.id),
      ),
      db.prepare(`INSERT INTO site_meta (key, value, updated_at) VALUES ('seed_revision', '6', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(new Date().toISOString()),
    ]);
  }
  await db.prepare("PRAGMA optimize").run();
  ready = true;
  return db;
}
