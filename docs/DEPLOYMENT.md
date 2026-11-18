# Deploy TermTrove independently

The current public deployment is **https://termtrove-bangkok.netlify.app**, in the owner's Termtrove Netlify team on the **Free** plan. The account has a 300-credit monthly hard limit and no payment method. The former https://termtrove.onrender.com deployment remains available as a temporary fallback while email configuration is completed. No database or Storage migration is needed: both hosts use the existing `termtrove` Supabase project.

GitHub hosts the source. Netlify serves the static frontend from its CDN and runs the Node API as functions; Supabase provides PostgreSQL, password authentication and private photo storage. Neither the browser nor the server requires ChatGPT, an OpenAI account, an OpenAI API key, Sites, or Cloudflare bindings.

The maintainer owns the hosting and Supabase accounts. Do not purchase upgrades to follow these steps. Review the providers' current free-plan eligibility and quotas in your account. If a feature requires a paid upgrade, stop rather than entering payment information.

## 1. Supabase project (your account)

1. Sign in at https://supabase.com/dashboard and create a **Free** project in a suitable region. Choose and store the database password yourself; do not paste it into chat or source control.
2. Open the SQL Editor. Run every file in `supabase/migrations/` once, in filename order, in the intended project. The first creates tables, indexes, signup profile trigger, row-level security rules, transactional marketplace functions, and the private `book-images` bucket. The follow-up hardens hosted API-role grants and separates public seller names from private profiles. Alternatively use the Supabase CLI’s `link` and `db push` commands after authenticating yourself. Inspect existing tables and triggers first if reusing a project; do not delete unrelated data to make a migration fit.
3. Under Authentication → Providers, enable Email/Password and email confirmations. Set minimum password length to at least 12. Keep rate limits enabled. Do not enable anonymous sign-ins.
4. Under Project Settings → API, copy the project URL and **publishable** key (or legacy **anon** key). These are the only Supabase credentials used by the application. **Do not use a service-role/secret key**: doing so would bypass database authorization.
5. Configure a production SMTP sender in Authentication → Email/SMTP for sign-up and recovery messages. Supabase’s built-in email sender is intended for development and restricts delivery/rate, so it is insufficient for arbitrary public users. Choose an existing/free compatible sender and verify a sending address/domain you control; do not buy one without explicit permission. Keep SMTP credentials only in Supabase settings.

Do not load sample data in production unless deliberately requested. `supabase/seed.sql` is optional local sample content and cannot be purchased.

### Upgrading an already running app: photo removal

Fresh deployments apply every migration before starting the API. When upgrading an older running app, deploy photo removal in two stages:

1. Apply `20261116151038_support_private_photo_removal.sql`. It adds a removal flag and owner-only RPCs while keeping the old upload policy compatible.
2. Deploy the metadata-first image uploader and removal API from this revision; wait for the deploy to become live and verify it.
3. Apply `20261116151046_require_registered_photo_storage.sql`. It requires image ownership metadata before object upload and a pending-removal flag before object deletion.

Do not apply the final storage-policy migration while the old object-first uploader is still running. A removed photo stays locked against publication until its stored object has been deleted. Photos attached to a listing cannot be deleted directly. Replacing photos first saves the listing, then removes objects that are no longer attached; a failed listing edit leaves the existing photos intact. Cleanup after a storage outage may need a retry; abandoned drafts are not silently purged on a timer.

### Optional Gmail sender for a small pilot

If the owner chooses their existing Gmail address, Supabase SMTP can use `smtp.gmail.com`, port `587` (STARTTLS), the full Gmail address as both username and sender address, and an owner-created Google app password. Set sender name to `TermTrove`. Google requires 2-Step Verification and may restrict app-password availability for some accounts. Keep the app password only in Supabase's SMTP Password field; never use or share the account's normal password. This authorizes account access through that credential, so the owner must create and enter it themselves and can revoke it in Google Account settings. Gmail's sending limits still apply, and actual delivery must be verified before relying on it for onboarding.

