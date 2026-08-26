# R10 — Checklist UAT para Fernando, Leticia, Elena y Silvia

Cada persona utilizará exclusivamente la URL temporal de STAGING y su propia cuenta de prueba. No deben introducir nombres, teléfonos, correos, centros ni viajes reales.

## Fernando — propietario

1. Iniciar y cerrar sesión.
2. Confirmar acceso a todos los centros y a Usuarios.
3. Abrir una ficha, crear un contacto y un viaje sintéticos.
4. Exportar CSV y copia completa JSON.
5. Archivar y restaurar un registro sintético.
6. Confirmar que no aparece ningún dato real.

## Leticia, Elena y Silvia — comerciales

Cada una repetirá por separado:

1. Iniciar y cerrar sesión.
2. Confirmar que sólo aparece su cartera asignada.
3. Crear un centro, una persona y un viaje totalmente sintéticos.
4. Registrar un seguimiento y una próxima fecha de contacto.
5. Buscar el centro y exportar su CSV.
6. Confirmar que no aparecen Usuarios, copia completa, cartera global ni registros de otra comercial.

## Resultado que debe comunicarse

Para cada persona basta responder con una de estas dos fórmulas:

- `NOMBRE — UAT correcta`.
- `NOMBRE — incidencia en PASO — texto exacto mostrado`.

No enviar contraseñas, capturas con datos reales ni información personal. Una incidencia no se corregirá directamente en producción: primero se reproducirá en STAGING, se convertirá en prueba automática y se validará de nuevo.
