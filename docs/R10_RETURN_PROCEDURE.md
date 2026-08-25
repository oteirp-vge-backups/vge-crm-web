# Retorno al corte V15 · R9.8

1. Recuperar la referencia `v15-r9.8-r10-phase0-2026-08-25`.
2. Restaurar primero el backup cifrado en un proyecto Supabase aislado.
3. Aplicar sólo migraciones ausentes y respetar el orden registrado.
4. Desplegar las Edge Functions conservando su autenticación interna.
5. Configurar secretos fuera del repositorio.
6. Publicar `index.html`.
7. Ejecutar las siete pruebas JavaScript.
8. Habilitar cron únicamente tras validar agenda y correo en aislamiento.
9. Comparar el esquema con la huella `6389db0723eecdabd1299f230852e1e4`.

Nunca se restaura directamente sobre el origen sin una copia nueva y confirmación explícita.
