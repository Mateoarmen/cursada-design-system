# Cursada

Gestión académica personal para estudiantes de la ORT (o cualquier facultad
uruguaya): materias, notas, agenda de parciales/entregas, calendario y
horario semanal — todo en un único archivo HTML, con cuenta propia y datos
sincronizados en la nube (Supabase). **Requiere conexión a internet** para
autenticarse y guardar/leer datos — ver la sección "Cuenta y sincronización
(Supabase)" más abajo para el detalle completo de esto, incluido de dónde
viene y por qué dejó de ser 100% offline.

Este proyecto es la implementación real de tres handoffs de Claude Design.
El primero (`Cursada.dc.html`, 14 artboards) definió toda la estructura,
pantallas y funcionalidad. El segundo (`Cursada Apple.dc.html`, turno 2 de
dirección visual) reemplazó sólo el *estilo* — colores, tipografía, radios,
sombras — manteniendo intacta la funcionalidad ya construida; ver
"Dirección visual" más abajo. El tercero (`Cursada Marca.dc.html`, turno 3)
trajo el sistema de marca (isotipo, paleta, wordmark, favicon); ver "Marca"
más abajo. En todos los casos los `.dc.html` se usaron sólo como
especificación visual: `support.js` y el runtime `<x-dc>`/`sc-for`/`{{ }}`
son herramientas internas de Claude Design y no viajan en `out/Cursada.html`.

Después de esos tres handoffs de producto/diseño, un cuarto pedido cambió la
**arquitectura**: migrar de `localStorage` puro a cuentas de usuario con
datos sincronizados en Supabase (Postgres + Auth + Storage). Ese cambio no
tocó ninguna pantalla ni ningún cálculo — es exactamente la misma app, con
una capa de persistencia y autenticación nueva debajo. El detalle completo
está en "Cuenta y sincronización (Supabase)".

## Uso rápido

```bash
npm install && npm run build:app
```

Esto genera `out/Cursada.html`. Abrilo con doble clic (o arrastralo a
Chrome/Safari/Edge) — necesita conexión a internet (habla con Supabase para
autenticarte y guardar tus datos), pero no necesita un servidor propio ni
nada más allá del navegador. La primera vez, te pide crear una cuenta
(email + contraseña) o iniciar sesión si ya tenés una; a partir de ahí es tu
información, sincronizada a esa cuenta — abrí el mismo archivo (o
cualquier copia de él) desde otro dispositivo, iniciá sesión con la misma
cuenta, y vas a ver las mismas materias, notas y agenda.

Ya no hay datos de ejemplo precargados en cuentas nuevas — arrancás con la
pantalla de bienvenida y creás tu primera materia vos. (`src/seed.js` sigue
existiendo y viaja en el bundle por si en el futuro hace falta un botón de
"probar con datos de ejemplo", pero hoy no se usa en ningún lado — ver
"Cambiar el idioma, la semilla o el margen de riesgo" más abajo.)

**Requisito para el build:** Node.js 18 o superior (sólo para el paso de
empaquetado — concatenar los archivos de `src/`; el resultado final no
necesita Node para nada, sólo un navegador con internet). Si no tenés Node
instalado:
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
- **Perfil**: tocando tu nombre/avatar abajo del side nav se abre un modal
  para cambiar tu nombre y tu foto (se recorta a cuadrado y se comprime antes
  de subirse) — ver "Cuenta y sincronización (Supabase)" más abajo. El mismo
  lugar tiene el botón para cerrar sesión.

## Cambiar el idioma, la semilla o el margen de riesgo

- **Datos de ejemplo**: `src/seed.js` sigue existiendo (materias, agenda,
  eventos personales) y viaja en el bundle, pero ninguna cuenta nueva lo usa
  automáticamente — ver "Cuenta y sincronización (Supabase)" sobre por qué
  se dejó de auto-sembrar. Si en algún momento se agrega un botón de "probar
  con datos de ejemplo", este archivo es la fuente de esos datos; hoy es
  código sin usar, a propósito, no un bug.
- **Textos / idioma**: la interfaz vive en `src/app.html` (texto fijo) y
  `src/runtime.js` (texto generado dinámicamente — buscá los strings en
  español ahí).
- **Margen de riesgo** (cuándo una materia pasa de "en riesgo" a "en
  peligro"): ya no es una constante de código — se edita desde el panel de
  Ajustes (0 a 3, en pasos de 0.5, escala 0–12), ver sección "Panel de
  Ajustes" más abajo. `MARGEN_RIESGO` sigue existiendo al principio de
  `src/runtime.js`, pero ahora es sólo el valor de fallback mientras el
  perfil no cargó todavía.

## Estructura del proyecto

```
package.json
build/build-app.mjs        → script de build (Node, sin dependencias)
src/app.html                → chrome estático + <template> de cada listado dinámico
src/styles.css              → tokens claro/oscuro, acentos de materia, layout
src/supabase-client.js      → credenciales + inicialización del cliente de Supabase
src/runtime.js              → router, auth, persistencia (Supabase), lógica de estilo/notas, CRUD
src/seed.js                  → datos de ejemplo (sin usar hoy, ver arriba)
out/Cursada.html             → el entregable final
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
- **Horario en pasos de media hora**: el horario semanal de cada materia
  admite bloques que empiezan o terminan en :30 (18:30–19:30), no sólo en
  punto — se guardan como hora decimal (`18.5` = 18:30) en `bloques`. La
  grilla de Horario tiene una fila cada 30 minutos (antes, una por hora),
  con la etiqueta de hora sólo en las filas en punto para no saturarla
  visualmente. Los `<input type="time">` del formulario tienen
  `step="1800"` para que el selector nativo del navegador también salte de
  a 30 minutos. Se corrigió junto con un bug real de Safari: `<input
  type="time">` no siempre dispara el evento `input` de forma confiable ahí
  mientras se escribe segmento por segmento, así que un horario tipeado
  podía quedar sin guardarse en el estado del formulario y volver a su
  valor anterior apenas se re-renderizaba la fila (por ejemplo, al tocar un
  día) — ahora también se escucha `change` como respaldo.

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
- **No hay estado "archivado" para un semestre — pero sí se puede eliminar
  (pedido explícito en una pasada posterior, ver sección "Progreso histórico
  entre semestres" más abajo).** Cambiar cuál semestre está activo sigue
  siendo la forma normal de "dejar atrás" uno sin perder nada; eliminar es
  para cuando de verdad no querés conservarlo — borra en cascada sus
  materias y las evaluaciones de agenda de esas materias, con confirmación
  previa mostrando cuánto se va a borrar.
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

**Alta de la primera materia, sin ningún semestre todavía:** una cuenta
nueva arranca sin materias ni semestres (ya no hay semilla automática, ver
"Cuenta y sincronización (Supabase)"). Si creás tu primera materia sin haber
creado nunca un semestre, `src/runtime.js` crea uno solo ("Semestre actual",
activo) en el momento, antes de guardar la materia — no hace falta que
notes este paso, es transparente. Como red de seguridad adicional (no un
camino esperado en uso normal), `ensureSemestresServerSide()` corre una vez
después de cada login: si por algún motivo tu cuenta tiene materias sin
ningún semestre, hace lo mismo. Exportar incluye `semestres` en el JSON;
importar un JSON viejo (de antes de que existiera el concepto de semestre)
arma un semestre "Importado" y le asigna todas las materias del archivo,
para que ninguna quede huérfana — mismo criterio que la migración de
`localStorage` a tu cuenta, ver esa sección para el detalle completo de
cómo se resuelven los ids al importar.

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

## Cuenta y sincronización (Supabase)

Un cuarto pedido, después de los tres handoffs de diseño, cambió la
arquitectura: la app dejó de ser "un archivo que funciona sin conexión" y
pasó a requerir cuenta e internet para sincronizar. Fue un pedido explícito
de cambio de arquitectura, no un ajuste — el trade-off (perder el
funcionamiento 100% offline a cambio de tener los datos en la nube,
accesibles desde cualquier dispositivo) fue aceptado y buscado de entrada.

**El proyecto de Supabase (base, tablas, RLS, bucket de fotos) ya estaba
armado** de antes — no se creó desde acá. El trabajo fue sólo del lado del
cliente: conectar la app a esa base.

- **Esquema**: 4 tablas (`semestres`, `materias`, `agenda`, `personal`) más
  `profiles` (una fila por usuario, se crea sola con un trigger al
  registrarse). Las columnas de la base están en `snake_case`
  (`materia_id`, `color_id`, `todo_el_dia`, `semestre_id`) mientras el
  código JS sigue en `camelCase` (`materiaId`, `colorId`, `todoElDia`,
  `semestreId`), igual que siempre — la conversión vive en un puñado de
  funciones `rowToX()`/`xToRow()` al principio de `src/runtime.js`, no
  esparcida por el resto del archivo.
- **Row Level Security** está activada en las 4 tablas: cada usuario sólo
  puede leer/escribir sus propias filas (`auth.uid() = user_id`). Esto
  significa que el cliente nunca filtra "traeme sólo lo mío" a mano — Supabase
  ya lo hace solo — pero si hacés una consulta sin sesión activa, te
  devuelve vacío, no un error; por eso ninguna pantalla de datos se muestra
  sin sesión (ver "Flujo de autenticación").
- **`semestres` tiene un índice único parcial** que impide más de un
  `activo:true` por usuario a nivel de base de datos (no sólo a nivel de
  UI). El código respeta esto mandando primero "desactivar el semestre
  viejo" y después "activar el nuevo" como dos llamadas secuenciales — nunca
  las manda en el mismo lote, para no arriesgarse a que la base rechace un
  upsert con dos filas `activo:true` a la vez.
- **Storage**: bucket `avatars`, público de lectura, escritura restringida
  al dueño (`avatars/{user_id}/avatar.jpg` — mismo nombre de archivo
  siempre, así una foto nueva simplemente pisa a la anterior).

### El patrón de persistencia: caché en memoria + `save*Raw()` asíncrono

Antes de este cambio, cada colección tenía funciones puente
`loadXRaw()`/`saveXRaw(a)` que leían y escribían `localStorage`
directamente, síncronas. Todo el resto del código (cálculos, render, CRUD)
sólo conocía esas funciones, nunca `localStorage` en sí — ese fue
exactamente el punto de enganche para no tener que reescribir el resto.

- `loadXRaw()` sigue siendo **síncrona**: lee de un caché en memoria
  (`CACHE.materias`, `CACHE.agenda`, etc.) que se llena una vez al iniciar
  sesión. Esto es lo que evitó tener que convertir a `async` los ~30
  lugares que sólo *leen* datos (`computeMaterias()`, todos los `render*()`,
  etc.) — siguen funcionando exactamente igual que antes.
- `saveXRaw(a)` pasó a ser **asíncrona** (devuelve `Promise<boolean>`):
  compara el array nuevo contra el caché para saber qué filas borrar, sube
  el array entero con `upsert()` (son colecciones chicas — decenas de
  filas, no miles — así que upsertear todo es más simple y robusto que
  diffear campo a campo) y actualiza el caché recién si la llamada a
  Supabase salió bien. Cada uno de los ~10 lugares que *escriben* datos
  (los `submit` de los 3 modales, sus botones de eliminar, borrar-todo,
  importar, crear/renombrar/activar semestre) pasó a ser `async`/`await` —
  es el único cambio mecánico que se repite en todo el archivo.
- Un guardado fallido (sin internet, sesión vencida) no dice "guardado" y
  sigue de largo: `avisarError()` reemplaza al viejo aviso de
  "localStorage bloqueado" con un mensaje genérico de conexión, y el modal
  correspondiente se queda abierto (no se cierra en falso) para que puedas
  reintentar.

### Flujo de autenticación

- **Mientras se confirma si había sesión guardada** (Supabase tarda un
  instante en resolver esto al abrir la app) se ve una pantalla de carga
  simple, con el isotipo girando. Es el mismo estado que se muestra
  mientras se cargan tus datos después de un login exitoso.
  Si esa carga de datos falla (sin internet, error del servidor), se
  muestra una pantalla de error con un botón "Reintentar" en vez de dejar
  alguna vista a medio armar o en blanco.
- **Sin sesión activa**, la app no muestra ninguna pantalla de datos — sólo
  la pantalla de login/registro: un botón "Continuar con Google" arriba de
  todo y, debajo de un separador, el formulario de email + contraseña (que
  alterna entre "Iniciar sesión" y "Crear cuenta" con un toggle). El
  proveedor de Google se habilitó del lado de Supabase (fuera de este
  código, igual que el resto del proyecto) — acá sólo se agregó el botón y
  su manejo de errores.
- **Google necesita una URL http(s) real para el viaje de ida y vuelta**
  (`signInWithOAuth()` redirige la pestaña entera a Google y Supabase te
  trae de vuelta a `redirectTo`, que la app arma a partir de
  `location.href`) — no funciona si abriste el archivo con doble clic
  (`file://`), porque ni Google ni Supabase pueden redirigir a una ruta de
  archivo local. En ese caso el botón queda visible pero deshabilitado, con
  un tooltip que lo explica, en vez de fallar en silencio. Si volvés de
  Google con un error (cancelaste el consentimiento, el proveedor no está
  habilitado, etc.), la app lo detecta en el hash de la URL (`#error=…`), lo
  traduce y lo muestra en la misma pantalla de login — y limpia ese hash de
  la URL para que el router de la app no lo confunda con una vista ni quede
  pegado ahí en un refresh.
- El proyecto de Supabase tiene **confirmación de email activada**: al
  registrarte no queda una sesión activa hasta que confirmás el mail que te
  llega. La app lo detecta (`signUp()` no devuelve sesión) y, en vez de un
  texto chico al lado del formulario, reemplaza toda la tarjeta de login por
  una pantalla dedicada de "Confirmá tu cuenta" — con el email al que te
  escribimos, un botón para reenviar el mail (`supabase.auth.resend()`, con
  su propio feedback si falla) y un botón "Ya confirmé, iniciar sesión" que
  vuelve al formulario en modo login con el email precargado. Si el proyecto
  tuviera la confirmación de email desactivada (`signUp()` devuelve sesión
  de una), se muestra en cambio un toast breve de "¡Cuenta creada!" antes de
  entrar directo a la app — mismo evento, dos configuraciones posibles del
  proyecto, cada una con su propio feedback en vez de dejarlo implícito.
- Perfil (tocar tu nombre/avatar en el side nav) y cerrar sesión (el botón
  de al lado) viven en el mismo lugar donde ya vivían los demás controles
  de alcance global (tema, semestre) — no se agregó un lugar nuevo en la
  barra superior para no competir con las acciones de cada vista.

### Recuperación de contraseña

`.auth-card` pasó de 2 paneles (login, confirmá tu cuenta) a 5 — se
generalizó el show/hide puntual que ya existía en un solo `showAuthPanel(id)`
que oculta los otros 4 y muestra el pedido, en vez de un par de
`classList.add/remove('hidden')` sueltos por cada combinación nueva.

- **"¿Olvidaste tu contraseña?"** vive como link debajo del campo de
  contraseña, dentro del formulario pero fuera del `seg` Iniciar
  sesión/Crear cuenta — es una acción aparte, no un tercer modo de ese
  toggle. Se oculta en modo "Crear cuenta" (no aplica, todavía no hay
  contraseña que recuperar).
- **Pedir el mail**: un panel con un solo campo, llama a
  `resetPasswordForEmail(email, { redirectTo })` — el mismo `redirectTo`
  que ya usaba el botón de Google (`location.href` sin el hash), ahora en
  una función compartida (`authRedirectUrl()`) en vez de repetido en las dos
  llamadas. La confirmación ("revisá tu email") es siempre el mismo mensaje
  genérico, nunca condicional a si la llamada realmente encontró una cuenta
  con ese mail — es el comportamiento por defecto de Supabase (no filtra qué
  emails están registrados) y no tiene sentido armarle un mensaje propio que
  lo contradiga.
- **Volver del link del mail**: Supabase establece una sesión temporal a
  partir del token de la URL y dispara el evento `PASSWORD_RECOVERY` (no
  `SIGNED_IN`) — se intercepta ANTES de la rama genérica de
  `onAuthStateChange` que arranca la app, así que esa sesión temporal nunca
  llega a mostrar el dashboard. En su lugar se ve una pantalla dedicada
  (mismo patrón visual que el resto de `auth-screen`) con contraseña +
  confirmación. Al guardar (`updateUser({ password })`), esa sesión temporal
  ya queda como una sesión válida — se entra directo a la app
  (`onSignedIn(res.data.user)`), sin pedir un login aparte.
- **Errores**: contraseñas que no coinciden y contraseña corta (mismo
  mínimo de 6 caracteres que el registro) se validan en el propio
  formulario, antes de llamar a Supabase. Un link vencido o ya usado nunca
  llega a generar sesión ni evento `PASSWORD_RECOVERY` — Supabase vuelve en
  cambio con `#error=access_denied&error_code=otp_expired&…` en el hash, el
  mismo mecanismo que ya manejaba `mostrarErrorOAuthSiHay()` para los
  errores de Google, así que no hizo falta un camino nuevo — sólo un ajuste
  de orden en `traducirErrorAuth()`: Supabase reusa el código genérico
  `access_denied` tanto para "cancelaste el login de Google" como para
  "este link venció", así que el chequeo específico (`otp_expired`) tiene
  que evaluarse antes que el genérico, si no siempre gana el mensaje de
  Google. El aviso de link vencido señala el mismo camino para pedir uno
  nuevo: el link de "¿Olvidaste tu contraseña?".

### Manejo de sesión expirada en medio del uso

Antes, un guardado fallido (por cualquier motivo) mostraba siempre el mismo
`avisarError()` genérico ("revisá tu conexión a internet") — si la causa
real era que el token venció, el mensaje no tenía nada que ver con lo que
había que hacer (iniciar sesión de nuevo, no revisar el wifi).

- **`esErrorSesionVencida(e)`** clasifica el error antes de decidir qué
  mostrar: `.status === 401`, `.code === 'PGRST301'` ("JWT expired", el
  código que devuelve PostgREST) o un puñado de mensajes conocidos de
  auth-js (`Invalid Refresh Token`, `session_not_found`, etc.) cuentan como
  sesión vencida; cualquier otra cosa sigue el camino genérico de siempre.
  Es best-effort: no se pudo probar contra un JWT realmente vencido en este
  entorno (tarda ~1h en vencer solo) — quedó documentado en el propio
  comentario de la función para que, si en producción aparece un caso que
  esta regex no agarra, sumarlo ahí sea el único cambio que hace falta (ya
  está conectado a los tres lugares que lo necesitan, no repartido).
- **Dos caminos, una sola pantalla**: `mostrarSesionVencida()` es el punto
  al que confluyen (a) un guardado que falla con ese tipo de error
  (`makeSaver`/`saveSemestresRaw`, y también la carga inicial de datos en
  `loadAllFromSupabase()`) y (b) un evento `SIGNED_OUT` que Supabase dispara
  solo — sin que medie ningún guardado — cuando determina que el refresh
  token ya no sirve. Para (b) hacía falta distinguirlo de un logout
  deliberado (el botón "Cerrar sesión" también dispara `SIGNED_OUT`): un
  flag (`CERRANDO_SESION_DELIBERADO`) se marca justo antes de los dos únicos
  `signOut()` intencionales de la app (el botón de logout y el botón de la
  propia pantalla de sesión vencida) — si `SIGNED_OUT` llega sin ese flag
  marcado, es Supabase cerrando la sesión sola.
- **Qué hace `mostrarSesionVencida()`**: limpia `CACHE`/`CURRENT_USER` (como
  un logout), cierra cualquier modal que haya quedado abierto directamente
  (no vía `closeModalEl()`, que preguntaría "¿descartar cambios?" — ver
  la decisión de abajo) y muestra `gate-sesion-vencida`, una pantalla más
  con el mismo tratamiento visual que `gate-loading`/`gate-error`
  (`.gate-screen`), con un botón "Iniciar sesión de nuevo" que lleva al
  login. Un guard (`SESION_VENCIDA_MOSTRADA`) evita mostrarla dos veces si,
  por ejemplo, un guardado falla y además dispara el `SIGNED_OUT` automático
  casi al mismo tiempo — y hace que `avisarError()` se vuelva un no-op
  mientras tanto, para no terminar con el `alert()` genérico apilado encima
  de la pantalla dedicada.
- **Decisión: no se preserva el formulario del modal abierto.** Si el
  guardado que reveló la sesión vencida venía de un modal (materia,
  evaluación, evento personal o perfil) con datos sin guardar, esos datos se
  pierden — se prefirió un aviso claro y confiable antes que un intento de
  preservación. La razón: cada uno de los 4 modales tiene, además de los
  campos con `name` de su `<form>`, estado que vive en `STATE.editing` y no
  en el formulario (colores, franjas horarias y escala de nota en el modal
  de materia; tipo de evaluación en el de evaluación; "todo el día" en el de
  evento) — preservarlo de verdad significa, para cada uno, volver a armar
  ese estado no-formulario y volver a llamar a los `render*()` puntuales que
  lo pintan (swatches de color, filas de horario, grilla de escala), no sólo
  guardar un objeto y reabrir el modal. Es una sesión vencida en medio de un
  modal abierto — un caso posible pero poco frecuente — contra una
  ampliación real del alcance en las 4 aperturas de modal existentes; no
  valía la complejidad para este pedido.

### Perfil de usuario

Nombre, apellido, edad, facultad, carrera, teléfono y foto se editan desde
un único modal de perfil (mismo patrón visual que los otros 3 modales de la
app), reusado en dos contextos distintos — ver "Completar perfil" más
abajo. La foto se recorta a cuadrado (centrado) y se reescala a 256px de
lado con `<canvas>` antes de subirse — no hace falta un avatar más grande en
ningún lugar de la interfaz, y subir el archivo original sin comprimir
hubiera sido innecesariamente pesado. Sin foto, el avatar muestra las
iniciales del nombre (o la primera letra del email, si todavía no cargaste
un nombre) sobre un color de la misma paleta de 9 acentos que ya usan las
materias (`ACCENTS`) — el color es determinístico por usuario (siempre el
mismo, elegido a partir de tu id de cuenta), no aleatorio en cada carga.

`facultad`, `carrera`, `edad` y `telefono` (además de `apellido`) se
agregaron a `profiles` en un pedido posterior, del lado de Supabase (no
desde este código) — junto con un trigger `handle_new_user()` que, si el
registro trae estos datos en `raw_user_meta_data`, los copia solos a la
fila de `profiles` en el mismo momento de crear la cuenta. Esa parte es
100% del lado de la base; el trabajo de acá fue mandarle esos datos cuando
existen (registro por email) y ofrecer una forma de completarlos cuando no
(Google, o una cuenta vieja).

- **Registro por email**: el formulario de "Crear cuenta" pide, además de
  email y contraseña, nombre, apellido, edad, facultad, carrera y teléfono
  — se mandan en `options.data` de `signUp()`, y el trigger de la base los
  copia solo. **Ninguno de estos 6 campos es obligatorio para poder
  registrarte** (no tienen `required`) — se puede crear una cuenta con sólo
  email y contraseña, a propósito: exigir todo de entrada suma fricción justo
  en el paso donde menos la querés, y lo que quede sin completar se te
  vuelve a pedir después (ver "Completar perfil"). La edad, si la cargás, se
  manda como número (no como texto) y el input tiene `min="14" max="99"`
  como única validación de rango — nada más elaborado, como pedía el
  alcance.
- **Registro por Google**: Google no deja interponer un formulario propio
  antes de volver a la app, así que estos datos (más allá de lo que
  Supabase/Google puedan completar solos) quedan vacíos hasta que se
  completan a mano — ver "Completar perfil" a continuación.

### Completar perfil

Después de cada login exitoso (de cualquier tipo — email, Google, o una
sesión que ya tenías guardada), la app revisa tu fila de `profiles`. Si
**`facultad`, `carrera` o `telefono`** están vacíos, se abre el mismo modal
de perfil que usa la edición manual desde el side nav — no hay dos
formularios de perfil en el código, sólo un `modo` que cambia el título, el
texto de contexto, y si se puede posponer o no. Ese `modo` sale de una sola
pregunta: **¿la cuenta se creó con Google?** (`CURRENT_USER.app_metadata.provider
=== 'google'`).

- **Cuenta de email** → modo *no bloqueante* ("Completá tu perfil"): se
  puede cerrar con "Completar más tarde" sin completar nada y seguir usando
  el resto de la app con normalidad. Vuelve a aparecer en el próximo login
  mientras sigan faltando esos datos — a propósito, sin un flag de "no
  preguntar más" (a diferencia del aviso de importar datos locales, que si
  se descarta no vuelve a preguntar en ese navegador): acá el pedido era
  insistir suavemente en cada login hasta completarlo, sin bloquear nada. El
  disparador son sólo esos 3 campos (no nombre/apellido/edad/foto), porque
  ya tuvieron su oportunidad de cargarse en el formulario de registro por
  email y quedaron opcionales ahí a propósito.
