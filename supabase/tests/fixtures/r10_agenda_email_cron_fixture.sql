-- Isolated cron fixture used only by the R10 quality gate.
-- Commands are inert and never invoke production or an external endpoint.

select cron.schedule(
  'vge_queue_overdue_agenda',
  '5 * * * *',
  'select 1'
);

select cron.schedule(
  'vge-agenda-email-worker-hourly',
  '10 * * * *',
  'select 2'
);

select cron.schedule(
  'r10-control-job',
  '15 * * * *',
  'select 3'
);
