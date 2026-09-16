# R10 · Filtro de provincias

## Petición y alcance
Fernando solicita poder filtrar los listados por provincia además de comunidad autónoma, con mínima intervención y sin afectar otras áreas. Cambio solo de frontend; ninguna operación de escritura en Supabase, ningún cambio de permisos, contactos, centros, asignaciones, agenda, estadísticas o exportadores.

Base: `af33c83fa24189d4f52450ab138ce2a255b9c402`, versión `r10-phase10.0.2`.
Candidato: `r10-phase10.0.3`.

## Funcionamiento
- Nuevo selector «Todas las provincias» junto a «Todas las zonas».
- Provincias presentes en el ámbito de la vista y, cuando se selecciona, la comunidad autónoma. Las opciones no se restringen adicionalmente por búsqueda/estado/responsable para permitir cambiar filtros aunque no haya resultados.
- «Sin provincia informada» solo cuando hay fichas incompletas en ese ámbito. Nunca se deduce una provincia desde la localidad.
- Combina provincia, comunidad, búsqueda, estado y responsable por intersección.
- Al cambiar de comunidad se limpia solo una provincia incompatible. Volver a todas las zonas conserva una provincia válida.
- Cambiar provincia reinicia la paginación; paginar o abrir/cerrar una ficha conserva los filtros.
- El estado opcional `filters.province` es compatible con todos los reinicios heredados, que lo eliminan al cambiar de apartado.
- Si la última coincidencia desaparece durante una actualización de datos, la opción seleccionada sigue visible y se muestran cero resultados: no se amplía silenciosamente el ámbito.
- Aplicado a Todos, Mi cartera, vistas por estado, Sin asignar, Agenda y Vencidos. No se cambia la vista separada de Archivados ni Estadísticas.

## Exportaciones
El contrato previo de Excel/CSV exporta todos los registros del apartado sin filtros visuales. Se conserva deliberadamente. Se comprueba una descarga XLSX real con datos ficticios y el total registrado por `log_export`.

## Validación
- 27 comprobaciones Node específicas integradas en `check:frontend`.
- 7 nuevos recorridos Playwright, además de los 7 existentes.
- Se conserva la barrera R10: regresiones heredadas, SQL de permisos, frontend modular, aislamiento, artefacto inmutable y retorno.
- Datos de prueba exclusivamente sintéticos y red a producción bloqueada.
- Espejo `publish/` exacto. Solo `centers.js` y `config.js` cambian en el paquete web.

## Retorno
El paquete anterior está identificado por la base exacta indicada arriba. Revertir el PR completo mediante otro PR (sin force-push), incluyendo sus pruebas y metadatos, y repetir la barrera R10. Comparar los 12 archivos web con la base para confirmar retorno exacto. No ejecutar SQL ni deshacer las normalizaciones de provincias previamente publicadas: esta intervención no modifica la base de datos.
