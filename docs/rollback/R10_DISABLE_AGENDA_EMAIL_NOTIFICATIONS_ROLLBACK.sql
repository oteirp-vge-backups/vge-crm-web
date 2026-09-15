-- R10 rollback: restore the two hourly agenda email jobs.
-- Run only after an explicit decision to resume reminder emails.

do $rollback$
declare
  v_job record;
begin
  for v_job in
    select j.jobid
    from cron.job j
    where j.jobname in (
      'vge_queue_overdue_agenda',
      'vge-agenda-email-worker-hourly'
    )
  loop
    perform cron.alter_job(
      job_id := v_job.jobid,
      active := true
    );
  end loop;
end;
$rollback$;

-- Expected result: two rows, both active=true. Schedules remain unchanged.
select jobid, jobname, schedule, active
from cron.job
where jobname in (
  'vge_queue_overdue_agenda',
  'vge-agenda-email-worker-hourly'
)
order by jobname;
