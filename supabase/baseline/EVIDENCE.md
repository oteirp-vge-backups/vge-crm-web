# R10 Fase 2A — evidencia de línea base SQL

Fecha de extracción: 25 de agosto de 2026 a las 11:31:19 UTC.

## Procedencia y alcance

- Extracción de una sola ejecución mediante un workflow privado autorizado; run `32842633266`.
- Herramienta: Supabase CLI `2.115.0`, ejecutando `supabase db dump` sin `--data-only` y sin `--role-only`.
- Archivo original privado: `current-schema.sql`, 236.988 bytes; SHA-256 `1c7a5f2206f1309db04045f63128568b997f872335b437e8db73a1030f30cca1`.
- Archivo público sanitizado: `current-schema.sql`, 236.998 bytes; SHA-256 `6dc0ca0103fcba8cfe8a880af0fcd4c5a5b06ec55b9e078e1b31db29f5c1f27a`.
- SHA-256 del ZIP privado: `7560286a3adb17ccfd6727df4c7a1369f27f21903dbc22a3b6a3083a6c1356fb`.
- El artefacto privado fue configurado con retención de un día y caduca el 26 de agosto de 2026 a las 11:31:20 UTC.

## Comprobaciones superadas

- Hash interno del SQL verificado.
- Ausencia de `COPY`, `INSERT ... VALUES`, `CREATE ROLE` y contraseñas de roles a nivel superior.
- Ausencia de la URL y contraseña de conexión utilizadas por el workflow.
- Ausencia de patrones de credenciales AWS, age, Supabase, JWT y URLs PostgreSQL con contraseña.
- Un único correo operativo, presente dos veces como valor estructural, fue sustituido en la copia pública por `r10-staging-recipient@example.invalid`; no se alteró ningún otro contenido.
- El workflow de backup quedó omitido durante la ejecución y después fue restaurado exactamente a su blob original `e2dd15bb7a9aa50161538b474bd32b78a1400c30`.
- El commit de restauración no generó una nueva ejecución.

## Inventario estructural

| Objeto | Cantidad |
|---|---:|
| Tablas `public` | 20 |
| Vistas `public` | 2 |
| Funciones `public` | 52 |
| Funciones `private` | 21 |
| Políticas RLS | 17 |
| Triggers | 15 |
| Índices | 66 |

La extracción y su publicación no escribieron en Supabase ni modificaron la rama `main` del repositorio web. El hash del SQL público se calculó después de la sanitización y es el que debe verificarse antes de usarlo.