- **Cuenta de Google** → modo *obligatorio* ("Completá tu perfil para
  continuar"): Google no deja interponer un formulario propio antes de
  crear la cuenta, así que este es el único lugar donde se pueden pedir
  estos datos — acá sí son obligatorios, los 6 (nombre, apellido, edad,
  facultad, carrera, teléfono), no sólo los 3 que gatillan el aviso, porque
  con Google no llegó ninguno. No hay botón de cancelar ni X para cerrar, el
  click en el backdrop y Escape no cierran el modal, y los 6 campos tienen
  `required` — la única salida es completarlos y guardar. La cierre está
  bloqueada porque `closeModalEl()` se niega a cerrar este modal mientras un
  flag (`PERFIL_MODAL_BLOQUEANTE`) esté activo — un solo punto de control en
  vez de parchear cada camino de cierre (X, Cancelar, backdrop, Escape) por
  separado.
  - **Aparece antes que nada, como una pantalla más — no como un modal
    encima del dashboard.** `onSignedIn()` llama a
    `esperarCompletarPerfilObligatorio()` (que devuelve una Promise, resuelta
    recién cuando se guarda el formulario) **antes** de revelar `#app` — así
    que mientras esto está pendiente, `#app` sigue oculto (igual que durante
    la pantalla de login) y no hay ningún dashboard de fondo para tapar. Con
    `#app` oculto, técnicamente ni haría falta ocultar el fondo del modal,
    pero además se le agrega la clase `.is-gate`, que le cambia el fondo
    translúcido habitual por uno sólido (mismo tratamiento que
    `auth-screen`/`gate-screen`) y lo centra verticalmente — para que en
    todo momento se vea y se sienta como una pantalla de la secuencia de
    login, no como un diálogo. Recién cuando se guarda, `onSignedIn()`
    continúa: revela `#app`, y si no tenés ninguna materia todavía, ahí sí
    aparece la pantalla de bienvenida ("Crear mi primera materia") — nunca
    antes de completar el perfil.
- **Prioridad con los otros avisos post-login**: completar perfil
  obligatorio (cuentas de Google) es lo primero de todo, antes incluso de
  revelar la app. Una vez adentro, importar datos locales y completar
  perfil no bloqueante (cuentas de email) y onboarding son excluyentes entre
  sí (para que uno no tape visualmente al otro): importar datos locales
  primero (hay datos reales de por medio), completar perfil no bloqueante
  después, onboarding al final si seguís sin ninguna materia cargada.

### Migración de datos que ya tenías en `localStorage`

Si veniamos probando esta app antes de que existiera Supabase (o alguien
abre esta versión en un navegador donde ya había datos de la versión
100% local), esos datos no se pierden ni se suben solos: después del primer
login, si la app encuentra datos bajo las claves viejas `cursada:*` en ese
navegador, te ofrece un aviso explícito — "Importar mis datos locales a tu
cuenta" — con un resumen de cuántas materias/evaluaciones/eventos
encontró. Sólo se sube si tocás el botón; si tocás "No, gracias", no te
vuelve a preguntar en ese navegador para esa cuenta (se guarda un flag en
`localStorage`, por cuenta y por navegador — así que si tenés datos viejos
en *otro* navegador o dispositivo, ahí sí te va a preguntar, correctamente).
Los datos viejos nunca se borran del navegador como parte de este flujo
(son sólo lectura) — importar es una operación de "sumar", no de "mover".

Los ids del lote importado **siempre se regeneran** (nunca se reusan los
que traía `localStorage`), armando un mapa id-viejo → id-nuevo para poder
resolver las referencias (`materia.semestreId`, `agenda.materiaId`) con los
ids nuevos — así nunca hay riesgo de que un id viejo choque con uno que ya
exista en la cuenta de destino. Semestres se importan primero (las materias
los referencian), materias antes que agenda (agenda referencia materias).
Si la cuenta de destino ya tiene un semestre activo, los semestres
importados entran todos inactivos — evita chocar con la restricción de "un
solo activo" de la base; podés activar uno del selector después. El mismo
código (`importCollections()`) también es lo que usa el botón "Importar" de
la barra superior para un JSON exportado — misma semántica, un solo lugar.

### Build: el SDK de Supabase

`build/build-app.mjs` sigue concatenando `src/*` en un único HTML sin
bundler ni paso de compilación nuevo, pero ahora agrega un
`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">`
(CDN de jsdelivr) antes de `src/supabase-client.js` — es la única llamada
de red que agrega el *build* en sí; las que la app hace en tiempo real
contra Supabase son aparte y son el punto central de este cambio. Las
credenciales (`SUPABASE_URL`, la clave `anon`) viven en un único lugar,
`src/supabase-client.js`, no repetidas. La clave `anon` es pública por
diseño — está pensada para vivir en el código del cliente; la seguridad
real la da Row Level Security en las tablas, no el secreto de esa clave.

### Qué falta para producción real

Esto funciona y está probado, pero quedó pensado para uso personal/demo, no
para lanzarlo como producto con usuarios que no controlás vos. Antes de eso
faltaría, como mínimo:

- **Dominio propio** para el `out/Cursada.html` publicado (hoy, si se abre
  como archivo local o desde cualquier host genérico, los links de
  confirmación de email de Supabase igual funcionan, pero no hay una URL
  "oficial" del producto).
- **Políticas de contraseña** más allá del mínimo de 6 caracteres que exige
  Supabase por defecto (longitud/complejidad configurable desde el panel de
  Supabase, no desde este código).
- **Límites de rate** en signup/login más allá de los defaults del proyecto
  de Supabase (protección contra fuerza bruta / spam de cuentas) — revisar
  la configuración del proyecto, no algo que se controle desde el cliente.
- **Login social más allá de Google** (Apple, etc.) — Google ya se agregó;
  el resto sigue fuera de alcance por ahora.
- **Dominio real para que Google OAuth funcione siempre**: el botón de
  Google necesita que `redirectTo` sea una URL que Supabase tenga en su
  lista de "Redirect URLs" permitidas (configuración del proyecto, no de
  este código) — con un dominio propio, ese paso se configura una sola vez;
  sin él, hay que ir agregando cada URL http(s) nueva desde la que se sirva
  el archivo.
- **Verificación de dominio de email / anti-spam** para que los mails de
  confirmación (y los de recuperación de contraseña) no caigan en spam en
  proveedores grandes — depende de la configuración de SMTP del proyecto de
  Supabase (por defecto usa un servicio compartido con límites bajos,
  pensado para desarrollo).

## Accesibilidad y guidelines de interfaz web

Pasé `src/app.html`, `src/styles.css` y `src/runtime.js` por una revisión
contra las [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
y corregí todo lo que encontró. Lo más importante:

- **Filas y tarjetas clicables navegables por teclado.** Materia-card,
  prox-row, riesgo-row, nota-row, eval-row, agenda-row, la fila de la tabla
  de materias, las celdas del calendario (y sus eventos anidados), las
  tarjetas del panel lateral del calendario y los bloques de la grilla de
  Horario eran `<div>`/`<tr>` con sólo `click` — nadie que navegara solo con
  teclado podía abrirlos. Ahora todos pasan por `makeRowClickable()`
  (`src/runtime.js`): `role="button"` + `tabindex="0"` + Enter/Espacio. No
  se convirtieron a `<button>` reales porque varias contienen un checkbox
  real adentro (eval-row, agenda-row) o son `<tr>`/celdas con más de un
  elemento clicable anidado (cal-cell) — anidar contenido interactivo
  dentro de un `<button>` es HTML inválido, así que el patrón ARIA de
  "widget interactivo custom" es el correcto acá, no una conversión de tag.
- **Jerarquía de encabezados real.** Los títulos de cada vista, de cada
  modal, los panel-title y el nombre de la materia en Detalle y en cada
  tarjeta eran `<span>` sin semántica — pasaron a `<h1>`–`<h3>` reales (un
  reset en CSS los deja viéndose exactamente igual; el tag ya no controla
  el estilo, la clase sí). Antes no había un solo heading en toda la app.
- **Formularios**: cada `<label>` quedó asociado a su input via `for`/`id`
  (antes ninguno lo estaba — tocar el texto de la etiqueta no enfocaba el
  campo); se agregó `spellcheck="false"` a email/contraseña/código; los
  grupos de controles custom (colores de materia, chips de tipo/materia,
  franjas horarias, categoría del evento) quedaron con `role="group"` +
  `aria-labelledby`.
- **Foco de teclado**: `:focus` pasó a `:focus-visible` en los inputs (así
  el anillo de foco no aparece con un click de mouse), y se agregó un
  anillo genérico para botones y las filas/tarjetas custom que antes no
  tenían ninguno.
- **`prefers-reduced-motion`**: ahora se respeta globalmente (reduce
  duración de animaciones/transiciones a casi cero) — antes el spinner de
  carga y las transiciones de menú/switch corrían siempre.
- **Filtros, búsqueda y vista quedan en la URL** (Materias, Agenda,
  Calendario) — antes vivían sólo en memoria; el botón atrás y recargar la
  página los perdían. Ahora `#materias?filtro=cursando&q=algebra` es un
  link válido que reconstruye exactamente esa vista.
- **Aviso de cambios sin guardar**: cerrar el modal de materia, evaluación,
  evento personal o perfil con datos tipeados y sin guardar (X, Cancelar,
  click afuera, Escape) ahora confirma antes de descartarlos — comparando
  una "foto" del formulario tomada al abrir contra su estado actual.
- Otros ajustes puntuales: `aria-live` en el toast y los mensajes de error,
  `aria-label` en botones de sólo ícono, `color-scheme:dark` en el tema
  oscuro, `overscroll-behavior:contain` en los modales, `touch-action` y
  `-webkit-tap-highlight-color` en los botones, y la transición del menú
  mobile pasó de animar `left` a `transform` (compositor, no layout).

**Lo que decidí no tocar:** las fechas se siguen formateando a mano
(`DIAS_LARGOS`/`MESES_LARGOS` en `src/runtime.js`) en vez de con
`Intl.DateTimeFormat`. La guideline lo pide para evitar formatos
incorrectos entre locales, pero esta app tiene un único locale de destino
fijo por diseño (rioplatense/uruguayo — ver el resto de este README) con
abreviaturas específicas ("set" para setiembre, por ejemplo) que
`Intl.DateTimeFormat('es-UY', …)` no necesariamente reproduce igual;
cambiarlo arriesgaba romper una decisión de copy ya tomada a propósito,
por una ganancia que no aplica acá (no hay ni va a haber un segundo
locale).

## Animación

Pasada de pulido siguiendo la filosofía de Emil Kowalski (curvas de easing
con carácter, feedback de presión, nada de animar lo que se usa cientos de
veces por día). Antes casi todo en la app era instantáneo — un salto de
`display:none` a `flex`, un color que cambiaba de golpe — lo que en la
mayoría de los casos está bien (una lista de materias no necesita
animación), pero un puñado de lugares se sentían rotos en vez de rápidos.

- **Modales**: antes `display:none` ↔ `flex`, instantáneo. Ahora quedan
  siempre en `flex` (visibilidad real vía `opacity`+`visibility`+
  `pointer-events`, no `display`) para poder animar `opacity` y un
  `scale(.95→1)` en el `.modal`. Entran en 220ms, salen en 150ms — cerrar
  tiene que sentirse inmediato, nadie quiere esperar a que un modal se
  vaya. `transform-origin` se queda en el centro (default): a diferencia
  de un popover, un modal no sale de ningún disparador puntual.
- **Toast**: usaba la clase genérica `.hidden` (display:none), que bloquea
  cualquier transición — pasó a su propia clase `.is-open` y ahora sube
  deslizándose desde abajo (siempre desde el mismo lugar) en vez de
  aparecer de golpe.
- **Botones y filas/tarjetas clicables**: `transform:scale(.97)` al
  presionar (`:active`), 120ms — aplicado de forma universal a
  `button`/`[role="button"]` (cubre los ~15 tipos de botón de la app y las
  filas custom de `makeRowClickable()`, ver la sección de accesibilidad)
  en vez de repetirlo por componente.
- **Pills, chips, segmentos, swatches, días de franja horaria**: se tocan
  seguido (filtros, horarios) — el toque es a propósito chico y rápido
  (120ms), no una animación vistosa; antes el cambio de color al
  seleccionar era instantáneo y se sentía tosco.
- **Cajón mobile**: pasó de animar `left` (dispara layout) a `transform`
  (sólo compositor), y de una curva `ease` genérica a `--ease-drawer`
  (`cubic-bezier(.32,.72,0,1)`, la curva "estilo iOS" que usan Vaul/Ionic)
  — se siente mucho menos plana. El backdrop ahora funde en sincro en vez
  de aparecer de golpe.
- **Login/onboarding**: entrada sutil (`@starting-style`, fade + subir
  10px) sólo ahí — son pantallas que se ven una vez por sesión, así que
  hay margen para un toque más perceptible que en el resto de la app. Las
  pantallas de carga (`gate-loading`/`gate-error`) quedaron **sin**
  animación de entrada a propósito: son estados de carga, tienen que
  aparecer lo más rápido posible, no competir con su propio spinner.
- Curvas nuevas en `:root` de `src/styles.css`: `--ease-out`
  (`cubic-bezier(.23,1,.32,1)`) para lo que entra/aparece, `--ease-in-out`
  (`cubic-bezier(.77,0,.175,1)`) para lo que se mueve en pantalla (el knob
  del switch), `--ease-drawer` para cajones — las curvas nativas de CSS
  son demasiado débiles para sentirse intencionales.

Todo lo de acá arriba ya pasa por el `@media(prefers-reduced-motion:reduce)`
global que reduce duración de animaciones/transiciones a casi cero (ver
sección de accesibilidad) — no hizo falta tocar nada aparte para respetarlo.

**Lo que decidí no animar**: el cambio de vista (Inicio/Materias/Agenda/…)
sigue siendo instantáneo (`.hidden` en cada `<section>`) — es de lo que más
se toca en toda la sesión, y en Raycast/command palettes ese es
exactamente el tipo de acción que no debería tener ninguna animación.
Tampoco animé el anillo de nota (`conic-gradient`) llenándose de 0 al valor
real: es un lindo detalle pero aparece en Materias/Inicio, vistas de uso
muy frecuente, y `@property` para animar un `conic-gradient` agrega
complejidad para un beneficio marginal ahí.

## Calendario

Rediseño de usabilidad/legibilidad del Calendario (vista mes y semana), en PC
y en celular. Dos problemas de fondo, no de superficie:

**1. La grilla no mostraba las clases.** `eventosDeDia()` sólo lee `agenda`
(evaluaciones) y `personal` — el horario semanal de cada materia (`bloques`)
nunca se pintaba en la celda, sólo aparecía como texto plano ("2 clases").
Resultado: un estudiante con clase todos los días veía un calendario casi
vacío. Ahora `clasesDeDia(dow)` arma esas clases desde `computeMateriasDelActivo()`
y se mezclan (ordenadas por hora) con evaluaciones y personal en una sola
lista de ítems con punto de color — el mismo `m.strong` que ya usan la
leyenda "Referencias" y el Horario semanal, así que el color de una materia
es consistente en toda la app. Click en un punto de clase navega a
`#materia-<id>`; click en un punto de evaluación/personal abre su modal
(igual que antes).

**2. El header de la vista se rompía en mobile.** `.topbar` tenía `height:62px`
fijo con `flex-wrap:wrap` — cuando el contenido no entraba en una fila (el
caso normal en celular: título + navegación + "hoy" + selector Mes/Semana +
botón), el wrap ocurría igual pero la altura fija no crecía, así que la
segunda fila quedaba **superpuesta** encima de la grilla en vez de debajo.
Se veía en Calendario (el toggle Mes/Semana tapando los días de la semana)
y también en Inicio (el botón "+ Nuevo" tapando el "Hola, `‹nombre›`").
Cambié `height:62px` fijo por `min-height:62px` (+ padding vertical): ahora
cuando envuelve a una segunda fila, el header simplemente crece. Corrige el
bug en toda la app, no sólo en Calendario.

Con eso resuelto, el resto es afinar densidad y legibilidad:

- **Celdas planas, no 42 tarjetas flotando**: `.cal-cell` pasó de
  `box-shadow` a un borde de 1px. Una sombra por celda, multiplicada por 42
  celdas visibles a la vez, satura la grilla — la sombra real queda para
  `.cal-day-card` en el panel lateral, donde sí comunica jerarquía (es *el*
  día elegido).
- **Recorte visible, no silencioso**: antes `.cal-cell{overflow:hidden}`
  cortaba ítems de más sin avisar si no entraban en la celda. Ahora el mes
  muestra hasta 3 ítems por día y agrega "+N más" si hay más — la semana
  (celda más alta, ya scrollea) los lista todos.
- **Semana ya no es una pared vacía**: al no pintar clases (problema 1), la
  vista Semana eran columnas casi en blanco con mucho aire. Con las clases
  reales adentro, bajé la altura mínima de celda de 420px a 340px (la info
  ya no necesita tanto alto).
- **Botones de navegación** (`‹` `›`): de 30×30 a 36×36 — mejor blanco de
  toque en celular.
- **`.cal-hoy-badge` (el pill "HOY")**: tenía `top:-8px`, es decir, se
  posicionaba *fuera* del borde de su propia celda — y esa celda tiene
  `overflow:hidden`, así que en varias filas de la grilla el badge quedaba
  cortado a la mitad. Pasó a `top:4px` (adentro del borde), sin recorte en
  ninguna fila.
- **Celular (`≤640px`)**: 7 columnas reales en ~45px de ancho de celda no
  dejan lugar para texto — probé mostrar el label igual y se cortaba a 2-3
  caracteres, pisando visualmente la celda vecina. Por debajo de ese ancho,
  cada ítem colapsa a sólo el punto de color (mismo patrón que Apple
  Calendar en vista mes); el detalle completo del día ya vive debajo, en el
  panel lateral, que en celular pasa a ocupar todo el ancho.

Probado en el harness mock (`build_test.py`) con datos de prueba realistas
(4 materias con horario, evaluaciones, personal), en claro/oscuro y en
375×812 (mobile) y desktop — sin errores de consola, sin overlaps, sin
texto cortado a mitad de palabra.

### Filtros y etiquetas (segunda pasada)

Después de la primera pasada, feedback directo: el código de materia ("AM2")
en el punto de una clase no sirve para nada en esta vista, y hacía falta
poder elegir qué se ve en el calendario (sólo clases, clases + evaluaciones,
o una materia puntual) en vez de todo siempre.

- **Filtros de tipo**: además del switch "Ver personales" que ya existía,
  se suman "Ver clases" y "Ver evaluaciones" en el sidenav de Calendario
  (`STATE.mostrarClases` / `STATE.mostrarEvaluaciones`) — tres switches
  independientes en vez de un enum fijo de combinaciones, así que "sólo
  clases" es simplemente apagar los otros dos.
- **Filtro por materia**: la leyenda "Referencias" (antes sólo decorativa,
  y limitada a 6 materias) pasó a ser el filtro — cada fila es clickeable,
  apaga/prende esa materia en la grilla y en el panel del día. Apagada, el
  punto de color queda hueco (`box-shadow` en vez de `background`, se lee
  como un checkbox destildado) en vez de sólo bajar la opacidad, que es
  menos obvio. Saqué el límite de 6: ahora es un filtro real, no tenía
  sentido esconder materias de la lista que las controla. `clasesDeDiaRaw(dow)`
  centraliza el filtrado (clases ocultas + materia oculta) una sola vez;
  tanto la grilla como `renderCalSide()` (que antes duplicaba esa lógica)
  arman su propio formato a partir de esa misma fuente.
- **Etiquetas, de código a información real**: una clase ya no muestra el
  código de la materia — muestra su nombre (la identidad ya la da el color
  + la leyenda; el código no era información nueva, era ruido). Una
  evaluación con materia ahora muestra "Materia: título" en vez de sólo el
  título pelado ("Análisis Mat. II: Primer parcial" en vez de "Primer
  parcial" a secas) — a diferencia de una clase, cada evaluación es un
  evento puntual y el color solo no alcanza para saber de qué materia es.
  Personal sigue mostrando sólo el título: no tiene materia, no hay nada
  que prefijar.

## Landing page (`Cursada Landing.dc.html`)

Página pública de marketing — la primera pantalla que ve alguien que todavía
no tiene cuenta, separada de la app autenticada. Nació como un handoff de
Claude Design (un `.zip` exportado desde claude.ai/design con el mockup en
`Cursada Landing.dc.html` + su runtime `support.js`), no como un pedido de
diseño desde cero acá.

### Qué es un handoff de Claude Design, y qué se hizo con él

El `.dc.html` no es HTML de producción: es un prototipo que corre dentro del
runtime propio de la herramienta de diseño (`support.js`, un motor tipo React
con su propia sintaxis — `<x-dc>`, `<sc-for list="{{ x }}">`, `{{ interpolación }}`,
atributos `style-hover=`/`style-active=`/`style-after=` que la herramienta
traduce a estados reales). Nada de eso se copió tal cual: **se recreó el
resultado visual en HTML/CSS/JS estático de verdad** (`src/landing.html`),
sin runtime ni dependencias — exactamente lo que pide el propio README del
handoff ("recreate pixel-perfectly… don't copy the prototype's internal
structure"). Cada pieza dinámica del mockup se resolvió así:

- Los `<sc-for>` sobre listas fijas (nav, KPIs del mini-dashboard, próximos
  vencimientos, horario semanal, semestres, testimonios, preguntas) se
  "desenrollaron" a mano en HTML plano — son datos de ejemplo fijos en el
  propio mockup, no había ningún estado real que preservar en un loop.
  Sólo dos widgets son genuinamente interactivos y sí se reimplementaron con
  JS de verdad: el selector de escala (Nota 0 a 12 / Puntaje / Porcentaje)
  y el acordeón de Preguntas — misma lógica que el `state`/`setState` del
  prototipo, en `document.querySelectorAll`/`addEventListener` planos.
- El selector de escala es un solo estado global que recalcula **todos**
  los números derivados a la vez (las 3 notas de ejemplo, el número grande
  "para exonerar…", la frase de aprobación, el promedio del mini-dashboard
  del hero, y la estadística de riesgo de la grilla de Funciones) — se
  replicó ese acoplamiento tal cual, aunque las últimas dos viven en otra
  sección de la página, porque así estaba en el prototipo. Sólo los números
  del panel interactivo (los que tenían `data-num` en el mockup) llevan la
  transición de blur al cambiar; los otros dos actualizan el texto sin
  animación, mismo comportamiento que el original.
- `style-hover`/`style-active`/`style-after` se tradujeron a clases CSS
  reales (`.lp-cta-lg:hover`, `.lp-tab:active`, `.lp-mark::after`, etc.) en
  un único `<style>` embebido — el resto de las propiedades (posición,
  tamaño, color base) se dejó como `style=""` inline, calcado del valor
  exacto del prototipo, para minimizar el riesgo de perder fidelidad visual
  en una transcripción tan grande.
- El scroll-reveal (`IntersectionObserver`, fade + `translateY(16px)`,
  stagger de hasta 3×60ms) y el shadow del header al scrollear se portaron
  casi literal desde el `componentDidMount()`/`componentDidUpdate()` del
  prototipo a JS plano al final de `src/landing.html`.
- `<sc-if value="{{ mostrarPreguntas }}">` (un prop para poder ocultar la
  sección completa desde el panel de la herramienta de diseño) se resolvió
  a "siempre visible" — es un flag de autoría del mockup, no algo que el
  sitio público necesite alternar en tiempo de ejecución.

### Dos huecos de responsive que traía el propio diseño

El `.dc.html` no tenía **ningún** `@media` (aparte de
`prefers-reduced-motion`) — se ve bien a los ~1240px en que se diseñó, pero
nadie lo había probado angosto. Probándolo en 375px aparecieron dos roturas
reales (no cosméticas, contenido literalmente superpuesto e ilegible), que
arreglé agregando el único responsive que el archivo no traía:

- **La grilla de "Funciones"** (`grid-template-columns:repeat(6,1fr)`, sin
  breakpoint) dejaba tarjetas de ~60px de ancho en un celular, todas
  amontonadas. Ahora colapsa a una columna por debajo de 820px
  (`.lp-funcs-grid`/`.lp-funcs-4`/`.lp-funcs-2`).
- **El header** (logo + 3 links + 2 botones en una sola fila, sin
  breakpoint) se pisaba por completo a 375px. Por debajo de 700px se
  esconden el nav del medio y "Iniciar sesión" (Funciones/Cómo calcula tu
  nota/Preguntas siguen alcanzables scrolleando, y se repiten en el footer;
  "Crear mi cuenta" es el único CTA que queda, y ya alcanza para todo lo que
  hace esta página). No se armó un menú hamburguesa — el diseño no
  especificaba ninguno y hubiera sido inventar UI no pedida en vez de tapar
  el hueco real.

En ambos casos hizo falta mover la propiedad en cuestión
(`grid-template-columns`, `display`) del `style=""` inline a una clase CSS,
porque un inline style le gana a cualquier regla de media query salvo con
`!important` — se optó por lo primero, es más limpio.

El resto de las secciones (hero, "cómo calcula tu nota", cuenta, testimonios,
preguntas, footer) ya usaban `flex-wrap:wrap` con `min-width` en el propio
diseño y absorben el angosto sin ayuda — probado sin overflow horizontal en
375px salvo un recorte menor y contenido del mockup del hero (tiene
`min-width:340px` y el `overflow-x:hidden` del propio diseño ya lo esperaba;
no es scroll de página, es sólo un recorte visual del decorado).

### Es la puerta de entrada, no una página suelta

La landing **es** el punto de entrada de toda la plataforma, no un archivo
más al lado de la app — `build/build-landing.mjs` la escribe en
**`out/index.html`** (no `landing.html`) a propósito: es el nombre que
cualquier hosting estático sirve solo en la raíz del dominio, sin configurar
nada aparte. Sus 4 CTAs ("Crear mi cuenta" ×3, "Iniciar sesión") apuntan con
ruta relativa a `Cursada.html` — la app autenticada es el paso siguiente, no
el primero. Esto asume que `out/index.html` y `out/Cursada.html` se sirven
juntos, desde el mismo directorio (ambos build scripts ya escriben ahí) — si
el día de mañana la app se sirve desde otro dominio o subruta, ese único
`href="Cursada.html"` (4 apariciones) es lo que hay que actualizar.

### Build y build:landing

A diferencia de `build-app.mjs`, no hay nada que concatenar: `src/landing.html`
ya trae su propio `<style>` y `<script>` embebidos (una sola página
autocontenida, sin Supabase ni dependencias de otros módulos de `src/`), así
que `build/build-landing.mjs` sólo la envuelve con el doctype/head/favicon de
marca (mismo isotipo que `build-app.mjs`) y la escribe en `out/index.html`.
`npm run build` corre los dos builds (`build:app` y `build:landing`) en
secuencia.

### Lo que no se tocó

- La foto de la tarjeta "Agenda y calendario juntos" sigue siendo el
  placeholder de picsum.photos del prototipo
  (`picsum.photos/seed/cursada-escritorio-apuntes-facultad/…`) — no había
  ninguna foto real provista en el handoff, y no es algo que se pueda
  resolver generando contenido; hace falta una foto real (o un pedido
  explícito de generarla) para reemplazarla.
- El copy, los testimonios y los datos de ejemplo (Joaquín, Valentina,
  Nicolás, las 4 preguntas) son los que ya traía el mockup — no se
  inventó ni se editó texto nuevo.

## Optimización mobile de toda la interfaz

Auditoría vista por vista en 375px (probado con datos reales, no vacío) —
esto documenta los bugs de verdad que aparecieron, no ajustes cosméticos.
Cuatro eran genuinamente "funciona mal" (texto pisándose, campos casi
inusables), no sólo "se ve angosto":

- **Fila de Agenda pisándose**: `.agenda-fecha` tenía `width:170px` fijo,
  pensado para desktop. En 375px, ese fijo + checkbox + badge no dejaban
  espacio real para `.agenda-body` — el título dejaba de wrappear dentro de
  su columna y el texto se renderizaba encima de la fecha (confirmado
  midiendo el rect: `.agenda-body` calculaba 0px de ancho). Ahora la fila
  pasa a dos líneas en mobile (`flex-wrap` + un `flex-basis` en
  `.agenda-body` que fuerza el corte antes de que eso pase) — título arriba,
  fecha y badge abajo, alineados bajo el título.
- **Campos de los modales comprimidos a lo ilegible**: varios `.field`
  dentro de un `.field-row` traen un `width` fijo puesto para desktop (p.
  ej. Código 130px y Créditos 112px en el modal de materia) que nunca cede.
  En mobile, "Nombre de la materia" terminaba con ~69px reales de ancho, la
  etiqueta wrappeando en 4 líneas y el input casi inusable. Cada fila de
  campos pasa a una columna en mobile — `.field-row .field{width:auto
  !important}` cubre los ~5 lugares distintos entre los modales de una sola
  vez (el `!important` es porque un `style=""` inline le gana a cualquier
  regla de hoja de estilo salvo esa, y no valía la pena tocar cada `<div
  class="field">` a mano).
- **Mismo problema, otra forma, en `.num-pill-row`** (los presets de
  "Puntaje total"/"Aprueba con" del modal de materia): centraba
  verticalmente una etiqueta de una línea contra un grupo de pills que en
  mobile envuelve a 2-3 filas — la etiqueta quedaba flotando a media altura
  en vez de arriba de todas. Etiqueta arriba, pills abajo, en mobile.
- **El cajón de navegación tapaba los modales que abrís desde adentro
  suyo**: el modal de perfil y el de semestres se abren desde botones que
  viven en el propio cajón mobile — pero el cajón (`z-index:150`) es más
  alto que un modal normal (`z-index:100`), así que quedaba tapándolo en vez
  de al revés. Se centralizó en `openModal(id)` (el único punto por el que
  pasan los 6 modales de la app) que además de abrir el modal cierra el
  cajón — un modal nuevo no puede olvidarse de este detalle porque no pasa
  por acá a mano.

Más chico, no un bug pero sí ruido: el toolbar mobile repetía el nombre de
la vista (aparecía en el toolbar y de nuevo como `<h1>` de la vista, dos
veces "Materias" en la misma pantalla) — se sacó del toolbar en mobile, ya
que el `<h1>` de la vista alcanza.

**Lo que se probó y ya andaba bien**, sin cambios: Calendario (ya había
tenido su propia pasada de mobile antes), Horario (denso pero legible, sin
overflow), los modales de evaluación/evento personal (sus campos ya eran de
ancho completo), y las pantallas de auth/sesión vencida.

**Lo que quedó igual a propósito** (denso pero no roto, no alcanzó la
prioridad de esta pasada): la vista Tabla de Materias scrollea horizontal
sin ninguna pista visual de que hay más columnas a la derecha más allá de la
scrollbar nativa — funciona, pero no es obvio. Si se vuelve un problema real
avisen y lo resuelvo con un fade en el borde.

### Import/export JSON oculto del toolbar

A pedido explícito, no por un problema de mobile: `#btn-exportar` y
`#btn-importar` (y el `<input type="file">` que los acompaña) pasaron a
`class="... hidden"` en `src/app.html`. El código en `runtime.js` (los
listeners, `exportarJSON()`, etc.) sigue intacto — sacar el `hidden` de esos
dos botones alcanza para reactivarlo cuando se pida de vuelta. No se tocó
`importCollections()` (la migración de datos viejos de `localStorage`, ver
sección de Supabase): es una función distinta, para un caso distinto, y
sigue haciendo falta.

### Cerrar sesión vuelve a la landing, no al login de la app

`btn-logout` ahora navega a `index.html` después de `signOut()`, en vez de
quedarse en el `auth-screen` de `Cursada.html`. Cerrar sesión a propósito es
"salir del producto" — la landing es la puerta de entrada, no el formulario
de login. La excepción es la pantalla de "tu sesión venció": ese botón sigue
yendo al login de acá adentro, porque ahí es "reingresá para seguir donde
estabas" (una sesión que se cortó sola), no una salida elegida — mandar a
alguien a la landing en ese momento sería fricción de más. Asume que
`index.html` y `Cursada.html` se sirven desde el mismo directorio (ver
sección "Landing page" más arriba) — es el mismo supuesto que ya usan sus 4
botones.

## Rediseño de navegación mobile (handoff: "Mobile web design optimization")

Segundo handoff de Claude Design, esta vez sobre la experiencia mobile
completa (no la landing, no ajustes de layout como la pasada anterior): tab
bar abajo con 5 vistas + FAB de "crear" (tap = alta de la vista actual,
long-press = hoja con las 3 altas), buscador que se expande en el header,
swipe-para-completar + long-press con menú contextual en las filas de
Agenda, calendario en tira de semana para mobile, grilla de Horario
comprimida sin scroll horizontal, y modales a pantalla completa que entran
desde la derecha (hojas inferiores con grabber arrastrable para listas
cortas: semestres, importar local). Todo el alcance se implementó, gestos
incluidos — fue una decisión explícita, no la versión recortada.

**Pull-to-refresh (ítem 7 del propio CSS del handoff) quedó fuera a
propósito.** Hoy no hay ningún punto de la app que vuelva a pedir datos a
Supabase después del login (`loadAllFromSupabase()` corre una sola vez) —
un gesto visual sin función real detrás habría sido una implementación a
medias. Si en algún momento hace falta refrescar contra el servidor, se
puede pedir aparte.

Mismo principio que la pasada de mobile anterior: todo lo nuevo vive en un
`@media(max-width:760px)` al final de `src/styles.css`, apoyado en los
breakpoints que ya existían, nunca reemplazándolos. El JS nuevo reutiliza en
vez de duplicar: el tab bar usa el mismo delegado `[data-nav]` y el mismo
cálculo de `activeKey` que ya sincronizaba el cajón; el FAB y la hoja rápida
llaman a los mismos `openMateriaModal`/`openEvaluacionModal`/
`openPersonalModal` que ya usaban los accesos rápidos de Inicio; el swipe y
el menú contextual de Agenda llaman a `toggleAgendaHecho`, la misma función
del checkbox; el arrastre de las hojas inferiores cierra vía `closeModalEl`
(no saca `.is-open` a mano), así conserva el aviso de cambios sin guardar; y
la tira de semana usa `clasesDeDiaRaw`/`eventosDeDia`, las mismas fuentes
que ya arma `buildDayCell`.

### Gaps que traía el CSS del handoff (se completaron acá)

- **`.tabbar`, `.fab`, `.quick-sheet`, `.row-menu` sin `display:none` por
  defecto**: sus únicas reglas vivían dentro de `@media(max-width:760px)`.
  Como son elementos persistentes en el DOM (no sólo-mobile — tienen
  botones/texto real adentro), en cualquier ancho mayor a 760px se habrían
  visto sin estilo. Se agregó una regla chica fuera del media query
  ocultándolos por defecto.
- **`STATE.materiasView` podía seguir en `'tabla'`** (por un `?vista=tabla`
  en la URL) aunque el CSS de mobile oculte la tabla con `!important` —
  `renderMaterias()` sólo arma una de las dos vistas según ese estado, así
  que el resultado habría sido Materias en blanco en mobile. Se agregó un
  guard de una línea al principio de `renderMaterias()`: en viewport angosto
  fuerza `STATE.materiasView = 'tarjetas'` antes de decidir qué armar.
- **El wrapper `.swipe-row` rompía `.agenda-row:first-child` /
  `.eval-row:first-child`** (el selector que sacaba el borde superior de la
  primera fila): envolver cada fila en un nuevo padre hace que cada una sea
  `:first-child` de su propio wrapper, así que el selector viejo terminaba
  sacando el borde de todas las filas en vez de sólo la primera. Se
  re-apuntó a través del wrapper: `.agenda-list > .swipe-row:first-child
  .agenda-row{border-top:none}` (y el equivalente de `.eval-row`).

### Un bug del propio handoff, encontrado probando (no en el CSS que se pidió copiar)

`.swipe-row` traía `background:var(--c-success)` fijo — el verde de fondo
del "✓ Listo" que aparece detrás de la fila al arrastrarla. El problema:
`.swipe-row + .swipe-row{border-top:1px solid var(--c-line-faint)}` dibuja
el borde sobre ese wrapper (necesario: el borde tiene que quedar fijo
mientras la fila interna se desliza durante el swipe), y con
`box-sizing:border-box` ese borde de 1px le come una franja a la fila
interna — que quedaba 1px más baja que su wrapper. Resultado: una línea
verde asomando permanentemente entre cada fila de Agenda, no sólo durante el
gesto. Se cambió a que el verde sólo se active durante el gesto
(`.swipe-row.is-dragging,.swipe-row.is-armed{background:var(--c-success)}`),
con `var(--c-surface)` como fondo de reposo — igual al de la fila, así el
borde no revela nada raro cuando no se está arrastrando.

### Cajón mobile asomando en el borde (interacción con el breakpoint de 900px, no de esta pasada)

El breakpoint de 900px (de antes, sin tocar) cierra el cajón con
`transform:translateX(-260px)`, calculado para su ancho de siempre (260px).
El CSS de este handoff ensancha el cajón a 288px en mobile — sin actualizar
ese cierre, quedaban 28px del cajón asomando siempre contra el borde
izquierdo de la pantalla. Se agregó `transform:translateX(-288px)` dentro
del bloque de 760px para que el cierre coincida con el nuevo ancho.

### `renderWeekstrip()`: closure clásico de `var` en un `for`

La primera versión guardaba `iso`/`btn` en variables `var` declaradas dentro
del `for` que arma los 7 días de la tira, y el listener de click las leía
del closure. Como `var` no tiene scope de bloque, las 7 vueltas comparten la
misma variable — para cuando alguien tocaba cualquier día, `iso` ya tenía el
valor de la última vuelta (domingo). Tocar cualquier día seleccionaba
siempre el domingo. Se arregló leyendo la fecha desde `data-iso` en el
propio botón (`this.getAttribute('data-iso')` dentro del handler) en vez de
capturarla por closure.

### Deviación deliberada: no se ocultó el filtro de materia/estado de Agenda

El CSS del handoff traía `.topbar-actions > select.btn{display:none}`,
pensado para ocultar los `<select>` de filtro de Agenda en mobile — su
propio comentario decía que "se mueven a `.filtros-row`" pero no traía el
markup ni el JS para hacerlo. Ocultarlos sin reemplazo habría sacado
filtrado real que hoy funciona, así que esa línea no se copió: los
`<select>` de Agenda siguen visibles en mobile (comparten fila con scroll
horizontal, como el resto de `.filtros-row`), en vez de perder la función
para "verse más prolijo".

## Segunda pasada del handoff mobile: cosas que no andaban

El usuario mandó una v2 del mismo handoff ("hice cambios porque algunas
cosas no funcionaban") con fixes reales, no ajustes cosméticos. La más
grave:

- **En mobile no había forma de abrir el cajón de navegación.** El único ☰
  vivía en `#btn-menu`, dentro de `.app-toolbar` — y `.app-toolbar{display:
  none}` es la primera regla de la capa mobile (ver arriba). Resultado: el
  cajón (semestres, tema, perfil, cerrar sesión) era inalcanzable en mobile
  desde que se implementó esta capa. Se agregó un ☰ (`.topbar-menu`,
  `data-menu`) como primer hijo de cada una de las 6 `.topbar` de la app,
  delegado a un solo listener que llama al mismo `openMobileNav()` de
  siempre — visible sólo en mobile (`@media(min-width:761px){.topbar
  .topbar-menu{display:none}}`, porque `.icon-btn` es `display:flex` por
  defecto en cualquier ancho).
- **Filas con scroll horizontal que se comprimían en vez de scrollear**
  (`.filtros-row`, `.materias-toolbar`, `.mini-days`): les faltaba
  `flex:none` — sin eso, como son hijas de un contenedor flex, competían por
  espacio con sus hermanos y se angostaban en vez de mantener su ancho de
  contenido y scrollear.
- **`.swipe-row` con fondo verde permanente**: mismo bug que ya había
  encontrado y arreglado yo en la primera pasada (ver arriba), pero el
  handoff ahora trae su propio fix, más simple — el verde vive en
  `.swipe-action` (que ya se revela por `opacity`, no hace falta tocar el
  fondo de `.swipe-row`) en vez de alternarlo con `.is-dragging`/`.is-armed`
  como había hecho yo. Se adoptó la versión del handoff, es la misma idea
  con menos código.
- **Nombres de materia ilegibles en la grilla de Horario** (`.hg-block .n`
  con `line-clamp:3` en una columna de ~40px, texto partido en sílabas raras
  con `hyphens:auto`): pasa a una sola línea con ellipsis, y
  `renderHorario()` muestra el código de la materia en vez del nombre
  completo en mobile (`b.m.cod.split('-')[0]`) — el nombre completo sigue
  disponible en el `title`/`aria-label` que ya pone `makeRowClickable`.

Y una pantalla nueva:

- **Perfil pasa a ser pantalla completa en mobile** (antes era el mismo
  modal chico que en desktop, con los campos apretados). Identidad grande
  arriba (`.perfil-hero`: avatar, nombre completo, email, "Cambiar foto"),
  campos agrupados abajo (`.perfil-group`, "Datos personales" / "Estudio"),
  estilo ajustes de iOS, con un botón de "Cerrar sesión" al final del
  formulario — dispara el mismo `#btn-logout` de siempre (`.click()`), no
  duplica su `confirm()`/`signOut()`. `#perfil-nombre-completo` usa
  `nombreCompletoDeUsuario()`, una función nueva y chica (nombre + apellido,
  o el email si no hay ninguno cargado) — no reusa el cálculo de
  `sidenav-user-nombre`, que a propósito es sólo el nombre de pila (ahí el
  espacio es chico; acá es el título grande de una pantalla propia). El
  `id="perfil-email"` del header del modal no se podía reusar en el hero
  (un id no puede repetirse en el DOM) — el hero tiene su propio
  `#perfil-email-hero`, seteado en el mismo lugar. En desktop, `.perfil-hero`
  vuelve a su fila original (avatar + botón, sin el nombre/email grande ni
  "Cerrar sesión" — esa información ya está en el header del modal y en el
  cajón).

**Bug encontrado probando esto, no parte del handoff:** al abrir la pantalla
de Perfil (o cualquier modal) en mobile, el tab bar y el FAB se veían
flotando por encima del modal — `.tabbar`/`.fab`/`.quick-sheet`/`.row-menu`
tenían z-index 120–122, más alto que el z-index 100 del modal. No se notaba
en modales chicos con fondo opaco cerca del borde, pero en Perfil (ahora
pantalla completa, con un pie de formulario pegado abajo) quedaba clarísimo:
el FAB tapando el botón "Guardar". Se subió `.modal-backdrop` a z-index 160
— por encima de todo el chrome fijo mobile y del cajón (150), por debajo de
onboarding/gate/auth-screen/toast (200–400), que sí deben ganarle a un modal
abierto.

**Otro bug encontrado después de entregar esta pasada** (reportado por el
usuario: "se rompió la vista de agenda, aparece el visto ahí en desktop"):
`.swipe-action` (el "✓ Listo" que se revela al arrastrar una fila) sólo
tenía `position:absolute` dentro de `@media(max-width:760px)` — en
cualquier ancho mayor quedaba como un `<div>` de flujo normal, con su texto
"✓ Listo" visible arriba de cada fila de Agenda. Mismo tipo de gap que el
de `.tabbar`/`.fab`/etc. (ver "Gap #1" en la pasada anterior), esta vez sin
haberlo notado: se sumó `.swipe-action` al mismo `display:none` de base que
ya ocultaba a esos otros elementos fuera de mobile.

## Progreso histórico entre semestres

Hasta acá la app sólo mostraba el estado del semestre activo — nunca
comparaba contra semestres pasados ni mostraba evolución en el tiempo. Este
pedido agrega esa dimensión, en dos partes: una sección nueva "Progreso" con
el detalle completo, y un widget resumen en Inicio para quien no necesita
entrar a verlo. Vino acompañado de un pedido corto aparte: poder eliminar un
semestre (ver más abajo).

### Orden cronológico real, no por nombre ni por posición en el array

El nombre de un semestre es texto libre (`"2do cuatrimestre 2026"`) — no
sirve para ordenar de forma confiable, y el orden en que Supabase devuelve
las filas tampoco está garantizado. `rowToSemestre()` ahora expone
`createdAt` (columna que ya existía en la tabla, nunca se leía desde el
cliente — sólo lectura, nunca se escribe de vuelta) y `semestresOrdenados()`
ordena por ese campo. Se usa en el modal de semestres y en todo lo de acá
abajo que necesite saber "cuál es el semestre anterior a este" — **sin
asumir que el semestre activo es siempre el más nuevo**: para encontrar el
anterior se ubica la posición del activo dentro de `semestresOrdenados()` y
se resta 1, nunca "el anteúltimo del array" a secas (podés tener el activo
en cualquier posición si volviste a activar uno viejo).

### La fórmula de promedio, en un solo lugar

`computeKpis()` (el "Promedio general" de Inicio) ya normalizaba las notas
de cada materia a un 0-100% y promediaba — pero lo hacía sólo para el
semestre activo, con la fórmula escrita inline. Se extrajo a
`promedioNormalizado(materias)`, que ahora llaman tanto `computeKpis()` como
`computeProgresoPorSemestre()` (nueva) — la misma cuenta, corrida sobre
cualquier conjunto de materias, no una copia paralela que se puede desincronizar.

`computeProgresoPorSemestre()` arma un punto por cada semestre (en orden
cronológico) que tenga al menos una materia con nota cargada:
promedio normalizado, materias aprobadas y total. Es la única fuente de
datos tanto para la sección Progreso como para el widget de Inicio — un
cálculo, dos vistas.

### Sección "Progreso"

Ítem nuevo en el cajón (`data-nav="progreso"`), **a propósito sólo en el
cajón, no en el tab bar de mobile** — el tab bar quedó fijo a 5 destinos en
la pasada de optimización mobile (`grid-template-columns:repeat(5,1fr)`,
documentado ahí como decisión deliberada); meter un 6° lo apretaría en
390px. Progreso es una vista de consulta ocasional, no de uso diario como
las otras 5, así que el cajón (un toque extra desde el ☰) alcanza sin
comprometer el tab bar existente.

Sin datos, se ve un estado vacío simple (mismo patrón `.empty-state` que ya
usa Materias) en vez de un gráfico roto o en blanco. Con datos: un único
gráfico de línea (no uno por semestre — el pedido original habla de anotar
aprobadas/total "junto a cada punto del gráfico", en singular, confirmando
que es un solo gráfico combinado) con el promedio de cada semestre en el eje
X, más las barras de progreso hacia el título (créditos y/o cantidad de
materias — ver "Panel de Ajustes" más abajo, sección "Meta de carrera").

**El gráfico es SVG armado a mano** (`buildProgresoChartSvg()`), sin
librería — mismo espíritu que el ring/donut que ya usaba Detalle
(`ringStyle()`, un `conic-gradient` sin SVG ni deps), pero un gráfico de
línea de verdad necesita trazos, así que esta vez sí hizo falta SVG. Se arma
como string HTML (`<svg>...</svg>`) y se asigna con `.innerHTML` — el parser
de cualquier browser entiende SVG inline sin necesidad de
`document.createElementNS()`. Es el único lugar de todo el código que arma
HTML como string en vez de DOM con `el()`/`.textContent` (que es seguro por
naturaleza) — el único texto libre del usuario que termina ahí adentro (el
nombre del semestre) pasa por un `escapeHtml()` nuevo antes de interpolarse,
para no abrir una inyección de HTML si alguien nombra un semestre con algo
tipo `<img onerror=...>`.

Un bug encontrado probando el gráfico, no evidente por lectura de código:
con el padding original (30px) el nombre del semestre en el punto más a la
izquierda o más a la derecha (`text-anchor="middle"`) quedaba centrado justo
en el borde del `viewBox` — la mitad del texto caía en coordenadas negativas
o más allá del ancho del SVG, y el propio SVG la recortaba. Se ensanchó el
padding horizontal a 55px, suficiente para contener un nombre truncado a 14
caracteres sin que se corte.

### Widget en Inicio

Tercer panel en la columna derecha de `.inicio-cols`, junto a "Materias en
riesgo" y "Accesos rápidos" (ese contenedor ya era `flex-direction:column`,
un panel más entra sin tocar el layout existente, y en mobile ya se apila
solo). **Sólo aparece con 2 o más semestres con datos** — con menos, no hay
"anterior" contra el cual comparar, así que en vez de un estado vacío
confuso el panel directamente no se renderiza (`renderProgresoWidgetInicio()`
se llama al final de `renderInicio()`).

Muestra: el promedio del semestre activo con un indicador ▲/▼ + delta en
puntos contra el semestre inmediatamente anterior (cronológico de verdad,
ver arriba) — coloreado con el mismo vocabulario `TONE` que ya usan los
badges (verde/rojo/gris), nada nuevo. **Es el único elemento "motivacional"
de todo este pedido** — sin rachas, insignias ni animaciones, tal como pedía
explícitamente el prompt original. Debajo, si hay `creditos_carrera` y/o
`materias_carrera` cargados, una versión compacta de sus barras (reusa
exactamente `.bar-wrap`/`.bar-fill` de `nota-row`, la misma barra que ya usa
Detalle para las notas — no CSS nuevo) sin el detalle completo de la sección
Progreso. Un link "ver detalle" lleva a `#progreso`.

### Metas hacia el título: créditos y cantidad de materias

Dos metas independientes, cada una gateada por separado — cargar una no
depende de la otra, y si cargás las dos se muestran las dos. Créditos: suma
de `creditos` de las materias con `estado === 'aprobada'` en **todos** los
semestres (`creditosAcumulados()`, sin acotar al activo — a propósito,
distinto del resto de la app) sobre `profiles.creditos_carrera`. Materias:
mismo criterio pero contando materias en vez de sumar créditos
(`materiasAprobadasCount()`) sobre `profiles.materias_carrera`. Ambos
campos se cargan y editan desde el panel de Ajustes (ver más abajo), no
desde Perfil. Si algún campo es `null` (todavía no se cargó), esa barra en
particular no se muestra en cero ni con un placeholder — se muestra una
invitación chica a completarlo que abre Ajustes (`openAjustesModal()`).

`renderCreditosInto()` (la función original, sólo créditos) se generalizó a
`renderMetaBarInto(container, compact, valorMeta, valorActual, unidad,
ctaTexto)` — misma barra, parametrizada, para no mantener dos copias casi
idénticas de la lógica de progreso.

### Eliminar un semestre (pedido corto, aparte del prompt principal)

Hasta esta pasada un semestre se podía crear y renombrar, pero no borrar —
una decisión de scope explícita de una pasada anterior (ver sección
"Semestres" más arriba). Ahora cada fila del modal de semestres tiene un
tercer botón (🗑, junto al ✎ de renombrar) que dispara `eliminarSemestre()`:
mismo patrón de cascada con confirmación que ya usaba el borrado de materia
(`confirm()` con el conteo real de lo que se va a borrar → borrar hijos →
borrar padre → avisar si algo falla), un nivel más — semestre → sus materias
→ las evaluaciones de agenda de esas materias.

Dos decisiones tomadas al implementar esto, no pedidas explícitamente:

- **Si el semestre borrado estaba activo, se reactiva el más nuevo de los
  que quedan** (por posición cronológica real, no por orden del array).
- **Se permite borrar el último semestre que te queda — no se bloquea.**
  Probado explícitamente: con 0 semestres la app cae con gracia en sus
  estados vacíos existentes (Materias/Horario/Progreso muestran su empty
  state, los KPIs de Inicio muestran 0/—, el selector dice "Sin semestre"),
  y crear una materia nueva sin semestre activo ya auto-creaba uno antes de
  este pedido. No hizo falta inventar un caso especial para algo que la app
  ya sabía manejar.

## Panel de Ajustes

Cursada no tenía ningún lugar dedicado a configuración — lo más parecido era
el modal de Perfil, que es sobre identidad (nombre, foto, facultad), no
sobre cómo se comporta la app. Este pedido crea ese lugar: un modal nuevo
con tres secciones (Meta de carrera, Margen de riesgo, Datos y cuenta),
accesible con un ⚙ junto al bloque de usuario del cajón.

### Entrada: modal, no una vista de nav nueva

`#btn-ajustes` (⚙) vive dentro de `.sidenav-user`, junto al ⏻ de cerrar
sesión — mismo mecanismo de apertura que Perfil (el bloque entero abre
Perfil al clickear, salvo en esos dos íconos; el handler de exclusión que ya
existía para `#btn-logout` sumó `#btn-ajustes`). Ajustes es un modal
(`#modal-ajustes`, mismo patrón `.modal-head`/`.modal-body`/`.modal-foot`
que Perfil/Semestres), no un ítem de `CORE_VIEWS` ni del cajón de
navegación principal — el propio pedido lo enmarca como "Ajustes y Perfil
agrupados como 'lo tuyo'", separado de Inicio/Materias/Agenda/Calendario/
Horario/Progreso.

### Control del margen de riesgo: pills, no un slider

No existe ningún `<input type="range">` en toda la app (se confirmó
buscando antes de elegir). Los patrones que sí existen para "elegir un
valor discreto" son `.seg-item` (2-4 opciones fijas, como el toggle de
tema) y `.num-pill` + `buildNumPill()` (los presets de "Puntaje total"/
"Aprueba con" del modal de materia). El margen va de 0 a 3 en pasos de
0.5 — exactamente 7 valores discretos — así que una fila de 7 `.num-pill`
reusa el componente tal cual, sin la escotilla de "Otro" que sí tienen esos
presets (ahí el rango es abierto; acá es cerrado y chico). El texto de
ayuda debajo explica qué hace el número en palabras de usuario ("cuándo una
materia pasa de 'en riesgo' a 'en peligro'"), sin exponer el nombre técnico
del semáforo.

`margenDe(e)` (antes: `MARGEN_RIESGO / 12 * e.total`, una constante fija)
pasa a leer `CURRENT_PROFILE.margen_riesgo`, con `MARGEN_RIESGO` como
fallback si todavía no cargó (nunca debería ser el caso en producción — la
columna es `not null default 1` — pero cubre el instante entre login y que
`CURRENT_PROFILE` se puebla). Guardar Ajustes llama a `renderRoute()`, así
que los semáforos de Materias/Inicio reaccionan al toque, sin recargar.

### Meta de carrera: créditos y cantidad de materias

`creditos_carrera` se mudó acá desde Perfil (donde vivía en el grupo
"Estudio") — no se duplicó, se sacó el campo entero de `#modal-perfil` y se
recreó en `#form-ajustes`. `materias_carrera` es el mismo patrón, campo
nuevo. Los dos son opcionales e independientes — cargar uno no obliga a
cargar el otro, y si están los dos cargados, la sección Progreso muestra
las dos barras (ver esa sección más arriba para el detalle de
`renderMetaBarInto()`).

### Datos y cuenta: reubicados, no reescritos

`#btn-exportar`, `#btn-importar` (+ `#input-importar`) y `#btn-borrar-todo`
se movieron tal cual desde `.app-toolbar` a esta sección — mismos ids,
misma lógica de `runtime.js` sin tocar una línea (exportar arma un JSON y
dispara la descarga vía blob; importar valida la forma del archivo antes de
llamar a `importCollections()`; borrar todo pide confirmación con el texto
exacto de siempre y vacía materias/agenda/personal). Exportar e Importar ya
existían en el código pero vivían ocultos con `class="hidden"` en la
toolbar (a pedido explícito de una pasada anterior) — acá quedan visibles
sin más, no hace falta reactivarlos aparte. Se sumó un botón nuevo de
"Cerrar sesión" que dispara `.click()` sobre el `#btn-logout` real (mismo
patrón que ya usaba `#btn-perfil-logout` — una sola fuente de verdad para
el `confirm()`/`signOut()`, nunca una copia).

**Bug evitado al mover estos botones, no evidente hasta escribir el HTML:**
ninguno de los tres tenía `type="button"` explícito — no hacía falta,
vivían sueltos en `.app-toolbar`, fuera de cualquier `<form>`. Adentro de
`<form id="form-ajustes">`, un `<button>` sin `type` es `type="submit"` por
default: sin agregarlo a mano, tocar "Exportar" hubiera disparado además el
submit del formulario de Ajustes (guardando créditos/materias/margen de
paso, sin que el usuario lo pidiera). Se agregó `type="button"` a los tres
al moverlos, y al botón de logout nuevo.

`.app-toolbar` conserva el toggle de tema y "Imprimir" — no estaban en el
pedido de mover, y son acciones de "esta pantalla ahora mismo" más que de
configuración de cuenta.

## Simulador de escenario (Detalle de materia)

Detalle de materia ya mostraba "te faltan X para aprobar" como un número
estático (`m.necesita`, `computeMateria()`). Este pedido lo vuelve
interactivo: un slider por cada evaluación sin nota cargada, con un
promedio simulado en vivo — sin cambiar la fórmula de cálculo real, la
reusa tal cual.

### Reusa la fórmula real, no inventa una nueva

El promedio simulado se arma concatenando `m.parciales` (las notas reales
ya cargadas) con los valores actuales de los sliders, y se clasifica con la
misma `toneDe(m.estado, m.esc, notas)` que ya usa el cálculo real — se le
pasa el array combinado, no un promedio ya hecho, así "aprobada siempre es
success" y el margen de riesgo (configurable desde Ajustes, ver sección de
arriba) se respetan igual que en el dato real. Sin ponderación por tipo de
evaluación (un parcial no vale más que un trabajo práctico) — el cálculo
real tampoco pondera, y el simulador tiene que mostrar exactamente lo que
pasaría con ese cálculo, no una versión más sofisticada que no existe hoy.

### Punto de partida de los sliders: el mínimo de aprobación

Los sliders arrancan en `m.esc.aprob`, no en el promedio real. Se evaluó la
alternativa de arrancar en `m.actual` (para que abrir la sección "no cambie
nada" al principio), pero tiene un problema: si el promedio real ya está
por encima del mínimo, arrancar ahí *bajaría* el promedio simulado apenas
se abre la sección — cada slider nuevo entra al promedio con un valor igual
al actual, empujando hacia la media general. Se lee como que la app
muestra un escenario peor sin que el usuario haya tocado nada. Arrancar en
`m.esc.aprob` es consistente sin importar el estado real ("esto es lo justo
para pasar, ajustá desde acá") y es el mismo número que ya aparece al lado
en el callout ("aprueba con X") — mismo ancla mental.

### Diferenciación visual: anillo aparte + halo punteado + etiqueta

El anillo real (`#detalle-ring`) nunca se toca — cero riesgo de que el dato
real se vea alguna vez como simulado. El simulador tiene su propio anillo
chico, más angosto (72px vs. 140px), con el mismo sistema de color
(`TONE`) que el real, pero envuelto en un halo con `border:2px dashed`, más
una etiqueta "SIMULADO" al lado — dos señales redundantes, no una sola
sutil, para que sea inconfundible a simple vista.

### Estado puramente local — nunca se guarda

Los valores de los sliders viven en variables de closure dentro de
`renderDetalleSimulador(m)` — no hay ningún `var` a nivel de módulo para
esto. Esto importa porque `renderRoute()` no destruye el DOM de `#detalle`
al navegar (sólo lo esconde con `.hidden`), así que el estado no se
descarta solo — el reset es explícito: **la sección arranca colapsada en
cada llamada a `renderDetalleSimulador()`**, y esa función se llama en cada
`renderDetalle()` (cambiar de materia, recargar una nota real, cualquier
motivo de re-render). Colapsar la sección a mano también reinicia los
sliders al mínimo de aprobación, no sólo navegar — igual de explícito.
Ningún código de este feature llama a `saveAgendaRaw()`/`agendaToRow()`; no
hay botón de "guardar esta simulación como nota real" — si se llega a pedir
eso, es un feature aparte con sus propias implicancias (mezclar una
previsualización con el flujo real de cargar notas).

Si no hay ninguna evaluación pendiente en la materia (todas tienen nota, o
no hay ninguna cargada todavía), el botón "Simular escenario" no aparece —
no hay nada que simular.

### Primer `<input type="range">` de la app

Sin precedente que reusar: el panel de Ajustes (sección de arriba)
documentó una decisión deliberada de *no* usar un slider nativo para el
margen de riesgo, porque no había ningún precedente en la app y ese control
era de 7 valores discretos (mejor resuelto con `.num-pill`). Este pedido es
distinto — pide explícitamente un slider para un rango continuo (0 a
`m.esc.total`), así que acá sí se construyó uno: track y thumb con estilos
propios (`-webkit-slider-thumb`/`-moz-range-thumb`), con el relleno de
color hasta el valor actual pintado por JS vía un `linear-gradient` inline
(mismo criterio que `.bar-fill` ya usa con `width` inline, acá con
`background`). El paso del slider es `0.5` para escalas de "nota" y `1`
para porcentaje/puntos — coherente con la precisión que ya usa `fmt()` para
mostrar esos números.

## Dirección visual "Pro Edition" (refinamiento, no reescritura)

Pedido: adaptar el tema oscuro a una nueva dirección ("Pro Edition" —
glassmorphism sutil, fondo más orgánico, grid de 8px, sombras ambient) a
partir de tres referencias en `design-reference/`: `DESIGN.md` (tokens),
`Cursada Mobile Pro.dc.html` (4 frames de celular pixel-exactos) y
`github.md` (mapeo pantalla → clases reales). El acento (`--c-accent`) y los
radios (`--r-card`/`--r-control`) ya coincidían con la dirección nueva —
no se tocaron. Mobile primero, después el mismo tratamiento a desktop y al
resto de las vistas sin mockup propio.

### El lever fue el token, no cada componente

En vez de escribir CSS nueva por vista, se editaron los tokens de
`html[data-theme="oscuro"]` (`--c-bg`, `--c-surface`, `--c-sidenav`,
`--c-line`, `--c-shadow`) y se agregó una regla `html[data-theme="oscuro"]
.card{background:...;border:...}`. Como casi todas las superficies de la
app (`.kpi-card`, `.panel`, `.materia-card`, `.detalle-col`, `.detalle-head`,
`.mini-horario`) ya combinan la clase `.card` con su variante, este cambio
de ~10 líneas alcanzó Inicio, Materias, Detalle, Agenda, Progreso, y los
modales (que usan `var(--c-surface)` sin la clase `.card` — quedan opacos a
propósito, ver más abajo) sin tocar una sola vista de forma individual. Es
la razón por la que la fase 3 ("extrapolar a Materias/Progreso/Ajustes/
Perfil") no necesitó CSS propia: la heredan gratis.

Sólo tema oscuro — el claro no es parte de esta dirección (ni el prompt ni
`design-reference/` lo mencionan) y no se tocó.

### Glass sin `backdrop-filter`

`DESIGN.md` pide vidrio esmerilado (blur real) en las tarjetas. Se
implementó sólo con relleno translúcido (`rgba(255,255,255,.055)`) + borde
hairline (`rgba(255,255,255,.08)`), sin `backdrop-filter`, por dos motivos:
el fondo detrás de una tarjeta es un color plano sin textura (blur real no
cambia nada visible ahí, a diferencia de `.topbar`/`.tabbar`, que sí lo usan
porque contenido de verdad scrollea debajo), y Materias puede tener varias
tarjetas en pantalla a la vez — el costo de GPU de blur por tarjeta no se
justificaba por un resultado visualmente idéntico. Los modales (`.modal`,
`.auth-card`) no llevan la clase `.card`, así que quedan con el
`var(--c-surface)` sólido de siempre — vidrio ahí (útil cuando sí hay
contenido detrás, un backdrop con blur) queda para una pasada futura.

### Inicio: card "Lo próximo", con datos reales — no la copia del mockup

El mockup muestra un texto de "con 6,2 exonerás" que depende de una
proyección de exoneración que la app no calcula hoy (`computeMateria()` no
tiene ese campo) — inventar esa fórmula era lógica de negocio nueva, fuera
del alcance de "cambio visual". La card en cambio reusa el primer ítem de
`proximos` (mismo array ya ordenado que arma la lista de abajo, sin
recalcular nada) con `agendaBadgeInfo()`, y si es una materia, la barra
fina y el subtítulo reusan `m.actual`/`m.esc.total`/`m.riesgoTxt`/
`m.aprobTxt`, ya computados por `computeMateria()`. El botón secundario del
mockup ("Posponer") tampoco tiene equivalente en el modelo de datos — no
hay snooze en Cursada — así que se reemplazó por "Ver en agenda" (navega,
no inventa una función nueva). Se oculta con `.style.display` (mismo patrón
que `#riesgo-panel` en `renderInicio()`) cuando no hay nada en los próximos
7 días.

### Detalle: anillo más grueso sólo en mobile

"Ring reforzado" se resolvió como grosor, no diámetro (`ringInnerStyle`
pasa de 13 a 16px de trazo con `esMobile()`, mismo tamaño de 140px) — un
anillo más grande hubiera reflowado el resto de la card sin necesidad.

### Agenda/Detalle: gap de 8px, con la alineación recalculada

`.agenda-row`/`.eval-row` pasaron de `gap:12px` a `gap:16px` (múltiplo de
8). El `margin-left` de `.agenda-fecha`/`.eval-row > .badge` que alinea esa
columna bajo el título cuando la fila wrappea es `checkbox(22px) + gap` —
con el gap nuevo pasa de 34px a 38px. Quedó documentado en el CSS porque no
es evidente por qué ese número específico.

### Horario mobile: día seleccionado + timeline, no la grilla

Mismo motivo que el weekstrip de Calendario: la grilla Lun–Sáb no entra
legible en ~330px de columna real. `renderHorario()` ahora también llama a
`renderHorarioMobile(dias, porDia, cols)`, que arma un selector de día
(`#horario-daysel`) y una lista vertical del día elegido (`#horario-
timeline`) a partir del mismo `porDia` que ya arma la grilla — no hay query
nueva. El CSS decide cuál de los dos ancla se ve según el ancho (mismo
criterio que `.weekstrip`), así que ambos se arman siempre.

`STATE.horarioDia` (nuevo, guarda el día 1–6 tipo `Date.getDay()`) arranca
en el día de hoy si cae dentro de la semana visible, si no en lunes —
y se re-valida en cada render: si "Mostrar sábado" se apaga mientras sábado
estaba seleccionado, cae al default en vez de quedar en un día que ya no
existe. Bug encontrado probando (no hipotético): la primera versión del
punto bajo cada día era puramente decorativo, sin relación a si ese día
tenía clases — se corrigió para que sólo se vea en los días con `porDia[
dia].length`.

## Segunda pasada de "Pro Edition": valores exactos del mockup

La primera pasada (sección de arriba) cambió los tokens de fondo/superficie
y se detuvo ahí — "parecido" al mockup, no la misma familia visual. Este
pedido fue explícito: releer `Cursada Mobile Pro.dc.html` a nivel de
**valores concretos** (color, blur, opacity, radio, box-shadow) antes de
tocar nada, aplicar esa lista agrupada por tratamiento compartido (no
selector por selector), y un solo ciclo de prueba al final. El resultado es
un diff bastante más grande en `styles.css` — a propósito, es lo que se
pidió.

### La lectura del mockup, corregida

`DESIGN.md` describe "glassmorphism" para las cards en su prosa, pero
mirando los `div` reales del `.dc.html` pixel por pixel, **ninguna card de
contenido tiene blur, borde, ni sombra** — es relleno sólido `#191C22`, sin
más. El vidrio de verdad (translúcido + `backdrop-filter`) sólo aparece
donde `DESIGN.md` lo dice explícitamente en la sección de Elevación: *"Modal
windows and sidebars"* — nada más. Ese matiz cambió el resultado por
completo: la primera pasada le había puesto vidrio a `.card` en general (mal
leído), esta la saca de `.card` y la pone sólo en `.sidenav`/`.modal`/
`.auth-card`.

`DESIGN.md` también trae, en su YAML de arriba, una paleta M3 completa
(`primary: '#adc6ff'`, `background: '#10131b'`, etc.) que **no coincide**
con los colores reales del `.dc.html` (`#0F1116`/`#191C22`/`#2C7BFF`) ni con
la prosa del mismo documento más abajo (que a su vez propone `#0A0A0C`/
`#1C1C1E`/`#007AFF`, un tercer set). Los tres no son compatibles entre sí.
Ante esa contradicción, se usó el `.dc.html` como fuente de verdad para
cualquier valor concreto (es la ejecución real, no una exploración) y
`DESIGN.md` sólo para principios donde el `.dc.html` no cubre la pantalla
(Materias/Progreso/Ajustes/Perfil, glass de modal/sidebar).

### Valores exactos aplicados (tema oscuro)

| Token/regla | Antes (1ª pasada) | Ahora | De dónde sale |
|---|---|---|---|
| `--c-line` | `rgba(255,255,255,.1)` | `rgba(255,255,255,.08)` | borde del marco del teléfono / línea superior del tab bar en el `.dc.html` |
| `--c-line-faint` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.07)` | separador entre filas de una lista (prox-row, eval-row) en el `.dc.html` |
| `--c-shadow` | sombra ambient en todas las `.card` | `none` | ninguna card de contenido del `.dc.html` tiene `box-shadow` |
| `.card` (fondo/borde) | `rgba(255,255,255,.055)` + borde 1px | sin cambio de `.card` — vuelve a heredar `var(--c-surface)` opaco, sin borde | el `.card` "glass" de la 1ª pasada no tiene equivalente real en el mockup |
| `.sidenav`/`.modal`/`.auth-card` | opacos | `background:rgba(11,14,22,.7)` (sidenav) / `rgba(25,28,34,.7)` (modal), `backdrop-filter:blur(30px) saturate(160%)`, borde `rgba(255,255,255,.08)` | `DESIGN.md`, Elevación: "70% opacity + backdrop-blur(30px)" para modales y sidebars — el único lugar donde el documento pide vidrio explícitamente |
| `.topbar`/`.tabbar` (fondo) | `rgba(28,28,30,X)` | `rgba(15,17,22,X)` | quedó stale de cuando `--c-bg` era `#1C1C1E`; `rgb(15,17,22)` = `#0F1116` exacto, el bg nuevo |
| `.fab` (sombra) | `rgba(10,99,240,.34)` (rgb de tema claro, hardcodeado) | `rgba(44,123,255,.42)` | sombra del botón "+" flotante de Agenda en el `.dc.html`, con el rgb del acento oscuro real |
| `.horario-day.is-on` (sombra) | ninguna | `0 8px 20px rgba(44,123,255,.35)` | sombra de la celda "hoy" en la pantalla Horario del `.dc.html` |
| `.kpi-card` (radio) | `20px` (heredado de `--r-card`, no tocado por ser mobile-only en la 1ª pasada) | `16px`, en cualquier ancho | radio de las tiles de KPI en Inicio, `.dc.html` |
| `.inicio-hero-inner` (fondo) | `var(--c-surface)` (#191C22, igual que cualquier card) | `#171A21` | la card "Lo próximo" del mockup es la única superficie visiblemente más oscura que el resto — un tono "recesado" a propósito |
| `--c-accent`, `--r-card`, `--r-control` | sin cambios | sin cambios | ya coincidían con el mockup (pedido explícito de no tocarlos) |

### Agenda: de lista con separadores a tarjeta por ítem

El cambio estructural más grande. El mockup no dibuja la Agenda como una
lista continua con líneas divisorias — cada ítem es su propia card
(`background:#191C22;border-radius:16px`) con un riel de color de 3px en el
borde izquierdo (el color de la materia; ítems vencidos usan directamente
el rojo de esa materia, no un rojo "de estado" aparte — confirmado mirando
los hex exactos de cada fila del mockup).

Se logró sin tocar `runtime.js`: `.bar4` ya existe en el template
`agenda-row` y ya lo pinta `barStyle()` con el color de la materia (o gris
para personal) — es el mismo elemento que ya usa `prox-row` en Inicio. Acá
sólo se lo reposiciona con CSS (`position:absolute;left:0;top:0;bottom:0`)
para que haga de riel del borde en vez de barrita suelta junto al
checkbox; `prox-row` sigue usando `.bar4` sin tocar porque el selector nuevo
es `.agenda-row .bar4`, no `.bar4` a secas. `.agenda-list` pasa de ser una
sola card con filas adentro a un contenedor `flex` transparente con
`gap:8px` entre tarjetas.

Detalle (`eval-list`) y Próximos 7 días (`prox-row`) **no** se tocaron —
el mockup los muestra como lista con separador, no como tarjetas
individuales, así que ya estaban bien tal cual.

### Por qué el diff quedó agrupado en un solo bloque

Casi todos los cambios de esta pasada (vidrio, sombras corregidas, Agenda)
viven en un único bloque nuevo en `styles.css`, justo después del token de
tema oscuro — no uno por selector disperso por el archivo. Los únicos
cambios fuera de ese bloque son los que ya existían en otro lugar y sólo
necesitaban un valor corregido (`.topbar`/`.tabbar`, `.kpi-card`), para no
dejar dos declaraciones de la misma regla en dos lugares distintos del
archivo peleándose por orden de cascada — eso pasó una vez durante esta
misma pasada (ver comentario en el CSS) y quedó documentado para no
repetirlo.

### Qué no se tocó, a propósito

- `--c-accent` y `--r-card`/`--r-control`: pedido explícito de no tocarlos,
  ya coincidían.
- Tema claro: ninguna regla de esta pasada lo alcanza (todo vive bajo
  `html[data-theme="oscuro"]`), verificado a mano.
- `runtime.js`: cero cambios — el único candidato (colorear el riel de
  Agenda) ya tenía el dato puesto por código existente (`.bar4`).
- Calendario, Materias (grilla/tabla), Progreso, Ajustes, Perfil: sin
  mockup propio — heredan el tratamiento (fondo, `.card` opaco sin sombra,
  vidrio en sus modales) de los mismos tokens/reglas de arriba, sin CSS
  adicional por vista.

## Ver también

- La vista Semana del calendario reutiliza la misma lógica de eventos que
  la vista Mes, sólo que sin recortar texto (hay más lugar) y sin el
  concepto de "días de otro mes" atenuados.

## Rediseño visual: spotlight, set de íconos e Horario (3 capturas de referencia)

Se pidieron tres cambios visuales combinados en un solo sistema coherente,
cada uno con su propia captura de referencia (Calendario mes, Materias/
Contabilidad II, Horario semanal): fondo con degradé "spotlight" en el
panel de contenido, un set de íconos lineales para sidebar/topbar, y la
vista de Horario ajustada al estándar de la tercera captura.

### Cambio 1 — Fondo spotlight

Dos capas radiales ancladas cerca de la esquina superior derecha (una más
grande y tenue, otra más chica y con más tinte de acento) sobre el
`--c-bg` sólido de siempre como última capa. Sólo `.main` — el `.sidenav`
no se tocó, sigue con su fondo sólido `--c-sidenav`. `.topbar` ya tenía
`backdrop-filter:blur(20px)` con fondo semitransparente — el degradé se ve
correctamente atenuado/difuminado detrás suyo sin tocar esa regla.

Primera pasada: sólo en `html[data-theme="oscuro"] .main` (pedido
explícito original, con la referencia en oscuro). El usuario después pidió
el mismo tratamiento en claro — "sin el fondo negro pero sí el estilo" — así
que se agregó una regla base en `.main` (sin scope de tema, rige por
default en claro) con la misma composición de dos radiales pero con tinte
muy sutil (`rgba(130,160,210,.32)` / azul de marca al `.14`) sobre
`--c-bg` claro (`#EDEDF0`), en vez de repetir los valores oscuros — a
diferencia del negro, el gris claro de base no tiene margen para un
degradé tan marcado sin lavar el contraste con las cards blancas. La regla
oscura seguía siendo válida, con más especificidad (`html[data-theme=
"oscuro"] .main`) la pisa en ese tema; no se tocó.

### Cambio 2 — Set de íconos lineales

Se reemplazó el "mark" (punto de color, sin forma real) de cada ítem del
sidebar por un ícono SVG inline propio por vista (grid para Inicio,
book-open para Materias, clipboard-list para Agenda, calendar para
Calendario, clock para Horario, trending-up para Progreso) — mismo
lenguaje visual que Feather/Lucide (`viewBox 0 0 24 24`, `stroke:currentColor`,
`fill:none`, sin dependencia nueva: son `<svg>` a mano en `app.html`, no una
librería). Clase compartida `.ico` (tamaño/display base) + `.nav-ico`
(tamaño específico del sidebar, 18px) en `styles.css`, reemplazando las
reglas viejas de `.nav-item .mark` (incluido el caso especial de Agenda,
que rotaba un cuadrado 45° — ya no hace falta, el ícono nuevo no necesita
ese truco).

Mismo criterio aplicado a los íconos sueltos de topbar/sidebar que ya
existían como glifo de texto o `<span>` decorativo: el menú hamburguesa
(`.topbar-menu`, siete vistas), la lupa de búsqueda (tres vistas), la
campana de notificaciones de Inicio (antes sólo un punto rojo suelto, ahora
campana lineal + el mismo punto como badge posicionado encima), las
flechas de navegación del Calendario (`‹ ›` → chevrons), el chevron del
selector de semestre, y el engranaje/apagado del pie del sidebar
(Ajustes/Cerrar sesión). **No tocado, a propósito** (fuera del alcance
acotado del pedido): el logo/isotipo de marca (`.sidenav-brand .mark` y
equivalentes en onboarding/gate/auth), los íconos dentro de modales
(cerrar `×`, editar/borrar semestre), y los puntos del tab bar mobile
(`.tab .mark`) — el pedido hablaba del "sidebar", no de la barra de tabs de
mobile, y tocarla no estaba pedido explícitamente.

### Cambio 3 — Vista de Horario

La mayoría de lo pedido ya estaba implementado (grilla Lun–Vie/Sáb con
toggle, franja 8:00–22:00, encabezados de día en mayúsculas con
letter-spacing, panel "Materias en la grilla" con punto + nombre, toggles
verdes, tarjeta de perfil) — se ajustó lo que faltaba en vez de reescribir:

- Borde izquierdo de los bloques de clase: `3px` → `4px` (sólo desktop;
  el valor mobile de `2.5px` no se tocó, ya estaba afinado para esa
  columna angosta).
- Ubicación con ícono de pin: se agregó vía `mask-image` con
  `background:currentColor` en `.hg-block .s::before` (y el equivalente
  mobile, `.horario-timeline-block .s::before`) en vez de tocar el
  `<template>` o `runtime.js` — el pin hereda el color de la materia
  automáticamente porque ya vive dentro de un elemento cuyo `color` es
  `b.m.strong` (mismo mecanismo que el resto del bloque). Nueva variable
  `--ico-pin` en `:root` (data URI del SVG) para no repetirla en las dos
  reglas.
- Toggle Claro/Oscuro + botón "Imprimir" dentro del propio header de
  Horario (la referencia los muestra ahí, no sólo en la barra global de
  arriba): se agregó un segundo `.seg` con los mismos `data-theme-btn`
  (el binding de `renderTema()`/`bindEvents()` ya itera con
  `querySelectorAll('[data-theme-btn]')`, así que el toggle nuevo quedó
  sincronizado sin tocar `runtime.js`) y un botón "Imprimir" nuevo
  (`#btn-horario-imprimir`) que dispara el click del real (`#btn-imprimir`)
  — mismo patrón de "un botón dispara el click de otro" que ya usan
  `#btn-perfil-logout`/`#btn-ajustes-logout` con `#btn-logout` (única línea
  agregada a `runtime.js` en todo este cambio). El `search-fake` con el
  semestre activo que ya estaba en ese header se mantuvo (no estaba en la
  referencia pero es información existente, sacarla no era parte del
  pedido).

### Qué no se tocó, a propósito (los tres cambios)

- Ninguna lógica de datos, ruteo ni feature: todo lo de arriba es CSS +
  markup estático + un único listener nuevo que reusa una acción existente.
- Tema claro sigue funcional en las tres vistas de referencia (probado a
  mano) — sin el degradé del Cambio 1 (fuera de alcance para claro) pero
  con el set de íconos del Cambio 2 y el Horario del Cambio 3 igual.
- El doble bloque de header (barra global `.app-toolbar` + `.topbar` por
  vista) no se rediseñó como estructura — se mantiene como estaba en el
  resto de la app; sólo Horario ganó los controles adicionales pedidos por
  la referencia, sin sacarle nada a las demás vistas.

### Corrección post-entrega: grilla de Horario "en tablero"

El usuario marcó, con la misma captura de referencia, que `.hg-cell` (una
celda por cada media hora × día, ~150 en pantalla) tenía fondo (`--c-surface`)
+ borde + radio propios — con tantas a la vista se leía como un tablero de
casilleros marcado, no como el fondo limpio de la referencia (sólo los
bloques de clase flotando, sin ninguna división de celda visible). Se
volvió `.hg-cell` transparente y sin borde/radio; se sacó también la regla
mobile que sólo tocaba su `border-radius` (quedó sin efecto una vez sin
borde). Como `.hg-cell` nunca estuvo bajo `html[data-theme="oscuro"]`
(regla compartida entre temas), el ajuste aplicó a los dos temas con un
solo cambio — confirmado a mano en ambos. Sirve de recordatorio para el
resto de este rediseño: salvo el degradé del Cambio 1 (explícitamente sólo
oscuro), toda regla nueva de esta pasada es compartida entre temas por
default a menos que se documente lo contrario.

### Segunda corrección: degradé también en claro, grilla de Calendario, tab bar mobile

Tres pedidos más del usuario sobre el mismo rediseño:

**Degradé en claro.** El Cambio 1 original era explícitamente sólo oscuro
(pedido así desde el principio, referencia en oscuro). El usuario pidió
después el mismo tratamiento en claro, aclarando "sin el fondo negro pero
sí el estilo". Se agregó una regla base en `.main` (sin scope de tema, así
que rige en claro por default) con la misma composición de dos radiales
pero con tinte muy sutil (`rgba(130,160,210,.32)` y azul de marca al `.14`)
sobre `--c-bg` claro — el gris de base no tiene el mismo margen que el
negro para un degradé marcado sin lavar el contraste con las cards
blancas. La regla oscura original sigue intacta y la sigue pisando por
especificidad (`html[data-theme="oscuro"] .main`).

**Grilla de Calendario "suelta".** `.cal-cell` tenía fondo + borde + radio
propios por celda (42 a la vez) con `gap:8px` entre ellas — se leía como
celdas flotando por separado, no como una grilla. Se rehizo al estilo
Apple Calendar: el marco (borde fino + radio + `overflow:hidden` para
recortar esquinas) pasó a vivir en `.cal-grid` (el contenedor), y cada
`.cal-cell` sólo aporta un hairline (`border-right`/`border-bottom` en
`--c-line-faint2`, el mismo tono que ya separaba filas en el resto de la
app) — sin borde en la última columna/fila (`:nth-child(7n)`/
`:nth-last-child(-n+7)`, no hace falta JS porque el total de celdas
siempre es múltiplo de 7). `.cal-weekdays` pasó a `gap:0` también para que
sus columnas sigan alineadas con las de la grilla de abajo. "Hoy" pasó de
`border-color` a `box-shadow:inset` (ya no hay un borde propio de 4 lados
que recolorear) y "seleccionado" a `outline-offset:-2px` (offset positivo
quedaba recortado por el nuevo `overflow:hidden` del contenedor en las
celdas de borde).

**Tab bar mobile: más fina, íconos del sidebar, sin nombres.** Los 5
botones de `.tabbar` tenían una forma dibujada por CSS (punto/cuadrado/
rombo/rectángulo) + el nombre de la vista debajo. Se reemplazó por los
mismos `<svg>` que ya usa el sidebar (Cambio 2 — literalmente el mismo
markup, sin duplicar el set de íconos en otro lugar), sin texto visible
(queda como `aria-label`/`title` para accesibilidad). Sin la línea de
texto, cada tab bajó de 50px a 44px y el padding de la barra de 6px a 5px
— unos 8px menos de alto en total. Ese mismo delta de 8px se restó de
todos los offsets que reservan espacio para la tab bar/FAB en mobile
(`.fab` bottom 72→64px, `.quick-sheet` bottom 136→128px, `.view`
padding-bottom 112→104px, `#horario .view` 96→88px) para que el contenido
no quede ni corto de espacio ni con un hueco de más al fondo.

Al probarlo en 375px salió un bug real: el toggle Claro/Oscuro + botón
Imprimir que se habían agregado al header propio de Horario (Cambio 3,
pensados para desktop) no tenían guard de mobile — en la fila fija de
52px del `.topbar` mobile se apretaban contra el título "Horario semanal".
Se ocultan en `@media(max-width:760px)` (`#horario-theme-toggle`,
`#btn-horario-imprimir` — se le puso id al `.seg` nuevo para poder
apuntarle sin tocar los demás `.seg` de la app, como el Mes/Semana de
Calendario, que sí sigue visible en mobile). No se pierde funcionalidad
real: en mobile no había forma de cambiar de tema desde ningún lado antes
de este rediseño tampoco (el toggle global vive en `.app-toolbar`, oculto
en mobile desde antes), y el botón de Imprimir real no se expone en mobile
en ninguna otra vista.

## Bloque A — código/créditos, fecha de nacimiento, teléfono, universidad, etiquetas

Primer bloque de una tanda grande de mejoras, arrancada con una auditoría
completa (schema real de Supabase + búsqueda de todos los usos en código)
antes de tocar nada, y un plan bloque por bloque acordado antes de empezar.

**Código y créditos de materia, afuera de todo.** `cod`/`creditos` salieron
de columnas, formulario, tarjetas, tabla, detalle, filtros, búsquedas y
seed. En los ~15 lugares donde el código se usaba como identificador visual
corto (chip, tile, avatar de Detalle) se reemplazó por `nombre` truncado o
por `materiaAbrev()` (primera palabra, 4 letras) para los espacios muy
angostos (tile cuadrado, columna de Horario en mobile) que antes usaban el
prefijo del código.

**Conflicto real encontrado en la auditoría, no inventado:** `materia.creditos`
alimentaba una meta de "créditos hacia el título" ya existente (Ajustes +
widget de Inicio + sección Progreso), que el pedido original no mencionaba.
Se frenó y se preguntó antes de borrar la columna — la decisión fue sacar
esa meta por completo (queda sólo la meta por cantidad de materias, que no
depende de créditos) en vez de conservar la columna oculta.

**Edad → fecha de nacimiento.** Selects de día/mes/año (no `<input
type="date">`: el pedido pedía explícitamente algo usable en mobile sin
tener que navegar 20 años atrás en un calendario nativo). La edad se
consulta con una vista, `profiles_con_edad` (`extract(year from age(...))`,
calculada al leer — nunca se desactualiza sola). La vista se creó primero
sin `security_invoker` por descuido propio y quedó filtrando profiles de
cualquier usuario saltándose RLS — se encontró con el advisor de seguridad
de Supabase antes de dar el bloque por cerrado, `alter view ... set
(security_invoker = true)` lo corrigió.

**Teléfono con país.** Selector de país (bandera + prefijo, `+598` por
default) + `libphonenumber-js` cargado por CDN (`bundle/
libphonenumber-js.min.js`, mismo patrón que ya usaba `@supabase/
supabase-js`) para formatear mientras se escribe y validar contra el país
elegido. Se guarda en `telefono_e164` + `telefono_pais` por separado. Si el
CDN no carga, degrada a guardar el número tal cual lo escribió el usuario
en vez de romper el formulario.

**Universidad reemplaza a facultad** (confirmado explícitamente: no son dos
campos separados). Tabla `universities` nueva, lectura pública, 5 filas
precargadas (ORT, UCU, UM, UdelaR, UDE) + "Otra" en texto libre por perfil
(`university_other`, nunca se inserta en la tabla global). Los perfiles que
ya tenían `facultad` cargada se migraron a `university_other` antes de
borrar la columna, para no perder ese dato.

**Etiquetas de eventos**, tabla `event_tags` nueva (RLS por usuario, `kind`
académico/personal, `color` reusando la misma paleta `ACCENTS` que ya usan
las materias — no un sistema de color nuevo). Selector con creación inline
en los modales de Evaluación y Evento personal, que de paso reemplaza un
selector de "Categoría" que ya existía en el modal de evento personal pero
estaba deshabilitado y no hacía nada (Trabajo/Salud tenían `title="No
disponible"`). Gestión de renombrar/eliminar desde Ajustes. Un solo
`renderTagChipInto()` para los 5 lugares donde se muestra un chip de tag.

**El trigger `handle_new_user()` de Supabase** (vive en la base, no en este
repo) insertaba `edad`/`facultad`/`telefono` directo desde los metadatos de
`signUp()` — se reescribió para los campos nuevos, preservando
`SECURITY DEFINER` y `search_path` tal cual estaban (`create or replace
function` no toca los permisos ya otorgados sobre la función, sólo el
cuerpo).

## Bloque C — pantalla de Inicio

**Tarjeta "Progreso del semestre"**, la de más peso visual de Inicio,
reemplaza la KPI "Materias cursando". Promedio del semestre + delta contra
el semestre anterior (mismo criterio ya establecido en
`semestresOrdenados()`: posición real, nunca "el anteúltimo"), anillo de
notas cargadas sobre evaluaciones esperadas (`ringStyle()`, reusado, no un
componente nuevo), y desglose por materia ordenado con la peor encaminada
primero (mismo criterio de ordenar por `actual/total` que ya usaba
`riesgo-panel`, aplicado acá a la lista completa en vez de sólo a las en
riesgo). Estado vacío con CTA a Agenda en vez de un 0 — se probó
explícitamente creando un semestre con una materia sin evaluaciones para
verificar que el estado vacío se vea bien y no un placeholder roto.

**Countdown en vivo** (`formatCountdown()`, `setCountdownEnNodo()`,
`iniciarCountdownGlobal()`) — un solo `setInterval` de 30s para toda la
app, arrancado una vez en el bootstrap, no uno por tarjeta. Sin hora sólo
habla en días ("en 3 d", "vence hoy"); con hora baja a horas/minutos.
Diseñada desde el principio para reusarse en Agenda (bloque D2) sin
duplicar la función, cosa que efectivamente pasó.

**"+ Nuevo" con 4 opciones.** No son 4 modales nuevos — Materia abre
`openMateriaModal`, Evaluación y Tarea abren el mismo `openEvaluacionModal`
(sólo cambia `tipoPreset`), y Cargar nota abre el mismo modal de Evaluación
con `hecho` precargado en "Entregado/rendido" y el foco inicial en el campo
de nota en vez del título. Dropdown propio (`.nuevo-menu`), no el
`quick-sheet`/FAB existente — ese es sólo mobile y este botón vive también
en desktop.

**"Lo próximo" en desktop.** No se puede mover un nodo entre contenedores
CSS distintos sólo con media queries (son padres diferentes: fuera de
`.inicio-cols` en mobile, dentro de la columna derecha en desktop) — se
resolvió reubicando el nodo por JS según `esMobile()`
(`posicionarInicioHero()`, llamada en cada render de Inicio y en un
listener de `resize` liviano para el caso de cruzar el breakpoint sin
navegar). Sus estilos, que antes vivían enteros dentro del `@media
(max-width:760px)`, se subieron a la hoja base — si no, se verían sin
formato en desktop (mismo tipo de bug que ya documentó el rediseño mobile
más arriba).

## Bloque D — Agenda y semestres

**Línea de color del evento, rediseñada.** El bug real (no estético, de
especificidad CSS): `barStyle()` fijaba `width`/`height`/`border-radius`
por `style` inline, y una regla sólo de tema oscuro trataba de convertir esa
barra en un riel de borde izquierdo pisando esas mismas propiedades — el
inline le ganaba en `height` y `border-radius` (no en `position`, que sí
tomaba), así que quedaba una pastillita corta de 36px flotando en la
esquina en vez de un borde prolijo de punta a punta. Se separó en dos: JS
(`barColorStyle()`) sólo pone el color, la geometría entera vive en una
única regla CSS que ahora corre en los dos temas, no sólo en oscuro. El
riel sigue el color de materia/personal (misma identidad que el chip, el
Calendario y Horario) — la etiqueta ya tiene su propio chip de color al
lado, no compite con el riel.

**El tick de "hecho" en desktop no se pudo reproducir.** Se probó con
clicks de mouse reales (no sintéticos) en tres anchos de desktop distintos
(703px, 900px, 1200px) contra el checkbox real de una fila de Agenda, y en
los tres casos el toggle funcionó y persistió — incluso encontrando en el
camino un bug real pero *del entorno de prueba* (el emulador de viewport
del browser de este entorno pierde la correspondencia de coordenadas del
click después de usar la acción de scroll con viewports grandes
emulados — se esquivó haciendo `scrollIntoView()` por JS en vez de scroll
de mouse simulado). No se descarta que el bug reportado sea real en algún
navegador o condición específica no reproducida acá. Se blindó de todos
modos el checkbox de `agenda-row` con `stopPropagation()` en `click` y
`change`, igual que ya tenía el checkbox análogo de `eval-row` (detalle de
materia) — hoy dependía sólo del `if (ev.target === check) return` del
handler de la fila; con esto queda explícito, no implícito.

**Countdown en Agenda**: mismo `formatCountdown()`/`setCountdownEnNodo()`
del bloque C2, sin duplicar. La columna de fecha (`.agenda-fecha`) se
envolvió en `.agenda-fecha-col` para poder apilar la fecha y el countdown
— eso corrió el cálculo de `margin-left` que alinea esa columna bajo el
título cuando la fila wrappea en mobile (antes contaba el ancho de la barra
de color, que dejó de ocupar espacio en el flujo al pasar a
`position:absolute`; se recalculó a mano, no se copió el valor viejo).

**Reordenar semestres.** Columna `orden` nueva (migración con backfill por
`created_at` existente, partido por usuario). Botones subir/bajar hacen un
swap de `orden` con el vecino inmediato en `semestresOrdenados()`, no un
renumerado global — más simple y no puede desincronizar el orden de nadie
más. `semestresOrdenados()` pasó de ordenar por `created_at` a ordenar por
`orden` (con `created_at` de respaldo para filas sin `orden` — no debería
pasar después del backfill, pero por las dudas); esto también cambia,
correctamente, qué cuenta como "semestre anterior" para el delta de
Progreso — ahora es el anterior en el orden que el usuario eligió, no el
cronológico. Botones deshabilitados (no ocultos) en los extremos, para que
el tamaño de toque no se mueva de lugar entre filas. En el modal de
Semestres a 375px, mostrar nombre + cantidad de materias + 4 botones de
acción en una sola fila queda muy justo — se sacó la cantidad de materias
(ya se ve al entrar al semestre) sólo en mobile para darle el espacio a los
botones, que son la única forma de hacer esas acciones.

## Bloque E — layout, tema y landing

Se pidió: E1) overflow horizontal en mobile en Calendario/Agenda (Horario
como referencia de "hecho bien"), sin desactivar el pinch-zoom; E2) altura
de la topbar como variable CSS, padding del contenido derivado de ahí,
considerando `env(safe-area-inset-top)`; E3) logo "Cursada" en la topbar
mobile (hoy ausente); E4) tema por defecto siguiendo al sistema operativo
de forma reactiva, con un control de 3 estados (Sistema/Claro/Oscuro) en
Ajustes, sacando los botones de tema sueltos que había; E5) landing con
"Iniciar sesión" visible en mobile (hoy sólo se veía "Crear mi cuenta").

