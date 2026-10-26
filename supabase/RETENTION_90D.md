# IT Xperts recovery-copy retention: 90-day policy

## Current behavior

The migration in `business_workspace_retention_90d.sql` is safe to install as preparation:

- It adds a locked-down policy row with a 90-day period and `enabled = false`.
- It adds a database function that returns without deleting anything while the policy is disabled.
- It does not create a scheduled job.
- It deletes only rows from `public.business_workspace_backups` when enabled. It never deletes current workspace records.

As of the 26 October 2026 inventory, the test workspace had 23 Supabase recovery copies and none older than 90 days. The private Google Drive backup folder had seven encrypted files dated 20–26 October 2026 and none older than 90 days. No files or rows were deleted.

## Review the current Supabase impact

After installing the migration, run this read-only query in the Supabase SQL Editor immediately before considering activation:

```sql
select
  count(*) as expired_copy_count,
  count(distinct user_id) as affected_account_count,
  min(created_at) as oldest_expired_copy
from public.business_workspace_backups
where created_at < now() - interval '90 days';
```

The query returns aggregate counts only. Do not enable cleanup until the owner has reviewed the current Supabase count and a matching dry-run count for the exact private Drive backup folder. The Drive cleanup implementation is not included in this migration and must be reviewed separately.

## Optional activation, only after explicit owner approval

No automatic deletion should be active until both storage locations have a reviewed implementation and the owner has approved the affected-copy counts.

If and when approval is recorded:

1. Enable the `pg_cron` extension in Supabase Integrations > Cron if it is not already enabled.
2. Run the schedule below once in the Supabase SQL Editor. It creates one daily job at 01:15 UTC (02:15 Lagos time). The migration's policy switch stays off until separately enabled.

```sql
select cron.schedule(
  'itxperts-recovery-copy-90d',
  '15 1 * * *',
  'select public.purge_expired_business_workspace_backups();'
);
```

3. Only after the approved impact review, enable the policy:

```sql
update public.business_workspace_retention_policy
set enabled = true, updated_at = now()
where policy_name = 'recovery-copies';
```

4. Verify the schedule and monitor job-run results:

```sql
select jobname, schedule, active, command
from cron.job
where jobname = 'itxperts-recovery-copy-90d';
```

The function reports the number of deleted recovery copies to the cron run result. It keeps the newest 90 days of recovery copies. Account workspaces are retained.

To pause deletion, set the policy to disabled and unschedule the job. A job run that occurs after the policy is disabled returns zero and does not delete anything:

```sql
update public.business_workspace_retention_policy
set enabled = false, updated_at = now()
where policy_name = 'recovery-copies';

select cron.unschedule(jobid)
from cron.job
where jobname = 'itxperts-recovery-copy-90d';
```

## Remaining launch work outside this migration

- Implement and dry-run the same 90-day rule for encrypted Drive backups; do not delete Drive files until the exact folder and affected count have been reviewed and approved.
- Decrypt and restore one encrypted Drive backup with fictional data.
- Rotate and verify the backup script's Supabase credential, then revoke the old credential only after recovery succeeds.
- Complete production signup confirmation/resend and password-reset checks.
- Choose an availability plan for Supabase. The production project is currently on Free; Supabase says Free projects can pause after a week of inactivity. See the official [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
