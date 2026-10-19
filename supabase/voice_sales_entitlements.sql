-- IT Xperts voice sales entitlement and manual monthly payment review.
-- Run this in the connected Supabase SQL Editor before deploying the manual payment flow.
-- Customers submit a bank transfer reference. IT Xperts verifies it and approves access manually.

create table if not exists public.voice_sales_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.voice_sales_entitlements
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.voice_sales_entitlements enable row level security;
revoke all on table public.voice_sales_entitlements from anon, authenticated;
grant select on table public.voice_sales_entitlements to authenticated;

drop policy if exists "Users can read their own voice sales entitlement" on public.voice_sales_entitlements;
create policy "Users can read their own voice sales entitlement"
  on public.voice_sales_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.voice_sales_payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ngn integer not null default 5000 check (amount_ngn = 5000),
  payment_reference text not null check (length(payment_reference) between 4 and 120 and payment_reference = btrim(payment_reference)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  expires_at timestamptz
);

create index if not exists voice_sales_payment_requests_user_submitted_idx
  on public.voice_sales_payment_requests (user_id, submitted_at desc);

create unique index if not exists voice_sales_payment_requests_one_pending_per_user_key
  on public.voice_sales_payment_requests (user_id)
  where status = 'pending';

create unique index if not exists voice_sales_payment_requests_reference_key
  on public.voice_sales_payment_requests (lower(btrim(payment_reference)));

alter table public.voice_sales_payment_requests enable row level security;
revoke all on table public.voice_sales_payment_requests from anon, authenticated;
grant select, insert on table public.voice_sales_payment_requests to authenticated;

drop policy if exists "Users can read their own voice sales payment requests" on public.voice_sales_payment_requests;
create policy "Users can read their own voice sales payment requests"
  on public.voice_sales_payment_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can submit their own voice sales payment requests" on public.voice_sales_payment_requests;
create policy "Users can submit their own voice sales payment requests"
  on public.voice_sales_payment_requests
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and amount_ngn = 5000
    and status = 'pending'
    and length(payment_reference) between 4 and 120
    and payment_reference = btrim(payment_reference)
  );

-- Run this from the Supabase SQL Editor only after checking the transfer in the business bank account.
-- Returns the new access expiry and changes the request from pending to approved.
create or replace function public.approve_voice_sales_payment_request(payment_request_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_request public.voice_sales_payment_requests%rowtype;
  new_expiry timestamptz;
begin
  select *
    into payment_request
    from public.voice_sales_payment_requests
    where id = payment_request_id
      and status = 'pending'
    for update;

  if not found then
    raise exception 'Pending voice sales payment request not found';
  end if;

  insert into public.voice_sales_entitlements as entitlement (user_id, enabled, expires_at, updated_at)
  values (payment_request.user_id, true, now() + interval '1 month', now())
  on conflict (user_id) do update
    set enabled = true,
        expires_at = greatest(coalesce(entitlement.expires_at, now()), now()) + interval '1 month',
        updated_at = now()
  returning entitlement.expires_at into new_expiry;

  update public.voice_sales_payment_requests
    set status = 'approved',
        reviewed_at = now(),
        expires_at = new_expiry
    where id = payment_request.id;

  return new_expiry;
end;
$$;

revoke all on function public.approve_voice_sales_payment_request(uuid) from public, anon, authenticated;

-- Review unprocessed references (run as the project owner in the SQL Editor):
-- select r.id, u.email, r.payment_reference, r.amount_ngn, r.submitted_at
-- from public.voice_sales_payment_requests r
-- join auth.users u on u.id = r.user_id
-- where r.status = 'pending'
-- order by r.submitted_at;
--
-- Approve only after confirming the transfer:
-- select public.approve_voice_sales_payment_request('REQUEST_UUID_HERE');
--
-- Reject after investigating an invalid or missing transfer:
-- update public.voice_sales_payment_requests
-- set status = 'rejected', reviewed_at = now()
-- where id = 'REQUEST_UUID_HERE' and status = 'pending';