**E1 — el bug real, no el que se pensaba.** Calendario y Agenda desbordaban
horizontalmente en mobile, pero no por el motivo obvio (viewport/zoom): sus
topbars tienen controles extra que Horario no tiene (dos `<select>` de
filtro en Agenda; el toggle Mes/Semana + navegación de mes en Calendario),
y la regla mobile de `.topbar-actions` (`flex-wrap:nowrap` + `flex:none`,
pensada para una topbar simple de ícono+ícono+botón) no tiene ningún
mecanismo para acomodar controles más anchos — simplemente se salen de la
pantalla. La solución no fue "apretar todo hasta que entre": se sacaron los
controles que no son decorativos (el toggle Mes/Semana cambia
`STATE.calViewMode` de verdad, no se puede esconder en mobile como el
Tarjetas/Tabla de Materias) de `.topbar-actions` a una fila propia debajo
del header — mismo patrón que ya usaba Materias con `.materias-toolbar` +
`.filtros-row`, sólo que Agenda y Calendario nunca lo habían adoptado.
Encontrado recién probando de verdad en 375px, no por lectura de código:
`gridTemplateColumns`/`scrollWidth` no avisan nada raro hasta que se mide.

Dos gotchas de CSS reales en el camino, ambos con fix documentado inline en
`styles.css` porque no son obvios releyendo la regla:
- Un div flex con `gap` en el `style=` inline (`.cal-header-nav`) no se
  puede angostar desde una regla externa sin `!important` — se movió el
  `gap` al CSS (mismo criterio ya aplicado en `landing.html` para el header
  de la landing, ver más abajo).
