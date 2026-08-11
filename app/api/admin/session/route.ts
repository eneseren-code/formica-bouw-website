import { ensureDatabase } from "@/db/bootstrap";
import {
  adminSessionCookies,
  authenticatePassword,
  authConfigured,
  clearAdminCookies,
  renewAdminSession,
  requireAdmin,
  sameOrigin,
} from "@/lib/admin-auth";
import { hashIp } from "@/lib/file-validation";

function jsonWithCookies(payload: unknown, status: number, cookies: string[]) {
  const headers = new Headers({ "Content-Type": "application/json" });
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return new Response(JSON.stringify(payload), { status, headers });
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  return Response.json({ configured: authConfigured(), authenticated: Boolean(user), username: user?.username ?? null });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const db = await ensureDatabase();
  const ipHash = await hashIp(clientIp(request));
  const attempt = await db.prepare("SELECT failures, last_attempt, blocked_until FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).first<{ failures: number; last_attempt: string; blocked_until: string | null }>();
  if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > Date.now()) {
    return Response.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers: { "Retry-After": "900" } });
  }

  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const session = await authenticatePassword(body.username ?? "", body.password ?? "");
    await db.prepare("DELETE FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).run();
    return jsonWithCookies({ ok: true }, 200, adminSessionCookies(session));
  } catch (error) {
    const now = new Date();
    const withinWindow = attempt?.last_attempt && new Date(attempt.last_attempt).getTime() > now.getTime() - 15 * 60 * 1000;
    const failures = (withinWindow ? Number(attempt?.failures ?? 0) : 0) + 1;
    const blockedUntil = failures >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
    await db.prepare(`INSERT INTO admin_login_attempts (ip_hash, failures, last_attempt, blocked_until)
      VALUES (?, ?, ?, ?) ON CONFLICT(ip_hash) DO UPDATE SET failures = excluded.failures, last_attempt = excluded.last_attempt, blocked_until = excluded.blocked_until`)
      .bind(ipHash, failures, now.toISOString(), blockedUntil).run();
    return Response.json({ error: error instanceof Error ? error.message : "Sign in failed" }, { status: authConfigured() ? 401 : 503 });
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const session = await renewAdminSession(request);
    return jsonWithCookies({ ok: true }, 200, adminSessionCookies(session));
  } catch (error) {
    return jsonWithCookies({ error: error instanceof Error ? error.message : "Session expired" }, 401, clearAdminCookies());
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  return jsonWithCookies({ ok: true }, 200, clearAdminCookies());
}
