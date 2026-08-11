import { requireAdmin, sameOrigin } from "./admin-auth";

export async function authorizeAdmin(request: Request, mutation = false) {
  if (mutation && !sameOrigin(request)) return null;
  return requireAdmin(request);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function safeJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
