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

Voice sales is optional. Customers pay manually by bank transfer and submit the bank reference in the app. IT Xperts must check the transfer before approving access. Approval gives one month of voice sales; renewals are reviewed the same way. There is no automatic charge or automatic payment confirmation. The voice recording still creates a draft; the user reviews it and presses **Save sale** before it enters business records. Audio and product names and prices are sent to Groq through IT Xperts only after the user consents.

1. Run supabase/voice_sales_entitlements.sql in the connected Supabase SQL Editor. It adds a row-level secured payment-request table and an approval function. Signed-in users can submit and view only their own requests; they cannot approve themselves.
2. Add these public payment-display settings in Vercel for Production:
   - VOICE_SALES_BANK_NAME: the receiving bank name.
   - VOICE_SALES_ACCOUNT_NAME: the receiving account name.
   - VOICE_SALES_ACCOUNT_NUMBER: the 10-digit receiving account number.
   - VOICE_SALES_SUPPORT_CONTACT: optional contact details for payment questions.
   These details are shown to signed-in users in the payment screen. Do not put secret keys in these variables.
3. Keep the existing SUPABASE_URL, SUPABASE_ANON_KEY, and GROQ_API_KEY settings for account storage and voice processing. No payment-provider API key is used.
4. When a customer submits a transfer reference, check the bank account yourself. In the Supabase SQL Editor, list pending requests with the query at the bottom of supabase/voice_sales_entitlements.sql. After verifying a transfer, run select public.approve_voice_sales_payment_request('REQUEST_UUID_HERE'). This activates voice sales for one month, extending an existing paid period if the customer renews early. Reject an invalid reference by setting its request status to rejected.
5. Access expires automatically unless IT Xperts verifies and approves another monthly payment.


## Deploy

1. Run the required workspace storage SQL in the Supabase project connected to this site.
2. Deploy the repository through the connected Vercel Git project so both the site and serverless functions are available. No build command is required; the site entry is `index.html`.
3. If changing Supabase projects, update `config.js` and the Vercel server-side environment variables with that project's URL and publishable key. Do not put secret keys in client files.
4. Complete the pilot check above before inviting businesses to enter real records. Set up the paid voice feature separately using the instructions above.

Generated report summaries open in the signed-in owner's configured email app as a draft. The owner must review and send the draft manually. Download the CSV report and attach it if the full transaction list is needed.

