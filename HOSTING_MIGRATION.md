# Netlify hosting migration

**Status:** Prepared for preview only. The live domain remains on Vercel until the owner approves the DNS cutover.

## What moves

Only the static website moves to Netlify. Authentication, profiles, business records, recovery copies, and the existing database stay in the current Supabase project. This migration needs no database migration, new secret, or change to the public Supabase URL/key in `config.js`.

The app is a static HTML site. `netlify.toml` sets the repository root as the publish folder, enables clean HTML URLs, and carries over the current security response headers.

## 1. Create a Netlify preview

1. Sign in to Netlify and choose **Add new project** → **Import an existing project**.
2. Connect GitHub and select `IT-Xperts01/it-xperts-business-assistant`.
3. Use `main` as the production branch. Keep the base directory and build command blank; the publish directory is `.` in `netlify.toml`.
4. Deploy and open the generated `<project-name>.netlify.app` address. Do not add the production domain yet.
5. Confirm the home page, sign-up/sign-in screens, `/privacy`, and `/terms` load. Check that the deployed responses include the four headers in `netlify.toml`.

Netlify's Free plan allows commercial projects, but its current hard limit is 300 monthly credits. If credits run out, projects pause until the next cycle. Review usage and choose a suitable paid tier before relying on Free for sustained public traffic. No billing plan is selected or purchased by this migration.

## 2. Test Supabase authentication on the preview

The app sends email confirmation and password reset links to the exact origin currently open in the browser.

1. In Supabase **Authentication → URL Configuration**, keep the existing production Site URL `https://www.itxperts.group`.
2. Add the exact Netlify preview origin to **Redirect URLs**, for example `https://<project-name>.netlify.app/**`. Do not replace the existing production entry.
3. Using only the dedicated test account and fictional business data, check sign-up, confirmation, sign-in, sign-out, password reset, and session persistence.
4. After preview testing, remove the temporary preview redirect if it is no longer needed. Keep `https://www.itxperts.group` as the production Site URL and allowed redirect.

Do not copy user passwords or Supabase secrets into GitHub or chat.

## 3. Review the hosting disclosure

The current Privacy notice names Vercel as the website host. Before production cutover, update it to name Netlify and link to [Netlify's Privacy Statement](https://www.netlify.com/privacy/). Have the privacy professional confirm the revised disclosure and whether any cross-border-transfer or retention wording changes are needed. Netlify can receive technical details such as visitor IP address and browser/device information; business records continue to go directly from the app to Supabase under the current design.

## 4. Move the custom domain

Only after preview checks and the privacy update are approved:

1. In Netlify, add both `www.itxperts.group` and `itxperts.group` under the site's domain settings. Keep `www.itxperts.group` as the primary address so the existing Supabase Site URL remains valid.
2. Save the current DNS records and TTL values before making changes. Follow the exact DNS targets Netlify displays for these two hostnames; do not use guessed values.
3. At the domain's DNS provider, change only the web records Netlify specifies. Leave all mail records (MX, SPF, DKIM, DMARC, and other email TXT records) untouched.
4. Wait for Netlify to verify the domain and issue HTTPS certificates. Check that both the apex and `www` address resolve, with the apex redirecting to the primary `www` address.
5. Keep the Vercel project intact while validating Netlify. After the owner confirms the custom-domain app works, remove the production domain from Vercel and stop using the Hobby project for the commercial app.

If a Netlify deploy has a problem, roll back to the last known-good Netlify deploy and keep DNS aimed at Netlify. Do not use a Vercel Hobby deployment as the commercial production rollback.

## 5. Recheck production

Use the dedicated fictional test account first. Check email confirmation/reset, sign-in and sign-out, creating and reloading a business profile/product/sale/expense/invoice, reports, downloads, recovery restore, and the next scheduled encrypted backup. Confirm Supabase still holds the same records after the hostname move.

The owner must complete account MFA and the backup-credential rotation/recovery check listed in the main README before calling the app ready for full public launch.
