# Cursada

Gestión académica personal para estudiantes de la ORT (o cualquier facultad
uruguaya): materias, notas, agenda de parciales/entregas, calendario y
horario semanal — todo en un único archivo HTML que corre 100% local, sin
backend ni cuenta, con persistencia en `localStorage`.

Este proyecto es la implementación real de dos handoffs de Claude Design.
El primero (`Cursada.dc.html`, 14 artboards) definió toda la estructura,
pantallas y funcionalidad. El segundo (`Cursada Apple.dc.html`, turno 2 de
dirección visual) reemplazó sólo el *estilo* — colores, tipografía, radios,
sombras — manteniendo intacta la funcionalidad ya construida; ver
"Dirección visual" más abajo. En ambos casos los `.dc.html` se usaron sólo
como especificación visual: `support.js` y el runtime `<x-dc>`/`sc-for`/
`{{ }}` son herramientas internas de Claude Design y no viajan en
`out/Cursada.html`.

## Uso rápido

```bash
npm install && npm run build:app
```

Esto genera `out/Cursada.html`. Abrilo con doble clic (o arrastralo a
Chrome/Safari/Edge) — no necesita servidor. La primera vez que se abre carga
las 7 materias de ejemplo (Contabilidad II, Microeconomía, Derecho Comercial,
Marketing Estratégico, Estadística Aplicada, Comportamiento Organizacional,
Finanzas Corporativas) más su agenda y calendario. A partir de ahí es tu
información: editá o borrá lo que quieras y cargá lo tuyo — todo se guarda en
el propio navegador (`localStorage`), asociado a esa copia del archivo.

**Requisito para el build:** Node.js 18 o superior (sólo para el paso de
empaquetado — concatenar los archivos de `src/`; el resultado final no
necesita Node para nada, sólo un navegador). Si no tenés Node instalado:
- **Mac:** `brew install node` (instalá Homebrew primero desde brew.sh si
  hace falta), o bajalo de nodejs.org.
- **Windows:** `winget install OpenJS.NodeJS.LTS` — si `npm` da error de
  política de ejecución en PowerShell, usá `npm.cmd` en vez de `npm`.

> Nota de esta entrega: la máquina donde se generó este proyecto no tenía
> Node ni Homebrew instalados, así que `out/Cursada.html` ya vino generado
> con un script equivalente en Python (mismo resultado byte a byte). `npm
> run build:app` va a funcionar apenas tengas Node — no hace falta para usar
> el archivo que ya está en `out/`.

## Qué podés hacer desde la app

- **Inicio**: KPIs (materias cursando, próxima evaluación, promedio general,
  pendientes de la semana), tus próximos 7 días, materias en riesgo y accesos
  rápidos para cargar materia/entrega/evento. Todo se recalcula solo.
- **Materias**: tarjetas o tabla, buscador y filtros por estado, alta/edición
  completa (nombre, código propio o autogenerado, docente, créditos, color,
  salón, horario semanal, sistema de calificación).
- **Detalle de materia**: anillo de nota, desglose por evaluación (con su
  nombre real, no un genérico "Parcial N"), cuánto necesitás para aprobar,
  lista de evaluaciones con checkbox de entregado/rendido — tocar cualquier
  evaluación (o su fila de nota) la abre para editarla, incluida la nota.
- **Agenda**: buscador de texto libre, agrupada en Vencidas / Esta semana /
  Próximamente contra la fecha real de tu equipo (no una fecha fija), con
  filtros por tipo, materia y estado.
- **Calendario**: vista Mes o Semana, navegación con ‹ ›, un botón "hoy · …"
  que te vuelve al mes/semana actual en cualquier momento, el día de hoy
  marcado con borde grueso + una etiqueta "HOY", y panel de detalle del día
  (mezcla clases generadas desde el horario + evaluaciones + eventos
  personales).
- **Horario semanal**: grilla Lun–Sáb generada desde el horario de cada
  materia, con toggle para ocultar el sábado. Si dos materias se superponen
  en el mismo día y horario, se muestran lado a lado (no una tapando a la
  otra).
- **Barra superior**: cambiar tema claro/oscuro, exportar tus datos a JSON,
  importar un JSON, borrar todo (con confirmación) e imprimir.
- **Semestres**: selector en el side nav para crear un semestre nuevo o
  volver a uno anterior sin perder nada — ver la sección "Semestres" más
  abajo para el detalle completo de qué se acota por semestre y qué no.

