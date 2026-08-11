const sessionCookie = "fb-superadmin-session";
const sessionSeconds = 8 * 60 * 60;

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  const pair = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

function config() {
  return {
    username: process.env.SUPERADMIN_USERNAME ?? "",
    password: process.env.SUPERADMIN_PASSWORD ?? "",
    secret: process.env.ADMIN_SESSION_SECRET ?? "",
  };
}

export function authConfigured() {
  const value = config();
  return value.username.length >= 3 && value.password.length >= 8 && value.secret.length >= 32;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config().secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

async function safeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all(
    [left, right].map(async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))),
  );
  let difference = leftHash.length ^ rightHash.length;
  for (let index = 0; index < Math.max(leftHash.length, rightHash.length); index += 1) {
    difference |= (leftHash[index] ?? 0) ^ (rightHash[index] ?? 0);
  }
  return difference === 0;
}

async function createSession(username: string) {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    sub: "superadmin",
    username,
    exp: Math.floor(Date.now() / 1000) + sessionSeconds,
    nonce: crypto.randomUUID(),
  })));
  return `${payload}.${base64UrlEncode(await signature(payload))}`;
}

export async function authenticatePassword(username: string, password: string) {
  const value = config();
  if (!authConfigured()) throw new Error("Superadmin credentials are not configured");
  const [validUsername, validPassword] = await Promise.all([
    safeEqual(username.trim(), value.username),
    safeEqual(password, value.password),
  ]);
  if (!validUsername || !validPassword) throw new Error("Invalid username or password");
  return { token: await createSession(value.username), expiresIn: sessionSeconds };
}

export async function requireAdmin(request: Request) {
  if (!authConfigured()) return null;
  const token = readCookie(request, sessionCookie);
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  try {
    const expected = base64UrlEncode(await signature(payload));
    if (!(await safeEqual(suppliedSignature, expected))) return null;
    const session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { sub?: string; username?: string; exp?: number };
    if (session.sub !== "superadmin" || session.username !== config().username || !session.exp || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: "superadmin", username: session.username };
  } catch {
    return null;
  }
}

export async function renewAdminSession(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) throw new Error("Session expired");
  return { token: await createSession(admin.username), expiresIn: sessionSeconds };
}

export function adminSessionCookies(session: { token: string; expiresIn: number }) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [`${sessionCookie}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${session.expiresIn}${secure}`];
}

export function clearAdminCookies() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [`${sessionCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`];
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
