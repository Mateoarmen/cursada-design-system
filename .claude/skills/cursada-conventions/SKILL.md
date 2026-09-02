---
name: cursada-conventions
description: Patrones establecidos del código de Cursada — reusar antes de inventar algo nuevo. Cargar al empezar cualquier feature o fix en este repo.
user-invocable: false
---

# Convenciones de Cursada

Referencia de patrones ya existentes en `src/runtime.js`/`src/app.html`/`src/styles.css`,
para no re-descubrirlos vía exploración cada sesión ni duplicar lógica que ya existe.
Cuando un pedido nuevo se parece a algo de acá, reusar — no reinventar.

## Arquitectura general

- Vanilla JS en un único IIFE (`runtime.js`), sin framework, sin bundler más
  allá del build propio (`build/*.mjs`). Estilo ES5 consistente: `var`, sin
  `let`/`const`, sin arrow functions, sin clases. Mantener ese estilo al
  agregar código nuevo, no mezclar.
- `src/app.html` = chrome estático + `<template>` para filas repetidas.
  `src/runtime.js` = toda la lógica. `src/styles.css` = todo el CSS.
  `src/supabase-client.js` inicializa `window.CURSADA_SUPABASE`.
  `src/seed.js` = datos de ejemplo sin usar actualmente (a propósito).
- Build real: `npm run build:app` (Node, funciona — no hay que usar
  workarounds). Ver skill `cursada-ship` para el ciclo completo.
- Supabase: el esquema se modifica con el MCP de Supabase conectado —
  mostrar el SQL antes de aplicarlo, aplicarlo directo (no delegarlo al
  usuario vía dashboard salvo que lo pida explícitamente). La anon key es
  pública por diseño; la seguridad la da RLS en las tablas, no el secreto
  de esa key.

## Helpers de DOM (usar siempre, no `innerHTML` con texto de usuario)

- `el(tag, cls)` — crea un elemento.
- `qf(root, field)` — busca `[data-f="field"]` dentro de un nodo.
- `tpl(name)` — clona `<template data-template="name">`.
- `clear(node)` — vacía un nodo antes de reconstruirlo.
- `css(obj)` — objeto → string de `style` inline.
- Único lugar que arma HTML como string: `buildProgresoChartSvg()` (el
  gráfico SVG de Progreso) — ahí existe `escapeHtml()` específicamente para
  sanitizar texto libre del usuario antes de interpolarlo. Si se necesita
  armar HTML como string en otro lado, pasar por `escapeHtml()` también.

## Color y clasificación de riesgo

- `TONE = { success, warning, danger, neutral }` (runtime.js) — vocabulario
  único de color en toda la app. No inventar tonos nuevos.
- `toneDe(estado, esc, parciales)` — clasifica una materia. `margenDe(esc)`
  lee `CURRENT_PROFILE.margen_riesgo` (configurable en Ajustes, fallback a
  la constante `MARGEN_RIESGO`) para decidir cuándo pasa de "en riesgo" a
  "en peligro". Reusar esta función para cualquier clasificación nueva de
  promedio — no reimplementar el umbral a mano (ver el simulador de Detalle
  para un ejemplo: le pasa un array de notas combinado, no un promedio ya
  calculado).
- `ringStyle(v, color, size, total)` / `ringInnerStyle(size, thick)` — anillo
  de progreso circular vía `conic-gradient`, sin SVG. Es el patrón para
  "mostrar un valor sobre un total" en toda la app (Detalle, riesgo de
  Inicio, materia-card).
- `.nota-row`/`.bar-wrap`/`.bar-fill` — barra de progreso horizontal lineal
  (alternativa al ring cuando no hace falta un círculo). Ancho vía `style`
  inline (`width:X%`), no CSS estático.

## Controles de "elegir un valor"

- `.seg`/`.seg-item` — 2-4 opciones fijas (tema, Mes/Semana, Tarjetas/Tabla).
- `.num-pill` + `buildNumPill(on, label, onClick)` — presets numéricos
  discretos, con escotilla de "Otro" (`buildNumPillOtro`) si el rango es
  abierto. Usado para puntaje/aprobación de materia y el margen de riesgo
  de Ajustes (7 valores fijos, sin "Otro" porque el rango ya es cerrado).
- `.dia-mini` — multi-select por día de la semana (horario de materia).
- `<input type="range">` — el simulador de Detalle es el ÚNICO lugar que lo
  usa. No hay precedente en ningún otro lado a propósito (Ajustes evaluó y
  descartó un slider para el margen de riesgo, prefiriendo `.num-pill`).
  Sólo usar un slider nuevo si el pedido lo pide explícitamente para un
  rango continuo — si no, preferir `.num-pill`/`.seg-item`.

## Modales

