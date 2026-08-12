import { ensureDatabase } from "@/db/bootstrap";
import { authorizeAdmin, unauthorized } from "@/lib/admin-api";

function csv(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!(await authorizeAdmin(request))) return unauthorized();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);
  if (status !== "all" && !["new", "contacted", "closed"].includes(status)) {
    return Response.json({ error: "Invalid lead status" }, { status: 400 });
  }
  const db = await ensureDatabase();
  const conditions: string[] = [];
  const bindings: string[] = [];
  if (status !== "all") {
    conditions.push("status = ?");
    bindings.push(status);
  }
  if (search) {
    const escaped = search.replace(/[\\%_]/g, "\\$&");
    conditions.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR postcode LIKE ? ESCAPE '\\' OR service LIKE ? ESCAPE '\\')");
    for (let index = 0; index < 5; index += 1) bindings.push(`%${escaped}%`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await db.prepare(`SELECT id, created_at, name, email, phone, postcode, service, preferred_contact,
    status, notification_status, project_description FROM leads${where} ORDER BY created_at DESC`)
    .bind(...bindings).all<Record<string, unknown>>();
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
