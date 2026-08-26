# R10 — Fase 10: estabilización con cuatro usuarios

Fecha de inicio: 26 de agosto de 2026.

## Objetivo y límites

La fase valida el candidato consolidado con cuatro perfiles independientes y, como último control, con Fernando, Leticia, Elena y Silvia. No modifica `main`, producción ni el CRM publicado. Toda incidencia reproducible debe convertirse en una prueba automática antes de considerarse resuelta.

## STAGING temporal

- Rama Supabase: `r10-phase10-uat-temp`.
- Project ref: `etclakslqsoylyymjljz`.
- Datos copiados de producción: ninguno.
- Tarifa confirmada: 0,01344 USD por hora mientras exista.
- Eliminación obligatoria: al cerrar la UAT o, como máximo, el 1 de septiembre de 2026.
- Línea base sanitizada aplicada tras detectar que Branching sólo reconstruyó tres migraciones antiguas y nueve tablas.
- Migración de reducción `SECURITY DEFINER` de Fase 7 aplicada exclusivamente en STAGING.

## Validación técnica previa

El fixture contiene cuatro identidades sintéticas: propietario, dirección y dos comerciales. Se comprobó que:

- las cuatro identidades tienen credenciales válidas;
- propietario y dirección ven los dos centros sintéticos;
- cada comercial ve únicamente su centro asignado;
- los comerciales no pueden cruzar carteras;
- propietario conserva las facultades exclusivas de usuarios, seguridad, copia y borrado permanente;
- dirección conserva alcance global operativo sin facultades de propietario;
- producción queda bloqueada por project ref y no recibe consultas de escritura.

La matriz automática permanente aumenta de 35 a 37 pruebas SQL acumuladas. El recorrido Playwright integrado añade una cuarta prueba específica para el aislamiento entre dos comerciales.

## Estado de cierre

La validación humana se completó el 26 de agosto de 2026 sin incidencias:

- Fernando, propietario: UAT correcta.
- Leticia, comercial: UAT correcta.
- Elena, comercial: UAT correcta.
- Silvia, comercial: UAT correcta.

La rama temporal se eliminó al finalizar la UAT. Existió aproximadamente 1 hora y 9 minutos, con un coste estimado de 0,0155 USD a la tarifa confirmada. La comprobación posterior confirmó que Supabase conserva únicamente `main`, producción permanece saludable con sus 42 migraciones y mantiene exclusivamente sus dos Edge Functions anteriores.

La Fase 10 queda funcionalmente cerrada. Este documento no autoriza fusionar PR, desplegar Edge Functions, publicar el frontend ni aplicar migraciones en producción.
