begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select is(
  (select active from cron.job where jobname = 'vge_queue_overdue_agenda'),
  false,
  'la preparación automática de avisos por email queda inactiva'
);

select is(
  (select active from cron.job where jobname = 'vge-agenda-email-worker-hourly'),
  false,
  'el envío automático de avisos por email queda inactivo'
);

select is(
  (select schedule from cron.job where jobname = 'vge_queue_overdue_agenda'),
  '5 * * * *'::text,
  'se conserva el horario original de la preparación para un retorno seguro'
);

select is(
  (select schedule from cron.job where jobname = 'vge-agenda-email-worker-hourly'),
  '10 * * * *'::text,
  'se conserva el horario original del envío para un retorno seguro'
);

select is(
  (select active from cron.job where jobname = 'r10-control-job'),
  true,
  'la migración no desactiva otros trabajos programados'
);

select is(
  (
    select count(*)::bigint
    from cron.job
    where jobname in (
      'vge_queue_overdue_agenda',
      'vge-agenda-email-worker-hourly'
    )
      and not active
  ),
  2::bigint,
  'los dos trabajos de correo y solo los dos objetivos quedan desactivados'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.run_vge_agenda_queue_worker()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.run_vge_agenda_queue_worker()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.run_vge_agenda_queue_worker()',
    'EXECUTE'
  ),
  'la función técnica conserva sus permisos restringidos al servicio'
);

select * from finish();
rollback;