- `.filtros-row` reutiliza el patrón "flex:none + overflow-x:auto" pensado
  para cuando es hijo directo de `.view` (un bloque normal, 100% de ancho).
  Al meterlo dentro de un nuevo contenedor flex (`.agenda-toolbar`), ese
  mismo `flex:none` — antes inerte porque `.filtros-row` no vivía en un
  contexto flex — pasó a tener efecto real y lo dejó del ancho de su
  contenido (519px) en vez de encogerse a lo disponible, así que su propio
  scroll interno nunca llegaba a activarse. `min-width:0` no alcanzó para
  forzarlo (con `flex-shrink:0` el min-width no entra en juego para el
  cálculo de stretch en este caso); hizo falta `width:100%` explícito.

**Bug propio, encontrado probando — HTML mal cerrado.** Al mover el toggle
de Calendario y los `<select>` de Agenda fuera de la topbar, se agregaron
comentarios explicativos en `app.html` y en dos de ellos se cerró con `*/`
(sintaxis de comentario de `styles.css`, donde se escribió la mayoría de
los comentarios de esta sesión) en vez de `-->` (HTML). Un comentario HTML
sin cerrar correctamente no termina en el `*/` — sigue "abierto" hasta el
próximo `-->` real que aparezca en el archivo, así que todo el markup del
medio (incluidas dos secciones completas: `.calendario-wrap` con
`#cal-side`, y parte de la apertura de la sección Horario) quedaba fuera
del DOM real. El síntoma no se veía en Calendario/Agenda mismos sino
navegando a **otra** vista (Materias, en este caso): `#cal-side`, que
debería vivir anidado dentro de `#calendario`, terminaba reparentado como
hijo directo de `#app` (hermano de `.sidenav`/`.main` en el flex row raíz),
robándole todo el ancho a `.main` vía `flex:1` y aplastando la vista
visible a columnas de 64px. Se encontró probando cada vista después del
cambio (no sólo la que se tocó) y confirmando con
`document.getElementById('app').children` en vez de confiar en la captura
visual — el screenshot del bug ya alcanzaba para sospechar, pero la
inspección del árbol real fue la que mostró la causa exacta. Corregido
(`-->` en los dos comentarios) y reverificado: `#app` vuelve a tener
siempre los mismos 6 hijos esperados en cualquier vista.

