# IT Xperts Business Assistant — Netlify deployment

This is a static Netlify site. Supabase handles authentication, business profiles, and business workspace records. The browser uses only the Supabase publishable key in config.js. Never put a Supabase secret or service-role key in this repository or any browser file.

## Supabase setup

For a new Supabase project, run supabase/business_workspace_storage.sql in the SQL Editor, then supabase/restore_business_workspace.sql. The first script creates the workspace and recovery tables, enables row-level security, and restricts each signed-in account to its own records. The second updates the recovery-copy uniqueness rule and installs an owner-checked, atomic restore operation for online recovery copies and downloaded JSON backups.

For an existing project where the original storage script is already installed, run only supabase/restore_business_workspace.sql. The app shows up to 30 recent recovery copies; older copies are not automatically deleted.

## Launch status — 26 October 2026

Completed:

- The restore migration was applied to the connected Supabase project and authenticated restore was verified.
- On the dedicated fictional test account, recovery detection found copies containing records. Restoring a copy brought back 2 sales, 2 expenses, and 1 product; those records remained after reload.
- The restored sales and expenses show their saved dates, and monthly/yearly report totals include the restored records.
- The owner confirmed the final live-site check passed.

## Current hosting migration status

- Hosting migration PR #15 is merged. Netlify has published the main branch at commit 53cd02c, and its production deploy completed successfully.
- Privacy-disclosure PR #16 is merged as `b6289f9`. The notice describes Vercel as the current public host and Netlify as the preview and target production host; business records continue to go directly to Supabase.
- PR #16's description says the Netlify-specific wording had not been approved at merge. Record the privacy professional's confirmation that their review covers the exact current Netlify disclosure before the public-domain cutover.
- The public domain still points to Vercel. Netlify's domain manager reports **Pending External DNS verification** for the custom domain, and its custom-domain HTTPS certificate has not been issued.
- Supabase's Site URL remains https://www.itxperts.group. The allowed redirect list also includes https://itxperts.group/**, with the existing Vercel and Netlify preview URLs retained.

Still required before the full public launch:

- Netlify MFA and Google 2-Step Verification for the backup account were previously confirmed. The owner has now confirmed Supabase account MFA is enabled. Complete the Apps Script credential rotation and backup recovery test in the owner security handoff below. Keep Vercel account security covered until its production domain is detached.
- The owner reports that a qualified Nigerian data-protection professional reviewed the Privacy notice, Terms, data flows, cross-border storage, and retention. PR #16 merged a new Netlify hosting disclosure; its description records that the wording had not been approved at merge. Confirm that the professional has reviewed this exact wording and record the approval before DNS cutover.
- After review of the exact disclosure is recorded, switch only the website DNS records to Netlify, wait for DNS verification and HTTPS, then rerun authentication, records, exports, recovery, and backup checks on the public domain.
- The current retention instruction is to keep recovery copies until the retention policy is approved. Document and implement the final retention and deletion schedule before scaling beyond the pilot.

## Owner security handoff

These steps require the IT Xperts account owner. Do not send passwords, keys, or encryption passphrases in chat, email, GitHub issues, or code.

1. Protect administrator accounts. Netlify MFA and Google 2-Step Verification for the backup account are enabled. Enable MFA on Supabase; keep Vercel protected until its production domain is detached and the project is no longer used. Review who has access to each account.
2. Rotate the credential used by the Apps Script backup job safely:
   - Identify which Supabase credential the script currently uses without copying its value into this repository.
   - Prefer a dedicated, least-privilege credential or a restricted server-side backup endpoint. A service-role key bypasses row-level security; if the current script requires one, keep it only in Apps Script Properties and restrict access to script editors.
   - Configure the replacement credential in Apps Script Properties, run a backup, and verify that a new encrypted file appears in the private Drive folder.
   - Test that the encrypted file can be recovered using fictional data. Revoke the old credential only after the replacement backup and recovery check succeed.
3. Protect the backup key and files:
   - Keep the existing encryption passphrase in a password manager controlled by the owner. Do not change it until historical backups that must remain recoverable have been re-encrypted and verified.
   - Confirm the Google Drive backup folder is private and limited to people who need access. Do not share the folder publicly.
   - Verify that the daily 02:00 Africa/Lagos Apps Script trigger exists, its latest execution succeeded, and the file is encrypted before it reaches Drive.
