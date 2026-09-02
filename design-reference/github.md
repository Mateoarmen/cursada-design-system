repo: Mateoarmen/cursada-design-system
branch: main
path: src

## Last sync
date: 2026-09-02T00:12:27Z

### Updated in this project
- Rediseño mobile (Inicio, Agenda, Detalle, Horario) sobre los tokens oscuros reales de `src/styles.css`.
- Navegación mobile: tab bar inferior de 4, reusando las marcas reales de `.tab .mark` (círculo / cuadrado r3 / rombo / barra 12×8).
- Horario en celular pasa de grilla Lun–Sáb a día seleccionado + timeline.
- Base visual mezclada con la dirección "Pro Edition" de Stitch (dark orgánico, glass, 8px grid).

## Screen map
| Pantalla del proyecto | Archivos del repo |
|---|---|
| Cursada Mobile Pro.dc.html · Inicio | src/styles.css (`.inicio-hello`, `.kpi-*`, `.prox-row`, `.riesgo-row`), src/app.html |
| Cursada Mobile Pro.dc.html · Agenda | src/styles.css (`.chip`, `.badge`, `.pill`, `.card`), src/app.html |
| Cursada Mobile Pro.dc.html · Detalle | src/styles.css (`.detalle-*`, `.nota-row`, `.ring-aprob`, `.mc-tile`), src/app.html |
| Cursada Mobile Pro.dc.html · Horario | src/styles.css (`.topbar`, media queries ≤ 900px), src/app.html |
| Tab bar (las 4 pantallas) | src/styles.css líneas 898–919 (`.tabbar`, `.tab`, `.tab .mark`), src/app.html líneas 462–466 |
| Tokens (colores, radios, tipografía) | src/styles.css líneas 8–63 |
