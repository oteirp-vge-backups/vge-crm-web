# R10 — Fase 2A: cimientos reproducibles

Fecha: 25 de agosto de 2026.

## Ejecutado

- Rama técnica `r10/phase2a-foundations` creada desde `ccdd2909e646381a9326d600651b8aa912f4b731`.
- Producción y la rama `main` permanecen sin cambios.
- Registro de 42 migraciones aplicadas y diferencia explícita de 39 fuentes históricas ausentes.
- Fuente canónica definida para frontend, migraciones y Edge Functions.
- CI básico añadido: igualdad del HTML, siete pruebas heredadas y consistencia del registro de migraciones.
- Modelo de separación Git/Supabase/Web documentado.
- PR de revisión abierto en borrador: `#1`; no fusionable durante esta fase.
- GitHub Actions `R10 - controles de cimientos`, ejecución `32835455755`: completada con éxito.
- STAGING temporal `r10-phase2a-staging-temp` creado como rama Supabase aislada y sin datos. La creación automática solo aplicó 3 de 42 migraciones y dejó el estado administrativo `MIGRATIONS_FAILED`.
- Línea base SQL estructural extraída en una sola ejecución privada (`32842633266`), auditada y publicada en copia sanitizada con SHA-256 `6dc0ca0103fcba8cfe8a880af0fcd4c5a5b06ec55b9e078e1b31db29f5c1f27a`.
- Inventario de la línea base: 20 tablas públicas, 2 vistas públicas, 73 funciones, 17 políticas RLS y 15 triggers; sin filas, cuentas de usuario, definiciones de roles personalizadas ni secretos.
- Un correo operativo incrustado como valor por defecto fue sustituido en las dos apariciones de la copia pública por `r10-staging-recipient@example.invalid`; el SQL original exacto permanece solo en el artefacto privado efímero.
- El workflow privado de Fase 0 se restauró exactamente tras la extracción y la restauración no produjo otra ejecución.
- STAGING se reinicializó de forma controlada y la línea base sanitizada se aplicó una única vez.
- La comprobación en STAGING reprodujo exactamente 20 tablas públicas, 2 vistas, 73 funciones, 17 políticas RLS y 15 triggers; las 20 tablas tenían RLS y las dos vistas `security_invoker`.
- Se verificaron cero filas, usuarios, identidades, sesiones, objetos Storage, secretos Vault y trabajos Cron.
- `anon` no obtuvo permisos de tabla ni de RPC privilegiadas; todas las funciones `SECURITY DEFINER` fijaban `search_path` y las RPC autenticadas conservaban controles internos de autorización.
- Los asesores no devolvieron errores. Sus avisos de seguridad y rendimiento quedaron documentados en `docs/R10_PHASE2A_STAGING_VALIDATION.md` sin alterar el diseño auditado.
- STAGING se eliminó correctamente el 25 de agosto de 2026 a las 11:52:34 UTC. La comprobación posterior confirmó que solo permanece la rama principal de producción.
- La duración real de STAGING fue inferior a una hora, con consumo estimado inferior a USD 0,01344 antes de impuestos.

## Cierre de Fase 2A

La Fase 2A queda técnicamente completada: línea base extraída, sanitizada, publicada, reproducida y verificada en un entorno aislado que ya ha sido eliminado.

El PR `#1` permanece en borrador y no se ha fusionado. Producción y `main` permanecen sin cambios.
