# Formica Bouw website

Local-first, bilingual (Dutch/English) website and fixed-structure CMS for Formica Bouw. The public site, `/admin`, D1 content/lead storage and R2 media storage run together through Sites/vinext. Nothing in this repository deploys or changes `formicabouw.com` automatically.

## Included

- Dutch routes at `/`, `/diensten`, the existing Dutch service URLs, `/projecten`, `/over-ons`, `/contact` and `/offerte`.
- Matching English routes under `/en/...`, language equivalents, canonical/hreflang metadata, sitemap, robots and structured business data.
- Responsive premium architectural design, accessible mobile navigation, keyboard focus, reduced-motion support, project filters/lightbox and WhatsApp shortcut.
- English `/admin` CMS for bilingual pages, services, projects, partners, settings, claims, media and lead management.
- Quote form with server validation, honeypot/timing controls, per-IP rate limiting, up to five verified JPEG/PNG/WebP files, D1-first persistence and Resend notification retry state.
- Draft/published content states. Draft entries never appear on the public site.
- CSV lead export, internal notes, lead status and confirmed deletion only after a closed lead is older than 12 months.

## Local setup

Requirements: Node.js 22.13+ and pnpm (or npm).

```bash
cp .env.example .env.local
pnpm install
pnpm run dev
```

Open `http://localhost:3000`. Local D1 and R2 are emulated by Wrangler according to `.openai/hosting.json`; local data remains on the development machine.

Useful commands:

```bash
pnpm run build
pnpm run test
pnpm run lint
pnpm run db:generate
pnpm run media:hero
```

## Private superadmin setup

1. Copy `.env.example` to `.env.local`.
2. Set your private `SUPERADMIN_USERNAME`.
3. Set a strong `SUPERADMIN_PASSWORD` of at least 8 characters.
4. Generate an independent signing secret with `openssl rand -hex 32` and set it as `ADMIN_SESSION_SECRET`.
5. Restart the development server and sign in at `/admin/login`.

The username and password stay in the server environment and are never stored in D1, sent to the browser or committed to the repository. After a successful login, the server issues an eight-hour HMAC-SHA256 signed session token in one HttpOnly, SameSite=Strict cookie. Every admin API request verifies the signature, expiry and configured username again. Five failed attempts from the same hashed IP trigger a 15-minute lockout.

## Resend setup

1. Add and verify the sending domain in Resend.
2. Create an API key and set `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to an address on the verified domain.
4. Keep `LEAD_NOTIFICATION_EMAIL=info@formicabouw.com`, or change it for local testing.

The lead is committed to D1 before an email is attempted. Missing configuration is marked `pending_configuration`; an API error is marked `failed`. Both remain visible in the admin panel and can be retried. The same idempotency key prevents accidental duplicate sends.

## Data and media

- Schema source: `db/schema.ts`
- Generated migrations: `drizzle/`
- Seed content: `lib/site-data.ts`
- Local source assets: `public/media/`
- Uploaded CMS and lead images: logical R2 binding `UPLOADS`
- Structured content and leads: logical D1 binding `DB`

The legal pages intentionally remain draft-style copy and visibly require business/legal approval before a public launch. Claims about financing, mortgage options, energy labels or years of experience are kept as draft CMS records until they can be verified.

## Production hand-off

The current Sites release is published independently from `formicabouw.com`; no custom-domain DNS is changed by this repository. Before accepting real submissions, review all legal/claim drafts, replace the temporary production superadmin password with a strong private value, and configure Resend after its sending domain is verified.