**E2 — no se pudo reproducir un "la topbar tapa contenido" en vivo.**
`.topbar` usa `position:sticky` en mobile (no `fixed`), así que reserva su
propio espacio en el flujo normal — no hay manera estructural de que tape
contenido por default, y no se encontró ningún elemento `position:fixed`
en la app que asuma su altura a mano (ninguna otra regla duplicaba el
`52px` de `.topbar`, sólo la propia definición). Se probó cada vista a
375px con scroll real (`window.scrollTo`) buscando algo escapándose por
encima o por detrás de la topbar, y en desktop (1440px) donde `.topbar` en
realidad ni siquiera es sticky (`position:static`, scrollea con el
contenido — el elemento persistente ahí es `.sidenav`). Nada. Se implementó
igual el pedido explícito, como refuerzo preventivo más que como fix de un
bug reproducido: `--topbar-h:52px` nueva en `:root`, y
`calc(var(--topbar-h) + env(safe-area-inset-top))` reemplaza el `52px`
hardcodeado que tenía `.topbar`. Cualquier elemento mobile nuevo que en el
futuro necesite ubicarse justo debajo de la topbar (un overlay `fixed`, por
ejemplo) ya tiene de dónde calcularlo sin adivinar un número a mano y
desincronizarse si esto cambia — mismo espíritu que el bug del tick de
"hecho" en el bloque D: no se pudo reproducir, se blindó preventivamente y
se documentó la falta de reproducción en vez de inventar un fix para un
síntoma no confirmado.

