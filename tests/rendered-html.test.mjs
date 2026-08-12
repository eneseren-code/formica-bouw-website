import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const file = (path) => new URL(`../${path}`, import.meta.url);

test("contains complete Dutch and English route maps with matching page keys", async () => {
  const source = await readFile(file("lib/site-data.ts"), "utf8");
  for (const route of [
    'home: "/"', 'services: "/diensten"', 'renovations: "/renovaties"', 'insulation: "/isolatie"',
    '"custom-kitchens-cabinets": "/keukens-kasten-op-maat"', '"plastering-painting": "/stucen-en-schilderen"',
    '"ev-charging-electrical": "/laadpalen-en-elektra"', 'quote: "/offerte"',
    'home: "/en"', 'services: "/en/services"', 'renovations: "/en/renovations"',
    'quote: "/en/quote"', 'privacy: "/en/privacy"', 'cookies: "/en/cookies"',
  ]) assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /Uw nieuwe badkamer, tot in detail gerealiseerd/);
  assert.match(source, /Your new bathroom, delivered down to the last detail/);
  assert.match(source, /Complete badkamerrenovatie/);
  assert.match(source, /Complete bathroom renovation/);
});

test("wires canonical, hreflang, social image, sitemap and structured data", async () => {
  const [seo, sitemap, layout, og] = await Promise.all([
    readFile(file("lib/seo.ts"), "utf8"), readFile(file("app/sitemap.ts"), "utf8"),
    readFile(file("app/layout.tsx"), "utf8"), readFile(file("public/og.png")),
  ]);
  assert.match(seo, /canonical/);
  assert.match(seo, /"nl-NL"/);
  assert.match(seo, /"en-GB"/);
  assert.match(seo, /\/og\.png/);
  assert.match(sitemap, /nlPaths/);
  assert.match(sitemap, /enPaths/);
  assert.match(layout, /HomeAndConstructionBusiness/);
  assert.match(layout, /data\.settings\.phone/);
  assert.match(layout, /data\.settings\.email/);
  assert.doesNotMatch(layout, /31851091145|085 109 11 45/);
  assert.equal(og.readUInt32BE(16), 1200);
  assert.equal(og.readUInt32BE(20), 630);
});

test("redirects both legacy booking URLs to the quote page", async () => {
  const [dynamicRoute, bookingRoute] = await Promise.all([
    readFile(file("app/[slug]/page.tsx"), "utf8"),
    readFile(file("app/booking-calendar/inmeet-en-kennismaking/page.tsx"), "utf8"),
  ]);
  assert.match(dynamicRoute, /slug === "book-online"/);
  assert.match(dynamicRoute, /redirect\("\/offerte"\)/);
  assert.match(bookingRoute, /redirect\("\/offerte"\)/);
});

