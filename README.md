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
  peligro"): constante `MARGEN_RIESGO` al principio de `src/runtime.js`
  (0 a 3, en pasos de 0.5, escala 0–12). El handoff no incluye una pantalla
  de ajustes para esto, así que quedó como constante de código.

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
- **Recuperación de contraseña** ("olvidé mi contraseña") — no se
  implementó en este pedido, a propósito, para no ampliar el alcance; hoy
  si alguien pierde su contraseña no tiene forma de recuperar la cuenta
  desde la app.
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
  confirmación no cayan en spam en proveedores grandes — depende de la
  configuración de SMTP del proyecto de Supabase (por defecto usa un
  servicio compartido con límites bajos, pensado para desarrollo).
- **Manejo de sesión expirada en medio del uso** — hoy, si el token vence
  mientras la app está abierta, la próxima operación de guardado va a
  fallar con el aviso de error genérico; no hay un flujo dedicado de
  "tu sesión venció, iniciá sesión de nuevo" con redirección automática.

## Ver también

- La vista Semana del calendario reutiliza la misma lógica de eventos que
  la vista Mes, sólo que sin recortar texto (hay más lugar) y sin el
  concepto de "días de otro mes" atenuados.
