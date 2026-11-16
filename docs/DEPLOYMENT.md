# Deploy TermTrove independently

The repository is source hosting. Vercel (or another Node host) serves the app; Supabase provides PostgreSQL, password authentication and private photo storage. Neither the browser nor the server requires ChatGPT, an OpenAI account, an OpenAI API key, Sites, or Cloudflare bindings.

No hosted Supabase project or Vercel account is created by the source code. The maintainer must own those accounts and supply the settings below. Do not purchase upgrades to follow these steps. Review the providers’ current free-plan eligibility and quotas in your account. If a feature requires a paid upgrade, stop rather than entering payment information.

## 1. Supabase project (your account)

1. Sign in at https://supabase.com/dashboard and create a **Free** project in a suitable region. Choose and store the database password yourself; do not paste it into chat or source control.
2. Open the SQL Editor. Run every file in `supabase/migrations/` once, in filename order, in the intended project. The first creates tables, indexes, signup profile trigger, row-level security rules, transactional marketplace functions, and the private `book-images` bucket. The follow-up hardens hosted API-role grants and separates public seller names from private profiles. Alternatively use the Supabase CLI’s `link` and `db push` commands after authenticating yourself. Inspect existing tables and triggers first if reusing a project; do not delete unrelated data to make a migration fit.
3. Under Authentication → Providers, enable Email/Password and email confirmations. Set minimum password length to at least 12. Keep rate limits enabled. Do not enable anonymous sign-ins.
4. Under Project Settings → API, copy the project URL and **publishable** key (or legacy **anon** key). These are the only Supabase credentials used by the application. **Do not use a service-role/secret key**: doing so would bypass database authorization.
5. Configure a production SMTP sender in Authentication → Email/SMTP for sign-up and recovery messages. Supabase’s built-in email sender is intended for development and restricts delivery/rate, so it is insufficient for arbitrary public users. Choose an existing/free compatible sender and verify a sending address/domain you control; do not buy one without explicit permission. Keep SMTP credentials only in Supabase settings.

Do not load sample data in production unless deliberately requested. `supabase/seed.sql` is optional local sample content and cannot be purchased.

## 2. Vercel project (your account)

1. Sign in to https://vercel.com and import `fynn151010-lab/Termtrove` from GitHub. Grant access only to the intended repository.
2. Select an available free plan only if your use is eligible for its terms. Vercel’s Hobby plan is intended for personal/non-commercial use; confirm eligibility for your marketplace rather than assuming every marketplace qualifies. Stop if the dashboard requires a paid plan. The application also supports any Node 22 host via `npm run build` then `npm start`, but Supabase remains required.
3. Vercel should detect Vite. Root directory: repository root. Build: `npm run build`. Output: `dist/client`. Node: 22+. `vercel.json` already maps `/api/*` to the server function and other application routes to the frontend.
4. Add **server-side** environment variables to Production (and separately to Preview if used):

| Variable                   | Value                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| `SUPABASE_URL`             | Your Supabase project URL                                          |
| `SUPABASE_PUBLISHABLE_KEY` | Your publishable or legacy anon key                                |
| `APP_ORIGIN`               | Your exact `https://…vercel.app` production origin, without a path |

Do not prefix these with `VITE_`: the browser communicates only with same-origin API routes. No Supabase credentials or session tokens are bundled into the frontend. `APP_ORIGIN` is used for CSRF checks and confirmation/recovery links, not inferred from untrusted request headers.

5. If Vercel has not assigned the production URL yet, create the project, note its assigned production domain, then set `APP_ORIGIN` and redeploy. The homepage can render while configuration is incomplete, but the backend will return a clear 503 setup error; do not announce a working marketplace before configuration and checks pass.
6. Keep production access public. Vercel preview deployments may have deployment protection; do not confuse a protected preview URL with the public production URL.

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

The automated integration suite runs the same core actions against real **local** Supabase services and Mailpit, not mock authentication. Production email delivery and the deployed Vercel environment must still be checked with your own provider configuration.

## 5. Existing Site and data

The earlier hosted Site remains separate and unchanged. Existing ChatGPT identities are not passwords and are not copied into Supabase. People must create independent TermTrove accounts and verify their emails. Never assign old purchases to a new account based only on a claimed email address.

For existing real data, privately export the old database and image objects, establish a verified old-user-ID → new-auth-user-UUID mapping, and import through an administrator-controlled migration. Do not commit database dumps or personal records to GitHub. The old SQLite migration is not applicable to the PostgreSQL schema. The local sample seed contains no real customer data.

## 6. Pending launch content

- The approved logo is implemented in `Brand` (`app/components.tsx`), using the original image at `public/brand/termtrove-logo.png`.
- Terms, Privacy Policy, legal operator/contact details and retention policy still need approved wording. Their placeholders are preserved.
- Contact submissions are private records in `contact_messages`, available to the maintainer in Supabase administration. There is no email-forwarding service or admin UI.
- Payment is **on collection only**. No online payment, fee, commission or payout is configured.
- A custom domain is optional. No domain purchase is necessary to deploy to a provider-assigned URL.

## Alternative: Render’s free Node service

`render.yaml` is included for a standard Node host if Vercel’s free plan does not fit your use. In your own Render account, import the repository as a Blueprint and keep **Free** selected. Supply the Supabase URL and publishable key; never add a service-role key. The app uses Render’s automatic `RENDER_EXTERNAL_URL` as its origin unless you explicitly set `APP_ORIGIN`. Configure Supabase’s Site URL and allowed email redirects for that exact public domain.

Direct setup links: [Supabase project setup](https://supabase.com/dashboard/new) · [Deploy this repository on Render](https://render.com/deploy?repo=https://github.com/fynn151010-lab/Termtrove). These links open the providers’ setup forms; they do not buy a plan or deploy by themselves.

This option stores all durable records and images in Supabase, so Render’s ephemeral service disk does not hold marketplace data. Free services may sleep when idle and have usage limits; verify current account terms and stop if a paid upgrade or payment method is required. The `/api/health` check verifies that the configured marketplace database can be read; a missing connection or migration fails clearly. No Render service or account is created automatically.
