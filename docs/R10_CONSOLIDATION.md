# R10 — consolidación final

Fecha: 26 de agosto de 2026.

## Objetivo

Conservar una única propuesta acumulada desde la versión estable de `main` hasta el candidato probado de Fase 10, sin fusionar ni desplegar antes de la autorización expresa de Fernando.

## Cadena verificada

| PR | Fase | Base | Head verificado |
| --- | --- | --- | --- |
| #1 | 2A — cimientos reproducibles | `main` | `6b3ffd08b03f71ddc1e056bcdb674b06a8d17de2` |
| #2 | 2B — barrera de calidad | Fase 2A | `b069b0c8fafedb7c0a4f20e89d74283c282d1516` |
| #3 | 2C — STAGING integrado | Fase 2B | `4fafbcc057b819ad6fe081486c7e02c66d5fca5a` |
| #4 | 4 — obsolescencia certificada | Fase 2C | `fff8705e1b6adf7ffbd1faa68d2dde32b53eb78b` |
| #5 | 5 — núcleo técnico modular | Fase 4 | `4ce4ed2f58dd02fd475a366a4bd7df6140a292ce` |
| #6 | 6 — módulos funcionales | Fase 5 | `0d2c1c0cef74534441f80a0fc00fa94a8bfc834e` |
| #7 | 7 — reducción de privilegios | Fase 6 | `dbfe2868fc0c91a777b8faa33f234189782c7af5` |
| #8 | 8 — observabilidad sin PII | Fase 7 | `67949891bf93387cde377d1dea6e9f0df392e7be` |
| #9 | 9 — CI/CD y retorno | Fase 8 | `f676837207f542ca27b60f6dbd7560be64be5c4d` |
| #10 | 10 — cuatro usuarios | Fase 9 | `62dc3749ba59319d4d94d9ee9b8179d667a36787` |

Los diez PR están abiertos, en borrador, son integrables y cada base coincide con el head final de la fase anterior. La numeración salta de 2C a 4 porque la antigua Fase 3 quedó absorbida por la secuencia de cimientos; no falta ningún cambio entre ambas.

## Resultado acumulado

- UAT humana correcta para Fernando, Leticia, Elena y Silvia.
- 37/37 pruebas SQL por roles y superficie privilegiada.
- 7/7 regresiones heredadas.
- 5/5 recorridos Playwright.
- Frontend, Deno, privacidad y aislamiento correctos.
- Artefacto único, verificable e inmutable.
- Retorno exacto a Fase 9 simulado correctamente.
- STAGING temporal eliminado.
- Producción saludable, con 42 migraciones y dos Edge Functions.
- `main` permanece en `ccdd2909e646381a9326d600651b8aa912f4b731`.

## Propuesta de integración

La rama `r10/consolidated-release` parte exactamente del cierre remoto de Fase 10 y añade únicamente esta evidencia y la actualización del estado de entornos. Su PR contra `main` es la única propuesta que deberá utilizarse para la decisión final.

Los PR apilados #1–#10 se conservarán como historial técnico mientras se valida la propuesta consolidada. No deben fusionarse uno a uno.

## Condiciones para autorizar

Antes de solicitar autorización final deben cumplirse simultáneamente:

1. PR consolidado integrable y barrera conjunta verde.
2. Revisión de que el diff acumulado parte del commit estable de `main`.
3. Confirmación de que no existe STAGING facturable.
4. Producción sin cambios desde el inicio de R10.
5. Procedimiento de publicación y retorno sellados.

La autorización final deberá mencionar expresamente la fusión del PR consolidado, la aplicación controlada de la migración R10, el despliegue de la Edge Function de observabilidad y la publicación del frontend. Cualquier fallo posterior activa el retorno inmediato.
