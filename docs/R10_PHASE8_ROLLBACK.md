# R10 — retorno de Fase 8

Este procedimiento es revisable y no se ejecuta automáticamente.

## Antes de un eventual despliegue

El retorno consiste en descartar la rama o revertir sus dos commits. No hay objetos de base de datos, datos ni secretos que restaurar.

## Después de un eventual despliegue autorizado

1. Promover nuevamente el artefacto frontend exacto anterior a Fase 8, sin recompilarlo.
2. Restaurar las fuentes Edge anteriores desde la etiqueta o commit de liberación.
3. Eliminar únicamente la función desplegada `vge-technical-incident` si se confirma que el frontend anterior ya no la invoca.
4. Ejecutar smoke tests de acceso, cartera, ficha, contacto, viaje y permisos.
5. Confirmar que no se han modificado migraciones ni datos, porque Fase 8 no contiene cambios de esquema.

Si el fallo afecta sólo al transporte de observabilidad, puede desactivarse temporalmente retirando su configuración en el artefacto anterior; la operación del CRM no depende de que la entrega del evento tenga éxito.
