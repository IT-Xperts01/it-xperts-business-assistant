# IT Xperts Business Assistant — Vercel deployment

This is a static Vercel site. Supabase handles authentication, business profiles, and the business workspace records. The browser uses only the Supabase publishable key in `config.js`; never add a Supabase secret or service-role key to this folder.

## Required Supabase setup

Before using this version, open the Supabase project connected to Vercel and run `supabase/business_workspace_storage.sql` in the Supabase SQL Editor. It creates the workspace and recovery tables, enables row-level security, and limits each signed-in account to its own business records. It keeps one recovery copy per UTC day with changes and saves the current version before a restore. The app shows up to 30 recent recovery copies per workspace; older copies are not automatically deleted.

The app will not open the business workspace if it cannot load and confirm recovery storage. After the SQL setup, deploy the clean ZIP to Vercel. Sign in, wait for the status to say **Saved to your account**, and make one test change; the status should then say **All changes saved**. The first saved workspace gets an initial recovery copy. Use fictional records until you have completed this pilot check.

## Data handling

- Sales, expenses, products, invoices, and net-worth figures sync to one Supabase workspace row for the signed-in account.
- Database row-level security checks the account ID for every workspace read or write. Recovery copies are readable by that account and are written by a database trigger.
- The app keeps a temporary browser copy while a change is waiting to sync or when a save fails. It removes the copy after the cloud save succeeds. Use a password-protected device, and wait for the saved status before signing out or closing the page.
- Settings can download a JSON backup, restore a downloaded backup, or choose an online recovery copy to restore. Keep a separate downloaded backup for important records.
- A recovery copy is created when the workspace is first saved and once per day when its records change. Before a restore, the app also saves the current version. The app lists up to 30 recent recovery copies; the database keeps older copies until an owner chooses a retention policy.
- Business profiles remain in `public.profiles`; their existing row-level security policies are still required.

## Deploy

1. Run the SQL setup above in the Supabase project connected to this site.
2. Deploy the provided clean ZIP as a static site to Vercel. It contains the website files and SQL setup, and excludes local Vercel authentication files. No build command is required; the site entry is `index.html`.
3. If changing Supabase projects, update `config.js` with that project's URL and publishable key. Do not put secret keys in client files.
4. Complete the pilot check above before inviting businesses to enter real records.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.

