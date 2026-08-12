import { ensureDatabase } from "@/db/bootstrap";
import { authorizeAdmin, unauthorized } from "@/lib/admin-api";
import { toLeadSummary, type LeadRow } from "@/lib/admin-leads";
import type { AdminOverview } from "@/lib/types";

type ContentCounts = { published: number; drafts: number; draft_claims: number };
type LeadCounts = { new_leads: number; failed_notifications: number };
type MediaCounts = { media: number; missing_alt_text: number };

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const db = await ensureDatabase();
  const [content, leads, media, recent] = await Promise.all([
    db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS published,
      COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS drafts,
      COALESCE(SUM(CASE WHEN content_type = 'claim' AND status = 'draft' THEN 1 ELSE 0 END), 0) AS draft_claims
      FROM content_entries`).first<ContentCounts>(),
    db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS new_leads,
      COALESCE(SUM(CASE WHEN notification_status <> 'sent' THEN 1 ELSE 0 END), 0) AS failed_notifications
      FROM leads`).first<LeadCounts>(),
    db.prepare(`SELECT COUNT(*) AS media,
      COALESCE(SUM(CASE WHEN is_public = 1 AND (TRIM(alt_nl) = '' OR TRIM(alt_en) = '') THEN 1 ELSE 0 END), 0) AS missing_alt_text
      FROM media_assets`).first<MediaCounts>(),
    db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5").all<LeadRow>(),
  ]);

  const overview: AdminOverview = {
    stats: {
      published: Number(content?.published ?? 0),
      drafts: Number(content?.drafts ?? 0),
      newLeads: Number(leads?.new_leads ?? 0),
      failedNotifications: Number(leads?.failed_notifications ?? 0),
      media: Number(media?.media ?? 0),
      missingAltText: Number(media?.missing_alt_text ?? 0),
      draftClaims: Number(content?.draft_claims ?? 0),
    },
    recentLeads: recent.results.map(toLeadSummary),
  };
  return Response.json(overview);
}
