import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const siteMeta = sqliteTable("site_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminLoginAttempts = sqliteTable("admin_login_attempts", {
  ipHash: text("ip_hash").primaryKey(),
  failures: integer("failures").notNull().default(0),
  lastAttempt: text("last_attempt").notNull(),
  blockedUntil: text("blocked_until"),
});

export const contentEntries = sqliteTable(
  "content_entries",
  {
    id: text("id").primaryKey(),
    contentType: text("content_type").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    titleNl: text("title_nl").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    summaryNl: text("summary_nl").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    bodyNl: text("body_nl").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    metadataJson: text("metadata_json").notNull().default("{}"),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_content_type_slug").on(table.contentType, table.slug),
    index("idx_content_status_sort").on(table.status, table.contentType, table.sortOrder),
  ],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    altNl: text("alt_nl").notNull().default(""),
    altEn: text("alt_en").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_media_public_created").on(table.isPublic, table.createdAt)],
);

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    postcode: text("postcode").notNull().default(""),
    service: text("service").notNull(),
    projectDescription: text("project_description").notNull(),
    preferredContact: text("preferred_contact").notNull(),
    status: text("status").notNull().default("new"),
    notificationStatus: text("notification_status").notNull().default("pending"),
    consentAt: text("consent_at").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    closedAt: text("closed_at"),
  },
  (table) => [
    uniqueIndex("idx_leads_idempotency").on(table.idempotencyKey),
    index("idx_leads_status_created").on(table.status, table.createdAt),
    index("idx_leads_ip_created").on(table.ipHash, table.createdAt),
  ],
);

export const leadNotes = sqliteTable(
  "lead_notes",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id").notNull(),
    note: text("note").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_lead_notes_lead_created").on(table.leadId, table.createdAt)],
);

export const leadMedia = sqliteTable(
  "lead_media",
  {
    leadId: text("lead_id").notNull(),
    mediaId: text("media_id").notNull(),
  },
  (table) => [
    uniqueIndex("idx_lead_media_pair").on(table.leadId, table.mediaId),
    index("idx_lead_media_lead").on(table.leadId),
  ],
);
