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
- STAGING temporal `r10-phase2a-staging-temp` creado como rama Supabase aislada, sin datos, con coste de USD 0,01344 por hora y eliminación automática prevista como máximo el 1 de septiembre de 2026.
- La creación automática de STAGING solo aplicó 3 de 42 migraciones; el entorno permanece aislado y no se considera válido para pruebas funcionales.
- Línea base SQL estructural extraída en una sola ejecución privada (`32842633266`), auditada y publicada en copia sanitizada con SHA-256 `6dc0ca0103fcba8cfe8a880af0fcd4c5a5b06ec55b9e078e1b31db29f5c1f27a`.
- Inventario de la línea base: 20 tablas públicas, 2 vistas públicas, 73 funciones, 17 políticas RLS y 15 triggers; sin filas, cuentas de usuario, definiciones de roles personalizadas ni secretos.
- Un correo operativo incrustado como valor por defecto fue sustituido en las dos apariciones de la copia pública por `r10-staging-recipient@example.invalid`; el SQL original exacto permanece solo en el artefacto privado efímero.
- El workflow privado de Fase 0 se restauró exactamente tras la extracción y la restauración no produjo otra ejecución.

## Pendiente antes de cerrar 2A

1. Reinicializar de forma controlada el STAGING parcial y aplicar la línea base exclusivamente allí.
2. Verificar en STAGING estructura, RLS, funciones, triggers y permisos antes de cualquier refactor.
3. Eliminar STAGING al terminar o, en todo caso, antes del límite temporal autorizado.

Ninguno de estos puntos autoriza un cambio en producción ni una fusión a `main`.
