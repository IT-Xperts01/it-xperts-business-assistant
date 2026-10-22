# IT Xperts Business Assistant — Vercel deployment

This is a static Vercel site. Supabase handles authentication, business profiles, and the business workspace records. The browser uses only the Supabase publishable key in `config.js`; never add a Supabase secret or service-role key to this folder.

## Required Supabase setup

For a new Supabase project, run `supabase/business_workspace_storage.sql` in the SQL Editor, then run `supabase/restore_business_workspace.sql`. The first script creates the workspace and recovery tables, enables row-level security, and restricts each signed-in account to its own records. The second updates the recovery-copy uniqueness rule and installs an owner-checked, atomic restore operation for online recovery copies and downloaded JSON backups. For an existing project where the original storage script is already installed, run only `supabase/restore_business_workspace.sql`. The app shows up to 30 recent recovery copies; older copies are not automatically deleted.

The app will not open the business workspace if it cannot load and confirm recovery storage. With a dedicated test account and fictional records, confirm email sign-up, sign-in, saving, online restore, downloaded-backup restore (including invoice customer names and contact details), sign-out, and password reset. Wait for **All changes saved** after each write. Do not invite businesses to enter real records until this pilot is complete and the account-security and privacy handoff has been reviewed.

## Go-live checklist

- Rotate the Supabase secret used by the backup script and replace it in Apps Script Properties. Confirm a new backup succeeds, then revoke the old key. Keep all secret values out of this repository and chat.
- Preserve the existing backup encryption passphrase or re-encrypt historical backups that must remain recoverable before changing it.
- Turn on two-factor authentication for the Vercel account.
- Have a Nigerian privacy professional review the Privacy notice and Terms of use before businesses enter real customer data.
- Apply the restore migration and complete the fictional-record pilot above before inviting businesses.

## Data handling

- Sales, expenses, products, invoices, and net-worth figures sync to one Supabase workspace row for the signed-in account.
- Database row-level security checks the account ID for every workspace read or write. Recovery copies are readable by that account and are written by a database trigger.
- The app keeps a temporary browser copy while a change is waiting to sync or when a save fails. It removes the copy after the cloud save succeeds. Use a password-protected device, and wait for the saved status before signing out or closing the page.
- Settings lets each signed-in owner download a formatted Excel workbook of their own business records. It contains a performance overview with daily, monthly, yearly, and all-record totals, plus separate sales and expense ledgers, stock and services, invoices, and an estimated net-worth schedule. The automated summary is not an audited financial statement. A JSON backup remains available for restoring records, alongside online recovery copies.
- A recovery copy is created when the workspace is first saved and once per day when its records change. Before a restore, the app also saves the current version. The app lists up to 30 recent recovery copies; the database keeps older copies until an owner chooses a retention policy.
- Business profiles remain in `public.profiles`; their existing row-level security policies are still required.

## Deploy

1. Install the Supabase setup or update above in the project connected to this site.
2. The connected Vercel project deploys commits pushed to `main`; other branches create preview deployments. No build command is required; the site entry is `index.html`.
3. If changing Supabase projects, update `config.js` with that project's URL and publishable key. Do not put secret keys in client files.
4. Complete the pilot check above before inviting businesses to enter real records.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.

