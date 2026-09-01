---
name: cursada-ship
description: Ciclo de build, prueba en navegador y entrega de una feature de Cursada. Usar al terminar de implementar cambios en src/, antes de darlos por entregados.
---

# Entregar una feature de Cursada

Ciclo completo para probar y entregar cambios en `src/app.html`/
`src/styles.css`/`src/runtime.js`. Correr esto ANTES de decir que una
feature está lista — no alcanza con que el build no tire errores, hay que
verla funcionar.

## 1. Build de prueba (con datos mock, sin depender de Supabase real)

```bash
npm run build:test
```

Genera `out/Cursada.test.html` con `test-harness/mock-supabase-client.js` en
vez de Supabase real — login automático, sin esperar confirmación de email.
Trae 2 semestres, materias en las 3 escalas de nota (nota 0-12, puntos, %),
evaluaciones con y sin nota cargada, y datos personales — suficiente para
probar la mayoría de las features sin tener que sembrar nada a mano.

Si la feature necesita datos que el fixture no tiene (ej. un semestre
nuevo, un campo de perfil sin cargar), editar
`test-harness/mock-supabase-client.js` directamente y volver a correr el
build — es un archivo del repo, no hace falta reconstruirlo de memoria cada
vez. **Ojo**: mutar la tabla en runtime desde la consola del browser
(`window.CURSADA_SUPABASE.from(...).upsert(...)`) NO persiste a través de
un `location.reload()` — el mock reinicializa `TABLES` desde este archivo
en cada carga de página. Para un escenario que necesite sobrevivir un
reload, editar el archivo, no la consola.

## 2. Servir y abrir en el navegador

```bash
cd out && python3 -m http.server 8899 &
```
(cualquier puerto libre — Node no tiene un server estático a mano sin
dependencias nuevas, así que Python alcanza sólo para esto). Abrir con las
herramientas de browser (`mcp__Claude_Browser__*`), no asumir que "no tira
error en el build" significa que funciona.

Extra: `?nosession=1` en la URL arranca deslogueado, para probar la
pantalla de auth.

## 3. Probar de verdad

- Revisar consola sin errores (`read_console_messages`, `onlyErrors: true`).
- Ejercitar el flujo real (clicks, no sólo inspeccionar el DOM) en desktop
  y en 375px (`resize_window` preset `mobile`).
- Si la feature toca algo que ya existía, confirmar explícitamente que lo
  viejo sigue andando — no sólo que lo nuevo funciona.
- Screenshot final para verificación visual, no sólo aserciones por JS.

## 4. Limpiar

```bash
pkill -f "http.server 8899"
```
`out/Cursada.test.html` está en `.gitignore` — no hace falta borrarlo a
mano, pero tampoco es el archivo a entregar.

## 5. Build real y entrega

```bash
npm run build:app
```
Regenera `out/Cursada.html` (el entregable real, con Supabase real — no el
mock). Confirmar que corrió sin errores, después entregar ese archivo con
`SendUserFile`.

## 6. README

Si la feature es lo bastante grande como para necesitar explicar
decisiones (no un fix de una línea), agregar una sección a `README.md` —
ver la skill `cursada-conventions` para el nivel de detalle esperado.