test("enforces protected superadmin APIs and lead safety controls", async () => {
  const [contentApi, mediaApi, leadApi, publicLeadApi, auth, sessionApi, overviewApi, contentPolicy] = await Promise.all([
    readFile(file("app/api/admin/content/route.ts"), "utf8"), readFile(file("app/api/admin/media/route.ts"), "utf8"),
    readFile(file("app/api/admin/leads/route.ts"), "utf8"), readFile(file("app/api/leads/route.ts"), "utf8"),
    readFile(file("lib/admin-auth.ts"), "utf8"),
    readFile(file("app/api/admin/session/route.ts"), "utf8"),
    readFile(file("app/api/admin/overview/route.ts"), "utf8"),
    readFile(file("lib/admin-content.ts"), "utf8"),
  ]);
  assert.match(contentApi, /authorizeAdmin/);
  assert.match(mediaApi, /authorizeAdmin/);
  assert.match(leadApi, /authorizeAdmin/);
  assert.match(auth, /HttpOnly; SameSite=Strict/);
  assert.match(auth, /SUPERADMIN_USERNAME/);
  assert.match(auth, /SUPERADMIN_PASSWORD/);
  assert.match(auth, /HMAC/);
  assert.match(auth, /sessionSeconds = 8 \* 60 \* 60/);
  assert.doesNotMatch(auth, /Supabase|SUPABASE/);
  assert.match(sessionApi, /admin_login_attempts/);
  assert.match(sessionApi, /failures >= 5/);
  assert.match(publicLeadApi, /photos\.length > 5/);
  assert.match(publicLeadApi, /validateImage/);
  assert.match(publicLeadApi, /Too many requests/);
  assert.match(publicLeadApi, /sendLeadNotification/);
  assert.match(leadApi, /365 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(overviewApi, /authorizeAdmin/);
  assert.match(overviewApi, /failed_notifications/);
  assert.match(overviewApi, /missing_alt_text/);
  assert.match(contentApi, /searchParams\.get\("type"\)/);
  assert.match(contentApi, /creatableContentTypes/);
  assert.match(contentApi, /fixedSlugContentTypes/);
  assert.match(contentPolicy, /\["project", "partner"\]/);
  assert.match(contentPolicy, /normalizeContentMetadata/);
  assert.match(mediaApi, /json_extract\(metadata_json, '\$\.mediaId'\)/);
  assert.match(mediaApi, /status: 409/);
  assert.match(leadApi, /searchParams\.get\("mode"\)/);
  assert.match(leadApi, /searchParams\.get\("id"\)/);
});

test("validates typed CMS metadata without accepting arbitrary fields", async () => {
  const { normalizeContentMetadata } = await import(file("lib/admin-content.ts"));
  assert.deepEqual(
    normalizeContentMetadata({ category: "Bathroom-Renovation", featured: true }, "project"),
    { category: "bathroom-renovation", featured: true },
  );
  assert.deepEqual(
    normalizeContentMetadata({ email: " INFO@FORMICABOUW.COM ", instagram: "https://instagram.com/formicabouw" }, "settings"),
    { email: "info@formicabouw.com", instagram: "https://instagram.com/formicabouw" },
  );
  assert.throws(() => normalizeContentMetadata({ featured: "yes" }, "project"), /true or false/);
  assert.throws(() => normalizeContentMetadata({ arbitrary: "value" }, "page"), /not valid/);
  assert.throws(() => normalizeContentMetadata({ image: "https://example.com/hotlink.jpg" }, "project"), /local website image/);
});

test("keeps the mobile navigation viewport-bound and keyboard dismissible", async () => {
  const [header, styles] = await Promise.all([
    readFile(file("components/SiteHeader.tsx"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
  ]);
  assert.match(header, /aria-controls="main-navigation"/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(styles, /\.site-header \{ backdrop-filter: none; \}/);
  assert.match(styles, /height: 100dvh/);
  assert.match(styles, /\.menu-button\[aria-expanded="true"\]/);
});

test("ships a responsive video-only hero with decorative transparent sketches", async () => {
  const [publicSite, motion, styles] = await Promise.all([
    readFile(file("components/PublicSite.tsx"), "utf8"),
    readFile(file("components/HomeMotion.tsx"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
  ]);

  assert.match(publicSite, /formica-hero-mobile-poster\.webp/);
  assert.match(publicSite, /data-desktop-src="\/media\/generated\/formica-hero\.webm"/);
  assert.match(publicSite, /data-mobile-src="\/media\/generated\/formica-hero-mobile\.webm"/);
  assert.match(publicSite, /sketch-floorplan\.png/);
  assert.match(publicSite, /sketch-vanity-elevation\.png/);
  assert.doesNotMatch(publicSite, /home-plan-card|bathroom-plan-v2|2400 × 3100|FORMICA \/ 01/);
  assert.match(motion, /activeVideoVariant/);
  assert.match(motion, /saveData/);
  assert.match(motion, /effectiveType/);
  assert.match(motion, /document\.hidden/);
  assert.match(styles, /home-scroll-sketch-floorplan/);
  assert.match(styles, /home-scroll-sketch-vanity/);
  assert.doesNotMatch(styles, /home-plan-float/);

  await Promise.all([
    "formica-hero.webm",
    "formica-hero.mp4",
    "formica-hero-poster.webp",
    "formica-hero-mobile.webm",
    "formica-hero-mobile.mp4",
    "formica-hero-mobile-poster.webp",
    "sketch-floorplan.png",
    "sketch-vanity-elevation.png",
  ].map((asset) => access(file(`public/media/generated/${asset}`))));
});

test("declares D1/R2, schema, migration and local source assets without Wix hotlinks", async () => {
  const [hosting, schema, migration, packageJson, publicSite] = await Promise.all([
    readFile(file(".openai/hosting.json"), "utf8"), readFile(file("db/schema.ts"), "utf8"),
    readFile(file("drizzle/0000_fixed_talos.sql"), "utf8"), readFile(file("package.json"), "utf8"),
    readFile(file("components/PublicSite.tsx"), "utf8"),
  ]);
  assert.match(JSON.parse(hosting).project_id, /^appgprj_/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.equal(JSON.parse(hosting).r2, "UPLOADS");
  for (const table of ["content_entries", "media_assets", "leads", "lead_notes", "lead_media"]) assert.match(migration, new RegExp(table));
  assert.match(schema, /idempotencyKey/);
  assert.match(schema, /notificationStatus/);
  assert.match(schema, /adminLoginAttempts/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(publicSite, /wixstatic|static\.wixstatic/i);
  await Promise.all(["brand/logo.png", "services/renovation.jpg", "projects/project-06.jpg", "partners/sani4all.png"].map((asset) => access(file(`public/media/${asset}`))));
});
