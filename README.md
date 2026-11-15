# TermTrove

An independent marketplace for pre-loved educational books in Bangkok. Students and families can browse, create their own email/password accounts, upload book photos, list books, reserve purchases, coordinate collection privately, and manage listings and orders.

**Source repository:** https://github.com/fynn151010-lab/Termtrove

This is the complete application source, not a GitHub Pages mockup. The existing forest-green design, educational mission and pages are preserved. The approved logo has not been provided, so the original `LOGO HERE` placeholder remains.

## Stack

- React + TypeScript and Vite preserve the existing frontend.
- Node 22+ runs the API locally, on Vercel Functions, or on a standard Node host.
- Supabase Auth provides real email/password signup, email confirmation, login, logout, persistent cookie sessions and forgotten-password recovery.
- PostgreSQL stores profiles, listings, photo metadata, orders, private collection messages and contact submissions. Row-level security and restricted transactional functions authorize writes.
- Supabase Storage persists private book images. The same-origin API checks access before serving them.

There is no runtime dependency on ChatGPT, OpenAI, Sites, D1, R2, or their identity headers. The browser never handles a Supabase service-role key or session token; sessions are HttpOnly cookies.

## Install and run

```sh
npm install
cp .env.example .env
```

Supply `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `APP_ORIGIN` in the ignored `.env`. For a hosted project, first apply the supplied SQL migration and configure Supabase Auth as described in [Deployment](docs/DEPLOYMENT.md).

```sh
npm run dev
```

Open `http://localhost:5173`. Pages render without credentials, but database/authentication actions deliberately return a configuration error until a real Supabase backend is connected. There is no fallback simulated account, localStorage marketplace, or fake checkout.

For a standalone production Node server:

```sh
npm run build
npm start
```

For Vercel, import the GitHub repository and set the server environment variables. The checked-in `vercel.json` supplies routing and security headers. See [Deployment](docs/DEPLOYMENT.md) for the exact Supabase and hosting steps, email templates, and launch checks.

## Fully local real backend

Install Docker and the official Supabase CLI (tested with 2.75.0). The `npm run db:*` helpers run that CLI through npx; a preinstalled `supabase` binary is also supported directly.

```sh
npm run db:start
node scripts/write-local-env.mjs
npm run dev
```

The local CLI starts PostgreSQL, Supabase Auth, Storage, the REST API and Mailpit. It applies `supabase/migrations/` and `supabase/seed.sql`. Mailpit captures confirmation/reset emails locally at `http://127.0.0.1:54324`; no external email provider is required for local testing. The environment helper writes only local URL/anon credentials into ignored `.env`, without printing them. It refuses non-local projects.

On resource-limited machines the tested reduced command is:

```sh
supabase start -x studio,realtime,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta
```

Development records and images persist in Docker volumes. `supabase stop` preserves them. `npm run db:reset` destroys **local development** records and reloads migrations/seed, so only use it on disposable local data.

## Checks

```sh
npm run typecheck
npm test
npm run build
# Requires running local Supabase and the ignored local .env:
npm run test:integration
```

The integration suite refuses a non-local Supabase URL. It creates independent seller/buyer accounts through the actual application, follows real local confirmation/reset emails, uploads persistent photos, exercises RLS and ownership, races two purchases, checks private order conversations, cancels/reorders/completes purchases, archives listings, and logs out. It does not send real-world email or make a financial transaction.

GitHub Actions runs these checks against isolated local Supabase services. No production secrets are required for CI. A workflow file is included; GitHub may require you to enable Actions for the repository and approve any account-specific usage restrictions. Do not enable paid usage to run it.

## Project structure

```text
app/
  main.tsx              Router, account state and responsive navigation
  auth.tsx              Signup, login, recovery and logout UI
  components.tsx        Shared covers, cards, branding, footer and states
  pages/                Home/marketplace, selling, checkout, account, information
  styles.css            Existing responsive design and auth page styling
server/
  api.ts                Marketplace API and server-side validation
  auth.ts               Supabase password and email-link endpoints
  supabase.ts           Per-request cookie client and refresh persistence
  config.ts             Server configuration and safe return paths
  node.ts, dev.ts       Standard Node adapters and local/production server
api/index.ts            Vercel server-function adapter
supabase/
  migrations/           PostgreSQL schema, RLS, storage and transactional functions
  seed.sql              Clearly labelled optional local samples
  config.toml           Local backend and email configuration
tests/                  Unit security checks and real Supabase integration suite
docs/DEPLOYMENT.md      Account setup, free-plan constraints and launch checks
.env.example            Names/placeholders only; no secrets
```

## Security and transaction behavior

- User identity is verified by Supabase Auth on the server. User IDs supplied in headers or bodies cannot select a different account.
- Anonymous users read public listings only. Private profiles, account emails, order details and collection notes are restricted to the correct account/participants.
- Public seller information exposes only the display name and account UUID, not the private profile or email.
- The application uses only the publishable/anon key so PostgreSQL RLS applies. Direct database writes to listings/orders are denied; explicitly granted functions validate identity and ownership.
- `save_listing` locks the listing and images, checks ownership and stored objects, and updates details/photos atomically. Reserved listings cannot be edited or archived.
- `place_order` locks one book, checks its state, rejects self/sample purchases and creates one exclusive reservation in the same database transaction. A partial unique index prevents multiple active orders per book.
- Buyer or seller can cancel a pending order, restoring inventory. Only the seller can confirm collection and payment, which completes the order and marks the book sold.
- Collection messages are visible only to the buyer and seller. No residential address or email is added automatically to a public listing.
- Password sessions use HttpOnly, SameSite=Lax cookies, Secure over HTTPS; token refresh writes cookies back to each response. Mutation requests require the configured application Origin. Auth callbacks validate same-origin return destinations.
- Image uploads verify JPEG/PNG/WebP signatures, limit each upload to 3 MB and permit 1–5 photos per listing. Private Storage bucket policies also enforce owner paths and MIME/size limits. The 3 MB limit keeps requests below Vercel’s function body limit.
- Payment is on collection. “Paid” means the seller confirmed in-person payment, not a processor-verified charge. No online payment is simulated.

## External setup and launch status

A live independent deployment requires **your own Supabase project, SMTP/email-sending configuration and hosting account**. No hosted credentials, paid subscriptions or domains are created by this repository. Local integration success does not verify your production email delivery or hosting configuration.

Approved legal/contact wording and the logo remain pending. Existing users/data from the earlier Site are not silently moved: see the verified-account migration guidance in [Deployment](docs/DEPLOYMENT.md).
