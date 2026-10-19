-- IT Xperts monthly voice sales subscription entitlement.
-- Run this in the Supabase SQL Editor before deploying the payment integration.
-- RLS lets each signed-in user read their own entitlement. Payment writes use the
-- server-only Supabase service role key in Vercel; never put that key in browser code.

create table if not exists public.voice_sales_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  expires_at timestamptz,
  paystack_subscription_code text,
  paystack_customer_code text,
  paystack_last_reference text,
  paystack_last_paid_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Upgrade existing installations that already have the original enabled flag table.
alter table public.voice_sales_entitlements
  add column if not exists expires_at timestamptz,
  add column if not exists paystack_subscription_code text,
  add column if not exists paystack_customer_code text,
  add column if not exists paystack_last_reference text,
  add column if not exists paystack_last_paid_at timestamptz;

create unique index if not exists voice_sales_entitlements_paystack_subscription_code_key
  on public.voice_sales_entitlements (paystack_subscription_code)
  where paystack_subscription_code is not null;

alter table public.voice_sales_entitlements enable row level security;

revoke all on table public.voice_sales_entitlements from anon, authenticated;
grant select on table public.voice_sales_entitlements to authenticated;

drop policy if exists "Users can read their own voice sales entitlement" on public.voice_sales_entitlements;
create policy "Users can read their own voice sales entitlement"
  on public.voice_sales_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);
