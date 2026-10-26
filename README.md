# IT Xperts Business Assistant — Netlify deployment

This is a static Netlify site. Supabase handles authentication, business profiles, and business workspace records. The browser uses only the Supabase publishable key in config.js. Never put a Supabase secret or service-role key in this repository or any browser file.

## Supabase setup

For a new Supabase project, run supabase/business_workspace_storage.sql in the SQL Editor, then supabase/restore_business_workspace.sql. The first script creates the workspace and recovery tables, enables row-level security, and restricts each signed-in account to its own records. The second updates the recovery-copy uniqueness rule and installs an owner-checked, atomic restore operation for online recovery copies and downloaded JSON backups.

For an existing project where the original storage script is already installed, run only supabase/restore_business_workspace.sql. The app shows up to 30 recent recovery copies. The owner selected a 90-day retention rule, but automatic expiry is not enabled and older copies remain.

## Launch status — 26 October 2026

Completed:

- The restore migration was applied to the connected Supabase project and authenticated restore was verified.
- On the dedicated fictional test account, recovery detection found copies containing records. Restoring a copy brought back 2 sales, 2 expenses, and 1 product; those records remained after reload.
- The restored sales and expenses show their saved dates, and monthly/yearly report totals include the restored records.
- The owner confirmed the final live-site check passed.

## Production hosting status — 26 October 2026

- PR #18 merged to main as commit fd08c151; PR #19 merged as commit 0e94afdd. Netlify publishes production from main.
- Netlify lists itxperts.group as the primary domain and www.itxperts.group as its redirect alias. The active Let’s Encrypt certificate covers both names.
- Public DNS currently resolves the apex to Netlify and the www name to the Netlify site. A clean request to the apex with a unique query string loaded the app during this check.
- The existing Codex browser profile still reports a redirect loop for the bare apex and www URLs. This is consistent with a cached redirect from the earlier www-primary setup; verify the bare canonical URL in a fresh browser profile before treating that client-side issue as closed.
- Netlify serves the static site from the repository root, and pretty URL processing is disabled in netlify.toml.
- The Supabase client uses location.origin for signup confirmation, resend, and password-reset callbacks. Confirm the current Supabase allowed-redirect list contains https://itxperts.group and any preview origins that should remain active.
- The live Privacy notice now identifies Netlify as production hosting and Vercel as a preview host. The corrected notice was visible on the production domain.
- The owner reports that the privacy professional reviewed the current notice, Terms, data flows, cross-border storage, and retention. Keep that approval record with the current notice.
- The owner reports MFA is enabled on Netlify, Google, and Supabase.

## Still required before declaring full public launch

- Complete and observe sign-in, signup confirmation, and password reset on the production domain with the dedicated fictional test account. The visible production test tab still showed the sign-in form at the end of this check.
- Rotate the Apps Script Supabase credential safely: configure a replacement in Apps Script Properties, verify an encrypted backup and fictional-data recovery, then revoke the previous credential.
- Decrypt and restore one encrypted Google Drive backup with fictional data. The daily trigger is running, but successful file creation alone does not verify recovery.
- Implement the selected 90-day retention rule for Supabase recovery copies and encrypted Drive files. Automatic expiry is not enabled, and no existing backups have been deleted. Get explicit approval before enabling deletion, then verify the cutoff and recovery behavior.
- Recheck the canonical root URL in a clean browser profile; the current Codex browser profile retains a redirect loop on bare URLs.

## Owner security handoff

These steps require the IT Xperts account owner. Do not send passwords, keys, or encryption passphrases in chat, email, GitHub issues, or code.

1. Protect administrator accounts. The owner reported that Netlify MFA, Google 2-Step Verification for the backup account, and Supabase MFA are enabled. Keep Vercel protected while its project remains accessible and review who has access to each account.
2. Rotate the credential used by the Apps Script backup job safely:
   - Identify which Supabase credential the script currently uses without copying its value into this repository.
   - Prefer a dedicated, least-privilege credential or a restricted server-side backup endpoint. A service-role key bypasses row-level security; if the current script requires one, keep it only in Apps Script Properties and restrict access to script editors.
   - Configure the replacement credential in Apps Script Properties, run a backup, and verify that a new encrypted file appears in the private Drive folder.
   - Test that the encrypted file can be recovered using fictional data. Revoke the old credential only after the replacement backup and recovery check succeed.
3. Protect the backup key and files:
   - Keep the existing encryption passphrase in a password manager controlled by the owner. Do not change it until historical backups that must remain recoverable have been re-encrypted and verified.
   - Confirm the Google Drive backup folder is private and limited to people who need access. Do not share the folder publicly.
   - The daily time-based trigger is set for 02:00–03:00 Africa/Lagos (GMT+01:00). The six scheduled runs from 21–26 October 2026 completed; the latest run logged an encrypted backup file, which was found in the private Drive backup folder. A decrypt-and-restore test is still required.
4. Retention: the owner selected a 90-day period for Supabase recovery copies and encrypted Google Drive backups. Automatic expiry is not enabled. Existing copies remain in place until the owner explicitly approves enabling deletion after reviewing the implementation and the affected-copy count.

## End-to-end pilot checks

Use a dedicated test account and fictional records only. Wait for All changes saved after every write.

- Confirm email sign-up, sign-in, sign-out, and password reset on the production domain.
- Create and reload a fictional business profile, product, sale, expense, and invoice; confirm the values remain under the same account.
- Check daily, monthly, yearly, and all-record report totals, plus downloaded Excel and JSON exports.
- Restore a Supabase recovery copy and a downloaded JSON backup. Confirm that the current records are preserved as a recovery copy before replacement. Include invoice customer names and contact details in the fictional test.
- Confirm the daily encrypted Drive backup and perform a recovery check with fictional data before inviting real businesses.

## Privacy and Terms review handoff

The owner reports that a qualified Nigerian data-protection professional reviewed the Privacy notice, Terms, actual data flows, cross-border storage, and retention handling. Netlify now serves the production website and receives technical request information; the corrected notice identifies Netlify as the production host and Vercel as a preview host. Keep the professional’s approval record aligned with this current wording.

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

1. Netlify is the current production host. Commits to the `main` branch publish automatically.
2. Netlify deployment settings are in netlify.toml. Connect this GitHub repo, use main as the production branch, leave the build command blank, and use . as the publish directory. Follow HOSTING_MIGRATION.md for Supabase preview redirects, privacy review, DNS, and production checks.
3. Supabase remains the app's authentication and data service. If changing Supabase projects, update config.js with that project's URL and publishable key. Never put secret keys in client files.
4. Review current Netlify plan terms, usage, and service limits before relying on the free plan for sustained public traffic.
5. Complete the outstanding production auth, credential-rotation, encrypted-backup recovery, and retention-policy checks before declaring the full public launch ready.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.