**E3 — logo en la topbar mobile.** El logo "Cursada" (`.sidenav-brand`)
sólo vivía dentro del cajón lateral, que en mobile está fuera de pantalla
por defecto — la topbar fija de cada vista (la que sí se ve todo el tiempo)
no tenía ningún logo, sólo el ☰. Se agregó `.topbar-brand` — la misma marca
cuadrada de `.sidenav-brand .mark`, sin el wordmark en texto (ya sobra
lugar con el título de la vista al lado) — repetida en los 7 headers de
`app.html`, mismo criterio de repetición ya establecido para
`.topbar-menu` (el ☰), que también vive duplicado en cada header en vez de
inyectarse por JS. Oculta en desktop con el mismo guard explícito que
`.topbar-menu` (`@media(min-width:761px){display:none}`) para no reabrir
el gap de "estilo que sólo vive dentro del media de mobile" documentado en
la skill de convenciones.

**E4 — tema de 3 estados.** Existían dos controles Claro/Oscuro sueltos
(uno en `.app-toolbar`, sólo desktop; uno duplicado en el header de
Horario, también sólo desktop) más un tercero fantasma: en mobile no había
ningún control de tema visible en ningún lado. Los dos sueltos se sacaron;
uno solo nuevo vive en Ajustes, con tres opciones (Sistema/Claro/Oscuro) —
accesible en cualquier ancho, a diferencia de los que reemplaza.
`localStorage['cursada:theme']` ahora guarda la *preferencia*
(`'sistema'|'claro'|'oscuro'`), no el tema resuelto: `'sistema'` se
resuelve con `window.matchMedia('(prefers-color-scheme: dark)')` en cada
`applyTheme()`, y un listener de `change` sobre ese mismo `matchMedia`
re-resuelve solo si el SO cambia de tema mientras la pestaña sigue abierta
(sin recargar). Default nuevo (sin preferencia guardada) es `'sistema'`;
una preferencia explícita guardada de antes de este cambio (`'claro'` o
`'oscuro'`) se respeta tal cual, no se pisa. Se agregó
`html[data-theme="claro"]{color-scheme:light}` (antes sólo el oscuro
declaraba `color-scheme`, así que los controles nativos en tema claro no lo
tenían explícito).

No se pudo verificar en este entorno que el cambio sea *reactivo en vivo*
sin interacción: la emulación de `prefers-color-scheme` de la herramienta
de browser de este entorno cambia lo que devuelve `matchMedia(...).matches`
pero no dispara el evento `change` sobre un `MediaQueryList` ya creado
(confirmado con un listener de prueba aparte, que nunca se disparó pese a
que `.matches` sí cambiaba) — limitación del entorno de prueba, no de la
API real (`addEventListener('change', ...)` sobre `matchMedia` es
comportamiento estándar y así es como cualquier navegador real notifica un
cambio de tema del SO en vivo). Se verificó el mecanismo de resolución en
sí (re-seleccionar "Sistema" con el SO ya en oscuro resuelve a oscuro
correctamente) — sólo la reactividad *sin* volver a tocar el control quedó
sin poder confirmarse en vivo acá.

**E5 — "Iniciar sesión" en el header mobile de la landing.** A 700px el
header ya escondía el nav del medio (Funciones/Cómo calcula/Preguntas) y
"Iniciar sesión" (dejaba sólo el CTA de "Crear mi cuenta") — decisión
documentada en el propio `landing.html` de una sesión anterior. Se cambió
para mostrar ambos: un visitante mobile que ya tiene cuenta necesita poder
entrar sin buscar el link en el footer. Mostrar los dos enteros
("Iniciar sesión" + "Crear mi cuenta") no entraba ni a 375px sin quedar al
límite exacto (medido: 227.5px de contenido para 227.5px disponibles, cero
margen) y a 320px desbordaba ~40px incluso después de angostar
gap/padding/tipografía al mínimo razonable — así que además de achicar
espaciado, los dos links ganaron una versión corta sólo para mobile
("Ingresar" / "Crear cuenta", mismo destino) vía un par de `<span>`
alternados por media query, y el logo del header también se achica un
toque en mobile (26px → 22px de marca, texto 19px → 16px). Verificado con
medición real (`getBoundingClientRect`) a 320px y 375px, no sólo por
lectura de CSS — la primera versión "parecía" entrar por cálculo a mano y
en la práctica desbordaba, así que esta vez se iteró contra el navegador
hasta confirmar margen real, no ancho exacto al límite.

**Cosas encontradas pero fuera de lo pedido, no tocadas.** El detalle de
materia (`#materia-*`) mide 3px de overflow horizontal a 375px que no
viene de nada tocado en este bloque — resultó ser contenido de un modal
cerrado (`visibility:hidden`, no `display:none`, patrón estándar de la app
para poder animar la apertura) que igual aporta al `scrollWidth` del
documento por estar fuera de flujo normal; no genera scroll visible ni
perceptible en uso real. Preexistente, no relacionado con Calendario/Agenda
que era el pedido explícito de E1 — se deja anotado acá en vez de
tocarlo sin que se pida.

## Fases 1-7 — separar evaluaciones de tareas, rehacer el simulador, y una
## tanda de UI (ver/editar, tick, etiquetas, ajustes visuales, tema)

Tanda grande pedida en un solo prompt con 7 fases + cierre. Se implementó
y verificó fase por fase, en el navegador, con un commit por fase. Esta
sección documenta las 7 juntas para no repetir contexto compartido (el
modelo de datos de Fase 1 es la base de casi todo lo demás).

### Fase 1 — separar tareas de evaluaciones

Antes, `agenda` (evaluaciones + entregas ligadas a una materia) era una
sola entidad sin distinguir "esto tiene nota" de "esto no" — el `tipo`
(Parcial/Final/Entrega/Tarea/...) era texto libre sin ninguna regla, y no
había forma de que una evaluación tuviera su propia nota máxima (requisito
de Fase 2).

**Migración** (`f1_agenda_kind_nota_maxima`): `agenda.kind`
(`'tarea'|'evaluacion'`, `NOT NULL`) + `agenda.nota_maxima` (numeric,
nullable) + `CHECK(kind = 'tarea' OR nota_maxima IS NOT NULL)`. Backfill
mostrado y aprobado antes de correrlo: evaluación si `tipo` es uno de los
clásicos de examen (`Parcial`, `Final`, `Obligatorio`, `Presentación`) o
ya tenía `nota` cargada; el resto (Tarea, Entrega, Estudiar, Estudio,
"Estudiar repasar") pasa a ser tarea — coincide con el propio ejemplo del
pedido ("entregar informe" = tarea). Resultado real: 23 evaluaciones y 8
tareas de 31 filas. `nota_maxima` de las evaluaciones migradas = `esc.total`
de su materia (la nota ya se interpretaba implícitamente sobre esa escala).
RLS no cambió: `agenda_all_own` (`auth.uid() = user_id`) ya cubre columnas
nuevas sin tocar la policy.

**Decisión de modelo** (confirmada con el usuario antes de tocar código):
una sola tabla `agenda` con columna `kind`, no dos tablas separadas —
reutiliza `CACHE.agenda`, el mapeo `agendaToRow`/`rowToAgenda` y los ~15
puntos de lectura existentes (Inicio, Agenda, Calendario, Detalle,
simulador) en vez de duplicarlos.

**Creación explícita**: el modal de evaluación/tarea gana un primer paso
(`STATE.editing.modo === 'elegir-kind'`) con dos tarjetas — Tarea / Evaluación
— antes de mostrar el form; los campos de nota sólo aparecen para
evaluación. Los accesos contextuales (`+ Nueva evaluación`/`+ Nueva tarea`
en Detalle, los ítems del menú "+ Nuevo") saltan directo al kind
correspondiente; los accesos genéricos (`+ Nuevo` de Agenda, el FAB, la
hoja rápida de mobile) muestran el picker.

**`computeMateria()` se partió en dos campos**: `items` (tareas +
evaluaciones de la materia, para el listado de Detalle) y `evaluaciones`
(sólo `kind==='evaluacion'`, la única fuente del promedio/simulador/ring de
aprobación) — antes una tarea sin nota se colaba en el cálculo de
aprobación de la materia. Bug real encontrado probando: el widget
"Progreso del semestre" de Inicio contaba tareas como "evaluaciones
esperando nota" (2/9 en vez de 2/7) porque `agendaDeSemestre()` trae ambos
kinds — se filtró a `kind==='evaluacion'` en `computeProgresoSemestreActivo()`.

### Fase 2 — simulador de notas como función pura

El simulador viejo promediaba notas reales+simuladas asumiendo que todas
compartían la escala de la materia. Con nota_maxima por evaluación (Fase 1)
esa cuenta ya no cierra: "20/25 en una y 30/30 en otra" promediado da 25,
no responde "¿cuánto falta para aprobar?".

`src/simulador.js` (nuevo, función pura `calcularSimulacion(esc,
evaluaciones, valoresSimulados)`, sin DOM/Supabase) suma puntos en vez de
promediar: `puntosReales` (suma de notas reales, fija — no la mueve el
slider de otra fila), `puntosProyectados` (suma de lo que dice cada slider
ahora), `disponibles` (Σ nota_maxima de las sin nota), `faltanAprobacion`/
`faltanExoneracion`, `imposible`/`asegurado` (calculados sobre lo YA real,
ignoran los sliders — no deberían prenderse y apagarse solos al arrastrar),
`promedioNecesario`, `escalaInconsistente` (aviso si Σnota_maxima ≠
esc.total, no rompe nada). Se concatena como `<script>` propio ANTES de
`runtime.js` (`build-app.mjs`/`build-test.mjs`) sin IIFE a propósito, para
quedar como función global igual que cualquier script sin módulos —
`runtime.js` la llama por nombre, sin namespacing.

Tests: `npm run test:sim` (`node --test`, sin dependencias nuevas) — 11
casos, incluyendo los 5 bordes pedidos explícitamente (sin evaluaciones,
Σnota_maxima≠total, nota>nota_maxima bloqueada, decimales, división por
cero).

Un slider por CADA evaluación registrada (antes sólo las sin nota), rango
`0…nota_maxima` propio de cada una; las que ya tienen nota real arrancan
ahí marcadas "Real" — tocar el slider las pasa a "Simulado" (se puede
simular igual, como pide el pedido).

Nuevo `esc.exoneracion` (opcional, JSONB, sin migración — `esc` ya es un
objeto libre): pill "Sin exoneración"/"Otro" en el modal de materia, junto
a los presets de aprobación existentes.

### Fase 3 — ver vs. editar

El mismo modal gana un modo lectura (`STATE.editing.modo === 'ver'`) que se
muestra primero al editar un ítem existente — materia, fecha, hora, nota
máxima/obtenida (sólo evaluación), estado, etiqueta, notas — con un botón
"Editar" que recién ahí revela el form de siempre. Crear uno nuevo salta
directo al picker/form (nada que ver todavía). "Eliminar" desde el modo
lectura dispara el click del botón real del form (mismo patrón que
`btn-perfil-logout`/`btn-ajustes-logout`) en vez de duplicar la lógica de
borrado.

Bug de paso, encontrado probando: el `confirm()` de borrado decía
"¿Eliminar esta evaluación?" para cualquier ítem, incluidas tareas — ahora
dice tarea/evaluación según `kind`.

### Fase 4 — tick verde: bug de raíz + menú de evaluación

La estructura vieja (`<input type=checkbox>` con un `<span>` visual encima,
`pointer-events:none` para dejar pasar el click al input real) ya
funcionaba para el toggle simple, pero no tenía forma limpia de colgar el
menú nuevo que pide esta fase. Se reemplazó por un `<button>` real: un solo
elemento interactivo (sin ambigüedad de a quién le llega el click),
`stopPropagation()` explícito, Enter/Espacio nativos por ser `<button>`
(nada que reimplementar), área de toque 22px → 28px, `aria-label`/
`aria-pressed` correctos.

Tarea → toggle directo. Evaluación → popover chico (`#tick-menu`, nuevo)
con "Esperando nota" (marca hecho, nota null) o "Cargar nota" (input
acotado a `nota_maxima`, sin abrir el modal entero). Popover propio, no
`#row-menu` (el menú contextual de mobile ya existente): ese es
`display:none` fuera de su `@media(max-width:760px)` a propósito (mobile
only, 4 acciones de toda la fila); el del tick tiene que andar en
cualquier ancho.

Verificado con clicks reales resueltos por referencia de accesibilidad
(`find` + click por `ref`), no por coordenadas de pantalla — las
coordenadas de los screenshots de este entorno no se corresponden 1:1 con
las coordenadas reales del viewport (confirmado comparando
`getBoundingClientRect()` contra dónde aterrizaba un click por coordenada);
para cualquier verificación futura acá, conviene resolver el elemento por
`find`/`ref` en vez de calcular píxeles a mano.

### Fase 5 — etiquetas unificadas

La sección "Etiquetas" de Ajustes (renombrar/eliminar) duplicaba la idea
original de los tags — el selector de chips ya reusado en evaluación/
tarea/evento personal. Se sacó de Ajustes; renombrar (✎, `prompt()`) y
eliminar (🗑, `confirm()` + mismo `ON DELETE SET NULL`) pasan a vivir en
cada chip del selector (`.tag-chip-wrap`, visible al hover en desktop,
siempre visible en mobile) — reusa `.semestre-row-edit`/`-delete`, ninguna
clase nueva.

Presets de creación rápida (un tap crea y selecciona si no existe):
Parcial/Examen/Final/Oral para evaluaciones, Estudiar/Leer/Entrega/Grupal
para tareas y eventos personales. `event_tags.kind` (`'academico'|
'personal'`) no cambió — sigue siendo "ligado a materia" vs "personal";
el preset es un parámetro aparte (`ids.presetKind`) que no toca el
esquema.

### Fase 6 — ajustes de UI

- **Completadas**: tareas/evaluaciones con `hecho:true` se sacan de sus
  grupos de fecha y van a una sección "Completadas (n)" colapsable al
  fondo (Agenda y Detalle de materia) — colapsada por default, estado
  persistido en `localStorage` por scope (`agenda`, `detalle-<materiaId>`),
  transición vía `grid-template-rows` (1fr↔0fr) para no medir alturas a
  mano ni saltar de layout.
- **Margen de riesgo**: se saca la edición desde Ajustes (7 pills para un
  concepto — cuánto margen antes de pasar de "en riesgo" a "en peligro" —
  que casi nadie tocaba). Queda fijo en `MARGEN_RIESGO` (constante ya
  existente). No se borra la columna `profiles.margen_riesgo` — dato
  inerte, no vale una migración destructiva sólo por esto.
- **Toggle Mes/Semana**: vuelve a la topbar (junto a flechas y título) en
  vez de su propia fila (`.cal-toolbar`, que se elimina) — Bloque E lo
  había sacado de ahí por overflow real a 375px; esta vez se resolvió con
  un `#cal-view-toggle` compacto y, en mobile, labels de una letra (M/S,
  mismo patrón `.lp-txt-l`/`.lp-txt-s` que ya usaba la landing) en vez de
  "Mes"/"Semana" completo. Verificado sin overflow (`scrollWidth` =
  `innerWidth`, con margen real medido) a ~360px, no sólo por lectura de
  CSS — el primer intento (sólo achicar tipografía/padding) todavía tocaba
  el borde de la pantalla.
- **Horario**: hairlines en `.hg-cell` (antes transparente del todo, ver
  Bloque "grilla en tablero") — `--c-line-faint2` en las filas de media
  hora, `--c-line-faint` (un toque más marcado) en las horas en punto.
- **Tabla de materias**: punto de color por fila (`dotStyle()`, ya
  existente — mismo color que tarjetas/Progreso, no uno nuevo).
- **Bug de solapamiento**: `#cal-side-list` (panel del día en Calendario)
  no tenía `gap`/`overflow-y` propio — un día con muchos eventos hacía
  crecer `.cal-side` sin límite (los flex item miden `min-height:auto` por
  default). Ahora scrollea internamente (`flex:1;min-height:0;overflow-y:
  auto`), "+ Agregar en este día" queda siempre visible abajo. Verificado
  sembrando un día de prueba con 9 eventos (`test-harness/mock-supabase-
  client.js`): sin overlaps reales (`getBoundingClientRect()` de cada
  tarjeta, ninguna se pisa) en desktop y mobile.

### Fase 7 — tema por defecto y landing oscura

El sistema de tema de 3 estados (Sistema/Claro/Oscuro, `temaEfectivo()` en
`runtime.js`) ya default-eaba a Sistema y reaccionaba en vivo desde Bloque
E — no se tocó esa lógica. Lo que faltaba era la landing (`src/
landing.html`), 100% clara con ~140 colores en hex literal inline (sin
CSS classes reusables para color, cada `style=` los repetía).

Se agregaron tokens propios (`--lp-bg`, `--lp-surface`, `--lp-ink`/`-ink2`/
`-ink3`, `--lp-accent`/`-accent-to`, `--lp-fill`, `--lp-border`, mismos
valores que `--c-*` de `styles.css` para las dos escalas) + un override
`[data-theme="oscuro"]`, y un `<script>` bloqueante al principio de
`<body>` (la landing no carga `runtime.js`, así que `temaEfectivo()` se
repite ahí en miniatura) que resuelve `localStorage['cursada:theme']` →
`prefers-color-scheme` antes de que la página pinte nada — sin esto habría
flash de tema incorrecto en cada carga.

Los degradés fijos del isotipo (`#2C7BFF → #0847B4`, el mismo del favicon)
y el blanco puro sobre fondos de acento (avatares, footer, chips) quedan
literales a propósito, no dependen del tema.

**Dos bugs reales, encontrados armando esto (no en el pedido):**
- Un comentario CSS que abreviaba "--c-ink, --c-ink2, --c-ink3" como
  `--c-ink*` seguido de `/--c-accent*` — la secuencia `*/` que quedó ahí en
  el medio cerró el comentario a mitad de camino; todo el texto en
  castellano que seguía se parseó como CSS inválido, y el navegador
  descartó la regla `:root{}` entera en la recuperación de errores (ningún
  token `--lp-*` llegaba a definirse — toda la página caía al color
  inicial del navegador). Mismo tipo de bug que el HTML mal cerrado de
  Bloque E, esta vez del lado CSS — encontrado con `document.styleSheets`
  y comparando qué reglas habían parseado, no a simple vista.
- 3 franjas de "contraste oscuro sobre página clara" (footer, sección
  final "Creá tu cuenta", una tarjeta de Funciones) tenían
  `background:var(--lp-ink)` — correcto mientras `--lp-ink` fuera siempre
  oscuro (es el color de texto, se aclara en tema oscuro), así que en
  oscuro esas franjas casi desaparecían (fondo casi blanco con texto
  gris clarito encima). Quedan con fondo fijo `#12161C` en los dos temas —
  son una franja de contraste, no texto, no tienen que seguir la escala de
  tinta.

### Cierre

- `npm run test:sim` (11/11) y `npm run build` (app + landing) sin errores
  en cada fase, no sólo al final.
