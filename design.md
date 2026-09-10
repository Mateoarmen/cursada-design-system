# Design — Cursada

Sistema de diseño bloqueado para este proyecto (landing + app + legal). Todo
redisño de página nuevo lee este archivo primero. No se regenera por página —
se extiende o se corrige este archivo cuando el sistema necesita crecer.

Producido por `hallmark redesign` (alcance: proyecto completo) a pedido del
usuario porque el conjunto se sentía genérico/plantilla. Preserva el azul de
marca (`#0A63F0` / `#2C7BFF` oscuro) — ya documentado como "el único acento en
todo el producto" — y reemplaza la tipografía de sistema por una pareja
propia en las tres superficies, a pedido explícito del usuario (revierte la
decisión anterior registrada en README de volver a la fuente del sistema).

## Genre
modern-minimal — el posicionamiento ya existente ("quiet power", acento
único, minimalismo con Apple/Stripe/Linear como referencia) encaja con este
género más que con editorial/atmospheric/playful. Restricciones del género
(sin glassmorphism, sin gradientes de texto, sans de punta a punta) aplican
a la landing rediseñada; la superficie de app conserva su propio lenguaje ya
establecido donde este documento lo indique explícitamente (ver "Qué
preserva cada superficie").

## Macrostructure family

- **Marketing (landing.html):** Workbench (05) — el producto en uso es el
  contenido principal. La landing muestra mockups reales de la UI de
  Cursada (rings de progreso, tarjetas de materia, calendario) en vez de
  imaginería de stock inventada. Nav: N5 Floating pill. Footer: Ft2 Inline
  single-line.
- **App (app.html):** shell existente preservado — cajón lateral + topbar +
  tabbar mobile, vistas Inicio/Materias/Agenda/Calendario/Progreso/
  Horario/Detalle/Ajustes/Perfil. No se redisñea la estructura (ver
  `cursada-conventions`: runtime.js depende de 90+ atributos `data-f`, del
  sistema `TONE`, de `MODAL_FORMS`, de templates y de nombres de clase
  exactos). El redisño acá es de capa visual: tokens, tipografía, ritmo de
  espaciado y voz de componente — cero cambios de DOM/clase.
- **Contenido (legal.html):** documento de una columna, tipografía
  solamente, sin macrostructure propia.

## Theme

Custom, anclado en el azul de marca ya existente (no un tema del catálogo —
cambiar de tema tiraría la identidad de marca ya documentada).

**Claro:**
- `--color-paper`     oklch(100% 0 0) — blanco puro (permitido en
  modern-minimal, gate 7 relajado para este género)
- `--color-paper-2`   oklch(94.7% 0.004 286) — el gris-azulado ya existente
  (`#EDEDF0`), como fondo de página detrás de tarjetas blancas
- `--color-paper-3`   oklch(98.9% 0.003 286) — el `#FBFBFD` del cajón
- `--color-ink`       oklch(19.9% 0.014 258)
- `--color-ink-2`     oklch(54.0% 0.008 286)
- `--color-ink-3`     oklch(62.2% 0.007 286)
- `--color-rule`      oklch(19.9% 0.014 258 / 7%)
- `--color-accent`    oklch(54.6% 0.225 261) — `#0A63F0`, sin tocar
- `--color-accent-to` oklch(43.8% 0.183 261) — `#0847B4`, gradiente del isotipo
- `--color-accent-ink` oklch(100% 0 0) — texto blanco sobre acento (L accent < 60)
- `--color-focus`     oklch(54.6% 0.225 261 / 25%)

**Oscuro:**
- `--color-paper`     oklch(17.8% 0.011 268) — `#0F1116`
- `--color-paper-2`   oklch(22.6% 0.013 264) — `#191C22`
- `--color-paper-3`   oklch(16.5% 0.018 269) — `#0B0E16` (cajón)
- `--color-ink`       oklch(97.1% 0.003 286)
- `--color-ink-2`     oklch(97.1% 0.003 286 / 60%)
- `--color-ink-3`     oklch(97.1% 0.003 286 / 45%)
- `--color-rule`      oklch(100% 0 0 / 8%)
- `--color-accent`    oklch(61.1% 0.211 260) — `#2C7BFF`
- `--color-accent-to` oklch(54.6% 0.225 261) — `#0A63F0`
- `--color-accent-ink` oklch(100% 0 0)
- `--color-focus`     oklch(61.1% 0.211 260 / 30%)

Nota sobre chroma del acento (0.225): excede el rango 0.12–0.20 que Hallmark
sugiere para acentos custom nuevos — se preserva igual porque es la marca ya
lanzada, no un acento inventado para este redisño.

Paleta de 9 colores de materia (`--acc-*-soft/strong`) se preserva sin
cambios — ya tiene su propia lógica de contraste probada, no forma parte de
lo que se sentía "genérico".

**Axes:** light+dark / geometric-sans / cool (~261°)

## Typography

- Display: **Instrument Sans**, peso 600–700, tracking -0.02em (headings,
  hero, cifras grandes de landing)
- Body: **Instrument Sans**, peso 400–500 (misma familia que el display —
  disciplina "single-family" del género modern-minimal)
- Mono/outlier: **JetBrains Mono**, peso 500 (notas, porcentajes, fechas,
  cualquier dato tabular — cifras con figuras monoespaciadas donde antes se
  usaba la fuente de sistema para todo)
- Fuente de sistema (`-apple-system...`) queda solo como fallback de la
  pila `font-family`, ya no como fuente primaria en ningún lado.
- Escala de tipo: se mantienen los tamaños ya afinados en `styles.css`
  (17px body, etc.) — el cambio es de familia tipográfica, no de escala.

## Spacing

Se preserva la grilla de 8px ya documentada en `design-reference/DESIGN.md`
(unit 8px, gutter 20px, margin-page 40px/20px mobile). Se nombra como escala
Hallmark en `tokens.css`: `--space-3xs` … `--space-3xl`.

## Motion

- Easings ya existentes y correctos (no son el `ease` por defecto del
  navegador): `--ease-out: cubic-bezier(.23,1,.32,1)`, `--ease-in-out:
  cubic-bezier(.77,0,.175,1)`, `--ease-drawer: cubic-bezier(.32,.72,0,1)`.
  Se preservan tal cual.
- Reveal pattern: ninguno en landing (modern-minimal → "reveals off, la
  página está compuesta"). La landing actual no tiene scroll-reveals
  pesados; no se agregan.
- `prefers-reduced-motion: reduce` → colapsa a crossfade de opacidad ≤150ms
  (ya implementado en landing, se preserva).

## Microinteractions stance

- Éxito silencioso, no toasts celebratorios (ya es el patrón de la app).
- Hover delay 800ms / focus delay 0ms en tooltips (si se agregan).
- `:active{transform:scale(.97/.98)}` ya establecido en botones — se
  preserva como firma táctil del producto.

## CTA voice

- **Landing (marketing):** CTA pill-shaped (`border-radius: 999px`) —
  canónico del género modern-minimal. Primario: relleno de acento, texto
  `--color-accent-ink`. Secundario: outline o fill tenue (`--color-rule`
  como fondo). Esto es distinto a los controles de la app (ver abajo) — es
  una diferencia de superficie deliberada, no una inconsistencia.
- **App (producto):** se preserva el radio existente de controles
  (`--r-control:10px`) — no se vuelve pill. Los controles del producto no
  cambian de forma, solo de paleta/tipografía subyacente.

## CTA destacada (marco con gradiente giratorio)

Clase `.cta-glow` en `styles.css` — un marco animado (dúo de marca +
celeste claro, gira vía `@property` sobre un `conic-gradient`) que envuelve
un `.btn-primary` sin tocar su forma. Agregada a pedido explícito del
usuario, probada primero como prototipo aislado antes de tocar el producto.

Regla de uso, no decorativa: **sólo en los CTA de "primera acción"** —
`#btn-ob-empezar` (onboarding) y `#btn-empty-primera` (estado vacío de
Materias). Son los dos únicos botones del producto que un usuario ve una
sola vez y que no compiten con ningún otro control en pantalla. No se usa
en botones de acción repetida (Guardar, + Nuevo, Continuar, etc.) — ahí el
movimiento constante sería ruido y rompería "éxito silencioso, no toasts
celebratorios" de Microinteractions. Si se agrega un tercer lugar, tiene
que cumplir el mismo criterio (única vez, sin competencia visual), no
"se ve bien acá también".

## Qué preserva cada superficie

- El acento azul de marca y su gradiente (`--color-accent` → `--color-accent-to`).
- El isotipo (círculo con anillo cortado) y el wordmark en minúscula "cursada".
- Los 9 colores de materia (`--acc-*`).
- En `app.html`: cada atributo `data-f`, cada nombre de clase, cada
  `<template data-template>`, el sistema de modales (`MODAL_FORMS`,
  `snapshotModalForm`), el sistema `TONE`/`toneDe`/`margenDe`, los rings de
  progreso (`ringStyle`/`ringInnerStyle`) — nada de esto se toca porque
  `runtime.js` depende de ello por nombre exacto (ver skill
  `cursada-conventions`).
- Los breakpoints mobile ya documentados y las razones detrás de cada uno
  (ver comentarios extensos en `landing.html`/`styles.css`).

## Qué puede diferir por página

- La landing puede usar Workbench (mockups reales de UI) como enriquecimiento
  Tier-A/B (CSS + HTML fiel a los componentes reales, no capturas de pantalla
  ni fotos de stock).
- `legal.html` es tipografía pura, sin enriquecimiento.
- `app.html` no admite enriquecimiento — la función manda, como ya indica
  `design-reference/DESIGN.md`.

## Exports

### tokens.css
Ver `src/styles.css` — los tokens de marca (`--c-*`) ya son la fuente de
verdad del proyecto; este redisño los re-nombra a convención Hallmark
(`--color-*`, `--font-*`, `--space-*`) donde no rompe el contrato con
`runtime.js`, y agrega los que faltan (`--font-display`, `--font-mono`
apuntando a la pareja nueva).
