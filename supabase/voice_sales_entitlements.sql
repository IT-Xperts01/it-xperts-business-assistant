-- IT Xperts paid voice sales entitlement
-- Apply this migration in the Supabase SQL editor for the IT Xperts project.
-- New accounts remain disabled until an administrator enables the paid feature.

create table if not exists public.voice_sales_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.voice_sales_entitlements enable row level security;

revoke all on table public.voice_sales_entitlements from anon, authenticated;
grant select on table public.voice_sales_entitlements to authenticated;

drop policy if exists "Users can read their own voice sales entitlement" on public.voice_sales_entitlements;
create policy "Users can read their own voice sales entitlement"
  on public.voice_sales_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

-- After payment, an administrator can enable an account from the Supabase SQL editor:
-- insert into public.voice_sales_entitlements (user_id, enabled)
-- values ('USER_UUID_HERE', true)
-- on conflict (user_id) do update
-- set enabled = excluded.enabled, updated_at = now();