Official references: [Google app passwords](https://support.google.com/mail/answer/185833?hl=en), [Google SMTP settings](https://support.google.com/mail/answer/7104828), [Supabase SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp). No sender account or app password is provisioned by this repository.

## 2. Netlify Free deployment

The existing project is `termtrove-bangkok`, ID `3ef1c725-cd9b-4422-a119-b8a352491a03`, in the `fynn151010-lab` team. Use it rather than creating duplicate sites. [Project dashboard](https://app.netlify.com/projects/termtrove-bangkok).

1. Sign in to Netlify and use the **Free** team. Netlify supports commercial projects on Free; paid features are unnecessary here.
2. Use Node 22, the repository root, build `npm run build`, publish `dist/client`, and functions directory `netlify/functions`. These are checked in as `netlify.toml`.
3. Add the following **server-side** environment variables to the project:

| Variable                   | Value                                   |
| -------------------------- | --------------------------------------- |
| `SUPABASE_URL`             | Your Supabase project URL               |
| `SUPABASE_PUBLISHABLE_KEY` | Your publishable or legacy anon key     |
| `APP_ORIGIN`               | `https://termtrove-bangkok.netlify.app` |
| `NODE_ENV`                 | `production`                            |

Do not prefix these with `VITE_`: the browser communicates only with same-origin API routes. No Supabase credentials or session tokens are bundled into the frontend. `APP_ORIGIN` is used for CSRF checks and confirmation/recovery links, not inferred from untrusted request headers.

4. Use the official Netlify CLI, tested with version 27.20.0. `netlify login` authorizes your own account; `netlify login --request "Deploy TermTrove Free"` also supports an account-owner authorization link without sharing passwords or tokens. Keep the generated CLI credentials out of source control.

```sh
netlify link --id 3ef1c725-cd9b-4422-a119-b8a352491a03
netlify build --context production
# Optional draft deployment for review; does not publish the main address:
netlify deploy --context production
# Publish the verified code:
netlify deploy --prod --context production
npm run check:deployment -- https://termtrove-bangkok.netlify.app
```

Use the correct production `APP_ORIGIN` for the build, too, so `scripts/seo.mjs` generates the new sitemap. Keep local `.env` files ignored and do not import a localhost origin into production. `.netlify/` contains local state and function archives and is also ignored. Static deploys without the function bundle do not run the marketplace backend.

5. Under Project configuration → General → Visitor access, make production **Public**. New Netlify teams can create private projects by default, which return a Netlify login wall to visitors. The current deployment has been made public and verified without authentication. Account and order access remain protected by the application and Supabase RLS.
6. Update Supabase's email URLs as described below. Keep the Render callback allowlist entry temporarily for emails issued before the switch. Sessions are scoped to each hostname, so users sign in again on the new address.

The API uses Netlify's Web Request/Response runtime directly. Function path patterns `/api` and `/api/*` preserve callback query strings and take priority over the SPA fallback. `external_node_modules = ["sharp"]` includes native Linux image processing dependencies. The adapter caps streamed request bodies at 4 MB even when Content-Length is missing or false, preserves multiple Set-Cookie headers and applies the same security headers as the frontend. No function result is publicly cached.

### Free-plan behavior and updates

The CDN frontend does not have Render's 15-minute idle-service sleep. API functions may have ordinary serverless cold-start latency. Free hosting does not provide unlimited capacity or an availability guarantee. As verified on 17 November 2026, Netlify Free includes 300 credits per month with a hard cap and no automatic recharge: production deploys consume 15 credits, function compute 10 credits/GB-hour, requests 2 credits/10,000, and bandwidth 20 credits/GB. Usage can pause the site until the allowance resets. Review current [Netlify pricing documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/); do not upgrade or add a payment method.

The site was deployed through the CLI. GitHub pushes alone do not currently redeploy it. Future maintainers can use the commands above after checks pass. Connecting Netlify's GitHub integration for automatic deployment requires the owner to approve its repository access; the existing GitHub connection cannot manage deployment keys. This is optional for running the published website. Do not copy an unrelated connector token into Netlify or GitHub Actions to bypass that authorization.

New Free projects may show Netlify's badge. Do not weaken the application Content Security Policy to enable an injected script, or purchase a plan to remove branding.

## 3. Confirmation and password reset URLs

In Supabase Authentication → URL Configuration:

- Site URL: the same origin as `APP_ORIGIN`.
- Allow redirects to `https://YOUR-DEPLOYMENT/api/auth/callback**` (the suffix permits the `next` query string on the same controlled domain).
- For local development, also allow `http://localhost:5173/api/auth/callback**`.

The default confirmation/recovery templates support PKCE through `/api/auth/callback`. The server exchanges the short-lived code for a cookie session, and removes it from the browser address via a redirect. Open these PKCE links in the same browser that initiated signup/recovery because the flow verifier is in an HttpOnly cookie.

For email links that must work across browsers/devices, use the server’s token-hash confirmation endpoint and update the Supabase email templates:

**Confirm signup**

```html
<a
  href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup"
  >Confirm your TermTrove account</a
>
```

**Reset password**

```html
<a
  href="{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Reset your TermTrove password</a
>
```

Keep the token in the email link only. Do not log it or commit actual links. `/api/auth/confirm` exchanges the token and redirects to `/account` or `/reset-password`. Session cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Successful password reset signs out sessions; the user signs in with the new password.

## 4. Verify the real production deployment

Run the read-only deployment check first:

```sh
npm run check:deployment -- https://YOUR-PUBLIC-HOST
```

It checks public routing, database health, anonymous session behavior, dashboard access protection, security headers, the approved logo, and production sitemap/crawler settings. It does not create users, send email, upload files, reserve books or write database records. A failed check exits with a nonzero status. Passing still requires the account, email and transaction checks below.

Use two ordinary email accounts you control; complete email verification for each. Do not publish sensitive test information.

1. Open the homepage in a private window; browse and search without signing in.
2. Register seller and buyer accounts; verify email, log in, refresh and confirm sessions persist.
3. Upload a real JPEG/PNG/WebP under 3 MB. Publish a book; check it appears in a separate browser.
4. Edit its price/description, inspect the product page and ensure public data contains no account email or collection note.
5. With the buyer account, reserve the book and verify it appears in both dashboards. The seller’s and other buyers’ purchase attempts must fail.
6. Exchange private collection messages. Cancel one pending order and verify availability returns; reorder and confirm collection from the seller account.
7. Request password reset and follow the real email link. Confirm the old password fails and the new password works. Log out and verify account pages require sign-in.
8. Check phone-width layouts and keyboard operation.

The automated integration suite runs the same core actions against real **local** Supabase services and Mailpit, not mock authentication. Production email delivery and signed-in actions on the deployed host must still be checked with your own provider configuration.

## 5. Existing Site and data

The earlier hosted Site remains separate and unchanged. Existing ChatGPT identities are not passwords and are not copied into Supabase. People must create independent TermTrove accounts and verify their emails. Never assign old purchases to a new account based only on a claimed email address.

For existing real data, privately export the old database and image objects, establish a verified old-user-ID → new-auth-user-UUID mapping, and import through an administrator-controlled migration. Do not commit database dumps or personal records to GitHub. The old SQLite migration is not applicable to the PostgreSQL schema. The local sample seed contains no real customer data.

## 6. Pending launch content

- The approved logo is implemented in `Brand` (`app/components.tsx`), using the original image at `public/brand/termtrove-logo.png`.
- The Privacy Policy and Terms of Service describe current marketplace practices. The owner must supply the legal operator identity, public contact details and retention periods before making specific commitments about them.
- Contact submissions are private records in `contact_messages`, available to the maintainer in Supabase administration. There is no email-forwarding service or admin UI.
- Payment is **on collection only**. No online payment, fee, commission or payout is configured.
- A custom domain is optional. No domain purchase is necessary to deploy to a provider-assigned URL.

## Alternative: Render’s free Node service

`render.yaml` is included for a standard Node host. The existing Render service is already deployed; do not import a duplicate Blueprint as part of this switch. Supply the Supabase URL and publishable key; never add a service-role key. The app uses Render’s automatic `RENDER_EXTERNAL_URL` as its origin unless you explicitly set `APP_ORIGIN`. Configure Supabase's Site URL and allowed email redirects for the active production domain.

Direct setup links: [Supabase project setup](https://supabase.com/dashboard/new) · [Deploy this repository on Render](https://render.com/deploy?repo=https://github.com/fynn151010-lab/Termtrove). These links open the providers’ setup forms; they do not buy a plan or deploy by themselves.

This option stores all durable records and images in Supabase, so Render’s ephemeral service disk does not hold marketplace data. Free services may sleep when idle and have usage limits; verify current account terms and stop if a paid upgrade or payment method is required. The `/api/health` check verifies that the configured marketplace database can be read; a missing connection or migration fails clearly. No Render service or account is created automatically.
