import { ensureDatabase } from "@/db/bootstrap";
import { authorizeAdmin, unauthorized } from "@/lib/admin-api";

function csv(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const db = await ensureDatabase();
  const result = await db.prepare(`SELECT id, created_at, name, email, phone, postcode, service, preferred_contact,
    status, notification_status, project_description FROM leads ORDER BY created_at DESC`).all<Record<string, unknown>>();
  const columns = ["id", "created_at", "name", "email", "phone", "postcode", "service", "preferred_contact", "status", "notification_status", "project_description"];
  const output = [columns.map(csv).join(","), ...result.results.map((row: Record<string, unknown>) => columns.map((column) => csv(row[column])).join(","))].join("\r\n");
  return new Response(output, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="formica-bouw-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
