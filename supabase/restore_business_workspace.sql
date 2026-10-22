-- Install this after the original business_workspace_storage.sql setup.
-- It enables safe restores from an online recovery copy or a downloaded JSON
-- file, while preserving the current online data before replacement.

-- This older helper only made a snapshot and could be called repeatedly to
-- create excess copies. The new atomic restore function handles both steps.
revoke execute on function public.save_business_workspace_before_restore()
  from public, anon, authenticated;

-- Align older storage installations with the per-day, per-reason snapshots
-- used by the restore function. The previous one-per-day constraint was stricter.
alter table public.business_workspace_backups
  drop constraint if exists business_workspace_backups_one_daily_copy_per_day;
alter table public.business_workspace_backups
  drop constraint if exists business_workspace_backups_one_copy_per_day_and_reason;
alter table public.business_workspace_backups
  add constraint business_workspace_backups_one_copy_per_day_and_reason
  unique (user_id, snapshot_date, reason);


create or replace function public.restore_business_workspace(
  p_backup_id bigint default null,
  p_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_data jsonb;
  current_data jsonb;
begin
  if owner_id is null then
    raise exception 'Sign-in is required.';
  end if;

  if (p_backup_id is null) = (p_data is null) then
    raise exception 'Choose one recovery copy to restore.';
  end if;

  if p_backup_id is not null then
    select b.data into saved_data
    from public.business_workspace_backups as b
    where b.id = p_backup_id and b.user_id = owner_id;

    if not found then
      raise exception 'That recovery copy could not be found.';
    end if;
  else
    saved_data := p_data;
  end if;

  if jsonb_typeof(saved_data) is distinct from 'object'
    or pg_catalog.octet_length(saved_data::text) > 1048576
    or jsonb_typeof(saved_data->'sales') is distinct from 'array'
    or jsonb_typeof(saved_data->'expenses') is distinct from 'array'
    or jsonb_typeof(saved_data->'items') is distinct from 'array'
    or (saved_data ? 'invoices' and jsonb_typeof(saved_data->'invoices') is distinct from 'array') then
    raise exception 'The recovery copy has an invalid format.';
  end if;

  select w.data into current_data
  from public.business_workspaces as w
  where w.user_id = owner_id
  for update;

  if current_data is not null then
    insert into public.business_workspace_backups (user_id, data, snapshot_date, reason)
    values (owner_id, current_data, null, 'before-restore');
  end if;

  -- A controlled delete+insert uses the existing insert snapshot trigger while
  -- keeping the normal update trigger's lost-record protection in place.
  delete from public.business_workspaces where user_id = owner_id;

  insert into public.business_workspaces (user_id, data, updated_at)
  values (owner_id, saved_data, pg_catalog.now());
end;
$$;

revoke execute on function public.restore_business_workspace(bigint, jsonb)
  from public, anon;
grant execute on function public.restore_business_workspace(bigint, jsonb)
  to authenticated;
