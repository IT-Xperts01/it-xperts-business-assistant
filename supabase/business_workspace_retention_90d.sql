-- IT Xperts recovery-copy retention (90 days)
-- Safe preparation only: this migration does not delete backups or create a cron job.
-- The policy is disabled by default and remains disabled until the owner explicitly approves activation.

begin;

create table if not exists public.business_workspace_retention_policy (
  policy_name text primary key
    check (policy_name = 'recovery-copies'),
  retention_days smallint not null default 90
    check (retention_days = 90),
  enabled boolean not null default false,
  updated_at timestamptz not null default pg_catalog.now()
);

insert into public.business_workspace_retention_policy (
  policy_name,
  retention_days,
  enabled
)
values ('recovery-copies', 90, false)
on conflict (policy_name) do nothing;

alter table public.business_workspace_retention_policy
  enable row level security;

revoke all on table public.business_workspace_retention_policy
  from public, anon, authenticated, service_role;

create or replace function public.purge_expired_business_workspace_backups()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  policy_is_enabled boolean := false;
  expired_count bigint := 0;
begin
  select policy.enabled
    into policy_is_enabled
  from public.business_workspace_retention_policy as policy
  where policy.policy_name = 'recovery-copies';

  if not coalesce(policy_is_enabled, false) then
    return 0;
  end if;

  delete from public.business_workspace_backups as backup
  where backup.created_at < pg_catalog.now() - interval '90 days';

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$function$;

revoke all on function public.purge_expired_business_workspace_backups()
  from public, anon, authenticated, service_role;

comment on function public.purge_expired_business_workspace_backups() is
  'Deletes only recovery copies older than 90 days, and only after the owner enables the recovery-copies policy. Does not delete workspace records.';

commit;