- `openModal(id)` / `closeModalEl(elm)` / `closeAllModals()` — únicos puntos
  de apertura/cierre. `closeModalEl` respeta el aviso de "¿descartar
  cambios?" — nunca sacar `.is-open` a mano.
- `MODAL_FORMS` (modal id → form id) + `snapshotModalForm(modalId)` +
  `modalTieneCambiosSinGuardar(modalId)` — detección de cambios sin
  guardar, basada en `FormData` del form asociado. Si el modal tiene estado
  que NO vive en un `<input name>` (ej. color seleccionado, slider), agregar
  una entrada a `MODAL_EXTRA_STATE[modalId]` que devuelva ese estado — no
  se detecta solo.
- Modal nuevo → agregarlo a `MODAL_FORMS` si tiene form con campos
  guardables, si no, no hace falta.

## Patrón "un botón dispara el click de otro" (una sola fuente de verdad)

Para reusar una acción que ya tiene su propio confirm()/lógica (ej. cerrar
sesión) desde un lugar nuevo de la UI, NO duplicar la lógica — disparar un
click sintético sobre el botón real:
```js
document.getElementById('btn-nuevo').addEventListener('click', function () {
  document.getElementById('btn-logout').click();
});
```
Ejemplo real: `#btn-perfil-logout` y `#btn-ajustes-logout` ambos disparan
`#btn-logout`.click().

## Borrado con cascada

Patrón establecido (materia → agenda, semestre → materias → agenda):
`confirm()` con el conteo real de lo que se va a borrar → borrar hijos →
borrar padre → `avisarError()` si algo falla. Ver `eliminarSemestre()` como
plantilla para cualquier borrado nuevo con hijos.

## Agregar una vista nueva a la navegación

1. `CORE_VIEWS` (array) — sumar el id.
2. `renderRoute()` — sumar la rama `else if`.
3. `VIEW_LABELS` — sumar la entrada.
4. `renderSidenav()` ya es genérico por `[data-nav]` — no hace falta tocarlo
   si el botón nuevo tiene ese atributo.
5. Decidir: ¿va en el cajón (`#sidenav-nav`) o también en el tab bar mobile
   (`#tabbar`, fijo a 5 destinos a propósito — ver siguiente sección)?

## Capa mobile: aditiva, nunca reemplazo

Todo el CSS mobile vive en `@media(max-width:760px)` al final de
`styles.css`, apoyado en breakpoints previos (900px cajón, 640px
Calendario, 680px/1100px Materias) — nunca los reemplaza.

**Gap recurrente a vigilar**: cualquier elemento persistente en el DOM (no
sólo-mobile) cuyas ÚNICAS reglas viven dentro de ese `@media` necesita un
`display:none` explícito FUERA del media query, o se ve sin estilo en
cualquier ancho mayor a 760px. Ya pasó dos veces (tabbar/fab/quick-sheet/
row-menu/weekstrip la primera vez, `.swipe-action` la segunda, encontrado
recién en producción). Antes de dar por terminada una feature con UI nueva
persistente-en-el-DOM, revisar: ¿tiene guard de `display:none` fuera del
`@media`?

El tab bar mobile (`#tabbar`) está fijo a 5 destinos
(`grid-template-columns:repeat(5,1fr)`) — vistas nuevas van al cajón, no
ahí, salvo que se pida explícitamente ensancharlo.

## Semestres y scoping

Materias/Inicio/Horario se acotan al semestre activo; Agenda/Calendario/
Progreso NO (muestran histórico completo a propósito — ver README, sección
Semestres). Antes de escribir una query nueva sobre materias/agenda,
confirmar cuál de los dos comportamientos corresponde — no asumir.

`semestresOrdenados()` ordena por `created_at` real, nunca por nombre ni
por posición en el array. Para "el semestre anterior a X", ubicar la
posición de X en ese array ordenado y restar 1 — nunca "el anteúltimo".

## Mapeo de datos (Supabase)

`materiaToRow`/`rowToMateria`, `agendaToRow`/`rowToAgenda`, etc. — mapean
camelCase (JS) ↔ snake_case (columnas reales). **`profiles` es la
excepción**: no tiene funciones de mapeo, los campos se leen/escriben con
el mismo nombre snake_case en JS y DB (`creditos_carrera`, no
`creditosCarrera`) — mantener esa convención al agregar un campo nuevo a
`profiles`, no introducir camelCase ahí.

## Documentación

Cada feature grande termina con una sección nueva en `README.md`, mismo
nivel de detalle que las existentes: qué se pidió, qué decisiones se
tomaron y por qué (incluyendo las NO pedidas explícitamente), qué bugs se
encontraron probando (no sólo por lectura de código). Ver cualquier sección
existente como plantilla de profundidad esperada.