- Verificado en el navegador con clicks/estado reales contra
  `out/Cursada.test.html` (mock) en cada fase — Inicio, Materias, Agenda,
  Calendario, Detalle, Ajustes, y la landing en `out/index.html`, desktop
  y mobile (~360-375px).
- Supabase: RLS de `agenda` (`agenda_all_own`, `auth.uid() = user_id`) sin
  cambios — cubre las columnas nuevas sin tocar la policy; `get_advisors`
  sin lints nuevos (el único WARN existente, `auth_leaked_password_
  protection`, es previo y no relacionado); auth y el resto de las tablas
  sin tocar. Verificado además que `out/Cursada.html` (build real, contra
  Supabase real) carga sin errores de consola y con `window.CURSADA_
  SUPABASE` inicializado.

## Rediseño de Progreso + fix del wordmark del sidenav

Auditoría de diseño (skill ui-ux-pro-max) sobre toda la app: la mayoría de
las vistas ya venían de varias pasadas de pulido (dirección visual, íconos,
accesibilidad, animación — ver secciones anteriores), pero **Progreso**
quedó comparativamente vacía: sólo un gráfico de línea entre semestres y la
barra hacia el título, con mucho blanco sin usar en desktop. Dos cambios,
acotados a esa vista y a un bug chico encontrado de paso.

### "Promedio por semestre": barras en vez de línea con pocos datos

La guía de gráficos del skill es explícita: una línea de tendencia necesita
≥4 puntos para tener sentido — con 2 o 3, una línea sugiere una tendencia
continua que todavía no existe, y sugiere en su lugar una comparación
directa. `renderProgreso()` ahora decide entre las dos según
`puntos.length` (el mismo array que ya armaba `computeProgresoPorSemestre()`,
sin tocar ese cálculo):

- **≥4 semestres con notas**: sigue usando `buildProgresoChartSvg()` tal
  cual estaba, sin cambios — ahí la línea sí gana sentido.
- **1 a 3 semestres**: `renderProgresoBarras()` (nueva), que arma una fila
  por semestre reusando el patrón `.nota-row`/`.bar-wrap`/`.bar-fill` que ya
  usa "Progreso hacia el título" — no un componente nuevo. Cada fila suma
  el dato de `p.aprobadas`/`p.total` que `computeProgresoPorSemestre()` ya
  traía y no se usaba en ningún lado, y el semestre activo queda marcado
  con "· actual" en el propio label (mismo criterio "sin ícono nuevo" que el
  resto de la vista).

### "Estado de todas tus materias" (card nueva)

Antes esa mitad de la vista era la barra hacia el título y nada más. La
card nueva es una barra segmentada (una franja por `estado`, ancho
proporcional a la cantidad) más su leyenda con conteo exacto — reusa
`ESTADO_LABEL`/`ESTADO_TONE` (el mismo vocabulario ya usado en los filtros
de Materias) y la plantilla `leyenda-item` que ya arma `buildLeyendaItem()`
para Calendario/Horario, así que no agrega clasificación, copy ni
componente nuevos. El color nunca es la única señal — la leyenda siempre
nombra el estado y su número, siguiendo la guía de accesibilidad del skill
para gráficos proporcionales ("no depender sólo del color").

**Alcance: todas las materias de la cuenta, no sólo el semestre activo.**
A diferencia de Materias/Inicio/Horario, esta vista (como toda la sección
Progreso) muestra histórico completo a propósito — ver
`cursada-conventions` y la sección "Semestres" más arriba. La card nueva
sigue ese mismo criterio (`computeMaterias()` sin `semestreId`, el mismo
alcance que ya usaba `materiasAprobadasCount()` para la meta hacia el
título), no el alcance acotado que tienen Materias/Inicio.

`renderProgresoDistribucion()` sólo se llama después de confirmar
`puntos.length > 0` (mismo guard que ya tenía el resto de la vista) — no se
agregó un estado vacío propio para esta card en particular, para no sumar
un tercer estado posible (vacío total / con historial de notas pero sin
materias / con materias) a una vista que ya tenía su empty-state general
bien resuelto.

### Fix de paso: el wordmark "cursada" se pintaba como ítem activo

Encontrado auditando el sidenav, no reportado por nadie: el botón
"cursada" del `.app-toolbar` (arriba de todo, sólo visible en el rango
mobile/tablet) reusa `class="nav-item" data-nav="inicio"` únicamente para
heredar el reset de botón y el listener genérico de `[data-nav]` que ya
navega por `location.hash`. El problema es que `renderSidenav()` togglea
`.is-active` con el selector `.nav-item[data-nav]` a secas, que también
matcheaba ese botón — cada vez que `STATE.route.view === 'inicio'`, el
wordmark quedaba con `background:var(--c-accent)` sólido (confirmado por
`getComputedStyle`, aunque en el layout donde lo vi no llegaba a pintarse
porque esa barra está fuera de flujo en ese ancho — igual era un bug real
de estado, no sólo cosmético en potencia). Fix de una línea: el selector de
`renderSidenav()` pasa a `#sidenav-nav .nav-item[data-nav]`, el contenedor
real de los 6 destinos del sidenav — el wordmark, que vive en
`.app-toolbar`, queda afuera. Nada más cambió: mismo listener de click,
mismo comportamiento de navegación.

### Qué no se tocó, a propósito

- `computeProgresoPorSemestre()`, `computeMateriasDelActivo()`,
  `buildProgresoChartSvg()`: sin cambios, sólo se agregó código alrededor.
- No se intentó una tendencia por materia entre semestres (qué materia
  mejoró/empeoró de un cuatrimestre al otro): las materias no están
  vinculadas entre semestres más que por nombre en texto libre, y
  emparejarlas por nombre para armar una serie histórica es una regla de
  negocio nueva que nadie pidió — se prefirió quedarse con datos que el
  modelo ya garantiza correctos.
- No se tocó nada de la landing (`src/landing.html`) — quedó fuera de esta
  pasada a pedido explícito.

## Onboarding automático desde el catálogo (ORT)

Hasta acá, una cuenta nueva arrancaba siempre en blanco: la primera materia,
la primera franja horaria y la primera fecha de parcial se cargaban a mano.
Este pedido agrega un wizard de 5 pasos que, para instituciones con
catálogo cargado del lado de la base (hoy sólo ORT), arma el semestre
entero — materias, horario, salón, sistema de calificación y agenda de
parciales/entregas reales — a partir de RPCs de sólo lectura que ya
existían en Supabase (`cat_carreras_de`, `cat_grupos`, `cat_dictados`,
`cat_materias_sugeridas`, `cat_electivas`, `cat_conflictos`) y tres RPCs de
escritura (`aplicar_grupo`, `aplicar_dictados`, `aplicar_plan`,
`aplicar_agenda`) que ya venían implementadas y probadas del lado de la
base — este PR es 100% frontend, no se tocó el esquema.

### Dónde vive

Todo el código nuevo entra en `src/runtime.js` (sección "WIZARD DE
ONBOARDING", después de `hideOnboarding()`), siguiendo la convención del
archivo de un solo IIFE — no se creó un módulo aparte. El overlay (`src/
app.html`, `#wizard-onboarding`) y sus estilos (`src/styles.css`, bloque
"Wizard de onboarding") son nuevos; el resto se apoya en componentes que ya
existían (`.seg-card`, `.chip-materia`/toggle-button, `buildNumPill()`,
`asignarColumnas()`).

### Decisiones de arquitectura

- **Overlay post-reveal, no gate bloqueante.** El precedente más cercano en
  el código (el modal de perfil obligatorio de cuentas de Google) se
  resuelve *antes* de revelar `#app`, porque no se puede posponer. Este
  wizard es lo opuesto — siempre salteable ("Prefiero cargarlo a mano", en
  los 5 pasos) y tiene que poder reabrirse desde Ajustes con la app ya en
  uso — así que se modela igual que `#onboarding` (overlay `position:fixed`
  encima del dashboard ya revelado, mismo z-index), con un array de pasos +
  una función que togglea cuál se ve (`WIZ_PASOS`/`wizMostrarPaso()`),
  calcado del patrón que ya usa el auth-card de 5 paneles
  (`AUTH_PANELS`/`showAuthPanel()`).
- **Primer uso de `sb().rpc(...)` en el archivo.** Hasta ahora todo el
  acceso a Supabase era CRUD directo (`.from(tabla).select/upsert/delete`).
  Se agregó un único punto de llamada (`rpc(name, params)`, al lado de
  `supaUpsert`/`supaDelete`) que tira la excepción tal cual — las RPCs de
  escritura ya traen mensaje en español, así que no hace falta traducir
  nada, sólo mostrarlo (`wizMostrarError`, mismo tratamiento visual que
  `auth-error`).
- **Punto de enganche**: los dos lugares donde el código decidía "no hay
  materias → mostrar `#onboarding`" (dentro de `onSignedIn()` y dentro del
  handler "No, gracias" de importar datos locales) pasan a llamar a
  `mostrarOnboardingOCatalogo()`, que abre el wizard sólo si
  `profiles.university_id === ORT_UNIVERSITY_ID` (constante nueva) **y**
  `profiles.carrera_id` todavía no se eligió — cualquier otra institución,
  o una cuenta que ya pasó por el wizard antes, sigue viendo el
  `#onboarding` de siempre. Ninguna institución sin catálogo llega a ver un
  dropdown vacío.
- **Reusar el layout de Horario para la previsualización, no reimplementarlo.**
  El Paso 5 tiene que verse pixel-idéntico a la grilla semanal real. En vez
  de armar una segunda versión del algoritmo de columnas para
  superposiciones, se extrajo `buildHorarioGridInto(grid, items,
  mostrarSabado, opts)` de `renderHorario()` — la vista real le pasa
  `computeMateriasDelActivo()`, el wizard le pasa un array armado en
  memoria con las materias todavía sin guardar (`wizItemsPreview()`). El
  refactor es sólo extracción; `renderHorario()` produce exactamente el
  mismo DOM que antes (probado: Horario semanal real, con materias del
  grupo aplicado, se ve igual que antes de este cambio).
- **Conflictos con datos reales, no aceptación ciega.** Antes de confirmar
  se llama `cat_conflictos` con todos los `dictado_id` en juego (los del
  camino elegido en el Paso 3 más las electivas del Paso 4). Si hay
  superposición, no se puede confirmar sin tildar "Confirmar igual, ya sé
  que se pisan" — mismo criterio que el enunciado pedía explícitamente.
- **Tres niveles de fallback en la oferta (Paso 3), nunca una pantalla
  vacía.** `cat_grupos` primero (camino rápido, sólo tiene sentido con un
  único semestre elegido); si viene vacío, `cat_dictados` (camino manual,
  cruza semestres); para cualquier semestre elegido que tampoco tenga
  dictados ahí, `cat_materias_sugeridas` de ese semestre puntual (materias
  del plan sin horario, con una nota explícita de "lo completás vos
  después"). Los tres niveles conviven en la misma pantalla del camino
  manual, sección por semestre.
- **`profiles.carrera_id` y `semestres.periodo` son campos nuevos,
  aditivos.** `profiles.carrera` (texto libre) y `profiles.university_id`
  ya existían de antes (formulario de registro/perfil) y no se tocaron —
  `carrera_id` es un campo distinto, con su propia semántica (referencia al
  catálogo). `semestreToRow`/`rowToSemestre` suman `periodo`; un semestre
  creado a mano (`crearSemestre()`) sigue quedando con `periodo:null`, no
  cruza con nada. `rowToMateria` suma `catalogoMateriaId`/`catalogoDictadoId`
  de sólo lectura (las escriben las RPCs, nunca este cliente, así que una
  edición manual posterior de la materia no las pisa) — quedan accesibles
  desde el objeto de materia para la futura calculadora de exoneración
  (`cat_esquema`/`calcular_nota`, explícitamente fuera de alcance de este
  PR), sin ninguna UI nueva que las muestre todavía.
- **Reingreso desde Ajustes.** Botón nuevo "Rehacer configuración inicial"
  en el grupo "Datos y cuenta" (oculto salvo que `university_id` sea ORT),
  que cierra Ajustes y abre el wizard sin la condición de "sin materias
  todavía" — las RPCs de escritura son idempotentes (buscan por
  `catalogo_dictado_id`/`catalogo_materia_id` antes de crear), así que
  correrlo de nuevo con la misma selección no duplica nada; probado a mano
  contra el mock (ver más abajo).

### Bug encontrado probando (no por lectura de código)

La previsualización del Paso 5 (`#wiz-horario-grid`) se renderizaba
**invisible, con altura 0**, la primera vez que se probó en el navegador.
Causa: `.horario-grid-wrap`/`.horario-grid` usan `flex:1` para expandirse
dentro de un padre con altura ya acotada — en la vista Horario real ese
padre es `.view` (`height:100%` heredado del layout de la app), pero
`.wiz-panel` no tiene ninguna altura fija. Fix: `#wiz-panel-revision
.horario-grid-wrap` pasa a tener una altura explícita (`460px`) en vez de
depender de `flex:1`. De paso apareció un segundo problema relacionado: la
regla mobile de la vista Horario real (`.horario-grid-wrap{display:none}`,
que ahí tiene sentido porque la reemplaza `renderHorarioMobile()` con un
timeline) apagaba también la grilla del wizard en pantallas chicas — el
wizard no tiene ese timeline alternativo, así que se la exceptúa
explícitamente de ese `display:none` en vez de construir una vista mobile
nueva sólo para esta previsualización.

### Probado contra el mock (`test-harness/mock-supabase-client.js`)

Se agregó `rpc: mockRpc` al cliente mock, con datos fixture: 2 carreras
(mismo `nombre`, `plan_version` distinto), grupos/dictados sólo para el
semestre 4 (`LA_M4B` matutino / `LA_N4A` nocturno, 4 materias cada uno,
mismo horario docente corrido 10hs), `cat_materias_sugeridas` para los
semestres 2 y 3 (sin horario), una electiva con 2 secciones abiertas y otra
con una sección `sin_minimo`, y `cat_conflictos` calculado de verdad
(overlap real entre los `bloques` de cualquier combinación de ids, no una
lista de pares hardcodeada). Nuevo flag `?onboarding=1` arranca la cuenta
de test sin semestres/materias/agenda (el resto de los tests de este
harness dependen del fixture con datos, que no dispara el wizard). Casos
verificados a mano en el navegador:

- Camino rápido completo (ORT → Plan actual → semestre 4 → `LA_M4B` →
  confirmar): 4 materias con horario, salón y escala de nota, agenda con
  parcial el 10 de diciembre a las **09:00** (turno matutino) y entrega el
  20 de noviembre — igual que si se hubieran cargado a mano.
- Semestre sin grupos ni dictados (semestre 2): cae directo al aviso +
  camino manual con `cat_materias_sugeridas`; confirmando queda la materia
  cargada sin horario, sin pantalla rota.
- Electiva que se pisa con una materia del grupo: el Paso 5 muestra el
  conflicto real (día y horario correctos) y no deja confirmar sin tildar
  la aceptación explícita.
- Re-ejecutar el wizard completo dos veces con la misma selección (desde
  Ajustes): la Agenda sigue en 8 ítems, Materias sigue en 4 — no duplica.
- "Prefiero cargarlo a mano" cierra el wizard y abre el modal de alta
  manual de siempre, en cualquier paso.

### Dos bugs reportados en uso real contra Supabase (corregidos)

El primer despliegue contra la base real (no el mock) mostró dos problemas
que el fixture del test-harness no reproducía:

- **Electivas mostraban "Sección N" en vez del nombre de la materia.**
  `wizCargarElectivasSegunTurno()` ponía el nombre de la materia sólo en un
  `<span>` agrupador arriba de la lista, y cada fila (`wiz-item-row`)
  mostraba únicamente `'Sección ' + e.seccion`. Con una sola sección
  abierta para el turno elegido (caso típico: nocturno con una sola
  sección "N"), la fila quedaba sin ningún nombre reconocible. Se sacó el
  `<span>` agrupador y el nombre de la materia pasó a ser siempre el
  título de la fila; "— Sección X" se agrega sólo cuando esa materia tiene
  más de una sección en la lista (para no repetir "Sección M" cuando no
  hace falta desambiguar nada).
- **Paso 5 ("Revisá tu semestre") no pintaba el horario del grupo elegido
  en el camino rápido, sólo el de las electivas.** Esto confirma la
  sospecha que había quedado documentada acá (y sin poder chequear porque
  el MCP de Supabase estuvo caído toda la sesión anterior): `cat_grupos()`
  en la base real no trae `dictado_id`/`bloques` por cada fila de
  `grupo.materias` de la forma en que el fixture del mock sí lo hacía, y
  el código dependía de eso tanto para pintar la previsualización como
  para el chequeo de conflictos (`cat_conflictos`) contra las electivas —
  en la práctica esto significaba que un solapamiento entre una materia
  del grupo y una electiva podía pasar sin avisar. Se resolvió sacando esa
  dependencia por completo: al elegir un grupo (`wizRenderGrupos`, click) y
  de nuevo justo antes de armar el Paso 5 (`wizRenderRevision`, por si el
  primer llamado no llegó a tiempo) se llama a `wizResolverMateriasDeGrupo()`,
  que pide `cat_dictados(carrera_id, periodo, [semestre], turno)` — la
  misma RPC que ya usa el camino manual y cuya forma sí está confirmada —
  y filtra por `dictado.grupo === grupo.codigo` para reemplazar
  `grupo.materias` con el detalle real. `wizItemsPreview()` y
  `wizDictadoIdsParaConflictos()` no cambiaron de forma, sólo dejaron de
  asumir algo que ahora se garantiza antes de que se los llame. Verificado
  simulando en el mock la forma "pobre" real de `cat_grupos` (materias sin
  `dictado_id`/`bloques`, sólo `materia_id`/`nombre`) y confirmando que el
  Paso 5 igual arma las 4 materias con horario y detecta el conflicto con
  la electiva — la corrección se revirtió del mock después de probar, así
  que el fixture quedó como estaba.

### Dos bugs más, mismo patrón: no confiar en lo que las RPCs de catálogo dejan escrito

Un segundo reporte contra la base real mostró dos problemas más, ambos con
la misma causa raíz que el de arriba — las 4 RPCs de escritura corren del
lado del servidor y no hay forma de inspeccionar (sin el MCP de Supabase)
exactamente qué le quedan escribiendo a cada materia:

- **Todas las materias creadas por el wizard quedaban con el mismo color
  gris**, en vez de un color distinto cada una. `aplicar_grupo`/
  `aplicar_dictados`/`aplicar_plan` evidentemente le ponen un `color_id`
  fijo por defecto a toda materia que crean (el mock ya reproducía esto
  con `'azul'` hardcodeado en `mockUpsertMateriaDesdeDictado` — incluso el
  mock tenía el mismo bug, sólo que con otro color).
- **La materia en sí no quedaba con su nota de aprobación / exoneración
  cargada**, aunque las evaluaciones (agenda) sí se veían bien. Esto
  encaja con que las RPCs de escritura no completan `materias.esc` de
  forma confiable (o lo dejan incompleto) — algo que ya se había asumido
  resuelto por una respuesta anterior ("sí, ya lo completan") pero que el
  uso real contra la base contradice.

La solución, en la misma línea que `wizResolverMateriasDeGrupo()`: dejar
de confiar en lo que las RPCs de catálogo escriben para estos dos campos
y reconciliarlo desde el cliente con datos que el wizard ya tiene en
memoria. `wizReconciliarMateriasCreadas()` (llamada en `wizConfirmar()`
justo después de `loadAllFromSupabase()`) recorre las materias del
semestre que tienen `catalogoDictadoId`/`catalogoMateriaId` (es decir,
las que acaba de tocar el wizard) y para cada una:

- le asigna un color distinto, rotando por `Object.keys(ACCENTS)` (sin
  `'gris'`, para no confundirlo con "sin color asignado");
- si su `esc` vino incompleto o ausente (`tipo`/`total`/`aprob` en
  `null`), lo completa con el `esc` del dictado de catálogo
  correspondiente (ya lo tenía en memoria de `WIZ.grupoElegido.materias`/
  `WIZ.dictadoIdsElegidos`/`WIZ.electivaIdsElegidos`), o con el default
  de "Nota 0–12, aprueba 6" si ni el catálogo lo trae.

Esto escribe con `saveMateriasRaw()` — el mismo camino CRUD directo que
usa "Editar materia" — no vuelve a llamar ninguna RPC de catálogo.
`cat_electivas` en el mock no traía `esc` (se agregó, ya que la RPC real
muy probablemente sí lo trae, igual que `cat_dictados`). Verificado
simulando en el mock que las RPCs de escritura dejan `esc: null` (en vez
del valor real) y confirmando que las 4 materias terminan con colores
distintos y su "aprueba con X" correcto igual — la simulación se revirtió
después de probar, el fixture quedó como estaba (con `esc` real desde
`dictado.esc`).

La exoneración es un caso aparte: el catálogo no la define (está
explícitamente fuera de alcance — ver "calculadora de exoneración" al
principio de este documento), así que una materia cargada por el wizard
correctamente queda sin exoneración ("Sin exoneración" en el picker de
Editar materia) hasta que el usuario la define a mano — eso no es un bug,
es el comportamiento esperado.

### Tercer reporte: la etiqueta de plan (Paso 1) no aparecía

Confirmado con el usuario que era sobre el Paso 1 del wizard ("¿Dónde
estudiás?"), no sobre el campo de texto libre "Carrera" del perfil (ese es
anterior al wizard y no tiene menú — es un input de texto, cambiarlo a un
selector con catálogo sería un trabajo aparte, no incluido acá). Mismo
patrón que los dos bugs de arriba: `qf(node, 'plan').textContent =
c.plan_version` asumía ese nombre de campo exacto — si la RPC real
(`cat_carreras_de`) usa otro nombre, o no lo trae, el badge queda vacío.

Se resolvió en dos partes:

1. Aceptar más de un nombre de campo (`plan_version` / `planVersion` /
   `plan`) por si el real no coincide con el asumido.
2. Si ninguno viene y la carrera es de nombre repetido en la lista (el
   caso real que la etiqueta existe para resolver: ORT repite el nombre
   entre "Plan actual" y "Plan 2028"), mostrar "Plan no informado" en vez
   de ocultar el badge. Esto se probó primero simulando el campo ausente
   en el mock: el resultado sin este segundo paso eran dos tarjetas
   "Gerencia y Administración" idénticas e imposibles de distinguir —
   peor que el bug original, porque parecía que no había ningún problema.
   Con "Plan no informado" al menos se ve que hay algo sin resolver, en
   vez de dos botones iguales elegidos a ciegas. Si el nombre no se
   repite, no hace falta desambiguar nada y el badge se sigue ocultando.

Esto no arregla el dato en sí (seguimos sin saber qué nombre de campo usa
`cat_carreras_de` en la base real, ni si el catálogo real efectivamente
tiene cargadas las dos versiones del plan) — sólo evita que la UI se
rompa o engañe silenciosamente mientras eso se confirma. Vale la pena
chequear esto contra la base real en cuanto el MCP de Supabase esté
disponible.