## Cambiar el idioma, la semilla o el margen de riesgo

- **Datos de ejemplo**: editá `src/seed.js` (materias, agenda, eventos
  personales) y volvé a correr `npm run build:app`. Los cambios sólo afectan
  el *primer arranque*; si ya abriste una versión anterior del archivo en tu
  navegador, ese perfil ya tiene datos guardados y no se resembrará (a
  propósito, para no pisar tus datos reales).
- **Textos / idioma**: la interfaz vive en `src/app.html` (texto fijo) y
  `src/runtime.js` (texto generado dinámicamente — buscá los strings en
  español ahí).
- **Margen de riesgo** (cuándo una materia pasa de "en riesgo" a "en
  peligro"): constante `MARGEN_RIESGO` al principio de `src/runtime.js`
  (0 a 3, en pasos de 0.5, escala 0–12). El handoff no incluye una pantalla
  de ajustes para esto, así que quedó como constante de código.

## Estructura del proyecto

```
package.json
build/build-app.mjs      → script de build (Node, sin dependencias)
src/app.html              → chrome estático + <template> de cada listado dinámico
src/styles.css            → tokens claro/oscuro, acentos de materia, layout
src/runtime.js            → router, persistencia, lógica de estilo/notas, CRUD
src/seed.js                → datos de ejemplo (editable, separado del runtime)
out/Cursada.html           → el entregable final
```

## Decisiones de implementación (para que no sean sorpresa)

El `.dc.html` es un prototipo estático: varias pantallas repiten los mismos
datos de ejemplo en arrays independientes y sin ids compartidos, y algunas
interacciones que pide este entregable (agrupar por fecha real, recalcular
KPIs, distinguir eventos de todo-el-día) no existen literalmente en el mock
porque un prototipo estático no las necesita. Estas son las decisiones que
tomé para resolver esas brechas:

- **Reconciliación de la agenda semilla**: unifiqué las evaluaciones que el
  prototipo repite en `agendaGrupos`, `detalle.evaluaciones` (de Contabilidad
  II) y `evMes` (calendario) en una sola lista sin duplicados en
  `src/seed.js`. Se agregaron registros que sólo existían en una de esas
  vistas (p. ej. el examen final de Contabilidad, o "Final · Derecho" y
  "Parcial 2 · Marketing" del calendario) — a estos, que en el mock sólo
  traían etiqueta y color, les asigné un tipo y horario razonables.
- **Las notas viven en la evaluación, no en la materia**: el mock original
  guardaba `parciales` como un array de números sueltos dentro de cada
  materia, sin decir a qué evaluación correspondía cada número. Eso hacía
  imposible nombrar, editar o agregar una evaluación calificada desde la UI
  (justamente el problema que reportaron después de la primera entrega). Acá
  cada nota vive en el campo `nota` de la evaluación (agenda) a la que
  pertenece; la materia ya no tiene `parciales` — su nota actual, tono de
  riesgo y ring se calculan leyendo sus propias evaluaciones. Los *valores*
  de nota de la semilla son los mismos del mock; para las materias donde el
  mock no nombraba la evaluación (todas menos Contabilidad II), inventé
  títulos y fechas razonables para poder colgar esos números de un registro
  real — ver los comentarios en `src/seed.js`.
- **Fecha "hoy" real, no fija**: la agenda y el calendario agrupan contra la
  fecha real del dispositivo (como pide el enunciado), no contra el
  "martes 1 de setiembre de 2026" que aparece hardcodeado en el mock. Elegí
  las fechas de la semilla para que coincidan con ese contexto igual.
- **Promedio general y KPIs de Inicio**: se calculan de verdad a partir de
  las notas cargadas (normalizando cada materia a % de su propio total), no
  son el "73%" ilustrativo que trae el mock — que no correspondía a un
  cálculo real sobre los datos de ejemplo.
- **Punto vs. barra en el calendario**: el criterio de aceptación pide que un
  evento personal "todo el día" se vea como barra y el resto como punto, algo
  que el prototipo no distingue visualmente (todos sus eventos se ven igual).
  Implementé: evaluaciones académicas y eventos personales con hora fija se
  muestran como punto + texto corto; eventos personales "todo el día" se
  muestran como barra de color.
- **Categorías de evento personal**: el modal del mock muestra chips
  "Personal / Trabajo / Salud", pero el esquema de datos pedido para
  `personal` no tiene un campo de categoría (y no se podían inventar campos
  nuevos). "Trabajo" y "Salud" quedaron visibles pero deshabilitados/
  decorativos; sólo "Personal" es funcional.
- **Checkbox de "entregado" en eventos personales dentro de Agenda**: el
  esquema de `personal` tampoco tiene un campo `hecho`, así que esos ítems
  aparecen en la Agenda con el checkbox deshabilitado (no aplica).
- **Modo oscuro en pantallas no diseñadas para oscuro**: el handoff sólo
  define oscuro para el SideNav/TopBar (1b) y para Inicio completo (1n). El
  resto de las pantallas (Materias, Detalle, Agenda, Calendario, Horario,
  modales) se resolvieron con el mismo sistema de tokens CSS
  (`--c-bg/surface/ink/ink2/ink3/line`), más algunos grises intermedios sin
  nombre en el handoff (bordes tenues, número de día apagado en el
  calendario) que se extrapolaron a mano siguiendo la misma lógica tonal.
- **"Otro" en los presets de puntaje/aprobación**: al elegir "Otro" en el
  modal de materia aparece un campo numérico inline; el valor se aplica al
  perder el foco (blur), no en cada tecla, para no perder el foco del input
  en cada render.
- **"Otro" en el Tipo de una evaluación**: el mock fija el Tipo a 5 botones
  (Parcial/Final/Entrega/Tarea/Presentación). Se agregó una 6ª opción "Otro"
  que despliega un campo de texto libre (mismo patrón que "Otro" en los
  presets de puntaje) para tipos que no entran en esa lista, tipo "Coloquio"
  o "Laboratorio".
- **Superposición de horarios**: si dos materias comparten día y horario en
  Horario semanal, un algoritmo tipo "salas de reunión" les asigna una
  columna a cada una dentro del mismo casillero en vez de dibujarlas una
  encima de la otra. El ancho se reparte según la concurrencia máxima de ese
  día — en un día con una superposición puntual y otro bloque suelto más
  tarde, ese bloque suelto puede quedar más angosto de lo estrictamente
  necesario; preferí esa simplicidad a un algoritmo de columnas por
  clúster.

## Semestres

Cada materia pertenece a un semestre (`semestreId`), y sólo uno de tus
semestres está "activo" a la vez. El selector vive en el side nav, justo
debajo del logo — es el lugar más persistente de la app (aparece en todas
las pantallas, incluido el cajón de mobile), y ya era donde vivían los
demás controles de alcance global (tema, toggles de "ver personales"/
"mostrar sábado"), así que un selector de semestre encaja ahí sin competir
con la barra superior de cada vista. Tocarlo abre una lista de tus
semestres — tocar uno lo activa al instante (y cierra la lista); el lápiz
de cada fila lo renombra in-line; abajo hay un campo para crear uno nuevo
(el placeholder sugiere un nombre en base a la fecha real, tipo
"2026 · Segundo semestre", pero es sólo eso — un placeholder, no un valor
precargado, para que tocar "Crear" sin escribir nada no cree un semestre de
más por accidente).

**Qué se acota al semestre activo y qué no:**

| Vista / dato | ¿Acotado? |
|---|---|
| Inicio (los 4 KPI, "Materias en riesgo") | Sí |
| Materias (grilla/tabla, filtros, buscador) | Sí |
| Horario semanal (grilla y su leyenda) | Sí |
| "Próximos 7 días" de Inicio — ítems académicos | Sí |
| "Próximos 7 días" de Inicio — eventos personales | **No**, siempre se ven |
| Agenda | **No**, se ve el historial completo |
| Calendario (eventos reales, panel de día) | **No**, se ve el historial completo |
| Calendario/Horario — conteo de "N clases" por celda | Sí (ver nota abajo) |
| Selector de materia del modal de evaluación | **No**, lista todas |
| Detalle de materia (por id, `#materia-<id>`) | **No** — un semestre viejo queda editable para siempre |

Las decisiones detrás de esa tabla:

- **Los eventos personales nunca se acotan por semestre.** Son vida
  personal, no académica — no tiene sentido que un cumpleaños o un turno
  médico "desaparezca" de Inicio o del Calendario porque cambiaste de
  semestre activo. Esto ya estaba implícito en el modelo de datos que pediste
  (`personal` no tiene `semestreId`) y me pareció la decisión correcta —
  no encontré una razón de UX para cuestionarlo.
- **Agenda y Calendario muestran todo el historial, no sólo el semestre
  activo.** Fue ambiguo a propósito en el pedido, con una preferencia
  explícita por no ocultar historial por fricción — y tiene sentido de uso
  real: querés poder revisar cuánto sacaste en un final de hace dos
  semestres sin tener que cambiar de semestre activo primero. El selector de
  materia del modal de evaluación sigue la misma lógica: lista materias de
  cualquier semestre, así podés cargar o corregir una nota vieja sin cambiar
  de semestre activo. Como concesión a la findability, si abrís "+ Nueva
  evaluación" sin materia preseleccionada, el default preferido es una
  materia del semestre activo (si hay alguna) antes que una vieja al azar.
- **Alta de materia: automática, sin campo en el formulario.** Cuando creás
  una materia nueva se asigna sola al semestre activo — no hay que elegirlo
  a mano en el modal. La razón: el selector de semestre ya es el lugar
  donde controlás "en qué semestre estoy trabajando ahora"; agregar un
  segundo control redundante en el modal de materia (que ya tiene bastantes
  campos) sumaría fricción sin sumar claridad. Si estás en el semestre
  equivocado, cambiás de semestre activo primero — es una operación de un
  clic.
- **No hay estado "archivado" ni botón para "cerrar" un semestre.** Cambiar
  cuál semestre está activo ya cumple el pedido (ver/editar el semestre
  viejo sigue siendo posible en cualquier momento, sólo hay que volver a
  activarlo). No agregué un estado adicional porque no lo pediste como
  requisito y no encontré un caso de uso claro que lo necesitara — el
  contador de materias por semestre en el selector ya deja claro cuáles
  tienen contenido.
- **El contador de "clases por día" en Calendario/Horario usa el semestre
  activo, no el semestre que estaba vigente en la fecha que estás mirando.**
  Es un dato derivado del horario semanal (qué día de la semana tenés cada
  materia), no un registro fechado — reconstruir qué horario regía en cada
  mes de cada semestre viejo hubiera sido bastante más complejo para un
  beneficio marginal (una etiqueta chica en la esquina de cada celda). Si
  navegás el Calendario a un mes de un semestre anterior, ese número va a
  reflejar tu horario *actual*, no el de ese semestre — los eventos reales
  (evaluaciones, entregas) sí son siempre los correctos, fechados, de ese
  semestre.

**Migración de datos existentes:** si abrís esta versión con materias ya
cargadas de una versión anterior (sin `semestreId`), `ensureSemestres()`
corre una única vez, sin avisos ni fricción: crea un semestre llamado
"Semestre actual", activo, y les asigna ese id a todas tus materias
existentes. Nunca se vuelve a correr una vez que la colección `semestres`
ya existe (aunque esté vacía). Si tu `localStorage` está realmente vacío
(primer uso de la app), no hace nada — `seedIfEmpty()` crea su propio
semestre semilla (el nombre sale de `CURSADA_SEED.semestre.nombre` en
`src/seed.js`) junto con las 7 materias de ejemplo. Exportar ahora incluye
`semestres` en el JSON; importar un JSON viejo (de antes de que existiera
el concepto) aplica la misma migración — arma un semestre "Importado" y le
asigna todas las materias del archivo, para que ninguna quede huérfana.

## Dirección visual (turno 2 — estilo "Apple")

El segundo handoff (`Cursada Apple.dc.html`) trajo una dirección visual
distinta: tipografía del sistema en vez de las 3 familias originales,
superficies blancas con sombra suave sobre un gris cálido, esquinas de 20 px
en vez de 14, azul de acento único (`#0071E3`/`#0A84FF`), y "tiles" con
degradé para identificar cada materia en vez del chip de texto plano. Se
aplicó como un cambio de **tokens y componentes visuales**, sin tocar router,
persistencia, cálculos ni la estructura de ninguna pantalla — el objetivo
explícito era no romper nada de lo ya construido.

- **Tipografía**: `--font-display/body/mono` apuntaron las tres a la fuente
  del sistema operativo, y `build/build-app.mjs` dejó de descargar
  tipografías. La marca (turno 3) hizo que `--font-display` y `--font-mono`
  pasaran a tipografías propias (Manrope e IBM Plex Mono) por un tiempo,
  pero a pedido explícito del usuario esa parte se revirtió (ver la sección
  "Marca" más abajo) — las tres variables volvieron a esta misma pila única
  del sistema, que es el estado vigente.
- **Paleta de 9 colores de materia**: el mock nuevo sólo define 4 identidades
  completas (azul, verde, y dos moradas que en el mock no tienen nombre fijo
  — acá quedaron mapeadas a "violeta" e "indigo" según cuál se parece más al
  violeta/índigo original). Coral, amarillo, rosa y gris no aparecen en el
  mock; se completaron con los colores de sistema de Apple para esos mismos
  tonos (naranja-rojizo, amarillo, rosa y gris de iOS) para no dejar 5 de las
  7 materias de ejemplo sin un color coherente con el resto.
- **Modo oscuro**: igual que con el primer handoff, este segundo tampoco trae
  ningún artboard oscuro. Se extrapoló siguiendo la jerarquía real de macOS
  (`#1C1C1E` de fondo, `#2C2C2E` para tarjetas, blanco al 60%/45% para texto
  secundario/terciario) en vez de simplemente oscurecer los tokens claros.
- **Tiles con degradé**: el mock muestra el color de cada materia como un
  ícono cuadrado redondeado con degradé de dos paradas (no un chip de
  texto). Se adoptó ese patrón en dos lugares puntuales — la tarjeta de
  Materias y el avatar de Detalle — porque son cambios contenidos (una línea
  de JS cada uno) con alto impacto visual. El resto de los usos de color por
  materia (chips en Agenda/Calendario/Horario, puntos, barras) se mantuvo
  como estaban estructuralmente, sólo recoloreados a la paleta nueva — tocar
  esos también habría significado reescribir la lógica de varias vistas para
  una ganancia visual marginal, algo que no correspondía dado el pedido
  explícito de no romper nada.
- **Modales**: se mantuvieron como formularios reales editables (inputs,
  selects, checkboxes) en vez de adoptar el patrón "lista de ajustes de iOS
  con flechitas" que muestra el artboard de ejemplo del mock (2e) — ese
  patrón es una interacción distinta (tap para abrir un sub-editor por
  campo), no sólo un cambio de estilo, y reconstruir los 3 modales con ese
  patrón hubiera sido el tipo de riesgo que este pedido pidió evitar. Sí se
  adoptó la estética general del sheet (esquinas de 26 px, encabezado y pie
  fijos, checkbox circular en vez de cuadrado).

## Marca (turno 3 — `Cursada Marca.dc.html`)

Un tercer handoff trajo el sistema de marca: isotipo, paleta, tipografía y
voz. A diferencia de los dos anteriores (que eran pantallas completas de
producto), este es un documento de identidad — logo, colores, tipografía,
tono de voz, usos correctos e incorrectos — pensado tanto para el producto
como para piezas fuera de él (redes, ícono de app). Lo que sigue es lo que
se incorporó al producto y las decisiones que tomé haciéndolo.

- **Isotipo**: un anillo abierto — la "C" de Cursada y, a la vez, el
  semestre en progreso (nunca cierra del todo). Se dibuja en CSS puro con
  `border-radius:50%` + `border-top-color:transparent` + `rotate(45deg)`
  sobre un `::after`, así no hace falta agregar ningún nodo nuevo al HTML
  de donde ya vivía la marca (side nav y pantalla de bienvenida) — sólo
  cambiaron los estilos. El isotipo es exclusivo de la marca Cursada: los
  "tiles" con degradé de cada materia (ver dirección visual "Apple" arriba)
  siguen mostrando el código de la materia como texto, no el anillo — son
  cosas distintas (identidad de marca vs. identidad de materia) y mezclarlas
  hubiera sido confuso.
- **Favicon**: no existía ninguno. Se agregó como SVG embebido en base64
  directo en el `<head>` que arma `build/build-app.mjs` (el mismo isotipo,
  sobre el tile azul) — el documento de marca menciona explícitamente un
  tamaño mínimo de 16 px para favicon, así que era un uso previsto.
- **Wordmark en minúscula**: el documento de marca muestra el logotipo
  siempre como `cursada` en minúscula (incluso en su propia maqueta del
  side nav del producto) — se aplicó así en los dos lugares donde el
  wordmark funciona como *logo* (side nav, pantalla de bienvenida). En el
  resto de la interfaz, donde "Cursada" aparece como palabra dentro de una
  oración o etiqueta (no como logo), se dejó con mayúscula inicial normal.
- **Azul de marca reemplaza al azul de acento**: `--c-accent` pasó de
  `#0071E3` (el azul "Apple" del turno anterior) a `#0A63F0` (Azul Cursada).
  Además, unifiqué el azul de identidad de materia ("azul", una de las 9 en
  `ACCENTS`) con este mismo azul — antes eran dos azules parecidos pero
  distintos, y tenerlos así hubiera leído como un error de color, no como
  una decisión. El resto de la paleta de 9 colores de materia no cambió.
- **Tinta y Niebla**: `--c-ink` (`#1D1D1F` → `#12161C`) y `--c-bg`
  (`#F5F5F7` → `#EDEDF0`) pasaron a los valores exactos que define la
  marca para texto y lienzo.
- **"Atención" pasó de `#FF9F0A` a `#FF9500`** (el naranja exacto de la
  marca) — muy cerca del valor anterior, se actualizó por prolijidad.
  "Al día" (`#34C759`) y "En riesgo" (`#FF3B30`) ya coincidían.
- **"Personal" se queda en gris, no en el celeste de marca — decisión
  tuya, no mía.** El documento de marca asigna `#64D2FF` a "Personal" en su
  paleta semántica, pero ese es exactamente el mismo color que ya usaba la
  materia "turquesa" en `ACCENTS`. Te pregunté antes de tocar nada porque
  aplicarlo tal cual hubiera roto el principio que vos mismo hiciste
  explícito desde el primer handoff ("los eventos personales nunca usan
  colores de materia, para no competir con lo académico") — elegiste
  mantener el gris neutro (`--c-personal:#8E8E93`) que ya había. Si en algún
  momento cambia la paleta de materia y "turquesa" deja de estar en uso, se
  podría reconsiderar.
- **Tipografía de marca — implementada y después revertida**: el documento
  de marca pide Manrope (600/800) para titulares y wordmark
  (`--font-display`) e IBM Plex Mono (400/500) para etiquetas/códigos/
  metadatos (`--font-mono`), con la tipografía del sistema sólo para el
  cuerpo general (`--font-body`). Se implementó así en un primer momento —
  `build/build-app.mjs` descargaba e inlineaba las dos tipografías, y el
  entregable pasó de ~0,15 MB a ~0,74 MB — pero en un pedido posterior el
  usuario pidió volver puntualmente a la tipografía del turno "Apple"
  (una sola pila del sistema para `--font-display/body/mono`) mientras
  dejaba el resto de la marca intacto. Ese es el estado actual:
  `--font-display/body/mono` son la misma pila del sistema, `.mono` sólo
  aporta `font-variant-numeric:tabular-nums` (sin `font-family` propio),
  `build/build-app.mjs` ya no descarga nada y el entregable volvió a
  ~0,17 MB. El resto de la marca — isotipo, favicon, wordmark en minúscula,
  paleta de colores — no se tocó.
- **Voz y tono**: el documento pide segunda persona rioplatense, directo,
  "avisa, no reta", números redondos en vez de decimales innecesarios. No
  hice una pasada de reescritura de textos porque los strings existentes
  (`src/runtime.js`, `src/app.html`) ya seguían esa voz de antes (p. ej.
  "Tenés 13 entregas pendientes", "Vas aprobando, pero raspando") — no
  encontré nada que sonara formal o "de sistema" que hubiera que corregir.
  Si en algún momento agregás textos nuevos, la guía completa (con ejemplos
  de qué sí y qué no) está en `Cursada Marca.dc.html`.
- **Lo que quedó fuera del producto, a propósito**: el documento de marca
  también incluye piezas que no son parte de la app en sí — un ícono de
  app standalone, una pieza social de 1200×630 con el tagline configurable
  ("Tu semestre, bajo control."), y tres rutas de isotipo exploradas y
  descartadas (semana en barras, monograma tipográfico). Son referencia
  para marketing/distribución, no algo que ponerse a construir dentro de
  `out/Cursada.html` — que es, y sigue siendo, sólo la app.

## Ver también

- La vista Semana del calendario reutiliza la misma lógica de eventos que
  la vista Mes, sólo que sin recortar texto (hay más lugar) y sin el
  concepto de "días de otro mes" atenuados.
