# R10 — Fase 2A: cimientos reproducibles

Fecha: 25 de agosto de 2026.

## Ejecutado

- Rama técnica `r10/phase2a-foundations` creada desde `ccdd2909e646381a9326d600651b8aa912f4b731`.
- Producción queda sin cambios.
- Registro actualizado de 42 migraciones aplicadas y diferencia explícita de 39 fuentes históricas ausentes.
- Fuente canónica definida para frontend, migraciones y Edge Functions.
- CI básico añadido: igualdad del HTML, siete pruebas heredadas y consistencia del registro de migraciones.
- Modelo de separación Git/Supabase/Web documentado.
- PR de revisión abierto en borrador: `#1`; no fusionable durante esta fase.
- GitHub Actions `R10 - controles de cimientos`, ejecución `32835455755`: completada con éxito en todos sus pasos.

## Pendiente antes de cerrar 2A

1. Autorizar de forma específica una extracción **solo de estructura** desde Supabase y su incorporación al repositorio público; no contendrá datos ni secretos.
2. Confirmar el coste de una rama Supabase para crear STAGING aislado.
3. Ejecutar la línea base en STAGING y verificar estructura, RLS, funciones, triggers y permisos antes de cualquier refactor.

Ninguno de estos puntos autoriza un cambio en producción.