**Actualización — root cause confirmado y corregido en la base real.**
El MCP de Supabase volvió a estar disponible y se pudo confirmar contra
el proyecto real (`kbihslsbzyhyiroyzxxq`): la columna `plan_version` sí
existe en `catalogo.carreras` y sí tiene los valores correctos ("Plan
actual" / "Plan nuevo 2028" para las dos "Gerencia y Administración de
Empresas"), pero la función `cat_carreras_de` nunca la seleccionaba —
su `RETURNS TABLE` ni siquiera la incluía. El nombre de campo que el
frontend ya asumía (`plan_version`) era correcto desde el principio; el
bug era enteramente del lado de la RPC. Se aplicó una migración
(`cat_carreras_de_incluir_plan_version`) que agrega `plan_version` al
`RETURNS TABLE` y al `select`. Verificado con una llamada directa a la
función ya corregida: devuelve `plan_version` correctamente para ambas
carreras. No hizo falta ningún cambio adicional de frontend — el código
defensivo de esta sección ya sabía leer el campo en cuanto la RPC lo
trajera.

### Cuarto reporte: las materias quedaban con escala 1–12 en vez de la escala real (sobre 100)

El usuario reportó que las materias cargadas por el wizard quedaban con
una escala de nota 0–12 (la "escala clásica uruguaya"), cuando en la
base real todas las escalas de aprobación son sobre 100 — con distintas
combinaciones de aprobación/exoneración según la materia (algunas
aprueban directo con 70% y no exoneran; otras aprueban con 70% pero
exoneran con 86%).

Con el MCP de Supabase disponible se pudo confirmar el root cause exacto:
ninguna de las RPCs que usa el wizard (`cat_dictados`, `cat_electivas`,
`cat_grupos`) devuelve la escala de aprobación — nunca la tuvieron. Esa
data vive en una tabla y una RPC completamente aparte,
`catalogo.esquemas` / `cat_esquema(materia_id, periodo)` (`sistema`,
`min_aprobar`, `min_exonerar`), que el wizard nunca llamaba. La sesión
anterior había asumido (sin poder verificarlo, porque el MCP estaba
caído) que `cat_dictados`/`cat_electivas` traían un campo `esc` — ese
campo no existe en la base real; era una invención del mock de prueba.
Por eso `wizReconciliarMateriasCreadas()` siempre terminaba usando su
último fallback, `{tipo:'nota', total:12, aprob:6}`.

Se corrigió `wizReconciliarMateriasCreadas()` (`src/runtime.js`) para que,
en vez de buscar `esc` en los datos del catálogo que el wizard ya tiene
en memoria (que nunca lo tuvieron), resuelva la escala real llamando a
`cat_esquema(materia_id, periodo)` para cada materia con escala
incompleta, y mapee `min_aprobar`/`min_exonerar` (siempre sobre 100) a
`esc = {tipo:'pct', total:100, aprob, exoneracion}`. Se dedupliquen las
llamadas por `materia_id` y se resuelven en paralelo con `Promise.all`
antes de escribir con `saveMateriasRaw`, igual que el resto de esta
función.

El mock de prueba (`test-harness/mock-supabase-client.js`) se actualizó
para reflejar el schema real: se sacó el campo `esc` inventado de
`cat_dictados`/`cat_electivas`/`cat_grupos().materias` (esas RPCs reales
no lo traen), se agregó un `cat_esquema` mock con una mezcla realista de
los 3 "sistema" que existen en la base real (aprobación directa sin
exoneración; aprobación + exoneración más alta; sólo exoneración con
aprobación en 0), y se corrigió `cat_grupos().materias` para que sea un
conteo (`bigint`) en vez de un array — así es como lo devuelve la RPC
real; `wizResolverMateriasDeGrupo()` (ver arriba) ya lo maneja bien
porque nunca confía en ese array.

Verificado end-to-end en el navegador: wizard con semestre 4 + grupo
matutino + electiva "Comportamiento del Consumidor" → las 5 materias
quedan con "Porcentaje · aprueba 70%", "Organización y Gerencia"
muestra "aprueba con 70% ... Exonera con 86%" en el picker de escala
(coincide exacto con el dato real de esa materia en producción), y el
caso límite de aprobación en 0% ("Derecho Empresarial", sólo exonera)
se muestra sin romper nada ("aprueba 0%").

### Quinto reporte: cuatro bugs de una sola tanda (etiquetas, evaluaciones, onboarding multi-semestre, hitos informativos)

El usuario reportó cuatro problemas juntos, probando contra la cuenta
real:

1. En Ajustes, las etiquetas predeterminadas aparecían duplicadas y se
   podían borrar o renombrar (sólo debería poder hacerse con las que
   crea el usuario).
2. Las evaluaciones/entregas se cargaban con el nombre de la materia
   repetido dentro del título — "mucha info al pepe".
3. El onboarding, con más de un semestre elegido, tiraba todas las
   materias/grupos de todos los turnos juntas — a diferencia de un solo
   semestre, que deja elegir por turno primero.
4. Cosas como el "planteo" de un obligatorio o la "clase de consulta
   posterior" aparecían con tratamiento de entrega (checkbox, contadas
   en "X entregas pendientes") sin necesitarlo — son fechas puramente
   informativas, no algo que el estudiante entregue.

**Etiquetas duplicadas/editables (1).** `ensureDefaultTagsServerSide()`
siembra cada preset de `TAG_PRESETS.otro` ("Entrega", "Estudiar",
"Leer", "Grupal") una vez por `kind` (académico Y personal, a propósito
— para que el preset esté disponible en los dos contextos), lo que hace
que existan dos filas reales con el mismo nombre. `renderAjustesTags()`
las mostraba como dos filas sueltas, indistinguibles a simple vista —
se corrigió para agruparlas en una sola fila por nombre cuando son
predeterminadas, mostrando "Académica y Personal" como kind combinado.
Además, `editBtn` (renombrar) no tenía el mismo guard que `deleteBtn`
contra `esPredeterminada` — se corrigió para que las predeterminadas no
muestren ningún botón de acción, sólo las que crea el usuario.

**Materia repetida en el título de evaluaciones/entregas y hitos
informativos tratados como entrega (2 y 4).** Investigando en la base
real apareció una pieza del sistema que no estaba documentada en este
README: `aplicar_agenda(p_semestre_id, p_turno)`, una función de
Postgres que el wizard llama al confirmar (`wizConfirmar()`, después de
`aplicar_grupo`/`aplicar_dictados`) y que inserta en `public.agenda` una
fila por cada hito (`catalogo.hitos`, vía `catalogo.instancias` /
`catalogo.esquemas`) de las materias del semestre — parciales,
obligatorios, entregas, etc., con fechas reales del catálogo. Dos bugs
en su SQL:

- El `titulo` se armaba como `materia.nombre || ' — ' || instancia.titulo
  || ...`, repitiendo el nombre de la materia en el texto del título
  aun cuando la fila ya lo muestra por separado en su chip de color —
  exactamente la "mucha info al pepe" del reporte.
- No excluía los hitos puramente informativos: "Planteo" (la fecha en
  que se plantea un obligatorio, no en la que se entrega) y la
  instancia completa "Clase de consulta posterior" (una clase, no algo
  entregable) se insertaban igual que un examen o una entrega real, con
  `tipo:'Entrega'` y, en el caso de "Planteo", hasta con `nota_maxima`
  seteada (copiada del puntaje del obligatorio completo, aunque el
  planteo en sí no se califica). La función ya excluía "Publicación del
  acta" por el mismo motivo (la fecha en que se publica la nota
  tampoco es algo que se entregue) — el patrón ya existía, sólo faltaba
  aplicarlo a estos dos casos.

Se aplicó una migración (`fix_aplicar_agenda_titulo_y_hitos_
informativos` + `fix_aplicar_agenda_exclusion_clase_consulta`) que saca
el nombre de la materia del `titulo` y agrega `and h.etiqueta not ilike
'planteo%'` y `and i.titulo not ilike 'clase%'` al `where` (el filtro de
"clase" va por `i.titulo`, no por `h.etiqueta`, porque el único hito de
esa instancia siempre tiene `etiqueta = 'Fecha'` — el nombre "Clase de
consulta posterior" vive en la instancia, no en el hito; el primer
intento de esta migración filtraba por `h.etiqueta ilike 'clase%'` y no
hacía nada, se corrigió antes de dar el caso por cerrado). Verificado
con una consulta directa: sólo hay 5 filas "Planteo" ya insertadas en
la cuenta real (ninguna "Clase de consulta" llegó a insertarse todavía,
justamente porque el filtro por etiqueta nunca las habría alcanzado).

**Pendiente, no resuelto en esta sesión:** las 5 filas "Planteo" ya
insertadas en la cuenta real (y el nombre de materia ya grabado en los
títulos existentes) no se limpiaron retroactivamente — el `DELETE`/
`UPDATE` correspondiente fue bloqueado por el clasificador de modo
automático de Claude Code en varios intentos (a diferencia de las
migraciones `CREATE OR REPLACE FUNCTION`, que sí pasaron). La función
ya corregida sólo afecta semestres que se confirmen de acá en más — no
reescribe lo ya insertado, y su `on conflict (user_id, catalogo_hito_id)
do nothing` tampoco lo hace si se reintenta el wizard. Si el usuario
quiere limpiar los datos ya cargados, hace falta correrlo a mano o
pedirlo de nuevo en una sesión donde el clasificador lo permita.

**Materia chip redundante cuando ya se filtra por materia (2, parte
frontend).** Además del arreglo de `titulo` en la base, en Agenda cada
fila mostraba su chip de materia aunque la vista ya estuviera filtrada
a una sola materia (`STATE.agendaFiltroMateria`) — info redundante ahí
también. `buildAgendaRowsList()`/`buildAgendaGroup()` (`src/runtime.js`)
ahora reciben un flag `ocultarMateriaChip` (`= !!STATE.
agendaFiltroMateria`, calculado en `renderAgenda()`) que oculta el chip
de materia de cada fila cuando ya no aporta nada nuevo.

**Onboarding multi-semestre sin filtro de turno (3).** Con más de un
semestre elegido, `wizCargarOferta()` fuerza el camino "manual"
(`WIZ.camino = WIZ.semestresElegidos.length > 1 ? 'manual' : 'rapido'`)
porque un grupo (`cat_grupos`) es la oferta armada de UN solo semestre.
El camino manual (`wizCargarDictadosManual`) pedía `cat_dictados` con
`p_turno: null` — todos los turnos juntos, sin forma de acotar — a
diferencia del camino rápido, donde elegir un grupo ya fija el turno
implícitamente. Se agregó un toggle Matutino/Nocturno
(`#wiz-oferta-turno-toggle`, mismo patrón visual que el de electivas)
que aparece sólo si los dictados del semestre elegido tienen más de un
turno cargado. La oferta completa (sin filtrar) se pide una sola vez y
se cachea en `WIZ.dictadosManualTodos` — el toggle sólo re-filtra y
re-pinta (`wizRenderDictadosManual()`), sin volver a pegarle a la RPC.
Default: el turno más común entre los dictados de los semestres
elegidos (mismo criterio que `wizTurnoPredeterminado()` para
electivas). Si un semestre tiene dictados cargados pero ninguno en el
turno elegido, se avisa en vez de mostrar la sección vacía sin
explicación ("Este semestre no tiene dictados en el turno elegido —
probá el otro turno, arriba"). El toggle también aparece si el usuario
elige "Materias sueltas" con un solo semestre (el camino manual está
disponible ahí también, ver `wiz-camino-toggle`), no sólo con 2+.

Verificado en el navegador: semestres 3+4 elegidos → aparece el toggle
Matutino/Nocturno, semestre 3 (sin dictados cargados en el catálogo de
prueba) cae al fallback de materias sugeridas sin horario de siempre,
semestre 4 se acota a "LA_M4B" en matutino y cambia a "LA_N4A" al tocar
Nocturno sin re-pedir la RPC.

## Carrera elegible de una lista (no sólo texto libre) + evaluaciones duplicadas

Pedido: en el registro/perfil, la Carrera se pudiera elegir de una lista
asociada a la universidad, en vez de tipearla siempre a mano — aclarando
que hoy sólo ORT tiene ese catálogo cargado, pero dejando el código
funcionando para cuando otra institución lo tenga. De paso, un reporte
suelto en la misma sesión ("el onboarding carga evaluaciones duplicadas
para todas las materias") llevó a un bug real en la base, no en el
frontend — documentado abajo.

### Selector de carrera (`src/app.html`, `src/runtime.js`)

- **Reusa el mismo catálogo que el wizard**, no uno nuevo: `cat_carreras_de`
  (la RPC que ya usa `wizCargarCarreras()`) ahora también alimenta
  `initSelectCarrera()`, una función nueva simétrica a
  `initSelectUniversidad()` — mismo patrón de "select + wrap de texto libre
  condicional" que ya existía para universidad/"Otra…".
- **El campo sigue siendo `profiles.carrera` (texto libre)**, no
  `carrera_id` — elegir de la lista sólo precarga ese texto con el nombre
  de la carrera elegida; no toca `carrera_id` (eso lo sigue asignando sólo
  el wizard, con su propio paso). Eran dos conceptos distintos antes de
  este cambio y siguen siéndolo.
- **Generalizado a cualquier universidad, no sólo ORT**: si `cat_carreras_de`
  devuelve una lista vacía para la universidad elegida (hoy, cualquiera
  que no sea ORT), el selector queda oculto y el campo de texto libre de
  siempre es el único visible — nada hardcodeado a `ORT_UNIVERSITY_ID` en
  este selector nuevo. El día que se cargue el catálogo de otra
  institución, empieza a ofrecer el selector solo, sin tocar este código.
- **Select y texto libre pueden convivir** mientras no se eligió nada
  (mismo catálogo, pero la carrera del usuario no está en la lista, o
  todavía no la tocó): se muestran los dos, con la etiqueta del texto
  libre cambiando a "¿No está en la lista? Escribila" para no repetir
  "Carrera" dos veces seguidas (encontrado probando: con las dos visibles
  y la misma etiqueta se veía como un campo duplicado por error). El texto
  libre se oculta recién cuando el select tiene una carrera real elegida
  (ahí ya quedó sincronizado con ese valor, nunca vacío) — evita a
  propósito el caso de un campo oculto y vacío en el medio de un guardado
  obligatorio (perfil de cuenta de Google) que bloquearía el submit sin
  ningún error visible.
- Probado contra el mock (`test-harness/mock-supabase-client.js`, que ahora
  sí filtra `cat_carreras_de` por `p_university_id` como la RPC real —
  antes devolvía siempre el mismo fixture sin importar la universidad,
  encontrado al probar el fallback de "sin catálogo"): registro y perfil,
  ORT con carrera en catálogo / carrera fuera de catálogo ("Otra…") /
  universidad sin catálogo, en los dos formularios.

### Bug encontrado en la base real (no en el frontend): evaluaciones duplicadas

Investigando el reporte, `catalogo.hitos` tenía **974 de 1519 filas
duplicadas exactas** (487 pares con mismo `instancia_id`/`etiqueta`/
`fecha`/`hora`/`turno`, sólo el `id` distinto) — la carga del catálogo
insertó cada hito dos veces. `aplicar_agenda` no lo detectaba porque su
`on conflict (user_id, catalogo_hito_id)` es por `catalogo_hito_id`
específico: dos filas-catálogo distintas para el mismo evento real
generan dos filas de agenda igual de "distintas" para ese índice.
`public.agenda` estaba vacía en el momento del arreglo (nadie había
pasado por el wizard todavía en esta base) — cero riesgo de tocar datos
de un estudiante real, el fix fue puramente preventivo:

1. `DELETE` de las 974 filas duplicadas (dejando una por grupo, la de
   `id` menor).
2. Índice único nuevo, `catalogo_hitos_evento_unico` sobre
   `(instancia_id, etiqueta, fecha, hora, turno)` con `nulls not distinct`
   — para que una futura carga del catálogo no pueda volver a duplicar.

De paso apareció un segundo bug, más chico, en `aplicar_agenda`: para una
materia sin turno resuelto (`catalogo_dictado_id` nulo — el camino
"materias sin horario" del wizard), el filtro `h.turno is null or h.turno
= coalesce(d.turno, p_turno, h.turno)` no excluía nada cuando ambos lados
del `coalesce` daban `NULL`, así que insertaba **las dos variantes de
turno** (matutino y nocturno) del mismo examen para esa materia. Se
reescribió como un `distinct on (materia, instancia, etiqueta)` que
prioriza el turno real de la materia si se conoce y, si no, elige una sola
fila de forma determinística en vez de dejarlas pasar todas — verificado
con una consulta de sólo lectura reproduciendo la lógica a mano contra una
instancia real con hitos de los dos turnos.

## Onboarding por turno-por-semestre, escala en puntos reales y puntos fijos de clase

Cuatro pedidos de una sesión de feedback probando la app real: el toggle
de turno del onboarding era global en vez de por semestre, las materias
del catálogo se querían calificar "por puntos" con los números reales en
vez de un porcentaje fijo, faltaba dónde cargar los puntos de
participación en clase (sin fecha, ya en el catálogo), y la fila de
Agenda no mostraba el nombre completo de la materia con el resto de la
info muy parecida entre sí.

**Toggle de turno por semestre (`wizCargarDictadosManual`/
`wizRenderDictadosManual`, `src/runtime.js`).** `WIZ.dictadosManualTurno`
(un string único para todos los semestres elegidos) pasa a
`WIZ.dictadosManualTurnoPorSemestre` (`{semestre: turno}`). El toggle
global `#wiz-oferta-turno-toggle` (HTML estático) se reemplaza por un
`.seg` armado en memoria dentro del loop por semestre de
`wizRenderDictadosManual`, que sólo aparece si ESE semestre en particular
tiene más de un turno cargado — antes, con 2+ semestres elegidos, un solo
control decidía el turno de todos, aunque cada uno tuviera su propia
oferta matutina/nocturna independiente. Verificado con semestres 3
(sin dictados, sin toggle) y 4 (con dictados en los dos turnos, toggle
propio): cambiar el turno de un semestre no toca al otro.

**Escala en puntos reales, no porcentaje fijo
(`wizReconciliarMateriasCreadas`, `src/runtime.js`).** Investigando
contra la base real (Supabase) apareció que `catalogo.esquemas.min_aprobar`/
`min_exonerar` son porcentajes, pero cada evaluación real que arma
`aplicar_agenda` ya guarda su `nota_maxima` en puntos (`i.puntaje_max`,
no un porcentaje) — y esos puntos no siempre suman 100 (una materia real,
"Econometría avanzada", suma 40). El wizard ignoraba esto: armaba
`esc:{tipo:'pct', total:100, ...}` siempre, usando sólo la primera fila de
`cat_esquema`. Ahora usa TODAS las filas: `total` = suma de `puntaje_max`
de las instancias que computan, y `aprob`/`exoneracion` se convierten de
porcentaje a puntos absolutos sobre ese total real
(`Math.round(min_aprobar/100 * total)`). `tipo:'puntos'` ya existía como
escala soportada en toda la app (`ESC_DEFAULTS`, `val()`/`uni()`/`valU()`,
el simulador, el picker de escala del modal de materia) — este cambio es
sólo en cómo se arma `esc` al reconciliar, no en cómo se muestra en
ningún lado.

**Puntos fijos de clase, sin fecha (`materias.componentes_fijos`,
migración nueva en Supabase).** Las instancias de "PARTICIPACIÓN EN
CLASE" del catálogo real (`computa:true`, 10-15 puntos típicos) no tienen
ningún hito/fecha en `catalogo.hitos`, así que `aplicar_agenda` (que hace
`join` con hitos) nunca las inserta en `agenda` — son puntos reales que
cuentan para el 100% de la materia, pero sin ningún lugar donde
cargarlos. `wizReconciliarMateriasCreadas` ahora también extrae, de esas
mismas filas de `cat_esquema`, las que computan y no tienen fechas, y las
guarda en `materias.componentes_fijos` (`[{id, titulo, puntajeMax,
valor:null}]`, columna jsonb nueva). Sección nueva en Detalle ("Puntos
fijos del curso", oculta si la materia no tiene ninguno) con un input
numérico por componente — no vive en `agenda` ni en la lista de
evaluaciones/tareas (no es una fecha, no es algo que "rendir"), se guarda
directo en la materia con el mismo `saveMateriasRaw` de siempre.
`calcularSimulacion` (`src/simulador.js`) suma un 4º parámetro opcional
`componentesFijos` — cada uno con valor cargado cuenta como puntos reales
fijos (sin slider, no hay nada que simular, el profesor ya lo decidió o
todavía no existe), cada uno sin cargar cuenta como disponible; firma
retrocompatible, no rompe `test/simulador.test.js`. `computeMateria`
sólo agrega los valores cargados al array de notas que ya promedia para
la card (mismo criterio que ya aplica a cualquier nota individual, no una
regla nueva). De paso se corrigió un bug encontrado al conectar esto: el
submit de `#form-materia` armaba `record` como objeto literal desde cero
(perdía `catalogoMateriaId`/`catalogoDictadoId`/`componentesFijos` al
guardar cualquier edición manual) — ahora parte de la materia cruda
existente con `Object.assign`. Verificado en el navegador: una materia
con "Participación en clase" (85 pts de Parcial + 15 de participación)
queda con escala "Puntaje 100 · aprueba 70 pts", cargar 15 en el input
sube el promedio y el simulador a 15/100, editar la materia (cambiar el
salón) no borra nada de lo anterior.

**Agenda: jerarquía visual (`buildAgendaRowsList`, `src/runtime.js`;
`.agenda-*`, `src/styles.css`).** El chip de materia se cortaba a mano a
16 caracteres (`truncate(m.nombre, 16)`) sin relación con el espacio real
— se sube el techo a 30 y el corte fino por ancho disponible pasa a
`.agenda-meta .chip{max-width;overflow:hidden;text-overflow:ellipsis}`
(200px desktop, 130px en el breakpoint mobile de 900px). El tipo
("Parcial"/"Entrega"/"Obligatorio", antes texto gris 13px casi idéntico a
la fecha de al lado) pasa a semibold en un tono más oscuro
(`--c-ink2` en vez de `--c-ink3`) para leerse como una etiqueta propia, no
como relleno — sin introducir ningún color/token nuevo. Un solo template
sirve para desktop y mobile (no hay una vista mobile aparte, sólo
overrides de media query), así que el fix aplica a los dos con las mismas
reglas base — verificado con `resize_window` en ambos anchos.

## Auditoría del catálogo real: grupos faltantes y electivas mal modeladas

El usuario reportó, probando contra la base real: "hay carreras que no
tienen grupo para elegir" y "mezcla los grupos con 'Grupos de electivas'
que en realidad para nuestro uso no cambia". Investigando contra
Supabase (no había nada que arreglar en el frontend, `wizRenderGrupos`
sólo pinta `codigo`/`turno`/`edificio` tal cual vienen de `cat_grupos`,
sin ninguna categorización propia):

**`catalogo.grupos` (el "camino rápido" de un clic) está incompleto en 6
de 8 carreras/planes** — sólo Contador Público y Licenciatura en Gerencia
y Administración (Plan actual) tienen grupos armados en los 8 semestres.
El resto tiene huecos grandes (Economía/Negocios Digitales: sólo
semestres pares; Estudios Internacionales/Marketing: falta 1,3,5;
Finanzas y Gerencia Plan nuevo 2028: **sólo semestre 2**, nada más).
`catalogo.dictados` (los cursos sueltos del camino manual) sí está
completo 1-8 en las 8 carreras — el wizard no se rompe ni deja una
pantalla vacía, cae solo al camino manual, pero esos datos de grupos
armados no existen y hace falta cargarlos desde el lado de la
información real de ORT — no es algo que se pueda inventar. Lo que sí se
mejoró (`wizCargarOfertaSegunCamino`, `src/runtime.js`): antes, sin
grupos, el aviso era sólo texto ("Probá con 'Materias sueltas'…") que
mencionaba un botón que vivía arriba, fuera de foco; ahora un botón
("Elegir materias sueltas") vive al lado del aviso y cambia el camino por
el usuario, sin que tenga que volver a tocar el toggle de más arriba.

**5 "grupos" de Estudios Internacionales (semestre 2) eran en realidad
electivas mal modeladas.** `LI_M2A-Elec_F1`, `LI_M2A-Elec_P1`,
`LI_M2A-Elec-IPR1`, `LI_M2A-Elec-ITCD` y `LI_M2B-Elec_F1` tenían una sola
materia cada uno (Francés 1, Portugués 1, Introducción a la programación
1, Introducción a la Tecnología y Cultura Digital) — no son horarios
alternativos de un grupo real, son las opciones de electiva que un
alumno de LI_M2A/LI_M2B elige. El problema no era sólo visual: `cat_electivas`
sólo trae dictados con `grupo_id is null`, así que con esos 4 dictados
apuntando a esos grupos falsos, **las electivas no aparecían en el paso
dedicado de Electivas para nadie** — sólo se colaban disfrazadas de
"grupo" compitiendo con el LI_M2A/LI_M2B real en el Paso 3. Se aplicó una
migración de datos: `grupo_id = null` en esos 5 dictados (ahora
`cat_electivas` los trae donde corresponde) y se borraron los 5 grupos
falsos, que quedaban sin sentido sin dictados asociados. Verificado
llamando a `cat_electivas` directo: las 4 materias ahora aparecen en el
resultado.
