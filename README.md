# IT Xperts Business Assistant — Vercel deployment

The site uses a static browser app and Vercel Node serverless functions for features that need a protected API key. Supabase handles authentication, business profiles, and workspace records. The browser uses only the Supabase publishable key in `config.js`; never add a Groq API key, OpenAI API key, Supabase secret, or service-role key to website files.

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

## Paid voice sales — ₦5,000/month

Voice sales is optional and disabled until Paystack confirms the user's first successful payment. Each recording prepares a draft for the sale form; the user must review and press **Save sale** before it enters business records. The browser asks for consent before sending audio and product names and prices to Groq through IT Xperts.

1. Create a Paystack plan named **IT Xperts Voice Sales** with amount **₦5,000 NGN**, interval **monthly**, and unlimited billing cycles. Use the live plan for production and a separate test plan for preview testing. Paystack recurring subscriptions use card and Nigerian direct debit authorizations.
2. Run \`supabase/voice_sales_entitlements.sql\` in the connected Supabase SQL Editor. It safely adds expiry and Paystack subscription fields to the existing entitlement table while keeping row-level security in place. Run this before deploying the code.
3. Add these server-side variables in the Vercel project. Keep them out of \`config.js\` and chat:
   - \`PAYSTACK_SECRET_KEY\`: the Paystack secret key for the selected mode.
   - \`PAYSTACK_VOICE_PLAN_CODE\`: the plan code for the ₦5,000 monthly plan.
   - \`PAYSTACK_EXPECTED_DOMAIN\`: \`live\` for production or \`test\` for preview.
   - \`ITX_SITE_URL\`: the HTTPS site address users open, such as \`https://www.itxperts.group\`.
   - \`SUPABASE_SERVICE_ROLE_KEY\`: the connected Supabase service-role key; Vercel server functions use it to write payment entitlements. Never expose this key in browser files.
   - Keep the existing \`GROQ_API_KEY\`, \`SUPABASE_URL\`, and \`SUPABASE_ANON_KEY\` settings for voice processing.
4. Deploy the Git-connected project so Vercel publishes the API routes. In the Paystack dashboard, set the webhook URL to \`https://www.itxperts.group/api/voice-payment\`. Paystack signs each webhook with HMAC SHA-512; the server validates the signature before updating records.
5. Verify a test payment in Paystack test mode, then switch the Vercel Production environment to the live secret key and live plan code. A verified checkout return enables access immediately; signed \`charge.success\` webhooks extend access after renewals. \`subscription.disable\` webhooks turn access off. The app gives a 3-day payment grace period after each scheduled renewal date.
6. Users can select **Manage plan** in Sales to update payment details or cancel through Paystack. The app retains access through the paid period and grace period.

The server checks the signed-in user and a current entitlement on every voice request. It does not write audio or transcripts to business records. A failed or unverified payment does not enable voice sales.
## Deploy

1. Run the required workspace storage SQL in the Supabase project connected to this site.
2. Deploy the repository through the connected Vercel Git project so both the site and serverless functions are available. No build command is required; the site entry is `index.html`.
3. If changing Supabase projects, update `config.js` and the Vercel server-side environment variables with that project's URL and publishable key. Do not put secret keys in client files.
4. Complete the pilot check above before inviting businesses to enter real records. Set up the paid voice feature separately using the instructions above.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.

