# IT Xperts Business Assistant — Vercel deployment

The site uses a static browser app and Vercel Node serverless functions for features that need a protected API key. Supabase handles authentication, business profiles, and workspace records. The browser uses only the Supabase publishable key in `config.js`; never add an OpenAI key, Supabase secret, or service-role key to website files.

## Required Supabase setup

Before using this version, open the Supabase project connected to Vercel and run `supabase/business_workspace_storage.sql` in the Supabase SQL Editor. It creates the workspace and recovery tables, enables row-level security, and limits each signed-in account to its own business records. It keeps one recovery copy per UTC day with changes and saves the current version before a restore. The app shows up to 30 recent recovery copies per workspace; older copies are not automatically deleted.

The app will not open the business workspace if it cannot load and confirm recovery storage. After the SQL setup, deploy through the connected Vercel Git project. Paid voice sales also requires its separate SQL and environment setup below. Sign in, wait for the status to say **Saved to your account**, and make one test change; the status should then say **All changes saved**. The first saved workspace gets an initial recovery copy. Use fictional records until you have completed this pilot check.

## Data handling

- Sales, expenses, products, invoices, and net-worth figures sync to one Supabase workspace row for the signed-in account.
- Database row-level security checks the account ID for every workspace read or write. Recovery copies are readable by that account and are written by a database trigger.
- The app keeps a temporary browser copy while a change is waiting to sync or when a save fails. It removes the copy after the cloud save succeeds. Use a password-protected device, and wait for the saved status before signing out or closing the page.
- Settings can download a JSON backup, restore a downloaded backup, or choose an online recovery copy to restore. Keep a separate downloaded backup for important records.
- A recovery copy is created when the workspace is first saved and once per day when its records change. Before a restore, the app also saves the current version. The app lists up to 30 recent recovery copies; the database keeps older copies until an owner chooses a retention policy.
- Business profiles remain in `public.profiles`; their existing row-level security policies are still required.

## Paid voice sales

Voice sales is optional and disabled for every account until IT Xperts enables it after payment. Each recording prepares a draft for the existing sale form; the user must review and press **Save sale** before it is added to business records. The browser asks for consent before recording and tells the user that the audio and product names and prices are sent to OpenAI through IT Xperts for processing.

1. Run `supabase/voice_sales_entitlements.sql` in the Supabase SQL Editor. It creates a row-level secured entitlement table. Users can read their own entitlement; only an administrator can enable accounts.
2. In the Vercel project, add server-side environment variables `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. Use the OpenAI API key and the connected Supabase project URL and publishable/anon key. Set the variables for Production and Preview as needed. Never use the Supabase service-role key.
3. Deploy this repository through its Vercel Git connection so Vercel publishes the `api/voice-sale.js` function alongside the website. A static ZIP upload does not provide this API route.
4. After payment, an administrator can enable the specific Supabase Auth user by following the SQL comment at the bottom of `supabase/voice_sales_entitlements.sql`.

The API verifies the signed-in user and paid entitlement on every request. It does not write audio or transcripts to the business workspace. OpenAI API usage is billed to the account that owns the API key.

## Deploy

1. Run the required workspace storage SQL in the Supabase project connected to this site.
2. Deploy the repository through the connected Vercel Git project so both the site and serverless functions are available. No build command is required; the site entry is `index.html`.
3. If changing Supabase projects, update `config.js` and the Vercel server-side environment variables with that project's URL and publishable key. Do not put secret keys in client files.
4. Complete the pilot check above before inviting businesses to enter real records. Set up the paid voice feature separately using the instructions above.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.

