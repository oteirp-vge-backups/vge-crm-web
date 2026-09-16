# R10 · Anotaciones internas en el historial

## Petición y regla funcional

Se mantiene intacto el registro de contacto comercial existente. Como segunda acción, el usuario puede escribir únicamente en «Qué se ha hablado / acordado · o anotación interna» y guardar el texto sin seleccionar canal, resultado, persona, viaje ni una nueva fecha.

Las anotaciones internas:

- aparecen junto a los contactos en el mismo historial cronológico del centro;
- muestran autor y fecha real de registro;
- se identifican visualmente como «Anotación interna»;
- no son contactos comerciales y no incrementan ningún contador ni estadística;
- no modifican estado, último contacto, último resultado, agenda general, agenda de viajes ni versiones de concurrencia.

Base: `fc688f5c29434309000f69afdaeab31390b4485f`, versión `r10-phase10.0.3`.
Candidato: `r10-phase10.0.4`.

## Diseño de datos y seguridad

Las notas se almacenan en `public.center_internal_notes`, separadas de `public.contact_events`. Esa separación hace que las consultas estadísticas existentes no puedan contabilizarlas por accidente.

La tabla tiene RLS, claves foráneas e índices de acceso. No concede lectura ni escritura directa a clientes. La única escritura pública es `register_internal_note_v1(text, text)`, una función `SECURITY DEFINER` con `search_path` vacío que comprueba sesión, operador y acceso vigente al centro. La función rechaza textos vacíos y limita cada anotación a 4.000 caracteres.

`get_center_history_v2` une contactos y notas únicamente al leer el historial y añade `entry_type` para que el frontend los represente y contabilice por separado. La copia lógica del propietario sube a esquema V16 e incorpora `center_internal_notes`.

## Interfaz

El formulario conserva los campos obligatorios y el botón «Registrar contacto». Junto a él se añade «Guardar anotación interna»:

- el primer botón sigue validando canal y resultado mediante el formulario;
- el segundo botón omite deliberadamente esos campos y envía solo centro y texto;
- ambas acciones comparten bloqueo de doble envío;
- tras guardar, el historial indica por separado cuántos contactos y anotaciones existen.

## Validación

- Prueba pgTAP específica de permisos, RLS, separación física, trazabilidad, alcance de cartera, rechazo de entradas inválidas, exclusión estadística, convivencia cronológica, contacto comercial heredado y copia V16.
- Comprobaciones estáticas que impiden que la ruta de anotaciones modifique contadores o estado comercial.
- Recorrido Playwright con Supabase simulado que guarda solo texto y confirma cero llamadas al registro de contacto.
- Regresiones heredadas, espejo `publish/`, aislamiento respecto de producción, artefacto inmutable y retorno sellado permanecen dentro de la barrera R10.

## Despliegue y retorno

La implementación se prepara en una rama distinta de `main`. La migración y el frontend no se aplican a producción sin autorización explícita posterior a la barrera de calidad.

El retorno funcional está en `docs/rollback/R10_INTERNAL_NOTES_ROLLBACK.md`. Restaura el historial solo de contactos y el esquema de copia V15, y elimina la tabla de anotaciones. Como esa última operación borra las notas ya creadas, solo debe ejecutarse con copia previa y autorización expresa. El retorno web se realiza promoviendo el artefacto sellado de `r10-phase10.0.3`.