4. Choose and document a retention and deletion schedule for Supabase recovery copies and Google Drive backups. The current Supabase setup does not automatically expire older copies, and account deletion does not automatically remove separate Drive files. Apply the chosen schedule only after the privacy professional confirms it.

## End-to-end pilot checks

Use a dedicated test account and fictional records only. Wait for All changes saved after every write.

- Confirm email sign-up, sign-in, sign-out, and password reset on the production domain.
- Create and reload a fictional business profile, product, sale, expense, and invoice; confirm the values remain under the same account.
- Check daily, monthly, yearly, and all-record report totals, plus downloaded Excel and JSON exports.
- Restore a Supabase recovery copy and a downloaded JSON backup. Confirm that the current records are preserved as a recovery copy before replacement. Include invoice customer names and contact details in the fictional test.
- Confirm the daily encrypted Drive backup and perform a recovery check with fictional data before inviting real businesses.

## Privacy and Terms review handoff

The owner reports that a qualified Nigerian data-protection professional reviewed the current Privacy notice, Terms, actual data flows, cross-border storage, and retention handling. This hosting migration introduces Netlify as a new provider for website delivery and technical request information. Before the production-domain cutover, ask that professional to review the updated host disclosure and confirm whether any other wording needs to change.

The review should resolve and document any outstanding or changed items:

- The exact legal identity and business address of the operator, plus a reliable privacy-request contact.
- IT Xperts’ roles for account data and support information, and the roles of each business customer and IT Xperts for customer details entered into invoices.
- The specific purpose and lawful basis for each processing activity; the Terms checkbox should not be treated as a blanket privacy consent.
- Each provider and recipient, the data each receives, and the applicable safeguards and lawful transfer mechanism for data stored or accessed outside Nigeria.
- Retention periods and deletion procedures for account data, customer records, logs, Supabase recovery copies, and Google Drive backups, including what happens after account closure.
- A workable route and response process for access, correction, objection, erasure and other rights requests, complaints, and security incidents.
- Whether IT Xperts has any registration, DPO, DPIA, or compliance-audit obligations under the NDP Act and GAID 2025 for its actual scale and processing.

Official references for the reviewer:

- Nigeria Data Protection Act 2023: https://ndpc.gov.ng/download/nigeria-data-protection-act-2023
- NDP Act General Application and Implementation Directive (GAID) 2025: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- NDPC FAQs: https://ndpc.gov.ng/faqs/

## Data handling

- Sales, expenses, products, invoices, and net-worth figures sync to one Supabase workspace row for the signed-in account.
- Database row-level security checks the account ID for workspace reads and writes. Recovery copies are readable by that account and are written by a database trigger.
- The app keeps a temporary browser copy while a change is waiting to sync or when a save fails. It removes the copy after the cloud save succeeds. Use a password-protected device and wait for the saved status before signing out or closing the page.
- Settings lets each signed-in owner download a formatted Excel workbook of their business records. It includes daily, monthly, yearly, and all-record totals, sales and expense ledgers, stock and services, invoices, and an estimated net-worth schedule. This is not an audited financial statement. A JSON backup is also available for restoring records.
- Recovery copies are created on initial save, once per day when records change, and before a restore. Up to 30 recent copies are shown in the app. Older copies remain in the database until an owner-defined retention policy is implemented.
- Business profiles remain in public.profiles; their existing row-level security policies are still required.

## Deploy

1. The existing production site remains on Vercel until the owner verifies the Netlify preview and approves the custom-domain DNS cutover.
2. Netlify deployment settings are in netlify.toml. Connect this GitHub repo, use main as the production branch, leave the build command blank, and use . as the publish directory. Follow HOSTING_MIGRATION.md for Supabase preview redirects, privacy review, DNS, and production checks.
3. Supabase remains the app's authentication and data service. If changing Supabase projects, update config.js with that project's URL and publishable key. Never put secret keys in client files.
4. The Netlify Free plan allows commercial projects but has a hard 300-credit monthly cap; sites pause when it is reached. Review current usage and plan limits before relying on Free for sustained public traffic.
5. Complete the owner security handoff, host-disclosure review, and Netlify end-to-end checks before inviting businesses to enter real records.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.
