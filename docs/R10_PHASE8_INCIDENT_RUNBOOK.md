# R10 — procedimiento de diagnóstico por correlación

## Datos que debe facilitar el usuario

Sólo la referencia mostrada por el CRM, con formato `r10-<uuid>`, y una hora aproximada. No se solicitarán pantallazos, contraseñas, correos, teléfonos, nombres ni contenido de la ficha.

## Búsqueda en Supabase Logs Explorer

Seleccionar la fuente `function_logs` y buscar la referencia exacta dentro de una ventana temporal acotada:

```sql
select timestamp, severity_text, event_message
from logs
where source = 'function_logs'
  and timestamp > now() - interval 24 hour
  and event_message like '%"event":"vge_technical_incident"%'
  and event_message like '%r10-00000000-0000-4000-8000-000000000000%'
order by timestamp desc
limit 20;
```

La referencia del ejemplo debe sustituirse por la facilitada. El evento permite identificar versión, componente, operación, código y severidad sin abrir otras fuentes ni recuperar contenido personal.

## Clasificación

- `vge_technical_warning`: fallo esperado o validación recuperable; revisar si se repite.
- `vge_technical_error`: operación fallida; investigar y crear una prueba de regresión.
- `vge_technical_fatal`: fallo no controlado; tratar como incidencia prioritaria.

## Regla de corrección

1. Reproducir con la versión y operación registradas.
2. Localizar la causa mediante código, pruebas y, sólo si es necesario, fuentes de log adyacentes usando la correlación y la hora como ancla.
3. No copiar datos de negocio a tickets ni logs.
4. Añadir una prueba automática que falle antes de la corrección y pase después.
5. Ejecutar la barrera R10 completa.
6. Registrar commit, ejecución, resultado y procedimiento de retorno antes de cerrar.

Nunca se amplía el contrato de telemetría con campos libres para resolver una incidencia concreta.
