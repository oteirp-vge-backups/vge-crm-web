-- R10 hotfix: keep overdue follow-ups visible inside the CRM while stopping
-- the two scheduled processes that prepare and send reminder emails.
--
-- The jobs are deactivated rather than removed so the change is reversible
-- and their configuration/history remains available for audit.

do $migration$
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
      active := false
    );
  end loop;
end;
$migration$;
