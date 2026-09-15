/*
 * Cursada — runtime vanilla JS: persistencia (localStorage), router por hash,
 * y las funciones de estilo/formato reimplementadas desde renderVals() de
 * Cursada.dc.html (fmt, rgba, chip, badge, bar, dot, ring, inner, val, uni,
 * valU, escLabel, margenDe, toneDe), ahora leyendo de las colecciones reales
 * en vez del array mock `base`. No usa support.js ni el runtime <x-dc>.
 */
(function () {
  'use strict';

  // ---------- constantes de estilo (dirección visual "Apple", turno 2) ----------
  // Cada acento tiene: strong (color sólido, para puntos/barras/anillos/bordes),
  // to (segunda parada del degradé de los "tiles" de materia), text (variante
  // con contraste seguro para texto sobre fondo claro) y soft (fondo tenue).
  // El mock nuevo sólo define 4 de estas 9 identidades (azul, verde, violeta →
  // acá "violeta", turquesa y la que el mock llama "morado" → acá "indigo");
  // coral, amarillo, rosa y gris se extrapolaron de la paleta de colores de
  // sistema de Apple (naranja-rojizo, amarillo, rosa y gris de iOS) para
  // completar las 9 identidades que ya usan las materias existentes.
  var ACCENTS = {
    azul: { strong: '#0A84FF', to: '#0060DF', text: '#0060DF', soft: rgba('#0A84FF', .12) },
    verde: { strong: '#34C759', to: '#248A3D', text: '#248A3D', soft: rgba('#34C759', .12) },
    violeta: { strong: '#5E5CE6', to: '#4340CC', text: '#4340CC', soft: rgba('#5E5CE6', .12) },
    coral: { strong: '#FF6B5B', to: '#E14F3F', text: '#D6402E', soft: rgba('#FF6B5B', .13) },
    amarillo: { strong: '#FFD60A', to: '#E6B800', text: '#8A6D00', soft: rgba('#FFD60A', .2) },
    turquesa: { strong: '#64D2FF', to: '#0A84FF', text: '#0071E3', soft: rgba('#64D2FF', .16) },
    rosa: { strong: '#FF375F', to: '#D6003D', text: '#D6003D', soft: rgba('#FF375F', .12) },
    indigo: { strong: '#BF5AF2', to: '#8E3FBE', text: '#8E3FBE', soft: rgba('#BF5AF2', .12) },
    gris: { strong: '#98989D', to: '#6E6E73', text: '#6E6E73', soft: rgba('#98989D', .14) }
  };
  // TONE = color sólido por estado (puntos/barras/anillos). Los badges usan un
  // texto y una transparencia de fondo propios por tono (TONE_BADGE_*), como en
  // el mock — no una fórmula única de alpha sobre el mismo color.
  var TONE = { success: '#34C759', warning: '#FF9F0A', danger: '#FF3B30', neutral: '#C7C7CC' };
  var TONE_BADGE_FG = { success: '#248A3D', warning: '#B25C00', danger: '#C9271F', neutral: '#6E6E73' };
  var TONE_BADGE_ALPHA = { success: .14, warning: .16, danger: .13, neutral: .055 };
  var PERSONAL_COLOR = '#8E8E93';
  // Ícono de cada kpi-card de Inicio, por el label fijo que arma
  // computeKpis() — ver renderInicio(). Los 3 templates viven junto a
  // data-template="kpi-card" en app.html.
  var KPI_ICON = { 'Próxima evaluación': 'ico-kpi-evaluacion', 'Promedio general': 'ico-kpi-promedio', 'Pendientes esta semana': 'ico-kpi-pendientes' };
  // Notificaciones (in-app + Web Push). La pública es pública por diseño
  // (va en el cliente, como la anon key de Supabase) — la privada vive como
  // secret de la Edge Function notifications-send, nunca acá.
  var VAPID_PUBLIC_KEY = 'BOLRtVRR2x12CqmnVCYioXKWZk_h8uJRyfu9GPnWcIFXqZ_57khaqfA9LvOtHQxwQ2iz3RoMCH9JaVMkXWu_0PI';
  var NOTIF_EVENT_TYPES = ['evaluacion_proxima', 'tarea_proxima', 'evento_personal_proximo', 'resumen_diario', 'resumen_semanal'];
  var NOTIF_EVENT_LABELS = { evaluacion_proxima: 'Evaluación próxima', tarea_proxima: 'Tarea próxima', evento_personal_proximo: 'Evento personal próximo', resumen_diario: 'Resumen diario', resumen_semanal: 'Resumen semanal' };
  var NOTIF_LEAD_OPTIONS = [1, 3, 12, 24, 48];
  // Las 3 familias tipográficas del bundle anterior se reemplazan por la pila
  // de fuente del sistema (ver styles.css); MONO queda como alias para no
  // tocar cada llamada de chip()/badge()/ring() una por una.
  var MONO = "-apple-system,BlinkMacSystemFont,system-ui,'SF Pro Text','Helvetica Neue',Arial,sans-serif";
  // Margen de riesgo (escala 0-12) — valor fijo (Fase 6: se sacó la
  // edición desde Ajustes, confundía y no sumaba). Ver margenDe() más abajo.
  var MARGEN_RIESGO = 1;
  var NOTA_APROBACION_DEFECTO = 3;
  // Mínimo para aprobar el examen de una materia "debo rendir examen"
  // (estado:'pendiente') — fijo en 70, sobre el examen (siempre calificado
  // sobre 100 puntos en ORT, confirmado por el usuario), NO el esc.aprob de
  // la materia. Llegar a "debo rendir examen" ya significa que se superó
  // el mínimo/umbral de exoneración de la cursada (esc.aprob o
  // exoneración, ver escConAprobacionEfectiva) — ese número quedó atrás,
  // el examen final tiene su propio mínimo, independiente de la materia.
  var APROBACION_EXAMEN_PENDIENTE = 70;

  var ESTADO_LABEL = { cursando: 'Cursando', aprobada: 'Aprobada', recursando: 'Recursando', pendiente: 'Pendiente' };
  var ESTADO_TONE = { cursando: 'neutral', aprobada: 'success', recursando: 'danger', pendiente: 'neutral' };

  var DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS_BLOQUE = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var DIAS_BLOQUE_MINI = ['L', 'M', 'X', 'J', 'V', 'S'];
  // Fase 1: "tipo" ahora sólo describe evaluaciones (agenda.kind==='evaluacion') —
  // las tareas no tienen tipo preestablecido, sólo título libre.
  var TIPOS_EVAL = ['Parcial', 'Final', 'Obligatorio', 'Presentación'];

  // Catálogo académico (wizard de onboarding, ver esa sección más abajo) —
  // sólo ORT tiene catálogo cargado hoy; cualquier otra institución cae
  // directo al alta manual (ver mostrarOnboardingOCatalogo()).
  var ORT_UNIVERSITY_ID = '29e5e219-2967-4a63-99d7-5edd936d9b70';
  var PERIODO_ACTUAL = '2026-2';

  // ---------- utilidades ----------
  function uid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  // Los bloques de horario se guardan como hora decimal (18.5 = 18:30) — la
  // grilla y los presets de horario trabajan en pasos de media hora, no hace
  // falta más precisión que esa para un horario de clases.
  function horaTexto(decimal) {
    var h = Math.floor(decimal);
    var m = Math.round((decimal - h) * 60);
    return pad2(h) + ':' + pad2(m);
  }
  function truncate(s, n) { return (s && s.length > n) ? s.slice(0, n - 1) + '…' : (s || ''); }
  // Abreviatura corta para tiles/avatares de materia (reemplaza al viejo
  // prefijo de código, ej. "CON" de "CON-201") — primera palabra del
  // nombre, hasta 4 letras.
  function materiaAbrev(nombre) { return ((nombre || '').trim().split(/\s+/)[0] || '').slice(0, 4).toUpperCase(); }
  // Único lugar del código que arma HTML como string (el gráfico de Progreso,
  // ver buildProgresoChartSvg) — el resto de la app arma DOM con el()/textContent,
  // que ya es seguro por naturaleza. Cualquier texto libre del usuario
  // (nombre de semestre) que termine ahí adentro pasa por acá primero.
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function css(obj) {
    return Object.keys(obj).map(function (k) {
      var v = obj[k];
      if (v == null || v === '') return '';
      var kebab = k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
      return kebab + ':' + v;
    }).filter(Boolean).join(';');
  }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'oscuro'; }
  // Mismo breakpoint que la capa mobile de styles.css (@media max-width:760px)
  // — un solo lugar si algún día cambia.
  function esMobile() { return window.matchMedia('(max-width:760px)').matches; }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function tpl(name) {
    var t = document.querySelector('template[data-template="' + name + '"]');
    return t.content.firstElementChild.cloneNode(true);
  }
  function qf(root, field) {
    if (root.getAttribute && root.getAttribute('data-f') === field) return root;
    return root.querySelector('[data-f="' + field + '"]');
  }
  // Vuelve accesible por teclado una fila/tarjeta clicable que no es
  // literalmente un <button>/<a> — muchas de estas filas tienen adentro un
  // checkbox real (eval-row, agenda-row) o son <tr>/celdas de grilla con
  // varios sub-elementos también clicables (cal-cell), así que envolverlas
  // en un <button> sería HTML inválido (no se puede anidar contenido
  // interactivo). En su lugar: role="button" + tabindex + Enter/Espacio,
  // el patrón estándar para widgets interactivos custom. `node.style.cursor`
  // ya no hace falta setearlo aparte, esto lo cubre.
  function makeRowClickable(node, handler, label) {
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    if (label) node.setAttribute('aria-label', label);
    node.style.cursor = 'pointer';
    node.addEventListener('click', handler);
    node.addEventListener('keydown', function (ev) {
      if (ev.target !== node) return; // no robarle Enter/Espacio a un checkbox/input interno
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handler(ev); }
    });
  }

  // ---------- fecha ----------
  function parseISODate(iso) {
    if (!iso) return null;
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function todayISO() { return toISODate(today()); }
  function diffDias(a, b) { return Math.round((a - b) / 86400000); }
  function designDia(date) { var g = date.getDay(); return g === 0 ? 7 : g; }
  function formatFechaAgenda(iso, hora) {
    var d = parseISODate(iso);
    return DIAS_CORTOS[d.getDay()] + ' ' + d.getDate() + ' ' + MESES_CORTOS[d.getMonth()] + (hora ? ' · ' + hora : '');
  }

  // ---------- estilo / formato (mirror de renderVals) ----------
  function fmt(v) { return v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function chipStyle(colorId) {
    var a = ACCENTS[colorId] || ACCENTS.gris;
    var d = isDark();
    return css({ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 9px', borderRadius: '999px', fontFamily: MONO, fontSize: '11px', fontWeight: 600, letterSpacing: '-.005em', background: d ? rgba(a.strong, .28) : a.soft, color: d ? a.strong : a.text, whiteSpace: 'nowrap' });
  }
  function personalChipStyle() {
    var d = isDark();
    return css({ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 9px', borderRadius: '999px', fontFamily: MONO, fontSize: '11px', fontWeight: 600, background: d ? rgba(PERSONAL_COLOR, .3) : rgba(PERSONAL_COLOR, .14), color: d ? '#D8DADE' : '#6E6E73', whiteSpace: 'nowrap' });
  }
  function badgeStyle(tone) {
    return css({ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 11px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: rgba(TONE[tone], TONE_BADGE_ALPHA[tone]), color: TONE_BADGE_FG[tone], whiteSpace: 'nowrap' });
  }
  // Degradé de "tile" de materia (icono cuadrado redondeado con el código),
  // reemplaza al chip de texto en las tarjetas de Materias y el avatar de Detalle.
  function tileGradient(colorId) {
    var a = ACCENTS[colorId] || ACCENTS.gris;
    return 'linear-gradient(180deg,' + a.strong + ',' + a.to + ')';
  }
  function barStyle(color) { return css({ width: '4px', height: '36px', borderRadius: '2px', background: color, flex: 'none' }); }
  // Sólo el color — la geometría del riel de Agenda (ancho, alto, radio,
  // posición) vive entera en CSS (.agenda-row .bar4), no acá. Antes esta
  // fila reusaba barStyle(), que traía width/height/radius por inline
  // style y le ganaba por especificidad a la regla de tema oscuro que
  // intentaba convertirla en riel — ver el comentario en styles.css.
  function barColorStyle(color) { return css({ background: color }); }
  function dotStyle(color, r) { return css({ width: '10px', height: '10px', borderRadius: r || '3px', background: color, flex: 'none' }); }
  function ringStyle(v, color, size, total) {
    var pct = Math.max(0, Math.min(100, ((v == null ? 0 : v) / (total || 12)) * 100));
    return css({ width: size + 'px', height: size + 'px', borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'conic-gradient(' + color + ' 0% ' + pct + '%, var(--c-line) ' + pct + '% 100%)' });
  }
  function ringInnerStyle(size, thick) {
    return css({ width: (size - thick * 2) + 'px', height: (size - thick * 2) + 'px', borderRadius: '50%', background: 'var(--c-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' });
  }
  // Gráfico de línea del promedio por semestre (sección Progreso) — sin
  // librería externa, mismo espíritu que el ring de arriba (a mano, con lo
  // que ya trae el browser), pero un gráfico de línea de verdad necesita
  // trazos, así que esta vez sí hace falta SVG en vez de un truco con CSS.
  // Se arma como string y se asigna con innerHTML (el parser HTML entiende
  // <svg> inline sin falta de un helper de DOM con namespace) — el único
  // texto libre del usuario que entra ahí (nombre de semestre) pasa por
  // escapeHtml() primero.
  function buildProgresoChartSvg(puntos, availableW) {
    // Antes el ancho era sólo `Math.max(320, puntos.length*110)`, sin mirar
    // el contenedor real: con pocos puntos (ej. 4) el gráfico quedaba angosto
    // y pegado a la izquierda de una card mucho más ancha, en vez de estirarse
    // para usar el espacio disponible. `availableW` (el clientWidth real del
    // wrap, medido en renderProgreso) es ahora el piso — el gráfico llena el
    // contenedor cuando entra cómodo, y sólo crece más allá (con scroll
    // horizontal, ver .progreso-chart-wrap) cuando de verdad hacen falta más
    // de ~110px por punto para que texto/puntos no se pisen.
    var w = Math.max(availableW || 320, puntos.length * 110);
    var h = 200;
    // padL/padR más anchos que lo que pide el trazo en sí: el label de
    // nombre de semestre (text-anchor="middle") en el primer/último punto se
    // centra justo en el borde del viewBox, así que sin este margen la mitad
    // del texto queda afuera y el SVG la recorta (confirmado probando con
    // "1er cuatrimestre 2026" truncado a 14 caracteres).
    var padL = 55, padR = 55, padT = 40, padB = 34;
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var color = TONE.success;
    function xAt(i) { return padL + (puntos.length === 1 ? plotW / 2 : (plotW * i) / (puntos.length - 1)); }
    // Clamp a 0–100: `promedio` normalmente vive en ese rango, pero una
    // nota mal cargada en una escala 0–12 (ej. 93 en vez de 9,3 — bug real
    // encontrado en cuenta de producción, ver renderProgresoPendientesModal)
    // podía dar un promedio de ~700% y mandar el punto/la línea bien afuera
    // del viewBox — el SVG las recorta ahí (overflow:hidden por default en
    // el <svg> raíz), así que se veía "cortado" en vez de simplemente mal.
    // El clamp es sólo geométrico: el texto sigue mostrando el % real (acá
    // abajo, sin tocar) para que un valor así siga siendo visible/raro en
    // vez de invisible/roto.
    function yAt(v) { var vc = Math.max(0, Math.min(100, v)); return padT + plotH - (vc / 100) * plotH; }
    var polyPts = puntos.map(function (p, i) { return xAt(i) + ',' + yAt(p.promedio); }).join(' ');
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMinYMid meet">';
    svg += '<line x1="' + padL + '" y1="' + yAt(0) + '" x2="' + (w - padR) + '" y2="' + yAt(0) + '" stroke="var(--c-line)" stroke-width="1"/>';
    svg += '<polyline points="' + polyPts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    puntos.forEach(function (p, i) {
      var x = xAt(i), y = yAt(p.promedio);
      // <g class="progreso-chart-point" data-semestre-id>: cada punto abre
      // el modal de materias de ese semestre (mismo destino que las barras/
      // la lista "sin promedio todavía", ver openSemestreMateriasModal) —
      // el círculo invisible de r=14 es el target real de toque/click, el
      // visible (r=4.5) es sólo el trazo del gráfico, muy chico para tocarlo
      // con precisión en mobile. Se cablea después de insertar el SVG (ver
      // renderProgreso), no acá: es un string, no puede llevar closures.
      svg += '<g class="progreso-chart-point" tabindex="0" role="button" aria-label="Ver materias de ' + escapeHtml(p.semestre.nombre) + '" data-semestre-id="' + escapeHtml(p.semestre.id) + '" style="cursor:pointer">';
      svg += '<circle cx="' + x + '" cy="' + y + '" r="14" fill="transparent"/>';
      svg += '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="' + color + '"/>';
      svg += '<text x="' + x + '" y="' + (y - 22) + '" text-anchor="middle" font-size="10" fill="var(--c-ink3)">' + p.aprobadas + '/' + p.total + ' aprob.' + (p.exoneradas ? ' · ' + p.exoneradas + ' exon.' : '') + '</text>';
      svg += '<text x="' + x + '" y="' + (y - 10) + '" text-anchor="middle" font-size="12" font-weight="600" fill="var(--c-ink)">' + p.promedio + '%</text>';
      svg += '<text x="' + x + '" y="' + (h - 12) + '" text-anchor="middle" font-size="11" fill="var(--c-ink3)">' + escapeHtml(truncate(p.semestre.nombre, 14)) + '</text>';
      svg += '</g>';
    });
    svg += '</svg>';
    return svg;
  }

  // ---------- sistema de calificación (mirror exacto) ----------
  function val(v, e) { return v == null ? '—' : (e.tipo === 'nota' ? fmt(v) : String(Math.round(v))); }
  function uni(e) { return e.tipo === 'nota' ? '' : (e.tipo === 'pct' ? '%' : ' pts'); }
  function valU(v, e) { return v == null ? '—' : val(v, e) + uni(e); }
  function escLabel(e) { return e.tipo === 'nota' ? 'Nota 0–12' : (e.tipo === 'pct' ? 'Porcentaje' : 'Puntaje ' + e.total); }
  // Fase 6: valor fijo (ya no editable desde Ajustes) — ver nota en
  // openAjustesModal.
  function margenDe(e) {
    return MARGEN_RIESGO / 12 * e.total;
  }
  // Catálogo (ORT), sistema "Examen con exoneración": el curso no tiene un
  // mínimo de aprobación propio, distinto del examen final — `min_aprobar`
  // viene en 0 porque, en los hechos, sólo existe el umbral de exoneración
  // (llegar ahí evita el examen; no llegar no es "reprobar", es que
  // todavía falta rendir). cat_esquema() copia ese 0 tal cual a esc.aprob
  // (ver wizCrearMateriasAprobadas/wizReconciliarMateriasCreadas) — dato
  // real, no un bug de carga (confirmado contra catalogo.esquemas), pero
  // tomado literal en toneDe()/"Te faltan..."/el badge "aprueba con X" y en
  // el auto-pasaje de una materia "Pendiente" a "Aprobada" (ver el hook en
  // el submit de #form-evaluacion) hacía que CUALQUIER nota, incluso 0,
  // se leyera como ya resuelta. Acá el umbral real para todo eso pasa a
  // ser la exoneración — no se toca `exoneracion` (sigue contando aparte
  // para "Encaminadas a exonerar"/el conteo de exoneradas de Progreso).
  function escConAprobacionEfectiva(esc) {
    if (!esc || esc.aprob > 0 || esc.exoneracion == null) return esc;
    return Object.assign({}, esc, { aprob: esc.exoneracion });
  }
  // "Debo rendir examen" (materia.estado:'pendiente'): decide sola si una
  // nota de examen alcanza para pasar a Aprobada, o si la materia sigue
  // pendiente para volver a rendir. Extraído del submit de #form-evaluacion
  // para reusarlo también desde el mini-modal "Cargar nota" (ver
  // abrirCargarNotaExamenModal) — misma lógica, un solo lugar. No hace nada
  // si la materia no está pendiente (ej. se llama sobre una nota de una
  // materia ya aprobada/cursando). computeMateriaById ya resuelve el
  // mínimo correcto para este estado (fijo, no el esc.aprob de la
  // materia — ver el `if (m.estado === 'pendiente')` en computeMateria).
  async function resolverPendienteSiCorresponde(materiaId, nota) {
    if (nota == null) return;
    var materiaPendiente = computeMateriaById(materiaId);
    if (!materiaPendiente || materiaPendiente.estado !== 'pendiente') return;
    if (nota >= materiaPendiente.esc.aprob) {
      var okAprobada = await saveMateriasRaw(loadMateriasRaw().map(function (x) {
        return x.id === materiaPendiente.id ? Object.assign({}, x, { estado: 'aprobada' }) : x;
      }));
      if (okAprobada) showToast('¡Aprobaste ' + materiaPendiente.nombre + '! La marcamos como aprobada.');
    } else {
      showToast('Nota cargada — no llegaste al mínimo, ' + materiaPendiente.nombre + ' sigue pendiente de rendir.');
    }
  }
  function toneDe(estado, esc, parciales) {
    if (estado === 'aprobada') return 'success';
    if (!parciales.length) return 'neutral';
    var a = parciales.reduce(function (x, y) { return x + y; }, 0) / parciales.length;
    if (a < esc.aprob) return 'danger';
    if (a < esc.aprob + margenDe(esc)) return 'warning';
    return 'success';
  }

  function formatHorario(bloques) {
    if (!bloques || !bloques.length) return 'Sin horario aún';
    var groups = {}, order = [];
    bloques.forEach(function (b) {
      var key = b.ini + '-' + b.fin;
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(b.dia);
    });
    var parts = order.map(function (key) {
      var dias = groups[key].slice().sort(function (a, b) { return a - b; });
      var labels = dias.map(function (d) { return DIAS_BLOQUE[d - 1]; });
      var diasTxt = labels.length <= 1 ? labels[0] : (labels.length === 2 ? labels[0] + ' y ' + labels[1] : labels.slice(0, -1).join(', ') + ' y ' + labels[labels.length - 1]);
      var kv = key.split('-'), ini = +kv[0], fin = +kv[1];
      return diasTxt + ' · ' + horaTexto(ini) + '–' + horaTexto(fin);
    });
    return parts.join(', ');
  }

  // ---------- persistencia (Supabase) ----------
  // Cada colección tiene sus funciones puente load*Raw()/save*Raw(a), igual que
  // en la versión local — el resto del código (cálculos, render, CRUD) no sabe
  // ni le importa que ahora hablan con Supabase en vez de localStorage. La
  // lectura es síncrona (lee de un caché en memoria que se llena una vez al
  // iniciar sesión, ver INIT/SESIÓN más abajo); el guardado es asíncrono
  // (diffea contra el caché y manda sólo altas/bajas a Supabase, más un
  // upsert de todo lo que quedó) — por eso cada save*Raw() devuelve una
  // Promise<boolean> y cada call site que la usa pasó a ser `async`/`await`.
  function sb() { return window.CURSADA_SUPABASE; }

  var CACHE = { semestres: [], materias: [], agenda: [], personal: [], eventTags: [], notificaciones: [], notifPrefs: [], pushDevices: [] };
  var CURRENT_USER = null;    // objeto `user` de supabase-js: id, email, …
  var CURRENT_PROFILE = null; // fila de `profiles`: {id, nombre, foto_url}

  // ---- mapeo camelCase (JS, como ya usaba todo el código) <-> snake_case
  // (columnas reales de Supabase) — queda todo acá, nada de conversiones
  // sueltas en el resto del archivo. ----
  function materiaToRow(m) {
    return { id: m.id, user_id: CURRENT_USER.id, semestre_id: m.semestreId || null, nombre: m.nombre, doc: m.doc, color_id: m.colorId, salon: m.salon, bloques: m.bloques || [], esc: m.esc, estado: m.estado, componentes_fijos: m.componentesFijos || [] };
  }
  function rowToMateria(r) {
    // catalogoMateriaId/catalogoDictadoId: sólo lectura — las escriben las
    // RPCs de aplicar_grupo/aplicar_dictados/aplicar_plan, nunca este
    // cliente (materiaToRow no las manda de vuelta, así una edición manual
    // posterior no las pisa). Se exponen acá para que la vista de materia
    // pueda engancharlas después (calculadora de exoneración, fuera de
    // alcance de este PR) — hoy no se muestran en ningún lado.
    return { id: r.id, semestreId: r.semestre_id, nombre: r.nombre, doc: r.doc, colorId: r.color_id, salon: r.salon, bloques: r.bloques || [], esc: r.esc, estado: r.estado, catalogoMateriaId: r.catalogo_materia_id || null, catalogoDictadoId: r.catalogo_dictado_id || null, componentesFijos: r.componentes_fijos || [] };
  }
  function agendaToRow(a) {
    return { id: a.id, user_id: CURRENT_USER.id, materia_id: a.materiaId || null, kind: a.kind, tipo: a.tipo, titulo: a.titulo, fecha: a.fecha, hora: a.hora || '', hecho: !!a.hecho, nota: a.nota == null ? null : a.nota, nota_maxima: a.notaMaxima == null ? null : a.notaMaxima, notas: a.notas || '', tag_id: a.tagId || null };
  }
  function rowToAgenda(r) {
    return { id: r.id, materiaId: r.materia_id, kind: r.kind, tipo: r.tipo, titulo: r.titulo, fecha: r.fecha, hora: r.hora || '', hecho: !!r.hecho, nota: r.nota == null ? null : r.nota, notaMaxima: r.nota_maxima == null ? null : r.nota_maxima, notas: r.notas || '', tagId: r.tag_id || null };
  }
  function personalToRow(p) {
    return { id: p.id, user_id: CURRENT_USER.id, titulo: p.titulo, fecha: p.fecha, hora: p.todoElDia ? '' : (p.hora || ''), todo_el_dia: !!p.todoElDia, tag_id: p.tagId || null };
  }
  function rowToPersonal(r) {
    return { id: r.id, titulo: r.titulo, fecha: r.fecha, hora: r.hora || '', todoElDia: !!r.todo_el_dia, tagId: r.tag_id || null };
  }
  function semestreToRow(s) {
    // periodo: sólo lo setea el wizard de onboarding ('2026-2', etc.) — un
    // semestre creado a mano (crearSemestre()) queda con periodo null a
    // propósito, no cruza con ningún catálogo. historico (Bloque 4): true
    // sólo en los semestres sintéticos que agrupan materias aprobadas antes
    // de usar la app — ver obtenerOCrearSemestreHistorico.
    return { id: s.id, user_id: CURRENT_USER.id, nombre: s.nombre, activo: !!s.activo, orden: s.orden, periodo: s.periodo || null, historico: !!s.historico };
  }
  function rowToSemestre(r) {
    // createdAt es sólo lectura — lo genera la DB, nunca se manda de vuelta
    // en semestreToRow. orden sí es de ida y vuelta (bloque D3): lo escribe
    // moverSemestre()/crearSemestre(), semestresOrdenados() ordena por acá.
    return { id: r.id, nombre: r.nombre, activo: !!r.activo, createdAt: r.created_at, orden: r.orden, periodo: r.periodo || null, historico: !!r.historico };
  }
  function tagToRow(t) {
    return { id: t.id, user_id: CURRENT_USER.id, name: t.nombre, kind: t.kind, color: t.colorId, is_default: !!t.esPredeterminada };
  }
  function rowToTag(r) {
    return { id: r.id, nombre: r.name, kind: r.kind, colorId: r.color, esPredeterminada: !!r.is_default };
  }
  // notification_queue: sólo lectura desde el cliente salvo read_at/
  // dismissed_at (marcar leída/descartar) — el insert real lo hace la Edge
  // Function con service_role, no hay notifToRow de ida.
  function rowToNotif(r) {
    return { id: r.id, eventType: r.event_type, channel: r.channel, entityType: r.entity_type, entityId: r.entity_id, title: r.title, body: r.body, deepLink: r.deep_link, scheduledFor: r.scheduled_for, status: r.status, sentAt: r.sent_at, readAt: r.read_at, dismissedAt: r.dismissed_at };
  }
  function rowToNotifPref(r) {
    return { id: r.id, eventType: r.event_type, channel: r.channel, enabled: !!r.enabled, leadTimeHours: r.lead_time_hours, quietHoursStart: r.quiet_hours_start, quietHoursEnd: r.quiet_hours_end, timezone: r.timezone };
  }
  function rowToPushDevice(r) {
    return { id: r.id, endpoint: r.endpoint, userAgent: r.user_agent, createdAt: r.created_at, lastSuccessAt: r.last_success_at };
  }

  async function supaUpsert(table, rows) {
    if (!rows.length) return;
    var res = await sb().from(table).upsert(rows);
    if (res.error) throw res.error;
  }
  async function supaDelete(table, ids) {
    if (!ids.length) return;
    var res = await sb().from(table).delete().in('id', ids);
    if (res.error) throw res.error;
  }
  // Único punto de llamada a RPCs de catálogo (wizard de onboarding) — a
  // diferencia del resto de la app (CRUD directo sobre las tablas del
  // usuario, ver supaUpsert/supaDelete de acá arriba), esto es lo primero
  // que llama funciones de Postgres. El error se tira tal cual (las RPCs de
  // escritura ya traen mensaje en español) para que el caller decida cómo
  // mostrarlo — ver wizMostrarError().
  async function rpc(name, params) {
    var res = await sb().rpc(name, params);
    if (res.error) throw res.error;
    return res.data;
  }

  // Fábrica de save*Raw() para las 3 colecciones "simples" (sin la restricción
  // de "un solo activo" que tiene semestres, ver saveSemestresRaw más abajo):
  // diffea el array nuevo contra el caché para saber qué borrar, y sube todo
  // el array nuevo con upsert() — son colecciones chicas (decenas de filas),
  // así que upsertear todo es más simple y robusto que diffear campo a campo.
  function makeSaver(table, cacheKey, toRow) {
    return async function (newArr) {
      var oldArr = CACHE[cacheKey];
      var newIds = {};
      newArr.forEach(function (x) { newIds[x.id] = true; });
      var toDelete = oldArr.filter(function (x) { return !newIds[x.id]; }).map(function (x) { return x.id; });
      try {
        if (toDelete.length) await supaDelete(table, toDelete);
        if (newArr.length) await supaUpsert(table, newArr.map(toRow));
        CACHE[cacheKey] = newArr.slice();
        return true;
      } catch (e) {
        console.warn('Cursada: error guardando ' + table, e);
        if (esErrorSesionVencida(e)) mostrarSesionVencida();
        return false;
      }
    };
  }
  // .slice(): cada load*Raw() devuelve una copia nueva, igual que antes
  // lsGetJSON() devolvía un array recién parseado de JSON — así el código que
  // llama (p. ej. `var arr = loadMateriasRaw(); arr.push(record);`) puede
  // seguir mutando el array libremente sin tocar el caché en memoria hasta
  // que llame a save*Raw() explícitamente.
  function loadMateriasRaw() { return CACHE.materias.slice(); }
  function loadAgendaRaw() { return CACHE.agenda.slice(); }
  function loadPersonalRaw() { return CACHE.personal.slice(); }
  var saveMateriasRaw = makeSaver('materias', 'materias', materiaToRow);
  var saveAgendaRaw = makeSaver('agenda', 'agenda', agendaToRow);
  var savePersonalRaw = makeSaver('personal', 'personal', personalToRow);
  function loadEventTagsRaw() { return CACHE.eventTags.slice(); }
  var saveEventTagsRaw = makeSaver('event_tags', 'eventTags', tagToRow);

  function loadSemestresRaw() { return CACHE.semestres.slice(); }
  // `semestres` tiene un índice único parcial en la base que impide más de un
  // `activo:true` por usuario. Si mandáramos "desactivar el viejo" y "activar
  // el nuevo" en el mismo upsert(), Postgres podría rechazarlo según el orden
  // en que evalúe las filas del lote — para evitarlo con certeza, se manda en
  // dos pasos secuenciales: primero todo lo que queda en `activo:false`
  // (desactiva el/los viejo/s), después lo que queda en `activo:true` (activa
  // el nuevo) — nunca hay dos `activo:true` en el mismo upsert().
  async function saveSemestresRaw(newArr) {
    var oldArr = CACHE.semestres;
    var newIds = {};
    newArr.forEach(function (s) { newIds[s.id] = true; });
    var toDelete = oldArr.filter(function (s) { return !newIds[s.id]; }).map(function (s) { return s.id; });
    var toDeactivate = newArr.filter(function (s) { return !s.activo; }).map(semestreToRow);
    var toActivate = newArr.filter(function (s) { return s.activo; }).map(semestreToRow);
    try {
      if (toDelete.length) await supaDelete('semestres', toDelete);
      if (toDeactivate.length) await supaUpsert('semestres', toDeactivate);
      if (toActivate.length) await supaUpsert('semestres', toActivate);
      CACHE.semestres = newArr.slice();
      return true;
    } catch (e) {
      console.warn('Cursada: error guardando semestres', e);
      if (esErrorSesionVencida(e)) mostrarSesionVencida();
      return false;
    }
  }

  function materiaRawById(id) { return loadMateriasRaw().filter(function (m) { return m.id === id; })[0] || null; }
  function agendaRawById(id) { return loadAgendaRaw().filter(function (a) { return a.id === id; })[0] || null; }
  function personalRawById(id) { return loadPersonalRaw().filter(function (p) { return p.id === id; })[0] || null; }
  // Una materia de un semestre histórico (ver obtenerOCrearSemestreHistorico)
  // no tiene horario ni fechas reales — su "Nota final" es un registro
  // administrativo (carga rápida desde Ajustes/Progreso), no un evento
  // agendado. eventosDeDia() la excluye con esto para que no ensucie el
  // Calendario con un ítem fechado "hoy" (fecha de carga) que no representa
  // nada que haya pasado ese día.
  function materiaEsHistorica(materiaId) {
    var m = materiaRawById(materiaId);
    if (!m || !m.semestreId) return false;
    var s = semestreRawById(m.semestreId);
    return !!(s && s.historico);
  }
  function semestreRawById(id) { return loadSemestresRaw().filter(function (s) { return s.id === id; })[0] || null; }
  function tagById(id) { return id ? (loadEventTagsRaw().filter(function (t) { return t.id === id; })[0] || null) : null; }
  // Chip de etiqueta — único render reusado en los 5 lugares donde se
  // muestra una etiqueta (Inicio, "Lo próximo", detalle de materia, Agenda,
  // panel del Calendario), en vez de que cada uno arme su propio chip.
  function renderTagChipInto(container, tagId) {
    var tag = tagById(tagId);
    clear(container);
    if (!tag) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    container.setAttribute('style', chipStyle(tag.colorId));
    container.textContent = tag.nombre;
  }

  // Garantiza el invariante "exactamente un semestre activo" (o ninguno, si no
  // hay ningún semestre todavía). Se usa después de migrar/importar, donde el
  // origen de los datos podría no respetarlo.
  function normalizarSemestresActivo(arr) {
    var yaHayActivo = arr.some(function (s) { return s.activo; });
    return arr.map(function (s, i) { return Object.assign({}, s, { activo: yaHayActivo ? !!s.activo : i === 0 }); });
  }
  function activeSemestreId() {
    var s = loadSemestresRaw().filter(function (x) { return x.activo; })[0];
    return s ? s.id : null;
  }
  // Orden manual del usuario (bloque D3, columna `orden`) — antes era
  // cronológico por created_at; ahora created_at queda sólo de respaldo
  // para filas viejas sin `orden` todavía (no debería pasar tras la
  // migración de backfill, pero por si acaso) y como desempate estable si
  // dos semestres compartieran orden. El nombre es texto libre, nunca sirve
  // para ordenar. No asumir "el activo es siempre el más nuevo/último": para
  // encontrar el semestre anterior a uno dado, ubicar su índice acá y
  // restar 1, nunca tomar "el anteúltimo del array" a secas.
  function semestresOrdenados() {
    return loadSemestresRaw().slice().sort(function (a, b) {
      if (a.orden != null && b.orden != null && a.orden !== b.orden) return a.orden - b.orden;
      if (a.orden != null && b.orden == null) return -1;
      if (a.orden == null && b.orden != null) return 1;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }
  // Bloque 4: los semestres históricos (ver obtenerOCrearSemestreHistorico)
  // entran en semestresOrdenados() porque Progreso los necesita, pero no son
  // "propios" del usuario — nunca se pueden activar, reordenar, renombrar ni
  // borrar desde el selector/gestor de semestres. Esto es lo que usan esas
  // pantallas en vez de semestresOrdenados() a secas.
  function semestresPropiosOrdenados() {
    return semestresOrdenados().filter(function (s) { return !s.historico; });
  }
  // Próximo valor de `orden` para un semestre nuevo — siempre al final.
  function proximoOrdenSemestre() {
    var max = -1;
    loadSemestresRaw().forEach(function (s) { if (s.orden != null && s.orden > max) max = s.orden; });
    return max + 1;
  }
  // Sube (-1) o baja (+1) un semestre en la lista — swap de `orden` con el
  // vecino inmediato en semestresOrdenados(), no un renumerado global.
  async function moverSemestre(id, delta) {
    var ordenados = semestresPropiosOrdenados();
    var idx = -1;
    ordenados.forEach(function (s, i) { if (s.id === id) idx = i; });
    var vecinoIdx = idx + delta;
    if (idx < 0 || vecinoIdx < 0 || vecinoIdx >= ordenados.length) return true;
    var actual = ordenados[idx], vecino = ordenados[vecinoIdx];
    // Filas viejas sin `orden` (no debería pasar post-migración): asignarle
    // uno acá mismo en vez de swapear `undefined`.
    var ordenActual = actual.orden != null ? actual.orden : idx;
    var ordenVecino = vecino.orden != null ? vecino.orden : vecinoIdx;
    var arr = loadSemestresRaw().map(function (s) {
      if (s.id === actual.id) return Object.assign({}, s, { orden: ordenVecino });
      if (s.id === vecino.id) return Object.assign({}, s, { orden: ordenActual });
      return s;
    });
    return saveSemestresRaw(arr);
  }
  function setSemestreActivo(id) {
    var arr = loadSemestresRaw().map(function (s) { return Object.assign({}, s, { activo: s.id === id }); });
    return saveSemestresRaw(arr);
  }
  // Evaluaciones de agenda cuya materia pertenece a `semestreId` (o todas, si
  // semestreId es null/undefined) — para acotar los cálculos de Inicio al
  // semestre activo sin duplicar el dato de semestre en cada evaluación.
  function agendaDeSemestre(semestreId) {
    var agenda = loadAgendaRaw();
    if (!semestreId) return agenda;
    var ids = {};
    loadMateriasRaw().forEach(function (m) { if (m.semestreId === semestreId) ids[m.id] = true; });
    return agenda.filter(function (a) { return ids[a.materiaId]; });
  }

  // Red de seguridad, no un camino esperado: si una cuenta tiene materias
  // pero ningún semestre (no debería pasar en uso normal — crear una materia
  // siempre le asigna el semestre activo), crea "Semestre actual" y se lo
  // asigna a todas. Se llama una vez después de cargar todo al iniciar
  // sesión.
  async function ensureSemestresServerSide() {
    if (CACHE.semestres.length || !CACHE.materias.length) return;
    var id = uid();
    if (!(await saveSemestresRaw([{ id: id, nombre: 'Semestre actual', activo: true }]))) return;
    var materias = CACHE.materias.map(function (m) { return Object.assign({}, m, { semestreId: m.semestreId || id }); });
    await saveMateriasRaw(materias);
  }

  // Etiquetas predeterminadas (feedback post-Fase 5): se siembran una vez
  // por cuenta (is_default:true — protegidas de borrado por RLS y por la
  // UI, ver renderAjustesTags) para que Parcial/Examen/Final/Oral/
  // Estudiar/Leer/Entrega/Grupal existan siempre, en vez de depender de
  // que el usuario las cree a mano desde el picker. Mismo patrón que
  // ensureSemestresServerSide: se llama una vez después de cargar todo,
  // no rompe nada si ya están — sólo agrega las que falten. TAG_PRESETS/
  // TAG_PRESET_COLOR están definidos más abajo (uso de closure, no
  // importa el orden textual dentro del mismo IIFE).
  async function ensureDefaultTagsServerSide() {
    var existentes = {};
    CACHE.eventTags.forEach(function (t) { existentes[t.kind + '|' + t.nombre] = true; });
    var faltantes = [];
    function agregarSiFalta(nombre, kind) {
      if (existentes[kind + '|' + nombre]) return;
      faltantes.push({ id: uid(), nombre: nombre, kind: kind, colorId: TAG_PRESET_COLOR[nombre] || 'azul', esPredeterminada: true });
    }
    TAG_PRESETS.evaluacion.forEach(function (nombre) { agregarSiFalta(nombre, 'academico'); });
    TAG_PRESETS.otro.forEach(function (nombre) { agregarSiFalta(nombre, 'academico'); agregarSiFalta(nombre, 'personal'); });
    if (!faltantes.length) return;
    await saveEventTagsRaw(loadEventTagsRaw().concat(faltantes));
  }

  async function loadAllFromSupabase() {
    var uidActual = CURRENT_USER.id;
    var results = await Promise.all([
      sb().from('profiles').select('*').eq('id', uidActual).maybeSingle(),
      sb().from('semestres').select('*'),
      sb().from('materias').select('*'),
      sb().from('agenda').select('*'),
      sb().from('personal').select('*'),
      sb().from('event_tags').select('*')
    ]);
    results.forEach(function (r) { if (r.error) throw r.error; });
    CURRENT_PROFILE = results[0].data || { id: uidActual, nombre: '', apellido: '', birth_date: null, carrera: null, telefono_e164: null, telefono_pais: null, university_id: null, university_other: null, foto_url: null, materias_carrera: null, margen_riesgo: 1 };
    CACHE.semestres = results[1].data.map(rowToSemestre);
    CACHE.materias = results[2].data.map(rowToMateria);
    CACHE.agenda = results[3].data.map(rowToAgenda);
    CACHE.personal = results[4].data.map(rowToPersonal);
    CACHE.eventTags = results[5].data.map(rowToTag);
  }

  // Separado de loadAllFromSupabase() a propósito: no es dato crítico para
  // revelar #app (el gate no espera esto), y así una falla acá no tira el
  // "no se pudo cargar tu cuenta" genérico. Se llama una vez al montar la
  // app y de nuevo en cada `visibilitychange` que vuelve a foco (Parte 3:
  // nada de Supabase Realtime, consume conexiones concurrentes limitadas
  // por plan y acá no hace falta latencia de milisegundos).
  async function cargarNotificaciones() {
    if (!CURRENT_USER) return;
    try {
      var results = await Promise.all([
        sb().from('notification_queue').select('*').eq('channel', 'inapp').order('scheduled_for', { ascending: false }).limit(100),
        sb().from('notification_preferences').select('*'),
        sb().from('push_subscriptions').select('*')
      ]);
      results.forEach(function (r) { if (r.error) throw r.error; });
      CACHE.notificaciones = results[0].data.map(rowToNotif);
      CACHE.notifPrefs = results[1].data.map(rowToNotifPref);
      CACHE.pushDevices = results[2].data.map(rowToPushDevice);
    } catch (e) {
      console.warn('Cursada: error cargando notificaciones', e);
      return;
    }
    renderNotifBadge();
    if (!document.getElementById('notif-panel').classList.contains('hidden')) renderNotifPanel();
    if (CURRENT_PROFILE) maybeMostrarBannerPush();
  }

  // Clasifica un error de Supabase como "sesión/token vencido" vs. cualquier
  // otro (red caída, RLS, etc.) — best-effort: la forma exacta del objeto de
  // error varía según si lo devuelve auth-js (falla al refrescar el token,
  // `.status` 401, mensajes tipo "Invalid Refresh Token" / "session missing")
  // o PostgREST en una consulta a una tabla con el JWT ya vencido (`.code`
  // "PGRST301" = "JWT expired"). No se pudo probar contra un token realmente
  // vencido en este entorno (tarda ~1h en vencer solo) — si en producción
  // aparece un caso que esta regex no agarra, sumarlo acá es el único
  // cambio que hace falta (avisarError()/mostrarSesionVencida() ya quedan
  // conectados a esta función, no a cada call site).
  function esErrorSesionVencida(e) {
    if (!e) return false;
    if (e.status === 401) return true;
    if (e.code === 'PGRST301') return true;
    var msg = (e.message || '') + '';
    return /jwt expired|invalid refresh token|refresh_token_not_found|session_not_found|session.*missing|invalid jwt/i.test(msg);
  }

  // Punto único al que confluyen los dos caminos por los que puede aparecer
  // una sesión vencida en medio del uso: (a) un guardado falla con un error
  // de este tipo (ver makeSaver/saveSemestresRaw) y (b) Supabase dispara
  // SIGNED_OUT solo, sin que medie un logout deliberado (ver
  // onAuthStateChange), porque no pudo refrescar el token. Los dos casos
  // necesitan la misma pantalla, y sólo una vez — el guard de abajo evita
  // mostrarla dos veces si, por ejemplo, un guardado falla y además dispara
  // el SIGNED_OUT automático casi al mismo tiempo.
  var SESION_VENCIDA_MOSTRADA = false;
  function mostrarSesionVencida() {
    if (SESION_VENCIDA_MOSTRADA) return;
    SESION_VENCIDA_MOSTRADA = true;
    CURRENT_USER = null; CURRENT_PROFILE = null;
    CACHE.semestres = []; CACHE.materias = []; CACHE.agenda = []; CACHE.personal = [];
    // Se cierra cualquier modal abierto directamente (sin pasar por
    // closeModalEl(), que preguntaría "¿descartar cambios?" — decisión
    // documentada en el README: un aviso claro sin intentar preservar el
    // formulario. Preservarlo de verdad implicaría reconstruir, para cada
    // uno de los 4 modales, estado que vive fuera de <form> — colores y
    // franjas horarias de materia, tipo de evaluación, escala de nota — algo
    // bastante más grande que este pedido para un caso poco frecuente).
    document.querySelectorAll('.modal-backdrop.is-open').forEach(function (m) { m.classList.remove('is-open'); });
    PERFIL_MODAL_BLOQUEANTE = false;
    setGate('gate-sesion-vencida');
  }

  function avisarError(msg) {
    if (SESION_VENCIDA_MOSTRADA) return; // ya se está mostrando esa pantalla — no duplicar con el alert() genérico
    alert(msg || 'No se pudo guardar. Revisá tu conexión a internet e intentá de nuevo.');
  }

  // ---------- migración: datos de la versión anterior (localStorage, sin cuenta) ----------
  function getDocId() {
    try {
      var path = decodeURIComponent(location.pathname);
      var base = (path.split('/').pop() || 'Cursada').replace(/\.html?$/i, '');
      return base || 'Cursada';
    } catch (e) { return 'Cursada'; }
  }
  var DOC_ID = getDocId();
  function legacyKey(col) { return 'cursada:' + DOC_ID + ':' + col; }
  function lsHas(k) { try { return localStorage.getItem(k) !== null; } catch (e) { return false; } }
  function lsGetJSON(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  // Datos de la versión anterior de esta misma app (100% local, sin cuenta)
  // que puedan seguir en este navegador — se ofrecen para importar una sola
  // vez después del primer login, nunca en automático (ver README).
  function readLegacyLocalData() {
    if (!lsHas(legacyKey('materias'))) return null;
    var materias = lsGetJSON(legacyKey('materias'), []);
    var agenda = lsGetJSON(legacyKey('agenda'), []);
    var personal = lsGetJSON(legacyKey('personal'), []);
    var semestres = lsGetJSON(legacyKey('semestres'), []);
    if (!materias.length && !agenda.length && !personal.length) return null;
    return { semestres: semestres, materias: materias, agenda: agenda, personal: personal };
  }
  function localImportDismissedKey() { return 'cursada:local-import-dismissed:' + (CURRENT_USER ? CURRENT_USER.id : ''); }
  function marcarImportLocalResuelto() { try { localStorage.setItem(localImportDismissedKey(), '1'); } catch (e) {} }
  function importLocalYaResuelto() { try { return localStorage.getItem(localImportDismissedKey()) === '1'; } catch (e) { return false; } }

  // Importa un lote {semestres, materias, agenda, personal} (mismo shape que
  // exporta/espera la app, en camelCase) a la cuenta actual. La usan tanto
  // "importar mis datos locales" (el aviso post-login) como el botón
  // "Importar" de la barra superior (un JSON exportado) — misma semántica.
  // Los ids del lote SIEMPRE se regeneran (nunca se reusan los que traía el
  // archivo/localStorage) para no chocar con ids que ya existan en la cuenta
  // de destino; se arma un mapa id-viejo → id-nuevo para poder resolver las
  // referencias (materia.semestreId, agenda.materiaId) con los ids nuevos.
  async function importCollections(payload) {
    var semestres = Array.isArray(payload.semestres) ? payload.semestres : [];
    var materias = Array.isArray(payload.materias) ? payload.materias : [];
    var agenda = Array.isArray(payload.agenda) ? payload.agenda : [];
    var personal = Array.isArray(payload.personal) ? payload.personal : [];

    // Compat con datos de antes de que existiera el concepto de semestre.
    if (!semestres.length && materias.length) {
      var idImportado = uid();
      semestres = [{ id: idImportado, nombre: 'Importado', activo: true }];
      materias = materias.map(function (m) { return Object.assign({}, m, { semestreId: m.semestreId || idImportado }); });
    }
    semestres = normalizarSemestresActivo(semestres);
    // Si la cuenta de destino ya tiene un semestre activo, los importados
    // entran todos inactivos (evita chocar con la restricción de "un solo
    // activo" de la base) — se puede activar uno desde el selector después.
    // Si la cuenta está vacía, se respeta cuál venía activo en el origen.
    var destVacio = !CACHE.semestres.length;
    var semMap = {}, matMap = {};
    var newSemestres = semestres.map(function (s) {
      var nid = uid(); semMap[s.id] = nid;
      return { id: nid, nombre: s.nombre, activo: destVacio ? !!s.activo : false };
    });
    var newMaterias = materias.map(function (m) {
      var nid = uid(); matMap[m.id] = nid;
      return Object.assign({}, m, { id: nid, semestreId: m.semestreId ? (semMap[m.semestreId] || null) : null });
    });
    var newAgenda = agenda.map(function (a) {
      return Object.assign({}, a, { id: uid(), materiaId: a.materiaId ? (matMap[a.materiaId] || null) : null });
    });
    var newPersonal = personal.map(function (p) { return Object.assign({}, p, { id: uid() }); });

    // Semestres primero (materias los referencian), materias antes que
    // agenda (agenda referencia materias); personal no tiene fks.
    var okSem = await saveSemestresRaw(loadSemestresRaw().concat(newSemestres));
    var okMat = await saveMateriasRaw(loadMateriasRaw().concat(newMaterias));
    var okAg = await saveAgendaRaw(loadAgendaRaw().concat(newAgenda));
    var okPer = await savePersonalRaw(loadPersonalRaw().concat(newPersonal));
    return okSem && okMat && okAg && okPer;
  }

  // ---------- vistas derivadas de materia ----------
  // Las notas viven en las evaluaciones (agenda), no en la materia: cada materia se
  // "arma" leyendo sus propias evaluaciones (agenda.materiaId === m.id) y tomando el
  // campo `nota` de las que ya están calificadas.
  function computeMateria(m, agendaAll) {
    var agenda = agendaAll || loadAgendaRaw();
    // `items`: todo lo de agenda ligado a esta materia (tareas + evaluaciones,
    // Fase 1) — se usa para el listado de Detalle. `evaluaciones`: sólo
    // kind==='evaluacion' — la única fuente para nota/promedio/simulador,
    // las tareas nunca entran a ese cálculo.
    var items = agenda.filter(function (a) { return a.materiaId === m.id; })
      .sort(function (a, b) { return parseISODate(a.fecha) - parseISODate(b.fecha) || (a.hora || '').localeCompare(b.hora || ''); });
    var evaluaciones = items.filter(function (a) { return a.kind === 'evaluacion'; });
    var notasEvals = evaluaciones.filter(function (a) { return a.nota != null; });
    // Puntos fijos del curso sin fecha (participación en clase, etc. — ver
    // README) ya cargados: cuentan para el promedio igual que cualquier
    // nota individual, mismo criterio que ya aplica la app al promediar
    // notas de evaluaciones con distinto notaMaxima entre sí.
    var componentesFijos = m.componentesFijos || [];
    var parciales = notasEvals.map(function (a) { return a.nota; })
      .concat(componentesFijos.filter(function (c) { return c.valor != null; }).map(function (c) { return c.valor; }));
    // escConAprobacionEfectiva: ver comentario junto a su definición — el
    // resto de esta función y todo lo que lee `m.esc.aprob`/`m.aprobTxt`
    // en pantallas ya usa esta versión, nunca el m.esc.aprob crudo (que
    // sigue viviendo sin tocar en el registro guardado, `m`).
    var e = escConAprobacionEfectiva(m.esc);
    // "Debo rendir examen" (estado:'pendiente'): llegar acá ya significa
    // que se superó el mínimo/exoneración de la cursada — ese número
    // quedó atrás (ver APROBACION_EXAMEN_PENDIENTE). De acá en adelante
    // (tone, aprobTxt, "Te faltan X", riesgoTxt, badge) todo tiene que ver
    // el mínimo fijo del examen, no el de la materia — y la exoneración
    // deja de aplicar (ya no hay forma de exonerar una vez que tenés que
    // rendir), por eso se anula acá y no sólo en el texto.
    if (m.estado === 'pendiente') e = Object.assign({}, e, { aprob: APROBACION_EXAMEN_PENDIENTE, exoneracion: null });
    var actual = parciales.length ? parciales.reduce(function (a, b) { return a + b; }, 0) / parciales.length : null;
    var tone = toneDe(m.estado, e, parciales);
    var acc = ACCENTS[m.colorId] || ACCENTS.gris;
    // Cuánto falta para aprobar: la diferencia directa entre el promedio actual y el
    // mínimo de aprobación, en la misma escala de la materia (no una proyección sobre
    // "la próxima evaluación" — eso llevaba a pedir más puntos de los que existen en
    // la escala cuando había pocas notas cargadas).
    var necesita = actual == null ? null : Math.max(0, e.aprob - actual);
    var riesgoTxt = '';
    if (tone === 'danger') riesgoTxt = 'Tu promedio es ' + valU(actual, e) + ', te faltan ' + valU(necesita, e) + ' para llegar a la aprobación (' + valU(e.aprob, e) + ').';
    else if (tone === 'warning') riesgoTxt = 'Vas aprobando, pero raspando: tu promedio es ' + valU(actual, e) + ' y el mínimo es ' + valU(e.aprob, e) + '.';
    var out = {};
    Object.keys(m).forEach(function (k) { out[k] = m[k]; });
    // Pisa el m.esc crudo copiado arriba: todo lo que lea m.esc.aprob desde
    // acá en adelante (hay varios call sites directos, no sólo aprobTxt)
    // tiene que ver el umbral efectivo, no el 0 crudo del catálogo.
    out.esc = e;
    out.actual = actual;
    out.tone = tone;
    out.toneColor = TONE[tone];
    out.strong = acc.strong;
    out.soft = acc.soft;
    out.notaTxt = val(actual, e);
    out.aprobTxt = valU(e.aprob, e);
    // Bloque 2: sólo si la materia define exoneración Y ese umbral es
    // distinto del de aprobación — null significa que no aplica (o que
    // escConAprobacionEfectiva ya lo usó como aprob, mismo número, mostrar
    // los dos sería puro ruido: "aprueba con 70,0 · exonera con 70,0").
    out.exonTxt = (e.exoneracion != null && e.exoneracion !== e.aprob) ? valU(e.exoneracion, e) : null;
    out.escalaTxt = escLabel(e);
    out.totalTxt = val(e.total, e) + uni(e);
    out.horario = formatHorario(m.bloques);
    out.badgeLabel = ESTADO_LABEL[m.estado];
    out.badgeTone = ESTADO_TONE[m.estado];
    out.riesgoTxt = riesgoTxt;
    out.necesita = necesita;
    out.items = items;
    out.evaluaciones = evaluaciones;
    out.notasEvals = notasEvals;
    out.parciales = parciales;
    return out;
  }
  // Sin `opts.semestreId`: todas las materias, de cualquier semestre — la
  // usan vistas que muestran historial completo a propósito (Progreso) o
  // que necesitan resolver una materia puntual sin importar su semestre
  // (computeMateriaById). Con `opts.semestreId`: sólo las materias de ese
  // semestre — ver computeMateriasDelActivo(), que es lo que usan Inicio,
  // Materias, Horario, la leyenda de Calendario, el filtro de Agenda y el
  // selector de materia del modal de evaluación (Bloque 1, ver README).
  function computeMaterias(opts) {
    opts = opts || {};
    var agenda = loadAgendaRaw();
    var raw = loadMateriasRaw();
    if (opts.semestreId) raw = raw.filter(function (m) { return m.semestreId === opts.semestreId; });
    return raw.map(function (m) { return computeMateria(m, agenda); });
  }
  function computeMateriasDelActivo() { return computeMaterias({ semestreId: activeSemestreId() }); }
  function computeMateriaById(id) { var m = materiaRawById(id); return m ? computeMateria(m) : null; }
  function materiaNombre(id) { var m = materiaRawById(id); return m ? m.nombre : ''; }

  // Promedio normalizado (0-100) de un conjunto de materias — de las que
  // tienen nota cargada (m.actual != null), normaliza cada una a % de su
  // propia escala y promedia. Extraída de computeKpis() (la usaba sólo para
  // el semestre activo) para que Progreso pueda correr la misma fórmula
  // sobre cualquier semestre sin duplicarla.
  function promedioNormalizado(materias) {
    var proms = materias.filter(function (m) { return m.actual != null; })
      .map(function (m) { return m.actual / m.esc.total * 100; });
    return proms.length ? Math.round(proms.reduce(function (a, b) { return a + b; }, 0) / proms.length) : null;
  }
  // Un punto por semestre (en orden cronológico real, ver semestresOrdenados)
  // que tenga al menos una materia con nota cargada — la fuente de datos
  // tanto de la sección Progreso como del widget resumen de Inicio, un solo
  // cálculo para las dos vistas.
  // Bloque 4: incluye cualquier semestre con al menos una materia, no sólo
  // los que ya tienen promedio — un semestre histórico recién armado por el
  // onboarding (materias aprobadas sin nota cargada) tiene que poder
  // aparecer en "Semestres anteriores" con su conteo de aprobadas/
  // exoneradas aunque no tenga promedio todavía. Quien arma el gráfico de
  // promedios filtra `promedio != null` por su cuenta (ver renderProgreso).
  function computeProgresoPorSemestre() {
    return semestresOrdenados().map(function (s) {
      var materias = computeMaterias({ semestreId: s.id });
      return {
        semestre: s,
        promedio: promedioNormalizado(materias),
        aprobadas: materias.filter(function (m) { return m.estado === 'aprobada'; }).length,
        exoneradas: materias.filter(function (m) { return m.actual != null && m.esc.exoneracion != null && m.actual >= m.esc.exoneracion; }).length,
        total: materias.length
      };
    }).filter(function (p) { return p.total > 0; });
  }
  // Materias aprobadas de TODOS los semestres, no sólo el activo — a
  // propósito, distinto del resto de la app (ver README, sección
  // Semestres, sobre qué vistas se acotan y cuáles no) — para la meta de
  // "cantidad de materias de la carrera".
  function materiasAprobadasCount() {
    return loadMateriasRaw().filter(function (m) { return m.estado === 'aprobada'; }).length;
  }

  // Materias aprobadas sin ninguna evaluación cargada todavía — típicamente
  // las que se tildaron en el paso "progreso" del wizard, pero también
  // cualquier materia marcada "Aprobada" a mano sin cargarle una nota. Se
  // usan para el panel de carga rápida de nota en Ajustes y el aviso de
  // Progreso — apenas tienen una evaluación (cargada acá o desde Detalle)
  // dejan de aparecer.
  function materiasAprobadasSinNota() {
    return computeMaterias().filter(function (m) { return m.estado === 'aprobada' && !m.notasEvals.length; });
  }

  // ================================================================
  // ESTADO EN MEMORIA (sólo UI, nunca persiste solo)
  // ================================================================
  var STATE = {
    route: { view: 'inicio', materiaId: null },
    materiasFiltro: 'todas',
    materiasQuery: '',
    materiasView: 'tarjetas',
    agendaFiltroKind: '',
    agendaFiltroMateria: '',
    agendaFiltroEstado: '',
    agendaQuery: '',
    // Bloque 6: id de un ítem a resaltar/scrollear en el próximo render de
    // Agenda — lo setea "Ver en agenda" del widget "Lo próximo" de Inicio,
    // se consume una sola vez (ver renderAgenda).
    agendaHighlightId: null,
    calYear: today().getFullYear(),
    calMonth: today().getMonth(),
    calViewMode: 'mes',
    calWeekStart: mondayOf(today()),
    calSelected: todayISO(),
    mostrarPersonales: true,
    // Bloque 7: el valor real se carga por usuario en onSignedIn() (ver
    // cargarMostrarClasesPref) — este default sólo importa antes de que
    // haya sesión (pantalla de login, nunca se llega a usar).
    mostrarClases: false,
    mostrarEvaluaciones: true,
    materiasOcultasCal: {},
    mostrarSabado: true,
    horarioDia: null,
    editing: {}
  };

  // ================================================================
  // SIDENAV / TOOLBAR
  // ================================================================
  var VIEW_LABELS = { inicio: 'Inicio', materias: 'Materias', detalle: 'Materias', agenda: 'Agenda', calendario: 'Calendario', horario: 'Horario', progreso: 'Progreso' };

  function buildLeyendaItem(label, color, opts) {
    opts = opts || {};
    var node = tpl('leyenda-item');
    qf(node, 'dot').setAttribute('style', dotStyle(color));
    qf(node, 'label').textContent = label;
    if (opts.onToggle) {
      node.classList.add('is-toggle');
      node.classList.toggle('is-off', !opts.active);
      makeRowClickable(node, function () { opts.onToggle(); }, (opts.active ? 'Ocultar' : 'Mostrar') + ' ' + label + ' en el calendario');
    }
    return node;
  }

  // ---- perfil / avatar (side nav) ----
  function initialsDe(nombre, email) {
    var base = (nombre || '').trim();
    if (base) {
      var parts = base.split(/\s+/).filter(Boolean);
      return (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
    }
    return ((email || '?').charAt(0) || '?').toUpperCase();
  }
  function primerNombre(nombre) {
    var base = (nombre || '').trim();
    return base ? base.split(/\s+/)[0] : '';
  }
  // Color determinístico (mismo usuario → mismo color siempre) elegido de la
  // paleta de 9 acentos que ya usan las materias, para el avatar de iniciales.
  function accentIdDeUsuario() {
    var keys = Object.keys(ACCENTS);
    var seed = (CURRENT_USER && CURRENT_USER.id) || '';
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return keys[h % keys.length];
  }
  function renderAvatarInto(elm, size) {
    clear(elm);
    elm.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * .36) + 'px;font-weight:700;color:#fff;overflow:hidden;flex:none';
    var fotoUrl = CURRENT_PROFILE && CURRENT_PROFILE.foto_url;
    if (fotoUrl) {
      var img = el('img'); img.src = fotoUrl; img.alt = ''; img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      elm.appendChild(img);
    } else {
      elm.style.background = tileGradient(accentIdDeUsuario());
      elm.textContent = initialsDe(CURRENT_PROFILE && CURRENT_PROFILE.nombre, CURRENT_USER && CURRENT_USER.email);
    }
  }
  // Nombre + apellido si hay alguno cargado, si no el email — para la
  // pantalla de Perfil en mobile (#perfil-nombre-completo). Distinto de
  // sidenav-user-nombre (sólo nombre) a propósito: ahí el espacio es chico,
  // acá es el título grande de una pantalla propia.
  function nombreCompletoDeUsuario(p) {
    var full = (((p && p.nombre) || '') + ' ' + ((p && p.apellido) || '')).trim();
    return full || (CURRENT_USER && CURRENT_USER.email) || '';
  }
  function renderSidenavUser() {
    if (!CURRENT_USER) return;
    renderAvatarInto(document.getElementById('sidenav-user-avatar'), 34);
    document.getElementById('sidenav-user-nombre').textContent = (CURRENT_PROFILE && CURRENT_PROFILE.nombre) || CURRENT_USER.email;
    document.getElementById('sidenav-user-email').textContent = CURRENT_USER.email;
  }

  function renderSidenav() {
    renderSidenavUser();
    renderSemestreSwitcher();
    var activeKey = STATE.route.view === 'detalle' ? 'materias' : STATE.route.view;
    // Scopeado a #sidenav-nav (no ".nav-item[data-nav]" a secas): el wordmark
    // "cursada" del app-toolbar reusa la clase .nav-item + data-nav="inicio"
    // sólo para heredar el reset de botón y su navegación (ver el listener
    // genérico de [data-nav] más abajo) — sin este scope, también matcheaba
    // acá y se le pegaba is-active (fondo azul sólido) cada vez que
    // STATE.route.view === 'inicio', algo que nunca se pidió para el logo.
    document.querySelectorAll('#sidenav-nav .nav-item[data-nav]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-nav') === activeKey); });
    document.querySelectorAll('.toolbar-btn[data-nav]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-nav') === activeKey); });
    // Tab bar mobile: mismo activeKey, mismo patrón — queda sincronizado
    // solo en cada cambio de ruta, sin un hook aparte.
    document.querySelectorAll('.tab[data-nav]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-nav') === activeKey); });
    var lbl = document.getElementById('toolbar-view-label');
    if (lbl) lbl.textContent = VIEW_LABELS[STATE.route.view] || '';

    var legend = document.getElementById('sidenav-legend');
    var list = document.getElementById('sidenav-legend-list');
    clear(list);
    if (STATE.route.view === 'calendario') {
      legend.classList.remove('hidden');
      // Clickeable acá (a diferencia de Horario, más abajo): en Calendario la
      // leyenda no es sólo referencia visual, es el filtro por materia — click
      // prende/apaga esa materia en la grilla y en el panel del día.
      document.getElementById('sidenav-legend-lbl').textContent = 'Referencias';
      // Bloque 1: acotado al semestre activo (antes listaba materias de
      // cualquier semestre) — ver plan, causa raíz compartida con Agenda y
      // el selector de materia del modal de evaluación.
      computeMateriasDelActivo().forEach(function (m) {
        var active = !STATE.materiasOcultasCal[m.id];
        list.appendChild(buildLeyendaItem(truncate(m.nombre, 22), m.strong, {
          active: active,
          onToggle: function () {
            if (active) STATE.materiasOcultasCal[m.id] = true; else delete STATE.materiasOcultasCal[m.id];
            renderRoute();
          }
        }));
      });
      if (STATE.mostrarPersonales) list.appendChild(buildLeyendaItem('Personal', PERSONAL_COLOR));
    } else if (STATE.route.view === 'horario') {
      legend.classList.remove('hidden');
      document.getElementById('sidenav-legend-lbl').textContent = 'Materias en la grilla';
      computeMateriasDelActivo().filter(function (m) { return m.bloques && m.bloques.length; }).forEach(function (m) { list.appendChild(buildLeyendaItem(truncate(m.nombre, 22), m.strong)); });
    } else {
      legend.classList.add('hidden');
    }
    document.getElementById('toggle-sabado-row').classList.toggle('hidden', STATE.route.view !== 'horario');
    document.getElementById('toggle-clases-row').classList.toggle('hidden', STATE.route.view !== 'calendario');
    document.getElementById('toggle-evaluaciones-row').classList.toggle('hidden', STATE.route.view !== 'calendario');
    // Bloque 7: sincroniza el switch visual con STATE.mostrarClases — a
    // diferencia de personales/evaluaciones (siempre arrancan en true), este
    // ahora puede arrancar en false (preferencia cargada por usuario, ver
    // cargarMostrarClasesPref), así que el markup estático ya no alcanza.
    document.getElementById('toggle-clases').classList.toggle('is-on', STATE.mostrarClases);
  }

  // ================================================================
  // INICIO
  // ================================================================
  function computeKpis() {
    var materias = computeMateriasDelActivo();
    var t = today();
    var agenda = agendaDeSemestre(activeSemestreId());
    var pendientes = agenda.filter(function (a) { return !a.hecho; });
    var proxExamen = pendientes
      .filter(function (a) { return a.kind === 'evaluacion'; })
      .map(function (a) { return { a: a, d: parseISODate(a.fecha) }; })
      .filter(function (x) { return x.d >= t; })
      .sort(function (x, y) { return x.d - y.d; })[0];
    var promedio = promedioNormalizado(materias);
    var estaSemana = pendientes.filter(function (a) { var d = diffDias(parseISODate(a.fecha), t); return d >= 0 && d <= 6; });
    var vencidas = pendientes.filter(function (a) { return parseISODate(a.fecha) < t; });
    // Bloque 5: ninguna tarjeta se renderiza vacía. "Próxima evaluación"
    // sin nada pendiente no tiene nada accionable que mostrar — se oculta
    // directamente (no entra al array). "Promedio general" sin notas
    // cargadas sí tiene una acción concreta — se resuelve como estado
    // vacío con CTA (empty:true, ver renderInicio) en vez de ocultarla.
    // "Pendientes esta semana" nunca se oculta: un 0 ahí es una respuesta
    // real y útil ("no tenés nada pendiente"), no un placeholder.
    var kpis = [];
    if (proxExamen) kpis.push({ label: 'Próxima evaluación', valor: DIAS_CORTOS[proxExamen.d.getDay()] + ' ' + proxExamen.d.getDate(), sub: proxExamen.a.tipo + ' · ' + materiaNombre(proxExamen.a.materiaId), tone: 'warning' });
    kpis.push(promedio != null
      ? { label: 'Promedio general', valor: promedio + '%', sub: 'normalizado · 3 escalas distintas', tone: 'success' }
      : { label: 'Promedio general', empty: true, ctaTexto: 'Cargá tu primera nota' });
    kpis.push({ label: 'Pendientes esta semana', valor: String(estaSemana.length), sub: vencidas.length ? (vencidas.length + (vencidas.length === 1 ? ' vencida de antes' : ' vencidas de antes')) : 'sin vencidas', tone: vencidas.length ? 'danger' : 'neutral' });
    return kpis;
  }

  // Tarjeta "Progreso del semestre" (C1) — promedio del semestre activo +
  // delta vs. el semestre cronológicamente anterior (mismo criterio que
  // renderProgresoWidgetInicio: posición real en semestresOrdenados(), no
  // "el anteúltimo del array"), cuántas evaluaciones del semestre ya tienen
  // nota cargada, y un desglose por materia ordenado con las peor
  // encaminadas primero (mismo espíritu que #riesgo-panel, pero acá se
  // listan todas, no sólo las en riesgo).
  function computeProgresoSemestreActivo() {
    var materias = computeMateriasDelActivo();
    var promedio = promedioNormalizado(materias);
    // Fase 1: sólo evaluaciones cuentan acá — agendaDeSemestre() trae
    // tareas también, y una tarea nunca tiene nota que cargar.
    var evaluacionesDelSemestre = agendaDeSemestre(activeSemestreId()).filter(function (a) { return a.kind === 'evaluacion'; });
    var evaluacionesEsperadas = evaluacionesDelSemestre.length;
    var evaluacionesCalificadas = evaluacionesDelSemestre.filter(function (a) { return a.nota != null; }).length;

    var ordenados = semestresOrdenados();
    var activoId = activeSemestreId();
    var idxActivo = -1;
    ordenados.forEach(function (s, i) { if (s.id === activoId) idxActivo = i; });
    var anterior = idxActivo > 0 ? ordenados[idxActivo - 1] : null;
    var deltaVsAnterior = null, nombreAnterior = null;
    if (anterior) {
      var promedioAnterior = promedioNormalizado(computeMaterias({ semestreId: anterior.id }));
      if (promedio != null && promedioAnterior != null) {
        deltaVsAnterior = promedio - promedioAnterior;
        nombreAnterior = anterior.nombre;
      }
    }

    var desglose = materias.slice().sort(function (a, b) {
      var pa = a.actual == null ? 2 : (a.actual / a.esc.total);
      var pb = b.actual == null ? 2 : (b.actual / b.esc.total);
      return pa - pb;
    });

    return { promedio: promedio, deltaVsAnterior: deltaVsAnterior, nombreAnterior: nombreAnterior, evaluacionesEsperadas: evaluacionesEsperadas, evaluacionesCalificadas: evaluacionesCalificadas, materias: desglose };
  }

  function renderProgresoSemestre() {
    var p = computeProgresoSemestreActivo();
    var card = document.getElementById('progreso-semestre-card');
    if (!p.materias.length) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');

    var deltaEl = document.getElementById('progreso-semestre-delta');
    if (p.deltaVsAnterior != null) {
      var tone = p.deltaVsAnterior > 0 ? 'success' : (p.deltaVsAnterior < 0 ? 'danger' : 'neutral');
      deltaEl.style.color = TONE[tone];
      deltaEl.textContent = (p.deltaVsAnterior > 0 ? '▲ ' : p.deltaVsAnterior < 0 ? '▼ ' : '— ') + Math.abs(p.deltaVsAnterior) + ' pts vs. ' + p.nombreAnterior;
    } else {
      deltaEl.textContent = '';
    }

    var sinNotas = p.evaluacionesCalificadas === 0;
    document.getElementById('progreso-semestre-empty').classList.toggle('hidden', !sinNotas);
    document.getElementById('progreso-semestre-content').classList.toggle('hidden', sinNotas);
    if (sinNotas) {
      // Sin notas todavía, la card no cae a un cartel de texto suelto — se
      // arma con el mismo anillo y las mismas filas por materia que la
      // versión con datos (ver más abajo), sólo que en gris "fantasma", así
      // ya enseña dónde va a aparecer cada cosa (p.materias ya viene
      // calculado arriba para el caso con notas, se reusa acá tal cual).
      var ringGhost = document.getElementById('progreso-semestre-empty-ring');
      ringGhost.setAttribute('style', ringStyle(0, 'var(--c-line)', 72, 1));
      clear(ringGhost);
      var innerGhost = el('div'); innerGhost.setAttribute('style', ringInnerStyle(72, 7));
      var g1 = el('span', 'mono'); g1.style.cssText = 'font-size:16px;font-weight:700;color:var(--c-ink3)'; g1.textContent = '0/' + p.materias.length;
      var g2 = el('span'); g2.style.cssText = 'font-size:9px;color:var(--c-ink3)'; g2.textContent = 'notas';
      innerGhost.appendChild(g1); innerGhost.appendChild(g2);
      ringGhost.appendChild(innerGhost);

      var listGhost = document.getElementById('progreso-semestre-empty-materias');
      clear(listGhost);
      listGhost.classList.toggle('hidden', !p.materias.length);
      p.materias.forEach(function (m) {
        var row = el('div', 'progreso-semestre-materia-row');
        var nombreWrap = el('div', 'progreso-semestre-materia-nombre');
        var dot = el('span', 'tone-dot'); dot.style.background = m.strong;
        var nombre = el('span'); nombre.textContent = m.nombre;
        nombreWrap.appendChild(dot); nombreWrap.appendChild(nombre);
        var valEl = el('span', 'mono'); valEl.style.color = 'var(--c-ink3)'; valEl.textContent = '— /' + val(m.esc.aprob, m.esc);
        row.appendChild(nombreWrap); row.appendChild(valEl);
        listGhost.appendChild(row);
      });
      return;
    }

    document.getElementById('progreso-semestre-promedio').textContent = p.promedio != null ? p.promedio + '%' : '—';
    var ring = document.getElementById('progreso-semestre-ring');
    ring.setAttribute('style', ringStyle(p.evaluacionesCalificadas, TONE.success, 72, p.evaluacionesEsperadas || 1));
    clear(ring);
    var inner = el('div'); inner.setAttribute('style', ringInnerStyle(72, 7));
    var v1 = el('span', 'mono'); v1.style.cssText = 'font-size:16px;font-weight:700'; v1.textContent = p.evaluacionesCalificadas + '/' + p.evaluacionesEsperadas;
    var v2 = el('span'); v2.style.cssText = 'font-size:9px;color:var(--c-ink3)'; v2.textContent = 'notas';
    inner.appendChild(v1); inner.appendChild(v2);
    ring.appendChild(inner);

    var list = document.getElementById('progreso-semestre-materias');
    clear(list);
    p.materias.forEach(function (m) {
      var row = el('div', 'progreso-semestre-materia-row');
      var nombreWrap = el('div', 'progreso-semestre-materia-nombre');
      var dot = el('span', 'tone-dot'); dot.style.background = m.strong;
      var nombre = el('span'); nombre.textContent = m.nombre;
      nombreWrap.appendChild(dot); nombreWrap.appendChild(nombre);
      var valEl = el('span', 'mono'); valEl.style.color = TONE[m.tone]; valEl.textContent = m.notaTxt + '/' + val(m.esc.aprob, m.esc);
      row.appendChild(nombreWrap); row.appendChild(valEl);
      makeRowClickable(row, function () { location.hash = '#materia-' + m.id; }, 'Ver materia ' + m.nombre);
      list.appendChild(row);
    });
  }

  // Card "Esperando nota" de Inicio — evaluaciones del semestre activo con
  // hecho:true y nota:null (mismo criterio que agendaBadgeInfo, ver
  // btn-eval-view-entregado). Antes la única forma de encontrarlas era
  // entrar a Agenda y reconocerlas por el badge; acá quedan agrupadas en un
  // solo lugar, con la acción de cargar la nota a un click (abre
  // abrirAsignarNotaModal directo, no pasa por el modo lectura del modal de
  // evaluación). Mismo scope que "Materias en riesgo"/KPIs de Inicio
  // (semestre activo, no histórico completo — ver cursada-conventions,
  // sección Semestres). Orden ascendente por fecha: la que lleva más tiempo
  // esperando la nota va primero.
  function renderInicioEsperandoNota() {
    var pendientes = agendaDeSemestre(activeSemestreId()).filter(function (a) {
      return a.kind === 'evaluacion' && a.hecho && a.nota == null;
    }).sort(function (a, b) { return parseISODate(a.fecha) - parseISODate(b.fecha); });
    var card = document.getElementById('inicio-esperando-nota-card');
    card.classList.toggle('hidden', !pendientes.length);
    if (!pendientes.length) return;
    document.getElementById('inicio-esperando-nota-count').textContent = pendientes.length + (pendientes.length === 1 ? ' evaluación' : ' evaluaciones');
    var list = document.getElementById('inicio-esperando-nota-list');
    clear(list);
    pendientes.forEach(function (a) {
      var m = computeMateriaById(a.materiaId);
      var row = el('div', 'progreso-semestre-materia-row');
      var nombreWrap = el('div', 'progreso-semestre-materia-nombre');
      var dot = el('span', 'tone-dot'); dot.style.background = m ? m.strong : 'var(--c-ink3)';
      var textWrap = el('div'); textWrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0';
      var tituloEl = el('span'); tituloEl.style.fontWeight = '600'; tituloEl.textContent = a.titulo;
      var metaEl = el('span'); metaEl.style.cssText = 'font-size:12px;color:var(--c-ink3)';
      metaEl.textContent = (m ? m.nombre + ' · ' : '') + formatFechaAgenda(a.fecha, a.hora);
      textWrap.appendChild(tituloEl); textWrap.appendChild(metaEl);
      nombreWrap.appendChild(dot); nombreWrap.appendChild(textWrap);
      var valEl = el('span'); valEl.style.cssText = 'color:var(--c-accent);font-size:12.5px;font-weight:600;white-space:nowrap;flex:none';
      valEl.textContent = 'Asignar nota ›';
      row.appendChild(nombreWrap); row.appendChild(valEl);
      makeRowClickable(row, function () { abrirAsignarNotaModal(a.id); }, 'Asignar nota a ' + a.titulo);
      list.appendChild(row);
    });
  }

  function renderInicio() {
    var t = today();
    var nombre = primerNombre(CURRENT_PROFILE && CURRENT_PROFILE.nombre);
    document.getElementById('inicio-hello').textContent = nombre ? ('Hola, ' + nombre) : 'Hola';
    document.getElementById('inicio-date').textContent = DIAS_LARGOS[t.getDay()].toLowerCase() + ' ' + t.getDate() + ' de ' + MESES_LARGOS[t.getMonth()] + ' de ' + t.getFullYear();
    var agenda = agendaDeSemestre(activeSemestreId()).filter(function (a) { return !a.hecho; });
    document.getElementById('inicio-note').innerHTML = 'Tenés <b style="color:var(--c-ink)">' + agenda.length + '</b> ' + (agenda.length === 1 ? 'entrega pendiente' : 'entregas pendientes');

    renderProgresoSemestre();

    // Mismo aviso que Progreso/Ajustes (materiasAprobadasSinNota) pero acá
    // en Inicio, a propósito: Ajustes queda escondido para quien no sabe
    // que existe, así que el aviso de "hay que completar lo que dejó el
    // wizard" tiene que aparecer también en la primera pantalla que ve.
    var sinNotaInicio = materiasAprobadasSinNota().length;
    var notasBanner = document.getElementById('inicio-notas-pendientes-banner');
    notasBanner.classList.toggle('hidden', !sinNotaInicio);
    if (sinNotaInicio) {
      document.getElementById('inicio-notas-pendientes-titulo').textContent = sinNotaInicio === 1 ? 'Tenés 1 materia aprobada sin nota cargada' : 'Tenés ' + sinNotaInicio + ' materias aprobadas sin nota cargada';
      document.getElementById('inicio-notas-pendientes-desc').textContent = sinNotaInicio === 1 ? 'No cuenta en tu promedio hasta que le cargues una nota.' : 'No cuentan en tu promedio hasta que les cargues una nota.';
    }

    var kpiRow = document.getElementById('kpi-row');
    // Si "Accesos rápidos" está viviendo acá adentro (posicionarAccesosRapidos()
    // lo movió en un render anterior, mobile), sacarlo ANTES de clear() — si
    // no, clear() lo destruye junto con las kpi-card viejas y la próxima
    // llamada a posicionarAccesosRapidos() encuentra getElementById(null).
    var accesosPanelPrevio = document.getElementById('accesos-panel');
    if (accesosPanelPrevio.parentNode === kpiRow) document.getElementById('inicio-cols-right').appendChild(accesosPanelPrevio);
    clear(kpiRow);
    computeKpis().forEach(function (k) {
      var node = tpl('kpi-card');
      var icon = qf(node, 'icon');
      // Acento único (design.md: "el azul es el único acento en todo el
      // producto") — el icon-tile ya no se tiñe por tono acá (antes usaba
      // naranja/verde/gris como Ajustes tiñe por tono, pero eso metía tres
      // colores compitiendo en la primera pantalla de la app). El estado
      // sigue comunicándose, solo que en el texto sub de abajo.
      icon.appendChild(tpl(KPI_ICON[k.label]));
      qf(node, 'label').textContent = k.label;
      // Bloque 5 (+ wizard de cargar nota): estado vacío con acción para
      // "Promedio general" sin notas cargadas — antes abría el picker de
      // "Nueva evaluación" (Tarea/Evaluación desde cero), que no es lo que
      // promete el botón; ahora abre el wizard materia → evaluación
      // pendiente → nota (ver openCargarNotaModal), y ese wizard mismo cae
      // al picker de Evaluación si no hay ninguna pendiente para calificar.
      if (k.empty) {
        node.classList.add('kpi-card-empty');
        var btn = el('button', 'btn btn-sm');
        btn.type = 'button';
        btn.textContent = k.ctaTexto;
        btn.addEventListener('click', function () { openCargarNotaModal(); });
        node.appendChild(btn);
        kpiRow.appendChild(node);
        return;
      }
      qf(node, 'valor').textContent = k.valor;
      var sub = qf(node, 'sub');
      sub.textContent = k.sub;
      sub.style.color = k.tone === 'neutral' ? 'var(--c-ink3)' : TONE[k.tone];
      kpiRow.appendChild(node);
    });

    var proxList = document.getElementById('proximos-list');
    clear(proxList);
    var t7 = today();
    // "Lo próximo"/"Próximos 7 días" son para lo que todavía hay que hacer —
    // una evaluación ya rendida (hecho:true, con nota o todavía "esperando
    // nota", ver agendaBadgeInfo) no pertenece acá aunque su fecha caiga
    // dentro de la ventana; para eso está Agenda con su propio filtro.
    function proximosEnRango(maxDias) {
      var out = [];
      agendaDeSemestre(activeSemestreId()).forEach(function (a) {
        if (a.hecho) return;
        var d = parseISODate(a.fecha);
        var diff = diffDias(d, t7);
        if (diff >= 0 && diff <= maxDias) out.push({ tipo: 'materia', d: d, item: a });
      });
      if (STATE.mostrarPersonales) loadPersonalRaw().forEach(function (p) {
        var d = parseISODate(p.fecha);
        var diff = diffDias(d, t7);
        if (diff >= 0 && diff <= maxDias) out.push({ tipo: 'personal', d: d, item: p });
      });
      out.sort(function (a, b) { return a.d - b.d; });
      return out;
    }
    // Nada en los próximos 7 días: en vez de dejar la card vacía, se pasa a
    // mostrar lo que quede del mes en curso — mismo criterio que "Lo
    // próximo" (hero, usa proximos[0]) para no desaparecer sólo porque no
    // hay nada en la semana. Si tampoco hay nada en lo que queda del mes, se
    // busca el próximo ítem sin límite de fecha y se acota la lista a SU mes
    // (no a "todo lo que hay a futuro" — si no, el título dice un mes pero
    // la lista mezcla varios meses siguientes).
    var diasHastaFinMes = diffDias(new Date(t7.getFullYear(), t7.getMonth() + 1, 0), t7);
    var proximos = proximosEnRango(7);
    var usandoMes = !proximos.length;
    if (usandoMes) proximos = proximosEnRango(Math.max(7, diasHastaFinMes));
    var usandoOtroMes = usandoMes && !proximos.length;
    var tituloProximos = 'Próximos 7 días';
    if (usandoOtroMes) {
      var siguiente = proximosEnRango(Infinity)[0];
      if (siguiente) {
        var finOtroMes = new Date(siguiente.d.getFullYear(), siguiente.d.getMonth() + 1, 0);
        proximos = proximosEnRango(diffDias(finOtroMes, t7));
        var nombreMes = MESES_LARGOS[siguiente.d.getMonth()];
        tituloProximos = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
      }
    } else if (usandoMes) {
      tituloProximos = 'Este mes';
    }
    document.getElementById('proximos-titulo').textContent = tituloProximos;
    if (!proximos.length) {
      var empty = el('div'); empty.style.cssText = 'padding:24px 0;text-align:center;color:var(--c-ink3);font-size:13px';
      empty.textContent = usandoMes ? 'No tenés nada agendado este mes.' : 'No tenés nada agendado para los próximos 7 días.';
      proxList.appendChild(empty);
    }
    proximos.forEach(function (p) {
      var node = tpl('prox-row');
      qf(node, 'dia').textContent = String(p.d.getDate());
      qf(node, 'mes').textContent = MESES_CORTOS[p.d.getMonth()].toUpperCase();
      if (p.tipo === 'materia') {
        var m = computeMateriaById(p.item.materiaId);
        qf(node, 'bar').setAttribute('style', barStyle(m ? m.strong : PERSONAL_COLOR));
        qf(node, 'titulo').textContent = p.item.titulo;
        var chip = qf(node, 'chip'); chip.setAttribute('style', m ? chipStyle(m.colorId) : personalChipStyle()); chip.textContent = m ? truncate(m.nombre, 16) : 'Personal';
        qf(node, 'metaTxt').textContent = (p.item.hora || '') + (p.item.hora ? ' · ' : '') + p.item.tipo;
        var badgeInfo = agendaBadgeInfo(p.item, t7);
        var b = qf(node, 'badge'); b.setAttribute('style', badgeStyle(badgeInfo.tone)); b.textContent = badgeInfo.label;
        setCountdownEnNodo(qf(node, 'countdown'), p.item.fecha, p.item.hora, p.item.hecho);
      } else {
        qf(node, 'bar').setAttribute('style', barStyle(PERSONAL_COLOR));
        qf(node, 'titulo').textContent = p.item.titulo;
        var chip2 = qf(node, 'chip'); chip2.setAttribute('style', personalChipStyle()); chip2.textContent = 'Personal';
        qf(node, 'metaTxt').textContent = p.item.todoElDia ? 'Todo el día' : (p.item.hora || '');
        var b2 = qf(node, 'badge'); b2.setAttribute('style', badgeStyle('neutral')); b2.textContent = 'Personal';
        setCountdownEnNodo(qf(node, 'countdown'), p.item.fecha, p.item.todoElDia ? '' : p.item.hora, false);
      }
      renderTagChipInto(qf(node, 'tag'), p.item.tagId);
      if (p.tipo === 'materia') makeRowClickable(node, function () { openEvaluacionModal({ editId: p.item.id }); }, 'Abrir ' + p.item.titulo);
      proxList.appendChild(node);
    });

    posicionarInicioHero();
    posicionarAccesosRapidos();
    renderInicioHero(proximos[0], t7);

    var riesgo = computeMateriasDelActivo().filter(function (m) { return m.tone === 'danger' || m.tone === 'warning'; });
    var riesgoPanel = document.getElementById('riesgo-panel');
    var riesgoList = document.getElementById('riesgo-list');
    clear(riesgoList);
    if (!riesgo.length) {
      riesgoPanel.style.display = 'none';
    } else {
      riesgoPanel.style.display = '';
      riesgo.forEach(function (m) {
        var node = tpl('riesgo-row');
        qf(node, 'ring').setAttribute('style', ringStyle(m.actual, TONE[m.tone], 64, m.esc.total));
        var inner = qf(node, 'ringInner');
        inner.setAttribute('style', ringInnerStyle(64, 7));
        clear(inner);
        var v1 = el('span', 'ring-val mono'); v1.style.fontSize = '16px'; v1.textContent = m.notaTxt;
        var v2 = el('span', 'ring-aprob mono'); v2.style.fontSize = '9px'; v2.textContent = '/' + val(m.esc.aprob, m.esc);
        inner.appendChild(v1); inner.appendChild(v2);
        qf(node, 'nombre').textContent = m.nombre;
        qf(node, 'riesgoTxt').textContent = m.riesgoTxt;
        makeRowClickable(node, function () { location.hash = '#materia-' + m.id; }, 'Ver materia ' + m.nombre);
        riesgoList.appendChild(node);
      });
    }

    renderInicioEsperandoNota();
    renderProgresoWidgetInicio();
  }

  // Reubica #inicio-hero según el ancho (bloque C4: "Lo próximo" pasa a
  // verse también en desktop) — en vez de reglas CSS que lo muevan de
  // contenedor (no se puede: son padres distintos), se mueve el nodo en el
  // DOM. En mobile va antes de #kpi-row ("Lo próximo" tiene que ganarle en
  // orden a todo lo demás — es lo urgente; progreso-semestre-card ahora
  // vive al final de Inicio, así que ya no sirve de ancla, ver comentario
  // en su <div> sobre por qué se movió); en desktop entra como la primera
  // card de la columna derecha de #inicio-cols, mismo ancho que Materias en
  // riesgo/Progreso/Accesos. Idempotente: llamarla de nuevo sin haber
  // cambiado de ancho no mueve nada.
  function posicionarInicioHero() {
    var hero = document.getElementById('inicio-hero');
    if (esMobile()) {
      var kpiRow = document.getElementById('kpi-row');
      if (hero.nextElementSibling !== kpiRow) kpiRow.parentNode.insertBefore(hero, kpiRow);
    } else {
      var colDerecha = document.getElementById('inicio-cols-right');
      if (colDerecha.firstElementChild !== hero) colDerecha.insertBefore(hero, colDerecha.firstElementChild);
    }
  }

  // "Accesos rápidos" — en mobile pasa a ser la 4ta celda de la grilla 2x2
  // de #kpi-row (las 3 kpi-card dejaban esa celda vacía, al lado de
  // "Pendientes esta semana"; feedback: mover el panel ahí en vez de que
  // aparezca recién después de "Materias en riesgo", mucho más abajo). En
  // desktop vuelve a su lugar original al final de la columna derecha. Ver
  // #kpi-row > #accesos-panel en styles.css para el estilo compacto que
  // toma sólo en esa posición.
  function posicionarAccesosRapidos() {
    var panel = document.getElementById('accesos-panel');
    if (esMobile()) {
      var kpiRow = document.getElementById('kpi-row');
      if (panel.parentNode !== kpiRow) kpiRow.appendChild(panel);
    } else {
      var colDerecha = document.getElementById('inicio-cols-right');
      if (panel.parentNode !== colDerecha) colDerecha.appendChild(panel);
    }
  }

  // Card "Lo próximo" — el mismo primer ítem de proximos-list ya ordenado
  // por fecha, no un cálculo nuevo: sólo agrega el layout de card destacada
  // + progreso de la materia si ya tiene notas cargadas. Botón "Ver en
  // agenda" navega, no crea nada nuevo (no hay "posponer" en el modelo de
  // datos, así que no se inventa acá). Visible en mobile y desktop (bloque
  // C4) — ver posicionarInicioHero() para dónde cae en cada ancho.
  function renderInicioHero(p, t7) {
    var hero = document.getElementById('inicio-hero');
    if (!p) { hero.style.display = 'none'; return; }
    hero.style.display = '';
    var badgeEl = document.getElementById('inicio-hero-badge');
    var progressWrap = document.getElementById('inicio-hero-progress');
    var secondary = document.getElementById('inicio-hero-secondary');
    var primary = document.getElementById('inicio-hero-primary');
    progressWrap.classList.add('hidden');
    secondary.classList.add('hidden');

    if (p.tipo === 'materia') {
      var m = computeMateriaById(p.item.materiaId);
      var badgeInfo = agendaBadgeInfo(p.item, t7);
      badgeEl.setAttribute('style', badgeStyle(badgeInfo.tone)); badgeEl.textContent = badgeInfo.label;
      document.getElementById('inicio-hero-title').textContent = p.item.titulo;
      document.getElementById('inicio-hero-meta').textContent = (m ? m.nombre + ' · ' : '') + (p.item.hora ? p.item.hora + ' · ' : '') + p.item.tipo;
      if (m && m.actual != null) {
        progressWrap.classList.remove('hidden');
        var pct = Math.max(0, Math.min(100, (m.actual / m.esc.total) * 100));
        document.getElementById('inicio-hero-bar').setAttribute('style', css({ width: pct + '%', background: TONE[m.tone] }));
        document.getElementById('inicio-hero-sub').textContent = m.riesgoTxt || ('Vas aprobando · aprobás con ' + m.aprobTxt + '.');
      }
      // Bloque 6: "Abrir materia" va a la materia (antes abría el modal de
      // la evaluación, que ya tiene su propio punto de entrada en la fila
      // de abajo). Si por lo que sea la materia ya no existe, cae al
      // comportamiento viejo en vez de navegar a una vista rota.
      primary.textContent = 'Abrir materia';
      primary.onclick = m ? function () { location.hash = '#materia-' + m.id; } : function () { openEvaluacionModal({ editId: p.item.id }); };
      secondary.classList.remove('hidden');
      // "Ver en agenda" navega Y resalta/scrollea hasta el ítem puntual
      // (antes sólo navegaba) — ver STATE.agendaHighlightId, consumido en
      // renderAgenda().
      secondary.onclick = function () {
        // Limpia los filtros que podrían esconder el ítem (si quedó, por
        // ejemplo, "Sólo pendientes" de una visita anterior a Agenda) —
        // si no, "Ver en agenda" podría navegar a una lista donde el
        // ítem ni siquiera aparece.
        STATE.agendaFiltroKind = ''; STATE.agendaFiltroMateria = ''; STATE.agendaFiltroEstado = ''; STATE.agendaQuery = '';
        STATE.agendaHighlightId = p.item.id;
        location.hash = '#agenda';
      };
    } else {
      badgeEl.setAttribute('style', badgeStyle('neutral')); badgeEl.textContent = 'Personal';
      document.getElementById('inicio-hero-title').textContent = p.item.titulo;
      document.getElementById('inicio-hero-meta').textContent = p.item.todoElDia ? 'Todo el día' : (p.item.hora || '');
      primary.textContent = 'Ver en agenda';
      primary.onclick = function () { location.hash = '#agenda'; };
    }
    renderTagChipInto(document.getElementById('inicio-hero-tag'), p.item.tagId);
  }

  // ================================================================
  // PROGRESO (histórico entre semestres)
  // ================================================================
  // Barra de progreso hacia la meta de cantidad de materias de la carrera —
  // reusada entre la sección Progreso completa y el widget resumen de
  // Inicio (compact=true ahí, sin el conteo exacto, sólo el %).
  function renderMetaBarInto(container, compact, valorMeta, valorActual, unidad, ctaTexto) {
    clear(container);
    if (valorMeta == null) {
      var cta = el('div', 'progreso-creditos-cta');
      var span = el('span'); span.textContent = ctaTexto;
      var btn = el('button', 'btn btn-sm'); btn.type = 'button'; btn.textContent = 'Ir a Ajustes';
      btn.addEventListener('click', function () { openAjustesModal(); });
      cta.appendChild(span); cta.appendChild(btn);
      container.appendChild(cta);
      return;
    }
    var pct = valorMeta > 0 ? Math.max(0, Math.min(100, Math.round((valorActual / valorMeta) * 100))) : 0;
    var row = el('div', 'nota-row');
    var label = el('span', 'label'); label.textContent = compact ? ('Hacia el título · ' + unidad) : (valorActual + ' / ' + valorMeta + ' ' + unidad);
    var barWrap = el('div', 'bar-wrap');
    var barFill = el('div', 'bar-fill');
    barFill.setAttribute('style', css({ width: pct + '%', background: TONE.success }));
    barWrap.appendChild(barFill);
    var v = el('span', 'v'); v.textContent = pct + '%';
    row.appendChild(label); row.appendChild(barWrap); row.appendChild(v);
    container.appendChild(row);
  }
  // <4 semestres con datos: comparación en barras en vez de línea — una
  // línea entre 2-3 puntos sugiere una tendencia continua que todavía no
  // existe (ver ui-ux-pro-max, dominio chart: "Trend Over Time" pide ≥4
  // puntos, si no usar una comparación). Reusa el mismo patrón
  // .nota-row/.bar-wrap/.bar-fill que ya usa "Progreso hacia el título" acá
  // abajo, no un componente nuevo. El semestre activo queda marcado en el
  // propio label (mismo criterio "sin ícono nuevo" que el resto de la vista).
  function renderProgresoBarras(container, puntos) {
    clear(container);
    var wrap = el('div', 'progreso-barras');
    var activoId = activeSemestreId();
    puntos.forEach(function (p) {
      var col = el('div', 'progreso-barra-col');
      var row = el('div', 'nota-row');
      var label = el('span', 'label');
      label.textContent = p.semestre.nombre + (p.semestre.id === activoId ? ' · actual' : '');
      var barWrap = el('div', 'bar-wrap');
      var barFill = el('div', 'bar-fill');
      // Clamp a 100 (mismo caso que buildProgresoChartSvg): un promedio mal
      // calculado por una nota fuera de escala no debería mandar el ancho
      // del div a un múltiplo de 100% — .bar-wrap tiene overflow:hidden así
      // que no se ve roto, pero tampoco tiene sentido pedirle al layout un
      // valor absurdo cuando 100% ya comunica "al tope" igual de bien.
      barFill.setAttribute('style', css({ width: Math.min(100, p.promedio) + '%', background: TONE.success }));
      barWrap.appendChild(barFill);
      var v = el('span', 'v'); v.textContent = p.promedio + '%';
      row.appendChild(label); row.appendChild(barWrap); row.appendChild(v);
      var sub = el('div', 'progreso-barra-sub');
      sub.textContent = p.aprobadas + '/' + p.total + ' aprobadas' + (p.exoneradas ? ' · ' + p.exoneradas + ' exoneradas' : '');
      col.appendChild(row); col.appendChild(sub);
      makeRowClickable(col, function () { openSemestreMateriasModal(p.semestre.id); }, 'Ver materias de ' + p.semestre.nombre);
      wrap.appendChild(col);
    });
    container.appendChild(wrap);
  }

  // Bloque 4: "Este semestre" completo de la vista Progreso — misma fuente
  // de datos que la card compacta de Inicio (computeProgresoSemestreActivo,
  // ver renderProgresoSemestre), pero con las materias agrupadas en 3
  // baldes (encaminada a exonerar / aprobando / en riesgo) en vez de una
  // lista plana. Sólo entran al desglose las materias con al menos una
  // nota cargada — sin datos no hay "encaminada" que afirmar.
  function renderProgresoEsteSemestre() {
    var p = computeProgresoSemestreActivo();
    var card = document.getElementById('progreso-este-semestre-card');
    if (!p.materias.length) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');

    var deltaEl = document.getElementById('progreso-este-semestre-delta');
    if (p.deltaVsAnterior != null) {
      var tone = p.deltaVsAnterior > 0 ? 'success' : (p.deltaVsAnterior < 0 ? 'danger' : 'neutral');
      deltaEl.style.color = TONE[tone];
      deltaEl.textContent = (p.deltaVsAnterior > 0 ? '▲ ' : p.deltaVsAnterior < 0 ? '▼ ' : '— ') + Math.abs(p.deltaVsAnterior) + ' pts vs. ' + p.nombreAnterior;
    } else {
      deltaEl.textContent = '';
    }

    var sinNotas = p.evaluacionesCalificadas === 0;
    document.getElementById('progreso-este-semestre-empty').classList.toggle('hidden', !sinNotas);
    document.getElementById('progreso-este-semestre-content').classList.toggle('hidden', sinNotas);
    if (sinNotas) return;

    document.getElementById('progreso-este-semestre-promedio').textContent = p.promedio != null ? p.promedio + '%' : '—';
    var ring = document.getElementById('progreso-este-semestre-ring');
    ring.setAttribute('style', ringStyle(p.evaluacionesCalificadas, TONE.success, 72, p.evaluacionesEsperadas || 1));
    clear(ring);
    var inner = el('div'); inner.setAttribute('style', ringInnerStyle(72, 7));
    var v1 = el('span', 'mono'); v1.style.cssText = 'font-size:16px;font-weight:700'; v1.textContent = p.evaluacionesCalificadas + '/' + p.evaluacionesEsperadas;
    var v2 = el('span'); v2.style.cssText = 'font-size:9px;color:var(--c-ink3)'; v2.textContent = 'notas';
    inner.appendChild(v1); inner.appendChild(v2);
    ring.appendChild(inner);

    var exonerando = 0, aprobando = 0, enRiesgo = 0;
    p.materias.forEach(function (m) {
      if (m.actual == null) return;
      if (m.esc.exoneracion != null && m.actual >= m.esc.exoneracion) exonerando++;
      else if (m.actual >= m.esc.aprob) aprobando++;
      else enRiesgo++;
    });
    var buckets = document.getElementById('progreso-este-semestre-buckets');
    clear(buckets);
    [['Encaminadas a exonerar', exonerando], ['Aprobando', aprobando], ['En riesgo', enRiesgo]].forEach(function (b) {
      var stat = el('div', 'detalle-sim-stat');
      var lbl = el('span', 'lbl'); lbl.textContent = b[0];
      var v = el('span', 'v mono'); v.textContent = String(b[1]);
      stat.appendChild(lbl); stat.appendChild(v);
      buckets.appendChild(stat);
    });
  }

  // Bloque 4: complemento del gráfico/las barras de arriba — sólo los
  // semestres SIN promedio todavía (típico de un semestre histórico recién
  // armado por el onboarding, con materias aprobadas pero sin ninguna nota
  // cargada), que el gráfico no puede plotear. Los que sí tienen promedio
  // ya muestran su "aprobadas · exoneradas" en la barra/el punto — no se
  // repiten acá para no duplicar la misma info dos veces.
  function renderProgresoSemestresLista(puntos) {
    var wrap = document.getElementById('progreso-semestres-lista');
    clear(wrap);
    var activoId = activeSemestreId();
    puntos.filter(function (p) { return p.promedio == null; }).forEach(function (p) {
      // Mismo layout de dos líneas que renderProgresoBarras (columna +
      // subtítulo), no `.nota-row .v` a secas: ese `.v` tiene un ancho fijo
      // de 70px pensado para un valor corto ("72%"), y esta fila necesita
      // una frase entera ("N aprob. · N exon. · sin promedio todavía") — se
      // partía en 3-4 líneas amontonadas sobre el hueco vacío donde iría la
      // barra (bug encontrado probando contra el fixture con semestres
      // históricos, no por lectura de código).
      var col = el('div', 'progreso-barra-col');
      var row = el('div', 'nota-row');
      var label = el('span', 'label');
      label.textContent = p.semestre.nombre + (p.semestre.id === activoId ? ' · actual' : '');
      var chev = el('span', 'v'); chev.style.cssText = 'width:auto;color:var(--c-ink3)'; chev.textContent = 'Ver materias ›';
      row.appendChild(label); row.appendChild(chev);
      var sub = el('div', 'progreso-barra-sub');
      sub.textContent = p.aprobadas + ' aprob. · ' + p.exoneradas + ' exon. · sin promedio todavía';
      col.appendChild(row); col.appendChild(sub);
      makeRowClickable(col, function () { openSemestreMateriasModal(p.semestre.id); }, 'Ver materias de ' + p.semestre.nombre);
      wrap.appendChild(col);
    });
  }

  // Modal "Materias de {semestre}" — el único camino de UI hacia las
  // materias de un semestre que no es el activo (histórico del onboarding o
  // cualquier semestre propio viejo): Materias y el selector de semestre
  // sólo conocen el activo, así que sin esto una materia vieja no tenía
  // forma de llegar a su Detalle (donde sí se ve/edita todo) salvo
  // escribiendo el hash a mano. Se abre desde renderProgresoBarras,
  // renderProgresoSemestresLista y los puntos del gráfico SVG (ver
  // buildProgresoChartSvg) — misma lista para los tres casos.
  function openSemestreMateriasModal(semestreId) {
    var s = semestreRawById(semestreId);
    if (!s) return;
    document.getElementById('modal-semestre-materias-title').textContent = s.nombre;
    var materias = computeMaterias({ semestreId: semestreId }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    var list = document.getElementById('semestre-materias-list');
    clear(list);
    if (!materias.length) {
      var empty = el('div'); empty.style.cssText = 'font-size:13px;color:var(--c-ink3);padding:8px 4px';
      empty.textContent = 'Este semestre no tiene materias todavía.';
      list.appendChild(empty);
    }
    materias.forEach(function (m) {
      var row = el('div', 'progreso-semestre-materia-row');
      var nombreWrap = el('div', 'progreso-semestre-materia-nombre');
      var dot = el('span', 'tone-dot'); dot.style.background = m.strong;
      var nombre = el('span'); nombre.textContent = m.nombre;
      nombreWrap.appendChild(dot); nombreWrap.appendChild(nombre);
      var right = el('div'); right.style.cssText = 'display:flex;align-items:center;gap:8px;flex:none';
      var badge = el('span', 'badge'); badge.setAttribute('style', badgeStyle(m.badgeTone)); badge.textContent = m.badgeLabel;
      var valEl = el('span', 'mono'); valEl.style.color = TONE[m.tone]; valEl.textContent = m.notaTxt + '/' + val(m.esc.aprob, m.esc);
      right.appendChild(badge); right.appendChild(valEl);
      row.appendChild(nombreWrap); row.appendChild(right);
      makeRowClickable(row, function () { closeAllModals(); location.hash = '#materia-' + m.id; }, 'Ver materia ' + m.nombre);
      list.appendChild(row);
    });
    openModal('modal-semestre-materias');
  }

  // "Estado de todas tus materias" — TODAS las materias de la cuenta, no
  // sólo el semestre activo: mismo alcance que "Progreso hacia el título" y
  // el resto de esta vista (ver cursada-conventions: Progreso muestra
  // histórico completo a propósito, no se acota). Agrupa por m.estado, el
  // mismo vocabulario que ya usan los filtros de Materias (ESTADO_LABEL/
  // ESTADO_TONE) — no inventa una clasificación de riesgo nueva acá.
  function renderProgresoDistribucion() {
    var materias = computeMaterias();
    var counts = {};
    materias.forEach(function (m) { counts[m.estado] = (counts[m.estado] || 0) + 1; });

    var bar = document.getElementById('progreso-dist-bar');
    var legend = document.getElementById('progreso-dist-legend');
    clear(bar); clear(legend);
    ['cursando', 'aprobada', 'recursando', 'pendiente'].filter(function (e) { return counts[e]; }).forEach(function (e) {
      var color = TONE[ESTADO_TONE[e]];
      var seg = el('div', 'progreso-dist-seg');
      seg.style.flexGrow = counts[e];
      seg.style.background = color;
      seg.title = ESTADO_LABEL[e] + ' · ' + counts[e];
      bar.appendChild(seg);
      var item = tpl('leyenda-item');
      qf(item, 'dot').setAttribute('style', dotStyle(color));
      qf(item, 'label').textContent = ESTADO_LABEL[e] + ' · ' + counts[e];
      legend.appendChild(item);
    });
  }

  // "Materias pendientes" — todas las materias estado:'pendiente' (debés
  // rendir examen) de TODA la cuenta, agrupadas por semestre en orden
  // cronológico real (semestresOrdenados(), no el orden en que aparecen en
  // computeMaterias()). Mismo alcance histórico completo que el resto de
  // Progreso — a propósito, así una materia "Pendiente" de un semestre
  // histórico del onboarding es tan visible acá como una del semestre
  // activo. Cada fila abre directo el mini-modal de "Cargar nota" (ver
  // abrirCargarNotaExamenModal) — no pasa por Detalle ni por "Nueva
  // evaluación": esa pantalla/modal completa pide título/fecha/tipo/
  // etiqueta, de más para lo único que hace falta acá, cuánto te sacaste
  // en el examen.
  function renderProgresoPendientes() {
    var card = document.getElementById('progreso-pendientes-card');
    var pendientes = computeMaterias().filter(function (m) { return m.estado === 'pendiente'; });
    if (!pendientes.length) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    document.getElementById('progreso-pendientes-count').textContent = pendientes.length + (pendientes.length === 1 ? ' materia' : ' materias');

    var porSemestre = {};
    pendientes.forEach(function (m) { (porSemestre[m.semestreId] = porSemestre[m.semestreId] || []).push(m); });

    var wrap = document.getElementById('progreso-pendientes-por-semestre');
    clear(wrap);
    var activoId = activeSemestreId();
    var gruposIds = {};
    function pintarGrupo(nombre, materias) {
      var group = el('div', 'progreso-pendientes-grupo');
      var header = el('div', 'progreso-pendientes-grupo-header');
      header.textContent = nombre;
      group.appendChild(header);
      materias.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }).forEach(function (m) {
        var row = el('div', 'progreso-semestre-materia-row');
        var nombreWrap = el('div', 'progreso-semestre-materia-nombre');
        var dot = el('span', 'tone-dot'); dot.style.background = m.strong;
        var nombreEl = el('span'); nombreEl.textContent = m.nombre;
        nombreWrap.appendChild(dot); nombreWrap.appendChild(nombreEl);
        var valEl = el('span'); valEl.style.cssText = 'color:var(--c-ink3);font-size:12.5px'; valEl.textContent = 'Cargar nota ›';
        row.appendChild(nombreWrap); row.appendChild(valEl);
        makeRowClickable(row, function () { abrirCargarNotaExamenModal(m.id); }, 'Cargar nota de ' + m.nombre);
        group.appendChild(row);
      });
      wrap.appendChild(group);
    }
    semestresOrdenados().forEach(function (s) {
      var materias = porSemestre[s.id];
      if (!materias || !materias.length) return;
      gruposIds[s.id] = true;
      pintarGrupo(s.nombre + (s.id === activoId ? ' · actual' : ''), materias);
    });
    // Red de seguridad: una materia sin semestreId (no debería pasar, ver
    // README sección Semestres) no queda oculta en silencio.
    var sueltas = pendientes.filter(function (m) { return !m.semestreId || !gruposIds[m.semestreId]; });
    if (sueltas.length) pintarGrupo('Sin semestre', sueltas);
  }

  // Bloque 4: la causa raíz de que esta vista no mostrara nada era que las
  // materias aprobadas del onboarding quedaban con semestreId:null (ver
  // wizCrearMateriasAprobadas, ahora apunta a un semestre histórico) — acá
  // el segundo problema apilado era que un solo `return` temprano escondía
  // también la barra de progreso de carrera y el aviso de notas sueltas,
  // que no dependen de agrupar por semestre. El único estado realmente
  // vacío ahora es "no hay ninguna materia en la cuenta todavía".
  function renderProgreso() {
    var hayMaterias = computeMaterias().length > 0;
    document.getElementById('progreso-empty').classList.toggle('hidden', hayMaterias);
    document.getElementById('progreso-content').classList.toggle('hidden', !hayMaterias);
    if (!hayMaterias) return;

    renderProgresoEsteSemestre();

    var puntos = computeProgresoPorSemestre();
    var puntosConPromedio = puntos.filter(function (p) { return p.promedio != null; });
    var chartWrap = document.getElementById('progreso-chart');
    var chartOuter = document.getElementById('progreso-chart-outer');
    var chartEmpty = document.getElementById('progreso-chart-empty');
    if (!puntosConPromedio.length) {
      clear(chartWrap);
      chartWrap.classList.add('hidden');
      chartEmpty.classList.remove('hidden');
    } else {
      chartWrap.classList.remove('hidden');
      chartEmpty.classList.add('hidden');
      // El SVG de línea necesita ~110px por punto para que ni los puntos ni
      // sus dos líneas de texto ("N/N aprob." + "72%") se pisen — con 5+
      // semestres históricos (común: el onboarding puede armar hasta 8) eso
      // no entra en los ~310px de una columna mobile, y el resultado se
      // scrollea horizontalmente sin ningún indicio visual de que hay más
      // para el costado: se ve cortado/roto, no "scrolleable" (bug
      // reportado, reproducido con 5 semestres con nota en el fixture de
      // test-harness). En mobile van directo a las barras — mismo dato,
      // apiladas verticalmente, nunca se cortan sin importar cuántos
      // semestres haya. En desktop se mantiene el gráfico (si entran los
      // puntos cómodos no hace falta scrollear un carrito nunca).
      if (puntosConPromedio.length >= 4 && !esMobile()) {
        chartWrap.innerHTML = buildProgresoChartSvg(puntosConPromedio, chartWrap.clientWidth);
        chartWrap.querySelectorAll('.progreso-chart-point').forEach(function (g) {
          var id = g.getAttribute('data-semestre-id');
          g.addEventListener('click', function () { openSemestreMateriasModal(id); });
          g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openSemestreMateriasModal(id); } });
        });
        // Con muchos semestres el gráfico igual puede no entrar entero ni en
        // desktop — el degradé del borde derecho (.progreso-chart-outer.
        // has-overflow) avisa que hay más para el costado, en vez de dejar
        // que la línea corte de golpe contra el borde sin ningún aviso.
        var tieneOverflow = chartWrap.scrollWidth > chartWrap.clientWidth + 1;
        chartOuter.classList.toggle('has-overflow', tieneOverflow);
      } else {
        chartOuter.classList.remove('has-overflow');
        renderProgresoBarras(chartWrap, puntosConPromedio);
      }
    }
    renderProgresoSemestresLista(puntos);
    renderProgresoPendientes();

    renderProgresoDistribucion();
    renderMetaBarInto(document.getElementById('progreso-materias'), false, CURRENT_PROFILE && CURRENT_PROFILE.materias_carrera, materiasAprobadasCount(), 'materias', 'Completá la cantidad de materias de tu carrera en Ajustes para ver tu progreso hacia el título.');
    var sinNota = materiasAprobadasSinNota().length;
    var aviso = document.getElementById('progreso-aviso-notas');
    aviso.classList.toggle('hidden', !sinNota);
    if (sinNota) aviso.textContent = 'Tenés ' + sinNota + (sinNota === 1 ? ' materia aprobada sin nota cargada — completala en Ajustes.' : ' materias aprobadas sin nota cargada — completalas en Ajustes.');
  }
  // Sólo se muestra con ≥2 semestres con datos — nada de estado vacío acá,
  // si no hay historial suficiente el panel directamente no aparece (ver
  // prompt original). El delta compara el activo contra el anterior
  // cronológico de verdad (posición del activo en semestresOrdenados() menos
  // 1), nunca "el anteúltimo del array".
  function renderProgresoWidgetInicio() {
    var panel = document.getElementById('progreso-widget');
    var puntos = computeProgresoPorSemestre();
    if (puntos.length < 2) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');

    var ordenados = semestresOrdenados();
    var activoId = activeSemestreId();
    var idxActivo = -1;
    ordenados.forEach(function (s, i) { if (s.id === activoId) idxActivo = i; });
    var anterior = idxActivo > 0 ? ordenados[idxActivo - 1] : null;
    var puntoActivo = puntos.filter(function (p) { return p.semestre.id === activoId; })[0];
    var puntoAnterior = anterior ? puntos.filter(function (p) { return p.semestre.id === anterior.id; })[0] : null;

    var deltaWrap = document.getElementById('progreso-widget-delta');
    clear(deltaWrap);
    // Bloque 4: computeProgresoPorSemestre() ahora también devuelve
    // semestres sin promedio todavía (históricos recién armados por el
    // onboarding) — sin promedio en alguno de los dos no hay delta que
    // mostrar, sólo la barra de meta de abajo.
    if (puntoActivo && puntoAnterior && puntoActivo.promedio != null && puntoAnterior.promedio != null) {
      var delta = puntoActivo.promedio - puntoAnterior.promedio;
      var tone = delta > 0 ? 'success' : (delta < 0 ? 'danger' : 'neutral');
      var row = el('div', 'progreso-delta');
      row.style.color = TONE[tone];
      var val = el('span', 'progreso-delta-val'); val.textContent = puntoActivo.promedio + '%';
      var d = el('span', 'progreso-delta-d');
      d.textContent = (delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : '— ') + Math.abs(delta) + ' pts vs. ' + anterior.nombre;
      row.appendChild(val); row.appendChild(d);
      deltaWrap.appendChild(row);
    }
    renderMetaBarInto(document.getElementById('progreso-widget-materias'), true, CURRENT_PROFILE && CURRENT_PROFILE.materias_carrera, materiasAprobadasCount(), 'materias', 'Completá la cantidad de materias de tu carrera en Ajustes.');
  }

  function agendaBadgeInfo(item, t) {
    if (item.hecho) {
      var esEval = item.itemKind === 'evaluacion' || item.kind === 'evaluacion';
      // Una evaluación "hecha" sin nota todavía es un estado propio ("la
      // rendí pero no sé cuánto me saqué") — antes se mostraba igual que
      // "Rendido" ya calificado, lo que escondía que faltaba cargar la nota
      // (ver btn-eval-view-entregado/abrirAsignarNotaModal).
      if (esEval && item.nota == null) return { tone: 'warning', label: 'Esperando nota' };
      return { tone: 'success', label: esEval ? 'Rendido' : 'Entregado' };
    }
    var d = parseISODate(item.fecha);
    var diff = diffDias(d, t);
    if (diff < 0) return { tone: 'danger', label: 'Vencida hace ' + Math.abs(diff) + (Math.abs(diff) === 1 ? ' día' : ' días') };
    if (diff === 0) return { tone: 'warning', label: 'Hoy' };
    if (diff === 1) return { tone: 'warning', label: 'Mañana' };
    if (diff <= 6) return { tone: 'neutral', label: 'Esta semana' };
    return { tone: 'neutral', label: 'Pendiente' };
  }

  // ---- Countdown en vivo (bloque C2/D2) ----
  // Texto de cuenta regresiva a partir de fecha (+hora opcional). Sin hora
  // sólo se puede hablar en días enteros ("en 3 d", "vence hoy"); con hora
  // se baja a horas/minutos cuando falta menos de un día. Reusada por
  // Inicio ("Próximos 7 días") y Agenda — un solo cálculo, nunca duplicado.
  function formatCountdown(fecha, hora, ahora) {
    var d = parseISODate(fecha);
    if (!hora) {
      var diasN = diffDias(d, today());
      if (diasN < 0) return 'vencido';
      if (diasN === 0) return 'vence hoy';
      return 'en ' + diasN + ' d';
    }
    var partes = hora.split(':');
    var objetivo = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(partes[0]) || 0, Number(partes[1]) || 0);
    var diffMs = objetivo - ahora;
    if (diffMs <= 0) return 'vencido';
    var totalMin = Math.ceil(diffMs / 60000);
    var dias = Math.floor(totalMin / 1440);
    var horas = Math.floor((totalMin % 1440) / 60);
    var minutos = totalMin % 60;
    if (dias >= 1) return 'en ' + dias + ' d ' + horas + ' h';
    if (horas >= 1) return 'en ' + horas + ' h ' + minutos + ' m';
    return 'en ' + minutos + ' m';
  }
  // Antes el countdown era siempre azul (var(--c-accent)), sin importar si
  // faltaban 12 horas o 3 semanas — otra fuente de "todo compite igual"
  // (ver badge de estado más arriba). Ahora el color es la única señal de
  // urgencia de la fila: rojo si venció, naranja si es hoy/mañana, gris
  // apagado (el color por defecto de .prox-countdown) para el resto — se
  // reutiliza en Inicio y Agenda, un solo criterio.
  function esCountdownUrgente(fecha) {
    return diffDias(parseISODate(fecha), today()) <= 1;
  }
  // Un solo setInterval para todos los countdowns visibles a la vez (Inicio
  // y Agenda pueden tener el suyo en pantalla en momentos distintos, nunca
  // los dos juntos porque son vistas separadas) — recorre el DOM en vez de
  // guardar referencias, así no importa qué vista los pintó.
  function tickCountdowns() {
    var ahora = new Date();
    document.querySelectorAll('[data-countdown-fecha]').forEach(function (nodo) {
      var fecha = nodo.getAttribute('data-countdown-fecha');
      var txt = formatCountdown(fecha, nodo.getAttribute('data-countdown-hora') || '', ahora);
      nodo.textContent = txt;
      nodo.classList.toggle('vencido', txt === 'vencido');
      nodo.classList.toggle('urgente', txt !== 'vencido' && esCountdownUrgente(fecha));
    });
  }
  var COUNTDOWN_INICIADO = false;
  function iniciarCountdownGlobal() {
    if (COUNTDOWN_INICIADO) return;
    COUNTDOWN_INICIADO = true;
    setInterval(tickCountdowns, 30000);
  }
  // Setea el countdown de un nodo y lo pinta al toque (no espera al primer
  // tick del interval) — hecho:true lo deja vacío, un ítem ya
  // entregado/rendido no cuenta regresiva hacia nada.
  function setCountdownEnNodo(nodo, fecha, hora, hecho) {
    if (hecho) { nodo.classList.add('hidden'); nodo.removeAttribute('data-countdown-fecha'); return; }
    nodo.classList.remove('hidden');
    nodo.setAttribute('data-countdown-fecha', fecha);
    nodo.setAttribute('data-countdown-hora', hora || '');
    var txt = formatCountdown(fecha, hora || '', new Date());
    nodo.textContent = txt;
    nodo.classList.toggle('vencido', txt === 'vencido');
    nodo.classList.toggle('urgente', txt !== 'vencido' && esCountdownUrgente(fecha));
  }

  // ================================================================
  // MATERIAS
  // ================================================================
  function renderMaterias() {
    // En mobile la tabla queda oculta con !important (no hay ancho para
    // columnas) y el toggle Tarjetas/Tabla también se esconde — pero si
    // STATE.materiasView seguía en 'tabla' (por ejemplo, volviendo de un
    // link con ?vista=tabla), esta vista sólo arma una de las dos según ese
    // estado: sin este guard, la tabla se arma pero el CSS la tapa y la
    // grilla ni se construye — Materias quedaría en blanco en mobile.
    if (esMobile()) STATE.materiasView = 'tarjetas';
    syncStateToURL();
    var materias = computeMateriasDelActivo();
    document.getElementById('materias-count').textContent = materias.length + (materias.length === 1 ? ' materia' : ' materias');

    var empty = document.getElementById('materias-empty');
    var toolbar = document.querySelector('#materias .materias-toolbar');
    if (!materias.length) {
      empty.classList.remove('hidden');
      toolbar.classList.add('hidden');
      document.getElementById('materias-grid').classList.add('hidden');
      document.getElementById('materias-table-wrap').classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    toolbar.classList.remove('hidden');

    var filtros = document.getElementById('materias-filtros');
    clear(filtros);
    var counts = { todas: materias.length };
    materias.forEach(function (m) { counts[m.estado] = (counts[m.estado] || 0) + 1; });
    var opciones = [['todas', 'Todas']];
    ['cursando', 'aprobada', 'pendiente', 'recursando'].forEach(function (e) { if (counts[e]) opciones.push([e, ESTADO_LABEL[e] + (e !== 'cursando' && e !== 'pendiente' ? 's' : '')]); });
    opciones.forEach(function (o) {
      var node = tpl('filtro-pill');
      node.classList.toggle('is-on', STATE.materiasFiltro === o[0]);
      qf(node, 'label').textContent = o[1] + ' · ' + counts[o[0]];
      node.addEventListener('click', function () { STATE.materiasFiltro = o[0]; renderMaterias(); });
      filtros.appendChild(node);
    });

    var searchInput = document.getElementById('materias-search');
    if (searchInput.value !== STATE.materiasQuery) searchInput.value = STATE.materiasQuery;
    var q = STATE.materiasQuery.trim().toLowerCase();
    var filtradas = STATE.materiasFiltro === 'todas' ? materias : materias.filter(function (m) { return m.estado === STATE.materiasFiltro; });
    if (q) filtradas = filtradas.filter(function (m) { return (m.nombre + ' ' + m.doc).toLowerCase().indexOf(q) >= 0; });

    var gridWrap = document.getElementById('materias-grid');
    var tableWrap = document.getElementById('materias-table-wrap');
    var isTarjetas = STATE.materiasView === 'tarjetas';
    gridWrap.classList.toggle('hidden', !isTarjetas);
    tableWrap.classList.toggle('hidden', isTarjetas);

    if (isTarjetas) {
      clear(gridWrap);
      filtradas.forEach(function (m) { gridWrap.appendChild(buildMateriaCard(m)); });
      var addCard = el('button', 'materia-add');
      addCard.type = 'button';
      addCard.innerHTML = '<div class="plus">+</div><span>Agregá otra materia</span>';
      addCard.addEventListener('click', function () { openMateriaModal(null); });
      gridWrap.appendChild(addCard);
    } else {
      var tbody = document.getElementById('materias-table');
      clear(tbody);
      filtradas.forEach(function (m) {
        var row = tpl('materia-table-row');
        qf(row, 'dot').setAttribute('style', dotStyle(m.strong, '50%'));
        qf(row, 'nombre').textContent = m.nombre;
        qf(row, 'doc').textContent = m.doc;
        qf(row, 'notaTxt').textContent = m.notaTxt + '/' + val(m.esc.aprob, m.esc);
        var b = qf(row, 'badge'); b.setAttribute('style', badgeStyle(ESTADO_TONE[m.estado])); b.textContent = m.badgeLabel;
        makeRowClickable(row, function () { location.hash = '#materia-' + m.id; }, 'Ver materia ' + m.nombre);
        tbody.appendChild(row);
      });
    }
  }

  function buildMateriaCard(m) {
    var node = tpl('materia-card');
    var tile = qf(node, 'tile'); tile.style.background = tileGradient(m.colorId); tile.textContent = materiaAbrev(m.nombre);
    var badge = qf(node, 'badge'); badge.setAttribute('style', badgeStyle(ESTADO_TONE[m.estado])); badge.textContent = m.badgeLabel;
    qf(node, 'nombre').textContent = m.nombre;
    qf(node, 'doc').textContent = m.doc;
    qf(node, 'ring').setAttribute('style', ringStyle(m.actual, TONE[m.tone], 56, m.esc.total));
    var inner = qf(node, 'ringInner'); inner.setAttribute('style', ringInnerStyle(56, 6));
    var v = el('span', 'ring-val mono'); v.style.fontSize = '14px'; v.textContent = m.notaTxt;
    inner.appendChild(v);
    qf(node, 'salon').textContent = m.salon || 'Sin salón asignado';
    qf(node, 'horario').textContent = m.horario;
    // Bloque 2: "exonera con Y" sólo si la materia define exoneración.
    qf(node, 'escalaTxt').textContent = m.escalaTxt + ' · aprueba ' + m.aprobTxt + (m.exonTxt ? ' · exonera con ' + m.exonTxt : '');
    qf(node, 'toneDot').setAttribute('style', dotStyle(TONE[m.tone], '50%'));
    makeRowClickable(node, function () { location.hash = '#materia-' + m.id; }, 'Ver materia ' + m.nombre);
    return node;
  }

  // ================================================================
  // DETALLE
  // ================================================================
  // Puntos fijos del curso (sin fecha, ej. "Participación en clase") — no
  // viven en agenda (no hay ningún hito al que atarlos, ver
  // wizReconciliarMateriasCreadas), así que se editan directo acá y se
  // guardan como parte de la materia, no como una evaluación más.
  function renderDetalleFijos(m) {
    var wrap = document.getElementById('detalle-fijos');
    var list = document.getElementById('detalle-fijos-list');
    var componentes = m.componentesFijos || [];
    wrap.classList.toggle('hidden', !componentes.length);
    clear(list);
    componentes.forEach(function (c, idx) {
      var node = tpl('fijo-row');
      qf(node, 'label').textContent = c.titulo;
      var input = qf(node, 'input');
      input.max = String(c.puntajeMax);
      input.value = c.valor != null ? String(c.valor) : '';
      input.setAttribute('aria-label', 'Puntos de ' + c.titulo);
      qf(node, 'max').textContent = '/ ' + c.puntajeMax + ' pts';
      input.addEventListener('change', async function () {
        var v = input.value.trim() === '' ? null : Math.max(0, Math.min(Number(input.value), c.puntajeMax));
        input.value = v != null ? String(v) : '';
        var arr = loadMateriasRaw().map(function (x) {
          if (x.id !== m.id) return x;
          var nuevos = (x.componentesFijos || []).map(function (cc, i2) { return i2 === idx ? Object.assign({}, cc, { valor: v }) : cc; });
          return Object.assign({}, x, { componentesFijos: nuevos });
        });
        if (!(await saveMateriasRaw(arr))) { avisarError(); return; }
        renderDetalle(m.id);
      });
      list.appendChild(node);
    });
  }

  function renderDetalle(id) {
    var m = computeMateriaById(id);
    if (!m) { location.hash = '#materias'; return; }
    document.getElementById('detalle-crumb').textContent = m.nombre;
    var av = document.getElementById('detalle-avatar');
    av.style.background = tileGradient(m.colorId);
    av.textContent = materiaAbrev(m.nombre);
    document.getElementById('detalle-nombre').textContent = m.nombre;
    var badge = document.getElementById('detalle-estado-badge');
    badge.setAttribute('style', badgeStyle(ESTADO_TONE[m.estado])); badge.textContent = m.badgeLabel;
    document.getElementById('detalle-meta').textContent = m.doc + ' · ' + m.escalaTxt.toLowerCase();
    document.getElementById('detalle-salon').textContent = m.salon || 'Sin salón asignado';
    document.getElementById('detalle-cursada').textContent = m.horario;

    var escBadge = document.getElementById('detalle-escala-badge'); escBadge.textContent = m.escalaTxt;
    // Trazo más grueso en mobile (dirección Pro Edition, "ring reforzado")
    // — mismo diámetro, sólo cambia el grosor del anillo.
    var ringThick = esMobile() ? 16 : 13;
    document.getElementById('detalle-ring').setAttribute('style', ringStyle(m.actual, TONE[m.tone], 140, m.esc.total));
    var ringInner = document.getElementById('detalle-ring-inner');
    ringInner.setAttribute('style', ringInnerStyle(140, ringThick));
    clear(ringInner);
    var v1 = el('span'); v1.className = 'mono'; v1.style.cssText = 'font-size:34px;font-weight:600;line-height:1'; v1.textContent = m.notaTxt;
    var v2 = el('span'); v2.className = 'mono'; v2.style.cssText = 'font-size:11px;color:var(--c-ink3)'; v2.textContent = 'aprueba ' + m.aprobTxt;
    ringInner.appendChild(v1); ringInner.appendChild(v2);
    // Bloque 2: umbral de exoneración, en su propia línea para no
    // amontonar todo en el subtítulo del anillo.
    if (m.exonTxt) {
      var v3 = el('span'); v3.className = 'mono'; v3.style.cssText = 'font-size:11px;color:var(--c-ink3)'; v3.textContent = 'exonera ' + m.exonTxt;
      ringInner.appendChild(v3);
    }

    var notasList = document.getElementById('detalle-notas-list');
    clear(notasList);
    m.notasEvals.forEach(function (a) {
      var node = tpl('nota-row');
      node.title = 'Editar esta evaluación';
      qf(node, 'label').textContent = truncate(a.titulo, 28);
      qf(node, 'barFill').setAttribute('style', css({ width: ((a.nota / m.esc.total) * 100) + '%', height: '100%', borderRadius: '3px', background: m.strong }));
      qf(node, 'val').textContent = valU(a.nota, m.esc);
      makeRowClickable(node, function () { openEvaluacionModal({ editId: a.id }); }, 'Editar nota de ' + a.titulo);
      notasList.appendChild(node);
    });
    if (!m.notasEvals.length) {
      var pend = el('div'); pend.style.cssText = 'font-size:13px;color:var(--c-ink3)'; pend.textContent = 'Todavía no cargaste notas.';
      notasList.appendChild(pend);
    }

    var callout = document.getElementById('detalle-callout');
    callout.setAttribute('style', css({ display: 'flex', flexDirection: 'column', gap: '5px', padding: '14px 16px', borderRadius: '12px', background: rgba(TONE[m.tone], .09), border: '1px solid ' + rgba(TONE[m.tone], .3) }));
    var count = (m.parciales || []).length;
    if (m.estado === 'aprobada') {
      document.getElementById('detalle-callout-t').textContent = 'Ya aprobaste esta materia';
      document.getElementById('detalle-callout-s').textContent = 'Se calificó por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprobaba con ' + m.aprobTxt + '.';
    } else if (m.estado === 'pendiente' && !count) {
      // "Debo rendir examen": la cursaste pero todavía falta el examen. Sin
      // esta rama caía en la genérica "Todavía no cargaste notas" — cierta,
      // pero no decía que cargar la nota acá (con "Cargar nota") resuelve el
      // estado solo (ver hook en el submit de #form-evaluacion): si llega al
      // mínimo pasa a Aprobada, si no, sigue Pendiente para volver a rendir.
      document.getElementById('detalle-callout-t').textContent = 'Debés rendir examen';
      document.getElementById('detalle-callout-s').textContent = 'Cursaste esta materia pero todavía te falta el examen. El examen aprueba con ' + m.aprobTxt + ' (el mínimo de la cursada ya quedó atrás). Cargá la nota del examen con "Cargar nota" — si llega al mínimo, la materia pasa a Aprobada sola; si no, seguís figurando como pendiente para volver a rendir.';
    } else if (!count) {
      document.getElementById('detalle-callout-t').textContent = 'Todavía no cargaste notas';
      // Bloque 2: el estado vacío es el único lugar que hoy no informaba
      // ningún umbral — acá van los dos, aprobación y (si aplica) exoneración.
      document.getElementById('detalle-callout-s').textContent = 'Esta materia se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '.' + (m.exonTxt ? ' Exonera con ' + m.exonTxt + '.' : '') + ' Agregá tu primer parcial para ver la proyección.';
    } else if (m.actual >= m.esc.aprob) {
      document.getElementById('detalle-callout-t').textContent = m.tone === 'warning' ? 'Vas aprobando, pero raspando' : 'Vas aprobando esta materia';
      document.getElementById('detalle-callout-s').textContent = 'Esta materia se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '. Con ' + count + (count === 1 ? ' nota cargada' : ' notas cargadas') + ' tu promedio es ' + valU(m.actual, m.esc) + ', por encima del mínimo.';
    } else {
      document.getElementById('detalle-callout-t').textContent = 'Te faltan ' + valU(m.necesita, m.esc) + ' para llegar a la aprobación';
      document.getElementById('detalle-callout-s').textContent = 'Esta materia se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '. Con ' + count + (count === 1 ? ' nota cargada' : ' notas cargadas') + ' tu promedio es ' + valU(m.actual, m.esc) + ', así que te faltan ' + valU(m.necesita, m.esc) + ' para llegar al mínimo.';
    }

    renderDetalleFijos(m);

    // Fase 1: m.items = tareas + evaluaciones de esta materia (todo lo que
    // aparecía acá antes de separar los kinds) — m.evaluaciones quedó
    // reservado para el promedio/simulador (sólo kind==='evaluacion').
    var evals = m.items;
    document.getElementById('detalle-eval-count').textContent = evals.length + (evals.length === 1 ? ' ítem' : ' ítems');
    var evalList = document.getElementById('detalle-eval-list');
    clear(evalList);
    var t = today();
    // Fase 6: completadas al fondo, en su propia sección colapsable — igual
    // que en Agenda (buildCompletadasSection), no una lista aparte.
    var pendientesEvals = evals.filter(function (a) { return !a.hecho; });
    var completadasEvals = evals.filter(function (a) { return a.hecho; });
    evalList.appendChild(buildEvalRowsList(pendientesEvals, m, t));
    if (completadasEvals.length) evalList.appendChild(buildCompletadasSection('detalle-' + m.id, completadasEvals.length, buildEvalRowsList(completadasEvals, m, t)));

    var miniDays = document.getElementById('detalle-mini-days');
    clear(miniDays);
    var byDia = {};
    (m.bloques || []).forEach(function (b) { byDia[b.dia] = b; });
    DIAS_BLOQUE.forEach(function (label, i) {
      var node = tpl('mini-day');
      qf(node, 'dia').textContent = label;
      var b = byDia[i + 1];
      var box = qf(node, 'box');
      if (b) {
        box.textContent = horaTexto(b.ini) + '–' + horaTexto(b.fin) + (m.salon ? ' · ' + m.salon.replace('Edificio ', '') : '');
        box.setAttribute('style', css({ height: '54px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: '11px', fontWeight: 600, textAlign: 'center', padding: '0 8px', background: m.soft, color: m.strong, border: '1px solid ' + rgba(m.strong, .28) }));
      } else {
        box.textContent = '';
      }
      miniDays.appendChild(node);
    });

    document.getElementById('btn-detalle-editar').onclick = function () { openMateriaModal(m.id); };
    document.getElementById('btn-detalle-nueva-eval').onclick = function () { openEvaluacionModal({ materiaId: m.id, kind: 'evaluacion' }); };
    document.getElementById('btn-detalle-nueva-tarea').onclick = function () { openEvaluacionModal({ materiaId: m.id, kind: 'tarea' }); };
    // "Debo rendir examen": acá "Cargar nota" es literalmente "cargar la
    // nota del examen" — el mini-modal dedicado (ver
    // abrirCargarNotaExamenModal), no el form completo de "Nueva
    // evaluación" (título/fecha/tipo/etiqueta, pensado para llevar la
    // agenda de parciales, no para esto). El resto de los estados sigue
    // yendo al form completo — ahí sí puede haber más de una evaluación
    // por materia.
    document.getElementById('btn-detalle-cargar-nota').onclick = m.estado === 'pendiente'
      ? function () { abrirCargarNotaExamenModal(m.id); }
      : function () { openEvaluacionModal({ materiaId: m.id, kind: 'evaluacion', modoNota: true }); };
    document.getElementById('btn-detalle-escala').onclick = function () { openMateriaModal(m.id); };
    renderDetalleSimulador(m);
  }

  // Fase 6: extraído de renderDetalle para reusarlo en la sección
  // "Completadas" colapsable — misma fila (eval-row), sin repetir tick/
  // swipe/click.
  function buildEvalRowsList(items, m, t) {
    var list = el('div', 'eval-list');
    items.forEach(function (a) {
      var node = tpl('eval-row');
      node.title = 'Editar este ítem';
      wireTickButton(qf(node, 'check'), a);
      var titulo = qf(node, 'titulo'); titulo.textContent = a.titulo; titulo.classList.toggle('done', !!a.hecho);
      qf(node, 'metaTxt').textContent = a.tipo + ' · ' + formatFechaAgenda(a.fecha, a.hora) + (a.nota != null ? ' · ' + valU(a.nota, m.esc) : '');
      renderTagChipInto(qf(node, 'tag'), a.tagId);
      var info = agendaBadgeInfo(a, t);
      var b = qf(node, 'badge'); b.setAttribute('style', badgeStyle(info.tone)); b.textContent = info.label;
      makeRowClickable(node, function () { openEvaluacionModal({ editId: a.id }); }, 'Editar ' + a.titulo);
      // Swipe para marcar entregado, sin long-press acá: ya estás en el
      // detalle de la materia, y editar/eliminar ya están a un toque
      // (la fila abre el modal, que tiene su propio botón de eliminar).
      attachSwipeToComplete(node, function () { toggleAgendaHecho(a.id, true); });
      list.appendChild(node);
    });
    return list;
  }

  // ----------------------------------------------------------------
  // Simulador de escenario (Detalle de materia) — un slider por evaluación
  // sin nota, promedio en vivo con la MISMA fórmula de computeMateria()
  // (promedio simple sin ponderar) y la misma toneDe() para clasificarlo.
  // Todo el estado (valores de los sliders, si la sección está abierta)
  // vive en variables de closure de renderDetalleSimulador — no hay ningún
  // var module-level acá: renderRoute() no destruye el DOM de #detalle al
  // navegar (sólo lo esconde), así que sin esto el estado viejo sobreviviría
  // entre materias. Arranca colapsado en cada llamada — cambiar de materia,
  // recargar la nota real, o cualquier otro motivo de re-render vuelve
  // siempre a "colapsada por default". Nunca llama a saveAgendaRaw() ni
  // toca `agenda` — es sólo una previsualización, no se guarda.
  function pintarRangeFill(range) {
    var min = Number(range.min), max = Number(range.max), value = Number(range.value);
    var pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
    range.style.background = 'linear-gradient(to right, var(--c-accent) 0%, var(--c-accent) ' + pct + '%, var(--c-line) ' + pct + '%, var(--c-line) 100%)';
  }
  // La matemática en sí vive en calcularSimulacion() (src/simulador.js,
  // función pura, testeada aparte con `npm run test:sim`) — acá sólo se
  // arma el estado de los sliders y se pinta el resultado.
  function recalcularSimulacion(m, evaluaciones, valores) {
    var r = calcularSimulacion(m.esc, evaluaciones, valores, m.componentesFijos);
    var tone = r.asegurado ? 'success' : (r.imposible ? 'danger' : (r.faltanAprobacion === 0 ? 'success' : 'warning'));
    document.getElementById('detalle-sim-ring').setAttribute('style', ringStyle(r.puntosProyectados, TONE[tone], 72, r.total || 1));
    var ringInner = document.getElementById('detalle-sim-ring-inner');
    ringInner.setAttribute('style', ringInnerStyle(72, 8));
    clear(ringInner);
    var v = el('span'); v.className = 'mono'; v.style.cssText = 'font-size:17px;font-weight:600;line-height:1'; v.textContent = val(r.puntosProyectados, m.esc);
    ringInner.appendChild(v);

    document.getElementById('detalle-sim-stat-reales').textContent = valU(r.puntosReales, m.esc);
    document.getElementById('detalle-sim-stat-disponibles').textContent = valU(r.disponibles, m.esc);
    document.getElementById('detalle-sim-stat-proyectado').textContent = valU(r.puntosProyectados, m.esc) + ' / ' + valU(r.total, m.esc);

    document.getElementById('detalle-sim-texto').textContent = r.asegurado
      ? 'Ya asegurada la aprobación con lo que ya tenés, pase lo que pase en el resto.'
      : r.imposible
        ? 'Con lo que ya tenés y lo máximo que falta, ya no es matemáticamente posible aprobar.'
        : r.faltanAprobacion === 0
          ? 'Con este escenario, llegás a ' + valU(r.puntosProyectados, m.esc) + ' — aprobarías.'
          : 'Con este escenario, te faltan ' + valU(r.faltanAprobacion, m.esc) + ' para aprobar (' + valU(r.aprob, m.esc) + ').';

    // Bloque 3: el aviso de acá abajo es sólo de APROBACIÓN — el de
    // exoneración vive aparte (detalle-sim-aviso-exoneracion, más abajo),
    // siempre visible si la materia la define, no escondido adentro de
    // este cuando ya está asegurada la aprobación.
    var aviso = document.getElementById('detalle-sim-aviso');
    if (r.asegurado) {
      aviso.classList.remove('hidden');
      aviso.setAttribute('style', css({ background: rgba(TONE.success, .09), border: '1px solid ' + rgba(TONE.success, .3) }));
      aviso.textContent = 'Aprobación asegurada con lo que ya tenés.';
    } else if (r.imposible) {
      aviso.classList.remove('hidden');
      aviso.setAttribute('style', css({ background: rgba(TONE.danger, .09), border: '1px solid ' + rgba(TONE.danger, .3) }));
      aviso.textContent = 'Objetivo imposible: incluso sacando el máximo en todo lo que falta, no se llega a ' + valU(r.aprob, m.esc) + '.';
    } else if (r.promedioNecesario != null) {
      aviso.classList.remove('hidden');
      aviso.setAttribute('style', css({ background: rgba(TONE.warning, .09), border: '1px solid ' + rgba(TONE.warning, .3) }));
      aviso.textContent = 'Necesitás promediar ' + valU(r.promedioNecesario, m.esc) + ' en las evaluaciones que faltan para llegar al mínimo.';
    } else {
      aviso.classList.add('hidden');
    }

    // Bloque 3: resultado de exoneración, siempre visible (mientras la
    // materia la defina) y diferenciado del de aprobación de arriba —
    // antes sólo aparecía metido en el aviso de "aprobación asegurada", y
    // "cuánto falta" podía mostrar un número que ya no entraba en el techo.
    var avisoExon = document.getElementById('detalle-sim-aviso-exoneracion');
    if (r.exoneracion == null) {
      avisoExon.classList.add('hidden');
    } else {
      avisoExon.classList.remove('hidden');
      if (r.exonerado) {
        avisoExon.setAttribute('style', css({ background: rgba(TONE.success, .09), border: '1px solid ' + rgba(TONE.success, .3) }));
        avisoExon.textContent = 'Exoneración asegurada con lo que ya tenés (' + valU(r.exoneracion, m.esc) + ').';
      } else if (r.imposibleExonerar) {
        avisoExon.setAttribute('style', css({ background: rgba(TONE.danger, .09), border: '1px solid ' + rgba(TONE.danger, .3) }));
        avisoExon.textContent = 'Exonerar ya no es matemáticamente posible: incluso sacando el máximo en todo lo que falta, no se llega a ' + valU(r.exoneracion, m.esc) + '.';
      } else {
        avisoExon.setAttribute('style', css({ background: rgba(TONE.warning, .09), border: '1px solid ' + rgba(TONE.warning, .3) }));
        avisoExon.textContent = 'Con este escenario, te faltan ' + valU(r.faltanExoneracion, m.esc) + ' para exonerar (' + valU(r.exoneracion, m.esc) + ').';
      }
    }

    var escAviso = document.getElementById('detalle-sim-escala-aviso');
    escAviso.classList.toggle('hidden', !r.escalaInconsistente);
    if (r.escalaInconsistente) escAviso.textContent = 'Ojo: la suma de notas máximas de las evaluaciones no coincide con el total de la materia (' + valU(m.esc.total, m.esc) + ').';
  }
  function renderDetalleSimulador(m) {
    // m.evaluaciones ya viene filtrado a kind==='evaluacion' (Fase 1) — acá
    // entran TODAS (con nota real o no, Fase 2), no sólo las pendientes.
    var evaluaciones = m.evaluaciones;
    var toggleBtn = document.getElementById('btn-detalle-sim-toggle');
    var panel = document.getElementById('detalle-sim');
    // Con evaluaciones vacías pero puntos fijos pendientes (p. ej. una
    // materia recién armada por el catálogo que sólo tiene "Participación
    // en clase" sin ninguna fecha todavía) igual hay algo que simular.
    if (!evaluaciones.length && !(m.componentesFijos || []).length) {
      toggleBtn.classList.add('hidden');
      panel.classList.add('hidden');
      return;
    }
    toggleBtn.classList.remove('hidden');
    panel.classList.add('hidden'); // colapsada por default en cada render

    var valores = {}; // itemId (evaluación o componente fijo) -> valor simulado actual del slider
    var slidersWrap = document.getElementById('detalle-sim-sliders');
    clear(slidersWrap);
    var step = m.esc.tipo === 'nota' ? 0.5 : 1;
    var filas = [];
    // Bloque 3: un slider por cada ítem simulable del esquema de
    // evaluación — evaluaciones (con fecha en agenda) Y componentes fijos
    // sin fecha (participación en clase, etc.) que todavía no tienen un
    // valor real cargado. Un fijo con valor ya cargado no tiene slider acá
    // (no hay nada que simular — ver renderDetalleFijos, se edita directo).
    function armarSliderRow(item, notaMaxima, notaReal) {
      var node = tpl('sim-slider-row');
      qf(node, 'label').textContent = truncate(item.titulo, 24);
      var tag = qf(node, 'tag');
      var range = qf(node, 'range');
      range.min = '0'; range.max = String(notaMaxima || 0); range.step = String(step);
      range.setAttribute('aria-label', 'Nota simulada para ' + item.titulo);
      var valSpan = qf(node, 'val');
      filas.push({ id: item.id, range: range, valSpan: valSpan, tag: tag, nota: notaReal });
      range.addEventListener('input', function () {
        valores[item.id] = Number(range.value);
        // Tocar el slider de un ítem ya calificado lo pasa a "Simulado" —
        // a partir de ahí está explorando un escenario distinto al real.
        tag.textContent = 'Simulado';
        valSpan.textContent = valU(valores[item.id], m.esc);
        pintarRangeFill(range);
        recalcularSimulacion(m, evaluaciones, valores);
      });
      slidersWrap.appendChild(node);
    }
    evaluaciones.forEach(function (a) { armarSliderRow(a, a.notaMaxima, a.nota); });
    var fijosSimulables = (m.componentesFijos || []).filter(function (c) { return c.valor == null; });
    fijosSimulables.forEach(function (c) { armarSliderRow(c, c.puntajeMax, null); });

    // Punto de partida de cada slider: la nota real si ya tiene una, si no
    // el mínimo de aprobación de la materia acotado a la nota_maxima de esa
    // fila (antes era un solo valor global — m.esc.aprob — pero ahora cada
    // evaluación puede tener su propio techo, así que hay que acotarlo por
    // fila para no arrancar un slider más allá de su propio máximo).
    function reiniciar() {
      filas.forEach(function (f) {
        var max = Number(f.range.max) || 0;
        valores[f.id] = f.nota != null ? f.nota : Math.min(m.esc.aprob, max);
        f.range.value = String(valores[f.id]);
        f.tag.textContent = f.nota != null ? 'Real' : 'Simulado';
        f.valSpan.textContent = valU(valores[f.id], m.esc);
        pintarRangeFill(f.range);
      });
      recalcularSimulacion(m, evaluaciones, valores);
    }
    reiniciar();

    toggleBtn.onclick = function () {
      var abrir = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !abrir);
      if (!abrir) reiniciar(); // se está colapsando: reinicia, como pide el alcance
    };
    document.getElementById('btn-detalle-sim-reset').onclick = reiniciar;
  }

  async function toggleAgendaHecho(id, hecho) {
    var arr = loadAgendaRaw();
    arr.forEach(function (a) { if (a.id === id) a.hecho = hecho; });
    var ok = await saveAgendaRaw(arr);
    if (!ok) avisarError();
    renderRoute();
  }
  // Misma acción que "Eliminar" del modal de evaluación (runtime.js, botón
  // btn-evaluacion-eliminar) pero standalone: la del modal depende de
  // STATE.editing.evaluacionId (sólo tiene sentido con el modal abierto),
  // acá no hay modal de por medio.
  async function eliminarEvaluacionId(id) {
    var item = agendaRawById(id);
    if (!confirm('¿Eliminar esta ' + (item && item.kind === 'tarea' ? 'tarea' : 'evaluación') + '?')) return;
    // Antes de borrar de Supabase: sync-google-event necesita leer la fila
    // (para el google_event_id) — llamado después, ya no la encontraría.
    await syncToGoogleCalendar('delete', 'agenda', id);
    var ok = await saveAgendaRaw(loadAgendaRaw().filter(function (a) { return a.id !== id; }));
    if (!ok) avisarError();
    renderRoute();
  }

  // Misma acción que "Eliminar" del modal de materia (botón
  // btn-materia-eliminar) pero standalone, para poder borrar una materia
  // "Aprobada"/"Pendiente" sin nota desde los paneles de carga rápida de
  // nota (Progreso y Ajustes) — esas materias suelen venir del paso
  // "progreso" del wizard y, si se tildaron mal (materia equivocada, o el
  // usuario no la había cursado en realidad), antes no había forma de
  // sacarlas salvo cargándoles una nota igual. Confirma con nombre propio
  // (a diferencia del genérico "¿Eliminar esta materia?" del modal) porque
  // acá se llega sin haber abierto la materia primero — sin el nombre en el
  // mensaje, no queda claro cuál se está por borrar.
  async function eliminarMateriaId(id) {
    var m = materiaRawById(id);
    if (!m) return false;
    if (!confirm('¿Eliminar "' + m.nombre + '"? También se van a borrar sus evaluaciones de la agenda.')) return false;
    var idsAgendaBorrados = loadAgendaRaw().filter(function (a) { return a.materiaId === id; }).map(function (a) { return a.id; });
    for (var i = 0; i < idsAgendaBorrados.length; i++) await syncToGoogleCalendar('delete', 'agenda', idsAgendaBorrados[i]);
    var okMat = await saveMateriasRaw(loadMateriasRaw().filter(function (x) { return x.id !== id; }));
    var okAg = await saveAgendaRaw(loadAgendaRaw().filter(function (a) { return a.materiaId !== id; }));
    if (!okMat || !okAg) { avisarError(); return false; }
    return true;
  }

  // ---- Mobile: swipe para marcar entregado + long-press para menú
  // contextual. Sin ningún touchstart/swipe previo en el repo — gestos
  // nuevos de punta a punta. Pointer Events (no touchstart/touchmove) para
  // que funcione igual con touch y con mouse (útil para probarlo acá
  // mismo con el navegador de este entorno).
  var SWIPE_THRESHOLD = 72, SWIPE_VELOCITY = .11, LONGPRESS_MS = 500;
  function attachSwipeToComplete(swipeRowEl, onComplete, onLongPress) {
    var startX = 0, startY = 0, startT = 0, dragging = false, moved = false, pressTimer = null;
    function reset() {
      swipeRowEl.classList.remove('is-dragging', 'is-armed');
      swipeRowEl.style.setProperty('--sx', 0);
    }
    swipeRowEl.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX; startY = e.clientY; startT = Date.now(); dragging = false; moved = false;
      if (onLongPress) {
        pressTimer = setTimeout(function () {
          if (moved) return;
          swipeRowEl.classList.add('is-pressed');
          onLongPress();
        }, LONGPRESS_MS);
      }
    });
    swipeRowEl.addEventListener('pointermove', function (e) {
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { moved = true; clearTimeout(pressTimer); }
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { dragging = true; swipeRowEl.classList.add('is-dragging'); }
      if (!dragging) return;
      var sx = Math.max(0, -dx); // el fondo "✓ Listo" está a la derecha: sólo arrastrar hacia la izquierda arma
      swipeRowEl.style.setProperty('--sx', sx);
      swipeRowEl.classList.toggle('is-armed', sx > SWIPE_THRESHOLD);
    });
    swipeRowEl.addEventListener('pointerup', function (e) {
      clearTimeout(pressTimer);
      if (!dragging) { reset(); return; }
      var dt = Math.max(Date.now() - startT, 1);
      var sx = Math.max(0, -(e.clientX - startX));
      var velocidad = sx / dt;
      swipeRowEl.classList.remove('is-dragging');
      if (sx > SWIPE_THRESHOLD || velocidad > SWIPE_VELOCITY) { swipeRowEl.style.setProperty('--sx', 320); onComplete(); }
      else { reset(); }
    });
    swipeRowEl.addEventListener('pointercancel', reset);
  }
  // Sólo para filas de Agenda (no las evaluaciones del detalle de materia:
  // ahí "ver la materia" no suma nada, ya estás en ella, y editar/eliminar
  // ya están a un toque via el modal) — reasigna las 4 acciones del
  // row-menu compartido a la fila actual cada vez que se abre.
  function wireRowMenuActions(item) {
    document.getElementById('row-menu-editar').onclick = function () { closeRowMenu(); openEvaluacionModal({ editId: item.id }); };
    document.getElementById('row-menu-entregado').onclick = function () { closeRowMenu(); toggleAgendaHecho(item.id, true); };
    document.getElementById('row-menu-materia').onclick = function () { closeRowMenu(); if (item.materiaId) location.hash = '#materia-' + item.materiaId; };
    document.getElementById('row-menu-eliminar').onclick = function () { closeRowMenu(); eliminarEvaluacionId(item.id); };
  }

  // ================================================================
  // AGENDA
  // ================================================================
  function agendaEntries() {
    var out = [];
    // itemKind (tarea/evaluacion, agenda.kind) no puede llamarse `kind` acá:
    // ese nombre ya lo usa esta función para el origen de la fila
    // (materia/personal) — ver README, Fase 1.
    loadAgendaRaw().forEach(function (a) { out.push({ kind: 'materia', itemKind: a.kind, id: a.id, materiaId: a.materiaId, tipo: a.tipo, titulo: a.titulo, fecha: a.fecha, hora: a.hora, hecho: a.hecho, nota: a.nota, notaMaxima: a.notaMaxima, tagId: a.tagId }); });
    if (STATE.mostrarPersonales) loadPersonalRaw().forEach(function (p) { out.push({ kind: 'personal', id: p.id, tipo: 'Evento personal', titulo: p.titulo, fecha: p.fecha, hora: p.todoElDia ? '' : p.hora, hecho: false, todoElDia: p.todoElDia, tagId: p.tagId }); });
    return out;
  }

  function renderAgenda() {
    syncStateToURL();
    var t = today();
    var materiaSel = document.getElementById('agenda-filtro-materia');
    var prevVal = STATE.agendaFiltroMateria;
    clear(materiaSel);
    var optTodas = el('option'); optTodas.value = ''; optTodas.textContent = 'Todas las materias'; materiaSel.appendChild(optTodas);
    // Bloque 1: acotado al semestre activo (antes listaba materias de
    // cualquier semestre) — el resto de los filtros de Agenda queda igual.
    computeMateriasDelActivo().forEach(function (m) { var o = el('option'); o.value = m.id; o.textContent = m.nombre; materiaSel.appendChild(o); });
    materiaSel.value = prevVal;
    materiaSel.onchange = function () { STATE.agendaFiltroMateria = materiaSel.value; renderAgenda(); };
    document.getElementById('agenda-filtro-estado').value = STATE.agendaFiltroEstado;
    document.getElementById('agenda-filtro-estado').onchange = function (e) { STATE.agendaFiltroEstado = e.target.value; renderAgenda(); };

    // Fase 1: filtro por kind (tarea/evaluación), no por tipo libre — antes
    // filtraba por TIPOS_EVAL (Parcial/Final/...), que ya no representa
    // "todo lo que puede aparecer en agenda" ahora que las tareas no tienen
    // un tipo preestablecido.
    var kindValues = [['', 'Todo'], ['evaluacion', 'Evaluaciones'], ['tarea', 'Tareas']];
    var filtrosNode = document.getElementById('agenda-filtros');
    clear(filtrosNode);
    kindValues.forEach(function (kv) {
      var node = tpl('filtro-pill');
      node.classList.toggle('is-on', STATE.agendaFiltroKind === kv[0]);
      qf(node, 'label').textContent = kv[1];
      node.addEventListener('click', function () { STATE.agendaFiltroKind = kv[0]; renderAgenda(); });
      filtrosNode.appendChild(node);
    });

    var agendaSearchInput = document.getElementById('agenda-search');
    if (agendaSearchInput.value !== STATE.agendaQuery) agendaSearchInput.value = STATE.agendaQuery;
    var aq = STATE.agendaQuery.trim().toLowerCase();
    var entries = agendaEntries().filter(function (e) {
      if (STATE.agendaFiltroKind && e.itemKind !== STATE.agendaFiltroKind) return false;
      if (STATE.agendaFiltroMateria && e.materiaId !== STATE.agendaFiltroMateria) return false;
      if (STATE.agendaFiltroEstado === 'pendiente' && e.hecho) return false;
      if (STATE.agendaFiltroEstado === 'hecho' && !e.hecho) return false;
      if (aq) {
        var nombreMateria = e.materiaId ? materiaNombre(e.materiaId) : 'personal';
        if ((e.titulo + ' ' + nombreMateria + ' ' + e.tipo).toLowerCase().indexOf(aq) < 0) return false;
      }
      return true;
    });

    // Fase 6: las completadas se sacan de Vencidas/Esta semana/Próximamente
    // y van a su propia sección al fondo — salvo que el filtro de estado ya
    // esté puesto en "Hecho" a propósito, ahí no tiene sentido re-agruparlas
    // aparte (es lo único que se está pidiendo ver).
    var separarCompletadas = STATE.agendaFiltroEstado !== 'hecho';
    var pendientesEntries = separarCompletadas ? entries.filter(function (e) { return !e.hecho; }) : entries;
    var completadasEntries = separarCompletadas ? entries.filter(function (e) { return e.hecho; }) : [];

    var vencidas = [], estaSemana = [], proximamente = [];
    pendientesEntries.forEach(function (e) {
      var d = parseISODate(e.fecha);
      var diff = diffDias(d, t);
      if (diff < 0) vencidas.push(e); else if (diff <= 6) estaSemana.push(e); else proximamente.push(e);
    });
    var sortFn = function (a, b) { return parseISODate(a.fecha) - parseISODate(b.fecha) || (a.hora || '').localeCompare(b.hora || ''); };
    vencidas.sort(sortFn); estaSemana.sort(sortFn); proximamente.sort(sortFn); completadasEntries.sort(sortFn);

    document.getElementById('agenda-count').textContent = entries.length + (entries.length === 1 ? ' ítem' : ' ítems') + (vencidas.length ? ' · ' + vencidas.length + (vencidas.length === 1 ? ' vencido' : ' vencidos') : '');

    var groupsNode = document.getElementById('agenda-groups');
    clear(groupsNode);
    // Con un filtro de materia activo todas las filas son de esa misma
    // materia — repetir su chip en cada una es la info redundante del
    // feedback ("mucha info al pepe"); ya se sabe de qué materia es por el
    // selector de arriba.
    var ocultarMateriaChip = !!STATE.agendaFiltroMateria;
    [['Vencidas', vencidas, true], ['Esta semana', estaSemana, false], ['Próximamente', proximamente, false]].forEach(function (g) {
      if (!g[1].length) return;
      groupsNode.appendChild(buildAgendaGroup(g[0], g[1], g[2], t, ocultarMateriaChip));
    });
    if (completadasEntries.length) groupsNode.appendChild(buildCompletadasSection('agenda', completadasEntries.length, buildAgendaRowsList(completadasEntries, t, ocultarMateriaChip)));
    if (!entries.length) {
      var empty = el('div'); empty.style.cssText = 'padding:40px 0;text-align:center;color:var(--c-ink3);font-size:14px';
      empty.textContent = 'No hay ítems con estos filtros.';
      groupsNode.appendChild(empty);
    }

    // Bloque 6: "Ver en agenda" (widget "Lo próximo" de Inicio) deja acá el
    // id a resaltar — se consume una sola vez (se limpia apenas se lee) para
    // no volver a scrollear/resaltar en cada re-render posterior de Agenda.
    if (STATE.agendaHighlightId) {
      var highlightId = STATE.agendaHighlightId;
      STATE.agendaHighlightId = null;
      var targetNode = groupsNode.querySelector('[data-agenda-item-id="' + highlightId + '"]');
      if (targetNode) {
        // Si el ítem cayó en "Completadas" (colapsada por default), se
        // despliega la sección primero — si no, scrollIntoView apuntaría a
        // un elemento visualmente recortado por el collapse.
        var collapseOuter = targetNode.closest('.agenda-collapse');
        if (collapseOuter && collapseOuter.classList.contains('is-collapsed')) {
          collapseOuter.classList.remove('is-collapsed');
          var grupoCollapsible = collapseOuter.closest('.agenda-group-collapsible');
          if (grupoCollapsible) grupoCollapsible.classList.remove('is-collapsed');
          setCompletadasCollapsed('agenda', false);
        }
        setTimeout(function () {
          targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetNode.classList.add('is-highlighted');
          setTimeout(function () { targetNode.classList.remove('is-highlighted'); }, 2200);
        }, 50);
      }
    }
  }

  function buildAgendaGroup(titulo, items, danger, t, ocultarMateriaChip) {
    var wrap = el('div', 'agenda-group');
    var head = el('div', 'agenda-group-head');
    var tEl = el('span', 't' + (danger ? ' danger' : '')); tEl.textContent = titulo;
    var n = el('span', 'n'); n.textContent = items.length + (items.length === 1 ? ' ítem' : ' ítems');
    var rule = el('div', 'rule');
    head.appendChild(tEl); head.appendChild(n); head.appendChild(rule);
    // "Próximamente" es el único balde sin techo de tiempo (Vencidas y Esta
    // semana ya están acotadas) — con el semestre cargado entero puede ir de
    // la semana que viene a dentro de tres meses, todo bajo el mismo
    // encabezado. Subdividir por mes ahí adentro (sólo si de verdad hay más
    // de un mes metido) da un punto de referencia para saltar directo a lo
    // que importa en vez de leer las N filas una por una.
    var subagruparPorMes = titulo === 'Próximamente';
    wrap.appendChild(head); wrap.appendChild(buildAgendaRowsList(items, t, ocultarMateriaChip, subagruparPorMes));
    return wrap;
  }
  // Extraído de buildAgendaGroup (Fase 6) para reusarlo en la sección
  // "Completadas" colapsable — misma fila, sin repetir la lógica de tick/
  // swipe/click. ocultarMateriaChip: ver renderAgenda — sólo true cuando ya
  // hay un filtro de materia activo (todas las filas comparten materia).
  // subagruparPorMes: ver buildAgendaGroup — asume `items` ya vienen
  // ordenados por fecha (sortFn en renderAgenda), si no los divisores de mes
  // van a salir desordenados.
  function buildAgendaRowsList(items, t, ocultarMateriaChip, subagruparPorMes) {
    var list = el('div', 'card agenda-list');
    var mesesDistintos = 0, ultimoMesKey = null;
    if (subagruparPorMes) {
      items.forEach(function (item) {
        var d = parseISODate(item.fecha);
        var key = d.getFullYear() + '-' + d.getMonth();
        if (key !== ultimoMesKey) { mesesDistintos++; ultimoMesKey = key; }
      });
      ultimoMesKey = null; // se vuelve a recorrer abajo para insertar los divisores
    }
    items.forEach(function (item) {
      if (subagruparPorMes && mesesDistintos > 1) {
        var d = parseISODate(item.fecha);
        var key = d.getFullYear() + '-' + d.getMonth();
        if (key !== ultimoMesKey) {
          ultimoMesKey = key;
          var nombreMes = MESES_LARGOS[d.getMonth()];
          var divider = el('div', 'agenda-month-divider');
          divider.textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1) + (d.getFullYear() !== t.getFullYear() ? ' ' + d.getFullYear() : '');
          list.appendChild(divider);
        }
      }
      var node = tpl('agenda-row');
      // Bloque 6: ancla para el resaltado/scroll que dispara "Ver en
      // agenda" desde el widget "Lo próximo" de Inicio (ver renderAgenda).
      node.setAttribute('data-agenda-item-id', item.id);
      var check = qf(node, 'check');
      if (item.kind === 'materia') {
        wireTickButton(check, { id: item.id, kind: item.itemKind, hecho: item.hecho, nota: item.nota, notaMaxima: item.notaMaxima, titulo: item.titulo });
      } else {
        check.disabled = true; check.title = 'Los eventos personales no tienen estado de entrega';
      }
      var m = item.materiaId ? computeMateriaById(item.materiaId) : null;
      // El riel sigue el color de materia/personal (misma identidad que
      // el resto de la app: chip, Calendario, Horario) — la etiqueta ya
      // tiene su propio chip con su propio color al lado, no compite acá.
      qf(node, 'bar').setAttribute('style', barColorStyle(m ? m.strong : PERSONAL_COLOR));
      var titleEl = qf(node, 'titulo'); titleEl.textContent = item.titulo; titleEl.classList.toggle('done', !!item.hecho);
      var chip = qf(node, 'chip');
      if (ocultarMateriaChip && m) {
        chip.classList.add('hidden');
      } else {
        chip.classList.remove('hidden');
        chip.setAttribute('style', m ? chipStyle(m.colorId) : personalChipStyle());
        // 16 cortaba nombres reales de materia a la mitad sin relación con
        // el espacio disponible de verdad — el corte fino por ancho real
        // ahora lo hace el CSS (.agenda-meta .chip, ver styles.css), esto
        // sólo pone un techo generoso para no mandar un string gigante al DOM.
        chip.textContent = m ? truncate(m.nombre, 30) : 'Personal';
      }
      qf(node, 'tipo').textContent = item.tipo;
      // Diferenciar evaluación de tarea a simple vista (feedback: "todo muy
      // parecido y mezclado" — antes "Tarea" y "Parcial" tenían exactamente
      // el mismo peso visual). Sólo evaluaciones (Parcial/Final/Examen/etc,
      // ver TIPOS_EVAL) llevan la clase — tareas y eventos personales quedan
      // con el tratamiento neutro de siempre.
      node.querySelector('.agenda-row').classList.toggle('is-evaluacion', item.kind === 'materia' && item.itemKind === 'evaluacion');
      renderTagChipInto(qf(node, 'tag'), item.tagId);
      qf(node, 'fecha').textContent = formatFechaAgenda(item.fecha, item.hora);
      setCountdownEnNodo(qf(node, 'countdown'), item.fecha, item.todoElDia ? '' : item.hora, item.hecho);
      // El badge de estado para un ítem sin hacer (Hoy/Mañana/Esta semana/
      // Pendiente) es el mismo dato que el countdown de al lado, sólo que en
      // texto redondeado a semana en vez de preciso — mostrar los dos era
      // ruido puro (feedback: "demasiada información compitiendo"), no
      // información nueva. El countdown ahora carga solo la urgencia (color,
      // ver setCountdownEnNodo/styles.css) y el badge queda sólo para lo que
      // SÍ es información propia: "Rendido"/"Entregado" cuando ya está hecho,
      // y "Todo el día"/"Personal" para eventos personales (no tienen
      // countdown de por sí relevante del mismo modo).
      var b = qf(node, 'badge');
      if (item.kind === 'materia' && !item.hecho) {
        b.classList.add('hidden');
      } else {
        b.classList.remove('hidden');
        var info = item.kind === 'materia' ? agendaBadgeInfo(item, t) : { tone: 'neutral', label: item.todoElDia ? 'Todo el día' : 'Personal' };
        b.setAttribute('style', badgeStyle(info.tone));
        b.textContent = info.label;
      }
      // El tick ya corta la propagación en su propio click (wireTickButton)
      // — no hace falta comparar ev.target acá.
      makeRowClickable(node, function () {
        if (item.kind === 'materia') openEvaluacionModal({ editId: item.id }); else openPersonalModal({ editId: item.id });
      }, 'Editar ' + item.titulo);
      // Swipe para marcar entregado + long-press para el menú contextual —
      // sólo evaluaciones (kind:'materia'): los eventos personales no
      // tienen "entregado" que marcar (mismo motivo por el que el checkbox
      // de arriba queda disabled para ellos).
      if (item.kind === 'materia') {
        attachSwipeToComplete(node, function () { toggleAgendaHecho(item.id, true); }, function () {
          openRowMenuAt(node);
          wireRowMenuActions(item);
        });
      }
      list.appendChild(node);
    });
    return list;
  }

  // Fase 6: sección "Completadas (n)" colapsable — mismo patrón de
  // localStorage que cursada:theme. Colapsada por default (no debería
  // dominar la vista); se acuerda del estado por scope (agenda/detalle-X)
  // para no compartirlo entre vistas distintas.
  function completadasCollapsedKey(scope) { return 'cursada:completadas-collapsed:' + scope; }
  function isCompletadasCollapsed(scope) {
    try { return localStorage.getItem(completadasCollapsedKey(scope)) !== '0'; } catch (e) { return true; }
  }
  function setCompletadasCollapsed(scope, collapsed) {
    try { localStorage.setItem(completadasCollapsedKey(scope), collapsed ? '1' : '0'); } catch (e) {}
  }

  // Bloque 7: "Ver clases" del Calendario — apagado por default (antes
  // quedaba prendido siempre, aunque el usuario lo hubiera apagado en la
  // sesión anterior) y guardado por usuario, mismo patrón de localStorage
  // que completadasCollapsedKey de acá arriba pero con el id de cuenta en
  // la clave (acá sí importa que no se mezcle entre cuentas en el mismo
  // navegador). cargarMostrarClasesPref() se llama recién con CURRENT_USER
  // ya seteado (ver onSignedIn), así que nunca corre sin id.
  function mostrarClasesKey() { return 'cursada:mostrar-clases:' + CURRENT_USER.id; }
  function cargarMostrarClasesPref() {
    try { return localStorage.getItem(mostrarClasesKey()) === '1'; } catch (e) { return false; }
  }
  function guardarMostrarClasesPref(mostrar) {
    try { localStorage.setItem(mostrarClasesKey(), mostrar ? '1' : '0'); } catch (e) {}
  }
  // `rowsListEl` ya viene armado por el caller (buildAgendaRowsList en
  // Agenda, buildEvalRowsList en Detalle) — esta función sólo pone el
  // encabezado colapsable alrededor, sin saber qué tipo de fila contiene.
  function buildCompletadasSection(scope, count, rowsListEl) {
    var wrap = el('div', 'agenda-group agenda-group-collapsible');
    var collapsed = isCompletadasCollapsed(scope);
    wrap.classList.toggle('is-collapsed', collapsed);
    var head = el('div', 'agenda-group-head is-toggle');
    var chevron = el('span', 'agenda-group-chevron'); chevron.textContent = '▾';
    var tEl = el('span', 't'); tEl.textContent = 'Completadas';
    var n = el('span', 'n'); n.textContent = '(' + count + ')';
    var rule = el('div', 'rule');
    head.appendChild(chevron); head.appendChild(tEl); head.appendChild(n); head.appendChild(rule);
    var collapseOuter = el('div', 'agenda-collapse' + (collapsed ? ' is-collapsed' : ''));
    var collapseInner = el('div', 'agenda-collapse-inner');
    collapseInner.appendChild(rowsListEl);
    collapseOuter.appendChild(collapseInner);
    makeRowClickable(head, function () {
      var abrir = collapseOuter.classList.contains('is-collapsed');
      collapseOuter.classList.toggle('is-collapsed', !abrir);
      wrap.classList.toggle('is-collapsed', !abrir);
      setCompletadasCollapsed(scope, !abrir);
      head.setAttribute('aria-label', (abrir ? 'Ocultar' : 'Mostrar') + ' completadas');
    }, (collapsed ? 'Mostrar' : 'Ocultar') + ' completadas');
    wrap.appendChild(head); wrap.appendChild(collapseOuter);
    return wrap;
  }

  // ================================================================
  // CALENDARIO
  // ================================================================
  function horaAMinutos(hhmm) {
    if (!hhmm) return 0;
    var p = String(hhmm).split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }

  // Fuente única de "qué clases hay el día `dow`", ya filtrada por los
  // toggles del Calendario (Ver clases / materia oculta desde la leyenda).
  // Cada vista (grilla compacta, panel del día) arma su propio formato de
  // salida a partir de estos pares {materia, bloque} — así el filtro no se
  // duplica en dos lugares.
  function clasesDeDiaRaw(dow) {
    if (!STATE.mostrarClases) return [];
    var out = [];
    // Usa el semestre activo: es el patrón semanal "de ahora", no una
    // reconstrucción histórica exacta por fecha (ver README, sección
    // Semestres) — el Calendario puede navegar a meses de semestres viejos
    // sin que estos bloques cambien de fuente.
    computeMateriasDelActivo().forEach(function (m) {
      if (STATE.materiasOcultasCal[m.id]) return;
      (m.bloques || []).forEach(function (b) { if (b.dia === dow) out.push({ materia: m, bloque: b }); });
    });
    return out;
  }

  function clasesDeDia(dow) {
    return clasesDeDiaRaw(dow).map(function (x) {
      // Antes mostraba el código (p. ej. "AM2") en la celda: no aporta nada
      // que el punto de color (ya mapeado 1:1 en "Referencias") no diga, y
      // para quien no se sabe los códigos de memoria es puro ruido — el
      // nombre de la materia es lo que de verdad identifica la clase.
      return { kind: 'clase', materia: x.materia, color: x.materia.strong, label: truncate(x.materia.nombre, 16), horaLabel: horaTexto(x.bloque.ini), sortMin: Math.round(x.bloque.ini * 60) };
    });
  }

  function eventosDeDia(iso) {
    var out = [];
    if (STATE.mostrarEvaluaciones) {
      loadAgendaRaw().forEach(function (a) {
        if (a.fecha !== iso) return;
        if (a.materiaId && STATE.materiasOcultasCal[a.materiaId]) return;
        if (a.materiaId && materiaEsHistorica(a.materiaId)) return;
        var m = computeMateriaById(a.materiaId);
        out.push({ kind: 'materia', item: a, color: m ? m.strong : PERSONAL_COLOR, label: a.titulo, allDay: false, materia: m });
      });
    }
    if (STATE.mostrarPersonales) loadPersonalRaw().forEach(function (p) { if (p.fecha === iso) out.push({ kind: 'personal', item: p, color: PERSONAL_COLOR, label: p.titulo, allDay: !!p.todoElDia }); });
    return out;
  }

  function mondayOf(d) { var dow = designDia(d); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow - 1)); }

  function itemClickHandler(item) {
    return function (evClick) {
      evClick.stopPropagation();
      if (item.kind === 'clase') location.hash = '#materia-' + encodeURIComponent(item.materia.id);
      else if (item.kind === 'materia') openEvaluacionModal({ editId: item.item.id });
      else openPersonalModal({ editId: item.item.id });
    };
  }

  function buildDayCell(d, opts) {
    opts = opts || {};
    var muted = !!opts.muted;
    var iso = toISODate(d);
    var isHoy = iso === todayISO();
    var node = tpl('cal-cell');
    node.classList.toggle('is-muted', muted);
    node.classList.toggle('is-hoy', isHoy);
    node.classList.toggle('is-semana', !!opts.semana);
    node.classList.toggle('is-selected', iso === STATE.calSelected);
    if (isHoy) { var badge = el('span', 'cal-hoy-badge'); badge.textContent = 'HOY'; node.appendChild(badge); }
    var numEl = qf(node, 'num'); numEl.textContent = opts.semana ? (DIAS_CORTOS[d.getDay()] + ' ' + d.getDate()) : String(d.getDate());
    numEl.classList.toggle('is-hoy', isHoy && !muted);
    numEl.classList.toggle('is-muted', muted);
    var eventosNode = qf(node, 'eventos');
    if (!muted) {
      var dow = designDia(d);
      var items = clasesDeDia(dow);
      var allDayBars = [];
      eventosDeDia(iso).forEach(function (ev) {
        if (ev.allDay) { allDayBars.push(ev); return; }
        // Evaluación con materia: "Materia: título" — el título solo no dice
        // de qué materia es (a diferencia de la clase, acá no hay color de
        // leyenda que lo reemplace, cada evaluación es un evento puntual).
        // Personal no tiene materia: el título alcanza.
        var label = (ev.kind === 'materia' && ev.materia) ? (truncate(ev.materia.nombre, 14) + ': ' + ev.label) : ev.label;
        items.push({ kind: ev.kind, item: ev.item, materia: ev.materia, color: ev.color, label: label, horaLabel: ev.item && ev.item.hora ? ev.item.hora : '', sortMin: horaAMinutos(ev.item && ev.item.hora) });
      });
      items.sort(function (a, b) { return a.sortMin - b.sortMin; });

      allDayBars.forEach(function (ev) {
        var bar = el('div', 'cal-event');
        bar.style.background = rgba(PERSONAL_COLOR, .16);
        bar.style.color = PERSONAL_COLOR;
        bar.style.borderLeftColor = PERSONAL_COLOR;
        bar.textContent = ev.label;
        makeRowClickable(bar, function (evClick) { evClick.stopPropagation(); if (ev.kind === 'materia') openEvaluacionModal({ editId: ev.item.id }); else openPersonalModal({ editId: ev.item.id }); }, ev.label);
        eventosNode.appendChild(bar);
      });

      // En mes, la celda es chica y fija: se cortan los ítems para que no
      // desborden en silencio (antes el overflow:hidden los recortaba sin
      // avisar). En semana, la celda ya scrollea (.is-semana), así que se
      // listan todos.
      var cap = opts.semana ? items.length : 3;
      items.slice(0, cap).forEach(function (item) {
        var row = tpl('cal-item');
        qf(row, 'dot').style.background = item.color;
        var lbl = qf(row, 'label');
        lbl.textContent = item.label + (opts.semana && item.horaLabel ? ' · ' + item.horaLabel : '');
        makeRowClickable(row, itemClickHandler(item), item.label + (item.horaLabel ? ', ' + item.horaLabel : ''));
        eventosNode.appendChild(row);
      });
      if (items.length > cap) {
        var more = tpl('cal-item-more');
        more.textContent = '+' + (items.length - cap) + ' más';
        eventosNode.appendChild(more);
      }
    }
    makeRowClickable(node, function () {
      STATE.calSelected = iso;
      renderCalSide();
      document.querySelectorAll('.cal-cell.is-selected').forEach(function (c) { c.classList.remove('is-selected'); });
      node.classList.add('is-selected');
    }, 'Ver ' + DIAS_LARGOS[d.getDay()] + ' ' + d.getDate());
    return node;
  }

  // Mobile + vista Semana: tira de 7 días con puntos de color en vez de la
  // grilla (no entra legible en 390px). Mismas fuentes de datos que ya usa
  // buildDayCell (clasesDeDiaRaw/eventosDeDia) — así respeta los mismos
  // toggles (Ver clases/evaluaciones/personales, materias ocultas) sin
  // duplicar el filtrado. Un punto por color DISTINTO presente ese día (no
  // uno por ítem) — mismo criterio que ya usa el mes en ≤640px.
  var WS_LETRAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // índice = Date.getDay()
  function renderWeekstrip() {
    var wrap = document.getElementById('cal-weekstrip');
    clear(wrap);
    var start = STATE.calWeekStart;
    for (var i = 0; i < 7; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var iso = toISODate(d);
      var isHoy = iso === todayISO();
      var isSel = iso === STATE.calSelected;
      var btn = el('button', 'ws-day' + (isHoy ? ' is-hoy' : '') + (isSel ? ' is-sel' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-label', DIAS_LARGOS[d.getDay()] + ' ' + d.getDate());
      btn.setAttribute('aria-pressed', String(isSel));
      var wd = el('span', 'wd'); wd.textContent = WS_LETRAS[d.getDay()];
      var dn = el('span', 'dn'); dn.textContent = String(d.getDate());
      var dotsWrap = el('span', 'ws-dots');
      var colores = {};
      clasesDeDiaRaw(designDia(d)).forEach(function (x) { colores[x.materia.strong] = true; });
      eventosDeDia(iso).forEach(function (ev) { colores[ev.color] = true; });
      Object.keys(colores).slice(0, 4).forEach(function (c) { var dot = el('i'); dot.style.background = c; dotsWrap.appendChild(dot); });
      btn.appendChild(wd); btn.appendChild(dn); btn.appendChild(dotsWrap);
      // OJO: `var iso`/`var btn` viven en el scope de la función entera (no
      // del bloque del for), así que un click diferido que los leyera del
      // closure vería siempre el valor de la última vuelta (domingo). Se
      // leen de `this`/data-iso en el momento del click en cambio.
      btn.setAttribute('data-iso', iso);
      btn.addEventListener('click', function () {
        STATE.calSelected = this.getAttribute('data-iso');
        document.querySelectorAll('.ws-day.is-sel').forEach(function (b) { b.classList.remove('is-sel'); b.setAttribute('aria-pressed', 'false'); });
        this.classList.add('is-sel'); this.setAttribute('aria-pressed', 'true');
        renderCalSide();
      });
      wrap.appendChild(btn);
    }
  }

  function renderCalendario() {
    syncStateToURL();
    document.getElementById('cal-today-label').textContent = 'hoy · ' + DIAS_CORTOS[today().getDay()] + ' ' + today().getDate();
    document.querySelectorAll('#cal-view-toggle [data-cal-view]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-cal-view') === STATE.calViewMode); });

    var weekdaysNode = document.getElementById('cal-weekdays');
    clear(weekdaysNode);
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(function (d) { var s = el('span'); s.textContent = d; weekdaysNode.appendChild(s); });

    var grid = document.getElementById('cal-grid');
    clear(grid);
    grid.classList.toggle('is-semana', STATE.calViewMode === 'semana');

    var weekstripNode = document.getElementById('cal-weekstrip');
    var mostrarTira = esMobile() && STATE.calViewMode === 'semana';
    weekstripNode.style.display = mostrarTira ? '' : 'none';
    weekdaysNode.style.display = mostrarTira ? 'none' : '';
    grid.style.display = mostrarTira ? 'none' : '';

    if (STATE.calViewMode === 'semana') {
      var start = STATE.calWeekStart;
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      var sameMonth = start.getMonth() === end.getMonth();
      var label = sameMonth
        ? (start.getDate() + '–' + end.getDate() + ' de ' + MESES_LARGOS[start.getMonth()] + ' ' + start.getFullYear())
        : (start.getDate() + ' ' + MESES_CORTOS[start.getMonth()] + ' – ' + end.getDate() + ' ' + MESES_CORTOS[end.getMonth()] + ' ' + end.getFullYear());
      document.getElementById('cal-month-label').textContent = label;
      if (mostrarTira) {
        renderWeekstrip();
      } else {
        for (var i = 0; i < 7; i++) {
          var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          grid.appendChild(buildDayCell(d, { semana: true }));
        }
      }
    } else {
      document.getElementById('cal-month-label').textContent = MESES_LARGOS[STATE.calMonth].charAt(0).toUpperCase() + MESES_LARGOS[STATE.calMonth].slice(1) + ' ' + STATE.calYear;
      var first = new Date(STATE.calYear, STATE.calMonth, 1);
      var startOffset = designDia(first) - 1; // días del mes anterior a mostrar
      var gridStart = new Date(STATE.calYear, STATE.calMonth, 1 - startOffset);
      for (var i2 = 0; i2 < 42; i2++) {
        var d2 = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i2);
        grid.appendChild(buildDayCell(d2, { muted: d2.getMonth() !== STATE.calMonth }));
      }
    }
    renderCalSide();
  }

  function calGoToday() {
    var t = today();
    STATE.calMonth = t.getMonth(); STATE.calYear = t.getFullYear();
    STATE.calWeekStart = mondayOf(t);
    STATE.calSelected = todayISO();
    renderCalendario();
  }

  function renderCalSide() {
    var iso = STATE.calSelected;
    var d = parseISODate(iso);
    document.getElementById('cal-side-title').textContent = DIAS_LARGOS[d.getDay()] + ' ' + d.getDate();
    var t = today();
    var dow = designDia(d);
    var claseEntries = clasesDeDiaRaw(dow).map(function (x) {
      var m = x.materia, b = x.bloque;
      return { chipColor: m.colorId, materiaTxt: truncate(m.nombre, 16), hora: horaTexto(b.ini) + ' – ' + horaTexto(b.fin), titulo: 'Clase de ' + m.nombre, lugar: m.salon || 'Sin salón asignado', strong: m.strong, sortHora: b.ini };
    });
    var evData = eventosDeDia(iso).map(function (ev) {
      if (ev.kind === 'materia') {
        return { chipColor: ev.materia ? ev.materia.colorId : null, materiaTxt: ev.materia ? truncate(ev.materia.nombre, 16) : '', hora: ev.item.hora || '', titulo: ev.item.titulo, lugar: ev.materia ? (ev.materia.salon || 'Sin salón asignado') : '', strong: ev.color, sortHora: ev.item.hora || '00:00', personal: false, refItem: ev.item, tagId: ev.item.tagId };
      }
      return { chipColor: null, materiaTxt: 'Personal', hora: ev.allDay ? 'Todo el día' : (ev.item.hora || ''), titulo: ev.item.titulo, lugar: '', strong: PERSONAL_COLOR, sortHora: ev.allDay ? '00:00' : (ev.item.hora || '00:00'), personal: true, refItem: ev.item, tagId: ev.item.tagId };
    });
    var all = claseEntries.concat(evData).sort(function (a, b) { return String(a.sortHora).localeCompare(String(b.sortHora)); });

    document.getElementById('cal-side-meta').textContent = MESES_LARGOS[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + all.length + (all.length === 1 ? ' ítem' : ' ítems');
    var list = document.getElementById('cal-side-list');
    clear(list);
    if (!all.length) {
      var e = el('div', 'cal-side-empty'); e.textContent = 'Nada agendado este día.'; list.appendChild(e);
    }
    all.forEach(function (item) {
      var node = tpl('cal-day-card');
      node.style.borderLeftColor = item.strong;
      var chip = qf(node, 'chip');
      chip.setAttribute('style', item.personal ? personalChipStyle() : (item.chipColor ? chipStyle(item.chipColor) : personalChipStyle()));
      chip.textContent = item.materiaTxt;
      renderTagChipInto(qf(node, 'tag'), item.tagId);
      qf(node, 'hora').textContent = item.hora;
      qf(node, 'titulo').textContent = item.titulo;
      qf(node, 'lugar').textContent = item.lugar;
      if (item.refItem) {
        makeRowClickable(node, function () { item.personal ? openPersonalModal({ editId: item.refItem.id }) : openEvaluacionModal({ editId: item.refItem.id }); }, 'Editar ' + item.titulo);
      }
      list.appendChild(node);
    });
    document.getElementById('btn-cal-side-add').onclick = function () { openEvaluacionModal({ fecha: iso }); };
  }

  // ================================================================
  // HORARIO
  // ================================================================
  // Arma la grilla semanal (etiquetas + celdas + bloques posicionados, con
  // el algoritmo de columnas de asignarColumnas() para las superposiciones)
  // dentro de cualquier contenedor `.horario-grid` — extraído de
  // renderHorario() para que la previsualización del Paso 5 del wizard de
  // onboarding (materias todavía sin guardar, ver wizRenderRevision) se vea
  // pixel-idéntica a esta vista, en vez de reimplementar el layout.
  // `items`: [{id, nombre, salon, bloques, strong, soft}]. `opts.onClick`
  // es opcional (la previsualización del wizard no navega a ningún lado).
  function buildHorarioGridInto(grid, items, mostrarSabado, opts) {
    opts = opts || {};
    var dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].concat(mostrarSabado ? ['Sáb'] : []);
    // Filas de media hora (8:00, 8:30, 9:00, …, 21:30) — así una materia
    // puede empezar o terminar en :30, no sólo en punto. La etiqueta de
    // hora sólo se muestra en las filas en punto para no saturar la grilla.
    var horas = []; for (var h = 8; h < 22; h += .5) horas.push(h);
    var cols = dias.length;
    clear(grid);
    grid.style.gridTemplateColumns = '58px repeat(' + cols + ',minmax(0,1fr))';
    grid.style.gridTemplateRows = '30px repeat(' + horas.length + ',1fr)';

    var corner = el('div'); corner.style.cssText = 'grid-column:1;grid-row:1'; grid.appendChild(corner);
    dias.forEach(function (dd, i) {
      var lbl = el('div', 'hg-day-label'); lbl.style.gridColumn = (i + 2); lbl.style.gridRow = 1; lbl.textContent = dd;
      grid.appendChild(lbl);
    });
    horas.forEach(function (hh, r) {
      var lbl = el('div', 'hg-hour-label'); lbl.style.gridColumn = 1; lbl.style.gridRow = r + 2; lbl.textContent = (hh % 1 === 0) ? pad2(hh) + ':00' : '';
      grid.appendChild(lbl);
      for (var c = 0; c < cols; c++) {
        var cell = el('div', 'hg-cell' + (hh % 1 === 0 ? ' is-hour' : '') + (c === cols - 1 ? ' is-last-col' : ''));
        cell.style.gridColumn = c + 2; cell.style.gridRow = r + 2;
        grid.appendChild(cell);
      }
    });

    // Bloques por día, para poder detectar superposiciones (dos materias en el mismo
    // horario) y ubicarlas lado a lado en vez de una encima de la otra.
    var porDia = {};
    items.forEach(function (m) {
      (m.bloques || []).forEach(function (b) {
        if (b.dia > cols) return;
        (porDia[b.dia] = porDia[b.dia] || []).push({ m: m, ini: b.ini, fin: b.fin });
      });
    });
    Object.keys(porDia).forEach(function (dia) {
      asignarColumnas(porDia[dia]).forEach(function (b) {
        var node = tpl('horario-block');
        node.style.gridColumn = Number(dia) + 1;
        // *2: la grilla ahora tiene una fila cada media hora, no cada hora.
        node.style.gridRow = ((b.ini - 8) * 2 + 2) + ' / span ' + ((b.fin - b.ini) * 2);
        node.style.background = b.m.soft; node.style.color = b.m.strong;
        node.style.borderColor = rgba(b.m.strong, .35); node.style.borderLeftColor = b.m.strong;
        var anchoPct = 100 / b.cols;
        node.style.width = 'calc(' + anchoPct + '% - 2px)';
        node.style.marginLeft = 'calc(' + (anchoPct * b.slot) + '% + 1px)';
        // En mobile la columna es de ~40px: el nombre completo no entra
        // ("Conta…"). Usamos la misma abreviatura de 4 letras que tiles/
        // avatares — el nombre completo sigue disponible en el title/
        // aria-label que pone makeRowClickable.
        qf(node, 'nombre').textContent = esMobile() ? materiaAbrev(b.m.nombre) : b.m.nombre;
        qf(node, 'hora').textContent = horaTexto(b.ini) + '–' + horaTexto(b.fin);
        qf(node, 'salon').textContent = (b.m.salon || '').replace('Edificio ', '');
        if (opts.onClick) makeRowClickable(node, function () { opts.onClick(b.m); }, 'Ver materia ' + b.m.nombre);
        grid.appendChild(node);
      });
    });
    return { dias: dias, porDia: porDia, cols: cols };
  }

  function renderHorario() {
    document.getElementById('horario-meta').textContent = '8:00 a 22:00' + (STATE.mostrarSabado ? '' : ' · sábado oculto');
    var grid = document.getElementById('horario-grid');
    var res = buildHorarioGridInto(grid, computeMateriasDelActivo(), STATE.mostrarSabado, {
      onClick: function (m) { location.hash = '#materia-' + m.id; }
    });
    renderHorarioMobile(res.dias, res.porDia, res.cols);
  }

  // Día seleccionado + timeline vertical (mobile, dirección Pro Edition) —
  // reemplaza la grilla Lun–Sáb, ilegible a ~330px de columna real. Se arma
  // siempre (mismo criterio que renderWeekstrip() en Calendario), el CSS
  // decide cuál de los dos (grilla o timeline) se ve según el ancho.
  function renderHorarioMobile(dias, porDia, cols) {
    if (STATE.horarioDia == null || STATE.horarioDia < 1 || STATE.horarioDia > cols) {
      var dow = today().getDay();
      STATE.horarioDia = (dow >= 1 && dow <= cols) ? dow : 1;
    }

    var daysel = document.getElementById('horario-daysel');
    clear(daysel);
    dias.forEach(function (dd, i) {
      var dayNum = i + 1;
      var btn = el('button', 'horario-day');
      btn.type = 'button';
      btn.classList.toggle('is-on', STATE.horarioDia === dayNum);
      var wd = el('span', 'wd'); wd.textContent = dd;
      btn.appendChild(wd);
      var dot = el('span', 'dot');
      if (!(porDia[dayNum] && porDia[dayNum].length)) dot.style.visibility = 'hidden';
      btn.appendChild(dot);
      btn.setAttribute('aria-label', dd);
      btn.addEventListener('click', function () { STATE.horarioDia = dayNum; renderHorario(); });
      daysel.appendChild(btn);
    });

    var timeline = document.getElementById('horario-timeline');
    clear(timeline);
    var bloquesDia = (porDia[STATE.horarioDia] || []).slice().sort(function (a, b) { return a.ini - b.ini; });
    if (!bloquesDia.length) {
      var empty = el('div', 'horario-timeline-empty');
      empty.textContent = 'No tenés clases este día.';
      timeline.appendChild(empty);
      return;
    }
    bloquesDia.forEach(function (b) {
      var row = el('div', 'horario-timeline-row');
      var hora = el('span', 'horario-timeline-hora'); hora.textContent = horaTexto(b.ini);
      var block = el('div', 'horario-timeline-block');
      block.style.background = b.m.soft; block.style.borderLeftColor = b.m.strong; block.style.color = b.m.strong;
      var n = el('span', 'n'); n.textContent = b.m.nombre;
      var h = el('span', 'h'); h.textContent = horaTexto(b.ini) + ' – ' + horaTexto(b.fin);
      var s = el('span', 's'); s.textContent = b.m.salon || 'Sin salón asignado';
      block.appendChild(n); block.appendChild(h); block.appendChild(s);
      makeRowClickable(block, function () { location.hash = '#materia-' + b.m.id; }, 'Ver materia ' + b.m.nombre);
      row.appendChild(hora); row.appendChild(block);
      timeline.appendChild(row);
    });
  }

  // Algoritmo tipo "salas de reunión": ordena por hora de inicio y le da a cada
  // bloque la columna libre más baja entre los que siguen activos; `cols` en cada
  // bloque queda como la concurrencia máxima del día, para repartir el ancho.
  function asignarColumnas(blocks) {
    var sorted = blocks.slice().sort(function (a, b) { return a.ini - b.ini || a.fin - b.fin; });
    var activos = [];
    var maxConcurrencia = 1;
    sorted.forEach(function (b) {
      activos = activos.filter(function (a) { return a.fin > b.ini; });
      var ocupadas = activos.map(function (a) { return a.slot; });
      var slot = 0;
      while (ocupadas.indexOf(slot) >= 0) slot++;
      b.slot = slot;
      activos.push(b);
      maxConcurrencia = Math.max(maxConcurrencia, activos.length);
    });
    sorted.forEach(function (b) { b.cols = maxConcurrencia; });
    return sorted;
  }

  // ================================================================
  // MODALES
  // ================================================================
  // Un solo punto de apertura (mismo espíritu que closeModalEl más abajo,
  // el punto único de cierre): así ningún modal nuevo puede olvidarse de
  // cerrar el cajón mobile. Antes, abrir el modal de perfil o el de
  // semestres desde adentro del cajón (ambos triggers viven ahí) dejaba el
  // cajón abierto encima — el cajón tiene más z-index que un modal normal,
  // así que quedaba tapando el modal en vez de al revés.
  function openModal(id) {
    var elm = document.getElementById(id);
    elm._elFocoPrevio = document.activeElement;
    elm.classList.add('is-open');
    closeMobileNav();
    // role="dialog"/aria-modal (ver app.html) no mueve el foco solo — sin
    // esto, abrir un modal con teclado/lector de pantalla dejaba el foco
    // atrás, sobre el botón que lo disparó. setTimeout (no rAF: rAF no
    // corre si la pestaña quedó en background, y ahí es justo donde más
    // importa que el foco quede bien puesto) porque .modal-backdrop pasa
    // de visibility:hidden a visible con la misma clase que agregamos acá
    // arriba — llamar a .focus() en el mismo tick síncrono no hace nada,
    // el navegador todavía no aplicó el nuevo estilo (sigue "invisible").
    var panel = elm.querySelector('.modal');
    if (panel) {
      panel.setAttribute('tabindex', '-1');
      setTimeout(function () { panel.focus(); }, 0);
    }
  }
  // Modales con un formulario real donde perder lo tipeado importa — se les
  // guarda una "foto" del formulario al abrir (snapshotModalForm) para poder
  // avisar si hay cambios sin guardar al intentar cerrar sin querer.
  var MODAL_FORMS = { 'modal-materia': 'form-materia', 'modal-evaluacion': 'form-evaluacion', 'modal-personal': 'form-personal', 'modal-perfil': 'form-perfil', 'modal-ajustes': 'form-ajustes' };
  // El modal de materia tiene selecciones (color, franjas horarias, sistema
  // de calificación) que viven en STATE.editing, no en <input>/<select> con
  // `name` — FormData no las ve, así que se agregan a mano a su snapshot.
  // Mismo motivo para el margen de riesgo de Ajustes (fila de pills, no un
  // <input> nativo).
  var MODAL_EXTRA_STATE = {
    'modal-materia': function () { return { colorId: STATE.editing.colorId, esc: STATE.editing.esc, horarioRows: STATE.editing.horarioRows }; },
    'modal-evaluacion': function () { return { kind: STATE.editing.kind, evalMateriaId: STATE.editing.evalMateriaId, evalTipo: STATE.editing.evalTipo, evalTipoCustom: STATE.editing.evalTipoCustom, evalNotaMaxima: STATE.editing.evalNotaMaxima }; },
    'modal-personal': function () { return { todoElDia: STATE.editing.todoElDia }; }
  };
  var MODAL_SNAPSHOTS = {};
  function modalSnapshotValue(modalId) {
    var formId = MODAL_FORMS[modalId];
    var form = formId && document.getElementById(formId);
    if (!form) return null;
    var data = new FormData(form);
    var obj = {};
    data.forEach(function (v, k) { obj[k] = v; });
    var extraFn = MODAL_EXTRA_STATE[modalId];
    return JSON.stringify(obj) + (extraFn ? '|' + JSON.stringify(extraFn()) : '');
  }
  function snapshotModalForm(modalId) {
    var v = modalSnapshotValue(modalId);
    if (v != null) MODAL_SNAPSHOTS[modalId] = v;
  }
  function modalTieneCambiosSinGuardar(modalId) {
    var v = modalSnapshotValue(modalId);
    if (v == null || !(modalId in MODAL_SNAPSHOTS)) return false;
    return v !== MODAL_SNAPSHOTS[modalId];
  }
  // Único punto de control para todas las formas de cerrar un modal (botón
  // X, "Cancelar", click en el backdrop, Escape, closeAllModals()):
  //  1) el modal de perfil puede negarse a cerrarse mientras está en modo
  //     obligatorio (cuentas de Google con datos sin completar, ver PERFIL);
  //  2) si el formulario tiene cambios sin guardar, confirma antes de
  //     descartarlos — salvo que quien llama ya haya actualizado el snapshot
  //     a propósito (ver los submit/eliminar handlers, que lo hacen justo
  //     antes de cerrar tras guardar/borrar con éxito, para no preguntar
  //     "¿descartar cambios?" sobre datos que ya se guardaron).
  var PERFIL_MODAL_BLOQUEANTE = false;
  function closeModalEl(elm) {
    if (!elm) return;
    if (elm.id === 'modal-perfil' && PERFIL_MODAL_BLOQUEANTE) return;
    if (modalTieneCambiosSinGuardar(elm.id) && !confirm('¿Descartar los cambios sin guardar?')) return;
    elm.classList.remove('is-open');
    if (elm._elFocoPrevio && typeof elm._elFocoPrevio.focus === 'function') elm._elFocoPrevio.focus();
    elm._elFocoPrevio = null;
  }
  function closeAllModals() { document.querySelectorAll('.modal-backdrop.is-open').forEach(closeModalEl); }
  // Foco atrapado dentro del modal abierto mientras esté abierto — sin esto,
  // Tab se escapaba al contenido de atrás aunque aria-modal="true" ya le
  // dice a los lectores de pantalla que ese contenido es inerte.
  function focosDeModal(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (n) { return n.offsetParent !== null; });
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Tab') return;
    var panel = document.querySelector('.modal-backdrop.is-open .modal');
    if (!panel) return;
    var f = focosDeModal(panel);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  // ---- Mobile: quick-sheet (long-press del FAB) y row-menu (long-press de
  // una fila de Agenda/evaluación) — dos popovers chicos, mismo patrón de
  // apertura/cierre que un modal pero sin backdrop propio. ----
  function closeQuickSheet() { document.getElementById('quick-sheet').classList.remove('is-open'); }
  function openQuickSheet() { closeRowMenu(); document.getElementById('quick-sheet').classList.add('is-open'); }
  function closeRowMenu() {
    document.getElementById('row-menu').classList.remove('is-open');
    document.querySelectorAll('.swipe-row.is-pressed').forEach(function (r) { r.classList.remove('is-pressed'); });
  }
  // Reposiciona el menú sobre la fila que se mantuvo apretada — arriba si
  // no entra abajo (fila cerca del borde inferior, tapada por el tab bar).
  function openRowMenuAt(rowEl) {
    closeQuickSheet();
    var menu = document.getElementById('row-menu');
    var r = rowEl.getBoundingClientRect();
    var menuH = 4 * 50; // 4 botones de 50px, ver .row-menu button en styles.css
    var margin = 10;
    if (r.bottom + margin + menuH < window.innerHeight) menu.style.top = (r.bottom + margin) + 'px';
    else menu.style.top = Math.max(margin, r.top - margin - menuH) + 'px';
    menu.style.bottom = 'auto';
    menu.classList.add('is-open');
  }
  // ---- Fase 4 (+ rediseño post-feedback): tick de "hecho" (agenda-row/
  // eval-row) ----
  // Tarea → toggle directo, un solo click, sin nada más. Evaluación → el
  // tick abre el mismo panel de lectura que tocar la fila (con "Asignar
  // nota"/Editar/Eliminar ahí) en vez de un popover chico propio — el
  // popover anterior resultó ilegible/inusable en la práctica; el panel ya
  // es grande y ya existe, no hace falta un componente nuevo.
  // Pinta y ata el tick de una fila (agenda-row/eval-row) — `item` es la
  // fila cruda de agenda ({id, kind, hecho, nota, notaMaxima, titulo}).
  function wireTickButton(btn, item) {
    var esEval = item.kind === 'evaluacion';
    btn.classList.toggle('is-on', !!item.hecho);
    btn.textContent = item.hecho ? '✓' : '';
    btn.setAttribute('aria-pressed', String(!!item.hecho));
    btn.setAttribute('aria-label', esEval
      ? ('Asignar nota para ' + item.titulo)
      : (item.hecho ? ('Marcar ' + item.titulo + ' como pendiente') : ('Marcar ' + item.titulo + ' como completada')));
    btn.onclick = function (ev) {
      ev.stopPropagation();
      if (esEval) openEvaluacionModal({ editId: item.id });
      else toggleAgendaHecho(item.id, !item.hecho);
    };
  }

  // Estado ocupado de un botón mientras espera una llamada a Supabase — hay
  // red de por medio ahora, así que un guardado puede tardar un instante.
  function setBtnBusy(btn, busy, busyLabel) {
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = busyLabel || 'Guardando…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  // ---- Modal materia ----
  var ESC_DEFAULTS = { nota: { total: 12, aprob: NOTA_APROBACION_DEFECTO }, puntos: { total: 100, aprob: 60 }, pct: { total: 100, aprob: 60 } };

  function bloquesToRows(bloques) {
    var groups = {}, order = [];
    (bloques || []).forEach(function (b) {
      var key = b.ini + '-' + b.fin;
      if (!groups[key]) { groups[key] = { dias: {}, inicio: horaTexto(b.ini), fin: horaTexto(b.fin) }; order.push(key); }
      groups[key].dias[b.dia] = true;
    });
    return order.map(function (k) { return groups[k]; });
  }

  // Menú "+ Nuevo" (bloque C3, Bloque 6) — 5 accesos directos a formularios
  // ya existentes, ninguno nuevo: Materia (openMateriaModal), Evaluación y
  // Tarea (openEvaluacionModal, la única diferencia es el tipo preseleccionado),
  // Cargar nota (mismo modal de Evaluación, arranca con foco en el campo
  // de nota — ver el flag opts.modoNota en openEvaluacionModal), Evento
  // personal (openPersonalModal). Mismo componente en Inicio y Calendario
  // (mismo markup .nuevo-menu-wrap/.nuevo-menu, ver app.html) — crearNuevoMenu()
  // arma el open/close/teclado una sola vez y bindNuevoMenus() lo instancia
  // dos veces, cada una con sus propios ids para no chocar.
  function crearNuevoMenu(btnId, menuId, acciones) {
    var btn = document.getElementById(btnId);
    var menu = document.getElementById(menuId);
    function toggle(cerrar) {
      var abrir = cerrar ? false : menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !abrir);
      btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      if (abrir) { var first = menu.querySelector('button'); if (first) first.focus(); }
    }
    btn.addEventListener('click', function (ev) { ev.stopPropagation(); toggle(); });
    acciones.forEach(function (a) {
      document.getElementById(a.id).addEventListener('click', function () { toggle(true); a.run(); });
    });
    document.addEventListener('click', function () { toggle(true); });
    menu.addEventListener('keydown', function (ev) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('button'));
      var idx = items.indexOf(document.activeElement);
      if (ev.key === 'Escape') { ev.preventDefault(); toggle(true); btn.focus(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(idx + 1) % items.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    });
  }
  function bindNuevoMenus() {
    // eventoOpts es función (no valor fijo) porque Calendario necesita leer
    // STATE.calSelected recién al momento del click, no al bindear — el día
    // seleccionado cambia todo el tiempo.
    function acciones(prefix, eventoOpts) {
      return [
        { id: prefix + '-materia', run: function () { openMateriaModal(null); } },
        { id: prefix + '-evaluacion', run: function () { openEvaluacionModal({ kind: 'evaluacion' }); } },
        { id: prefix + '-tarea', run: function () { openEvaluacionModal({ kind: 'tarea' }); } },
        { id: prefix + '-nota', run: function () { openEvaluacionModal({ kind: 'evaluacion', modoNota: true }); } },
        { id: prefix + '-evento', run: function () { openPersonalModal(eventoOpts()); } }
      ];
    }
    crearNuevoMenu('btn-inicio-nuevo', 'nuevo-menu', acciones('nuevo-menu', function () { return {}; }));
    crearNuevoMenu('btn-cal-nuevo', 'nuevo-menu-cal', acciones('nuevo-menu-cal', function () { return { fecha: STATE.calSelected }; }));
  }

  function openMateriaModal(id) {
    var editing = !!id;
    var m = editing ? materiaRawById(id) : null;
    STATE.editing = {
      materiaId: id || null,
      materiaStep: 0,
      colorId: m ? m.colorId : 'azul',
      esc: m ? JSON.parse(JSON.stringify(m.esc)) : { tipo: 'puntos', total: 100, aprob: 60 },
      horarioRows: bloquesToRows(m ? m.bloques : [])
    };
    if (!STATE.editing.horarioRows.length) STATE.editing.horarioRows.push({ dias: {}, inicio: '', fin: '' });
    document.getElementById('modal-materia-title').textContent = editing ? 'Editar materia' : 'Nueva materia';
    document.getElementById('btn-materia-eliminar').classList.toggle('hidden', !editing);
    var form = document.getElementById('form-materia');
    form.reset();
    form.nombre.value = m ? m.nombre : '';
    form.doc.value = m ? m.doc : '';
    form.salon.value = m ? m.salon : '';
    form.estado.value = m ? m.estado : 'cursando';
    renderModalMateriaSwatches();
    renderModalMateriaHorarioRows();
    renderModalMateriaSistema();
    materiaAplicarPaso();
    openModal('modal-materia');
    snapshotModalForm('modal-materia');
  }

  // Alta nueva = wizard de 3 pasos (esencial / horario / calificación), un
  // paso = una decisión a la vez, para no tirar 8 campos encima de golpe.
  // Edición = los 3 pasos se muestran juntos (sin steps-track ni Atrás):
  // quien edita quiere ver y tocar cualquier campo directo, no que lo hagan
  // reencadenar pasos para llegar a uno solo.
  var MATERIA_PASOS = [
    { sub: 'Contános qué materia es y elegí un color para identificarla.' },
    { sub: 'Dónde y cuándo cursás — podés dejarlo para después si todavía no lo sabés.' },
    { sub: 'Así se va a calcular tu nota. Si no sabés el sistema exacto todavía, dejá estos valores.' }
  ];
  function materiaAplicarPaso() {
    var editing = !!STATE.editing.materiaId;
    var track = document.getElementById('materia-steps-track');
    var atras = document.getElementById('btn-materia-atras');
    var cancelar = document.getElementById('btn-materia-cancelar');
    var continuar = document.getElementById('btn-materia-continuar');
    var sub = document.getElementById('modal-materia-sub');
    var hint = document.getElementById('modal-materia-hint');
    var steps = document.querySelectorAll('.mat-step');
    if (editing) {
      steps.forEach(function (s) { s.classList.remove('hidden'); });
      track.classList.add('hidden');
      atras.classList.add('hidden');
      cancelar.classList.remove('hidden');
      hint.classList.remove('hidden');
      sub.textContent = 'Los datos de horario alimentan el calendario y la grilla semanal.';
      continuar.textContent = 'Guardar materia';
      return;
    }
    var idx = STATE.editing.materiaStep;
    var last = MATERIA_PASOS.length - 1;
    steps.forEach(function (s) { s.classList.toggle('hidden', Number(s.getAttribute('data-mat-step')) !== idx); });
    track.classList.remove('hidden');
    track.querySelectorAll('.dot').forEach(function (d, i) {
      d.classList.toggle('is-done', i < idx);
      d.classList.toggle('is-current', i === idx);
    });
    atras.classList.toggle('hidden', idx === 0);
    cancelar.classList.toggle('hidden', idx !== 0);
    hint.classList.toggle('hidden', idx !== last);
    sub.textContent = MATERIA_PASOS[idx].sub;
    continuar.textContent = idx === last ? 'Guardar materia' : 'Continuar';
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-materia-atras').addEventListener('click', function () {
      if (STATE.editing.materiaStep > 0) { STATE.editing.materiaStep--; materiaAplicarPaso(); }
    });
    // Botón siempre type="button" (nunca type="submit" nativo): cambiarle el
    // `type` a mano dentro de su propio click handler hacía que el navegador
    // igual disparara el submit en ESE mismo click apenas se llegaba al
    // último paso (el submit evalúa el type post-handler, no el de al hacer
    // click) — se perdía el paso de Calificación entero. `requestSubmit()`
    // de forma explícita evita ese problema de raíz.
    document.getElementById('btn-materia-continuar').addEventListener('click', function () {
      var form = document.getElementById('form-materia');
      if (STATE.editing.materiaId) { form.requestSubmit(); return; }
      var last = MATERIA_PASOS.length - 1;
      if (STATE.editing.materiaStep >= last) { form.requestSubmit(); return; }
      if (STATE.editing.materiaStep === 0 && !document.getElementById('materia-nombre').reportValidity()) return;
      STATE.editing.materiaStep++;
      materiaAplicarPaso();
    });
  });

  function renderModalMateriaSwatches() {
    var wrap = document.getElementById('modal-materia-swatches');
    clear(wrap);
    Object.keys(ACCENTS).forEach(function (colorId) {
      var node = tpl('swatch');
      var strong = ACCENTS[colorId].strong;
      node.style.background = strong;
      node.classList.toggle('is-selected', STATE.editing.colorId === colorId);
      if (STATE.editing.colorId === colorId) node.style.boxShadow = '0 0 0 3px var(--c-surface), 0 0 0 5px ' + strong;
      node.addEventListener('click', function () { STATE.editing.colorId = colorId; renderModalMateriaSwatches(); });
      wrap.appendChild(node);
    });
  }

  function renderModalMateriaHorarioRows() {
    var wrap = document.getElementById('modal-materia-horario-rows');
    clear(wrap);
    STATE.editing.horarioRows.forEach(function (row, idx) {
      var node = tpl('horario-modal-row');
      var diasWrap = qf(node, 'dias');
      DIAS_BLOQUE_MINI.forEach(function (label, i) {
        var dia = i + 1;
        var btn = el('button', 'dia-mini'); btn.type = 'button'; btn.textContent = label;
        btn.classList.toggle('is-on', !!row.dias[dia]);
        btn.addEventListener('click', function () { row.dias[dia] = !row.dias[dia]; renderModalMateriaHorarioRows(); });
        diasWrap.appendChild(btn);
      });
      // 'input' y 'change' a la vez: Safari no siempre dispara 'input' de
      // forma confiable en <input type="time"> mientras se escribe segmento
      // por segmento (hora, minutos) — sin 'change' como respaldo, un valor
      // tipeado podía quedar sin guardar en `row` y volvía al valor viejo
      // apenas se re-renderizaba la fila (p. ej. al tocar un día).
      var inicio = qf(node, 'inicio'); inicio.value = row.inicio || '';
      inicio.addEventListener('input', function () { row.inicio = inicio.value; });
      inicio.addEventListener('change', function () { row.inicio = inicio.value; });
      var fin = qf(node, 'fin'); fin.value = row.fin || '';
      fin.addEventListener('input', function () { row.fin = fin.value; });
      fin.addEventListener('change', function () { row.fin = fin.value; });
      var remove = qf(node, 'remove');
      remove.addEventListener('click', function () { STATE.editing.horarioRows.splice(idx, 1); if (!STATE.editing.horarioRows.length) STATE.editing.horarioRows.push({ dias: {}, inicio: '', fin: '' }); renderModalMateriaHorarioRows(); });
      wrap.appendChild(node);
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-add-franja').addEventListener('click', function () {
      STATE.editing.horarioRows.push({ dias: {}, inicio: '', fin: '' });
      renderModalMateriaHorarioRows();
    });
  });

  function renderModalMateriaSistema() {
    var tipo = STATE.editing.esc.tipo;
    document.querySelectorAll('#modal-sistema-cards .seg-card').forEach(function (btn) {
      var on = btn.getAttribute('data-sistema') === tipo;
      btn.classList.toggle('is-on', on);
      if (!btn._bound) {
        btn._bound = true;
        btn.addEventListener('click', function () {
          var nuevoTipo = btn.getAttribute('data-sistema');
          STATE.editing.esc = { tipo: nuevoTipo, total: ESC_DEFAULTS[nuevoTipo].total, aprob: ESC_DEFAULTS[nuevoTipo].aprob };
          STATE.editing.totalOtro = false;
          STATE.editing.aprobOtro = false;
          renderModalMateriaSistema();
        });
      }
    });
    var unidadLbl = tipo === 'nota' ? 'notas 0–12' : (tipo === 'pct' ? '%' : 'pts');
    document.getElementById('modal-total-label').textContent = (tipo === 'nota' ? 'Escala de la materia' : (tipo === 'pct' ? 'Total' : 'Puntaje total')) + ' (' + unidadLbl + ')';
    document.getElementById('modal-aprob-label').textContent = 'Aprueba con (' + unidadLbl + ')';

    var totalWrap = document.getElementById('modal-total-presets');
    clear(totalWrap);
    var totalOptions = tipo === 'nota' ? [12] : (tipo === 'pct' ? [100] : [50, 60, 80, 100]);
    totalOptions.forEach(function (n) { totalWrap.appendChild(buildNumPill(n === STATE.editing.esc.total && !STATE.editing.totalOtro, String(n), function () { STATE.editing.esc.total = n; STATE.editing.totalOtro = false; renderModalMateriaSistema(); }, tipo !== 'pct' && tipo !== 'nota')); });
    if (tipo === 'puntos') {
      var totalActive = STATE.editing.totalOtro || !totalOptions.includes(STATE.editing.esc.total);
      totalWrap.appendChild(buildNumPillOtro(totalActive, STATE.editing.esc.total,
        function () { STATE.editing.totalOtro = true; renderModalMateriaSistema(); },
        function (val) { STATE.editing.esc.total = val; renderModalMateriaSistema(); }));
    }

    var aprobWrap = document.getElementById('modal-aprob-presets');
    clear(aprobWrap);
    var aprobOptions = tipo === 'nota' ? [3, 6, 8] : [50, 60, 80].filter(function (n) { return n <= STATE.editing.esc.total; });
    aprobOptions.forEach(function (n) { aprobWrap.appendChild(buildNumPill(n === STATE.editing.esc.aprob && !STATE.editing.aprobOtro, String(n), function () { STATE.editing.esc.aprob = n; STATE.editing.aprobOtro = false; renderModalMateriaSistema(); })); });
    var aprobActive = STATE.editing.aprobOtro || !aprobOptions.includes(STATE.editing.esc.aprob);
    aprobWrap.appendChild(buildNumPillOtro(aprobActive, STATE.editing.esc.aprob,
      function () { STATE.editing.aprobOtro = true; renderModalMateriaSistema(); },
      function (val) { STATE.editing.esc.aprob = val; renderModalMateriaSistema(); }));

    // Fase 2: exoneración — opcional (null = la materia no la define). "Sin
    // exoneración" es un pill más, no un checkbox aparte, mismo idioma que
    // el resto de esta sección.
    var exonWrap = document.getElementById('modal-exoneracion-presets');
    clear(exonWrap);
    var tieneExon = STATE.editing.esc.exoneracion != null;
    exonWrap.appendChild(buildNumPill(!tieneExon, 'Sin exoneración', function () {
      STATE.editing.esc.exoneracion = null;
      renderModalMateriaSistema();
    }));
    exonWrap.appendChild(buildNumPillOtro(tieneExon, tieneExon ? STATE.editing.esc.exoneracion : Math.min(STATE.editing.esc.total, STATE.editing.esc.aprob + 1),
      function () { STATE.editing.esc.exoneracion = Math.min(STATE.editing.esc.total, STATE.editing.esc.aprob + 1); renderModalMateriaSistema(); },
      function (val) { STATE.editing.esc.exoneracion = val; renderModalMateriaSistema(); }));

    var escSel = STATE.editing.esc;
    var hint = document.getElementById('modal-materia-hint');
    hint.textContent = (tipo === 'nota'
      ? 'La materia se califica de 0 a 12 y aprueba con ' + valU(escSel.aprob, escSel) + '.'
      : 'La materia se califica sobre ' + val(escSel.total, escSel) + uni(escSel) + ' y aprueba con ' + valU(escSel.aprob, escSel) + ' (' + (escSel.total ? Math.round(escSel.aprob / escSel.total * 100) : 0) + '% del total).')
      + (escSel.exoneracion != null ? ' Exonera con ' + valU(escSel.exoneracion, escSel) + '.' : '');
  }

  function buildNumPill(on, label, onClick) {
    var btn = el('button', 'num-pill' + (on ? ' is-on' : '')); btn.type = 'button'; btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }
  function buildNumPillOtro(active, currentVal, onActivate, onCommit) {
    if (!active) {
      var btn = el('button', 'num-pill'); btn.type = 'button'; btn.textContent = 'Otro';
      btn.addEventListener('click', onActivate);
      return btn;
    }
    var wrap = el('span', 'num-pill is-on is-custom');
    var input = el('input'); input.type = 'number'; input.min = '1'; input.value = currentVal || '';
    input.addEventListener('change', function () { onCommit(Number(input.value) || 0); });
    wrap.appendChild(input);
    setTimeout(function () { input.focus(); input.select(); }, 0);
    return wrap;
  }

  // Devuelve la hora como decimal (18:30 -> 18.5), redondeado al medio-hora
  // más cercano — la grilla y el resto del sistema de horario trabajan en
  // pasos de 30 minutos.
  function parseHoraDecimal(hhmm) {
    if (!hhmm) return null;
    var partes = hhmm.split(':');
    var h = parseInt(partes[0], 10);
    var m = partes[1] ? parseInt(partes[1], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;
    return Math.round((h * 60 + m) / 30) / 2;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('form-materia').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var bloques = [];
      STATE.editing.horarioRows.forEach(function (row) {
        var ini = parseHoraDecimal(row.inicio), fin = parseHoraDecimal(row.fin);
        if (ini == null || fin == null || fin <= ini) return;
        Object.keys(row.dias).forEach(function (dia) { if (row.dias[dia]) bloques.push({ dia: Number(dia), ini: ini, fin: fin }); });
      });
      // Semestre: una materia nueva se asigna sola al semestre activo (no se
      // le pregunta al usuario en el formulario — para eso está el selector
      // de semestre en el side nav, ver README). Al editar, se conserva el
      // semestre que ya tenía: editar una materia nunca la mueve de semestre.
      // Cuenta recién creada, sin ningún semestre todavía (ya no hay semilla
      // automática — ver README): si esta es la primera materia, se crea
      // "Semestre actual" al vuelo antes de asignarle uno.
      var semestreId;
      if (STATE.editing.materiaId) {
        semestreId = (materiaRawById(STATE.editing.materiaId) || {}).semestreId;
      } else {
        semestreId = activeSemestreId();
        if (!semestreId) {
          var idNuevoSemestre = uid();
          if (!(await saveSemestresRaw([{ id: idNuevoSemestre, nombre: 'Semestre actual', activo: true }]))) { avisarError(); return; }
          semestreId = idNuevoSemestre;
        }
      }
      // Se parte de la materia cruda existente (si la hay) en vez de un
      // literal desde cero: campos que este modal no edita —
      // catalogoMateriaId/catalogoDictadoId (de sólo lectura, ver
      // rowToMateria) y componentesFijos (los puntos fijos que carga el
      // estudiante en Detalle) — tienen que sobrevivir a un guardado desde
      // acá, no perderse porque el objeto nuevo nunca los mencionó.
      var record = Object.assign(
        {},
        STATE.editing.materiaId ? materiaRawById(STATE.editing.materiaId) : null,
        {
          id: STATE.editing.materiaId || uid(),
          semestreId: semestreId,
          nombre: form.nombre.value.trim(),
          doc: form.doc.value.trim(),
          colorId: STATE.editing.colorId,
          salon: form.salon.value.trim(),
          bloques: bloques,
          esc: STATE.editing.esc,
          estado: form.estado.value
        }
      );
      var arr = loadMateriasRaw();
      if (STATE.editing.materiaId) {
        arr = arr.map(function (m) { return m.id === record.id ? record : m; });
      } else {
        arr.push(record);
      }
      var btn = form.querySelector('button[type="submit"]');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await saveMateriasRaw(arr);
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      snapshotModalForm('modal-materia'); // ya se guardó — no preguntar "¿descartar cambios?" al cerrar
      closeAllModals();
      renderRoute();
    });
    document.getElementById('btn-materia-eliminar').addEventListener('click', async function () {
      if (!STATE.editing.materiaId) return;
      var ok = await eliminarMateriaId(STATE.editing.materiaId);
      if (!ok) return;
      snapshotModalForm('modal-materia');
      closeAllModals();
      location.hash = '#materias';
      renderRoute();
    });
  });

  // ---- Modal evaluación ----
  // Fase 1: creación en dos pasos — si no se sabe todavía el kind (tarea vs
  // evaluación), el modal muestra sólo el picker (#modal-eval-kind-step) y
  // esconde el <form> entero; recién al elegir uno se revela el form, con
  // los campos de nota/tipo condicionados a kind==='evaluacion'. Editar un
  // ítem existente nunca pasa por el picker — el kind ya quedó fijado al
  // crearlo.
  function openEvaluacionModal(opts) {
    opts = opts || {};
    if (!computeMaterias().length) { alert('Agregá primero una materia para poder cargar evaluaciones.'); return; }
    var ev = opts.editId ? agendaRawById(opts.editId) : null;
    var tipoEsPreset = ev ? TIPOS_EVAL.indexOf(ev.tipo) >= 0 : true;
    // El selector de materia del modal está acotado al semestre activo
    // (Bloque 1 — ver renderModalEvalMaterias), así que el default también
    // sale de ahí; si el semestre activo no tiene materias, cae a
    // cualquiera para no bloquear la creación.
    var materiaDefault = opts.materiaId || (computeMateriasDelActivo()[0] || computeMaterias()[0]).id;
    var kind = ev ? ev.kind : (opts.kind || null);
    var notaMaximaDefault = ev ? ev.notaMaxima : null;
    if (kind === 'evaluacion' && notaMaximaDefault == null) {
      var mDefault = computeMateriaById(materiaDefault);
      notaMaximaDefault = mDefault ? mDefault.esc.total : null;
    }
    STATE.editing = {
      evaluacionId: opts.editId || null,
      // Fase 3: editar uno existente siempre arranca en modo lectura
      // ('ver'); crear uno nuevo va directo a elegir kind o al form (nunca
      // hay nada que "ver" todavía en una creación).
      modo: ev ? 'ver' : (kind ? 'form' : 'elegir-kind'),
      kind: kind,
      evalMateriaId: ev ? ev.materiaId : materiaDefault,
      evalTipo: ev ? (tipoEsPreset ? ev.tipo : 'Otro') : 'Parcial',
      evalTipoCustom: ev && !tipoEsPreset ? ev.tipo : '',
      evalNotaMaxima: notaMaximaDefault,
      // Al editar, no pisar la nota_maxima ya guardada si se cambia de
      // materia desde el picker — al crear, sí seguir al total de la
      // materia elegida hasta que el usuario la toque a mano.
      notaMaximaTocada: !!ev,
      tagId: ev ? ev.tagId : null,
      tagNuevoAbierto: false,
      tagNuevoColor: 'azul'
    };
    document.getElementById('btn-evaluacion-eliminar').classList.toggle('hidden', !ev);
    var form = document.getElementById('form-evaluacion');
    form.reset();
    form.titulo.value = ev ? ev.titulo : '';
    form.fecha.value = ev ? ev.fecha : (opts.fecha || todayISO());
    form.hora.value = ev ? (ev.hora || '') : '';
    form.notaMaxima.value = notaMaximaDefault != null ? notaMaximaDefault : '';
    form.nota.value = ev && ev.nota != null ? ev.nota : '';
    form.nota.max = notaMaximaDefault != null ? notaMaximaDefault : '';
    form.notas.value = ev ? (ev.notas || '') : '';
    renderModalEvalFieldsVisibility();
    form.hecho.value = ev ? (ev.hecho ? '1' : '') : (opts.modoNota ? '1' : '');
    renderModalEvalMaterias();
    renderModalEvalTipos();
    renderModalEvalKindStep();
    renderModalEvalVisibility();
    renderTagPicker({ wrap: 'modal-eval-tags', kind: 'academico', presetKind: STATE.editing.kind === 'evaluacion' ? 'evaluacion' : 'otro', nuevoWrap: 'modal-eval-tag-nueva', nuevoNombre: 'modal-eval-tag-nueva-nombre', nuevoSwatches: 'modal-eval-tag-nueva-swatches', nuevoCrear: 'modal-eval-tag-nueva-crear' });
    openModal('modal-evaluacion');
    snapshotModalForm('modal-evaluacion');
    // "Cargar nota" desde +Nuevo: mismo formulario que "Evaluación", sólo
    // cambia el foco inicial — va directo al campo de nota en vez de al
    // título.
    if (opts.modoNota) { var notaInput = document.getElementById('eval-nota'); if (notaInput) notaInput.focus(); }
  }

  // Picker Tarea/Evaluación (paso 1 de la creación, STATE.editing.modo ===
  // 'elegir-kind') — sólo pinta y ata el click de las cards; a quién le
  // toca mostrarse (picker/lectura/form) lo decide renderModalEvalVisibility().
  function renderModalEvalKindStep() {
    document.querySelectorAll('#modal-eval-kind-cards .seg-card').forEach(function (btn) {
      var k = btn.getAttribute('data-kind');
      btn.classList.toggle('is-on', STATE.editing.kind === k);
      if (!btn._boundKind) {
        btn._boundKind = true;
        btn.addEventListener('click', function () {
          STATE.editing.kind = k;
          STATE.editing.modo = 'form';
          if (k === 'evaluacion' && STATE.editing.evalNotaMaxima == null) {
            var m = computeMateriaById(STATE.editing.evalMateriaId);
            STATE.editing.evalNotaMaxima = m ? m.esc.total : null;
          }
          var form = document.getElementById('form-evaluacion');
          form.notaMaxima.value = STATE.editing.evalNotaMaxima != null ? STATE.editing.evalNotaMaxima : '';
          form.nota.max = STATE.editing.evalNotaMaxima != null ? STATE.editing.evalNotaMaxima : '';
          renderModalEvalFieldsVisibility();
          renderModalEvalVisibility();
          // Los presets de etiqueta rápida dependen del kind (Fase 5) —
          // recién ahora se sabe cuál mostrar.
          renderTagPicker({ wrap: 'modal-eval-tags', kind: 'academico', presetKind: k === 'evaluacion' ? 'evaluacion' : 'otro', nuevoWrap: 'modal-eval-tag-nueva', nuevoNombre: 'modal-eval-tag-nueva-nombre', nuevoSwatches: 'modal-eval-tag-nueva-swatches', nuevoCrear: 'modal-eval-tag-nueva-crear' });
        });
      }
    });
  }

  // Fase 3: único punto que decide cuál de los 3 estados del modal se ve
  // (elegir-kind / ver / form) y el título — evita que la lógica de
  // mostrar/ocultar quede repartida entre el picker, el botón "Editar" y
  // openEvaluacionModal.
  function renderModalEvalVisibility() {
    var modo = STATE.editing.modo;
    document.getElementById('modal-eval-kind-step').classList.toggle('hidden', modo !== 'elegir-kind');
    document.getElementById('modal-eval-view-step').classList.toggle('hidden', modo !== 'ver');
    document.getElementById('modal-eval-view-foot').classList.toggle('hidden', modo !== 'ver');
    document.getElementById('form-evaluacion').classList.toggle('hidden', modo !== 'form');
    var editando = !!STATE.editing.evaluacionId;
    var label = STATE.editing.kind === 'tarea' ? 'tarea' : (STATE.editing.kind === 'evaluacion' ? 'evaluación' : '');
    var labelCap = label.charAt(0).toUpperCase() + label.slice(1);
    document.getElementById('modal-evaluacion-title').textContent =
      modo === 'ver' ? labelCap : (editando ? ('Editar ' + label) : (label ? ('Nueva ' + label) : '¿Qué querés agregar?'));
    if (modo === 'ver') renderModalEvalViewContent();
  }

  // Contenido del modo lectura — materia, fecha/hora, nota máxima/obtenida
  // (sólo evaluación), etiqueta y notas libres. Pensado para escanearse de
  // un vistazo, sin abrir el form.
  function renderModalEvalViewContent() {
    var ev = agendaRawById(STATE.editing.evaluacionId);
    if (!ev) return;
    var m = computeMateriaById(ev.materiaId);
    var isEval = ev.kind === 'evaluacion';
    var escRef = m ? m.esc : { tipo: 'puntos' };
    var info = agendaBadgeInfo(ev, today());
    var badge = document.getElementById('modal-eval-view-badge');
    badge.setAttribute('style', badgeStyle(info.tone));
    badge.textContent = info.label;
    var chip = document.getElementById('modal-eval-view-chip');
    if (m) { chip.setAttribute('style', chipStyle(m.colorId)); chip.textContent = m.nombre; }
    else { chip.removeAttribute('style'); chip.textContent = ''; }
    document.getElementById('modal-eval-view-titulo').textContent = ev.titulo;
    var d = parseISODate(ev.fecha);
    document.getElementById('modal-eval-view-fecha').textContent = DIAS_LARGOS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES_LARGOS[d.getMonth()];
    document.getElementById('modal-eval-view-hora-col').classList.toggle('hidden', !ev.hora);
    document.getElementById('modal-eval-view-hora').textContent = ev.hora || '';
    document.getElementById('modal-eval-view-notamax-col').classList.toggle('hidden', !isEval);
    document.getElementById('modal-eval-view-nota-col').classList.toggle('hidden', !isEval);
    if (isEval) {
      document.getElementById('modal-eval-view-notamax').textContent = val(ev.notaMaxima, escRef);
      document.getElementById('modal-eval-view-nota').textContent = ev.nota != null ? val(ev.nota, escRef) : 'Sin calificar';
    }
    renderTagChipInto(document.getElementById('modal-eval-view-tag'), ev.tagId);
    var notasEl = document.getElementById('modal-eval-view-notas');
    notasEl.classList.toggle('hidden', !ev.notas);
    notasEl.textContent = ev.notas || '';

    // Acción rápida sin pasar por "Editar": una tarea se completa al
    // toque; una evaluación abre el mini-modal de "Asignar nota" (ver
    // abrirAsignarNotaModal) — antes mandaba al form completo de "Editar
    // evaluación" sólo enfocado en el campo de nota, lo que se sentía como
    // editar toda la evaluación para cargar un solo número.
    var btnCompletar = document.getElementById('btn-eval-view-completar');
    btnCompletar.textContent = isEval ? (ev.nota != null ? 'Cambiar nota' : 'Asignar nota') : (ev.hecho ? 'Marcar pendiente' : 'Marcar completada');
    // "Marcar entregado, esperando nota": estado intermedio para cuando ya
    // rendiste pero todavía no sabés la nota — sólo tiene sentido antes de
    // que la evaluación quede hecha (una vez hecha, ya es "esperando nota"
    // o "rendida", ver agendaBadgeInfo). No aplica a tareas.
    document.getElementById('btn-eval-view-entregado').classList.toggle('hidden', !isEval || ev.hecho);
  }

  // Muestra/esconde los campos que sólo aplican a evaluación (tipo, nota
  // máxima/obtenida) y ajusta el texto del estado (una tarea se "completa",
  // una evaluación se "entrega/rinde") — un solo lugar para esa rama, en
  // vez de repetirla en cada función que toca el form.
  function renderModalEvalFieldsVisibility() {
    var isEval = STATE.editing.kind === 'evaluacion';
    document.getElementById('eval-tipo-field').classList.toggle('hidden', !isEval);
    document.getElementById('eval-nota-field-row').classList.toggle('hidden', !isEval);
    document.getElementById('eval-nota-maxima').required = isEval;
    var hechoSel = document.getElementById('eval-hecho');
    var prevVal = hechoSel.value;
    clear(hechoSel);
    var optPend = el('option'); optPend.value = ''; optPend.textContent = 'Pendiente'; hechoSel.appendChild(optPend);
    var optDone = el('option'); optDone.value = '1'; optDone.textContent = isEval ? 'Entregado / rendido' : 'Completada'; hechoSel.appendChild(optDone);
    hechoSel.value = prevVal;
  }

  function renderModalEvalMaterias() {
    var wrap = document.getElementById('modal-eval-materias');
    clear(wrap);
    // Bloque 1: acotado al semestre activo (antes listaba materias de
    // cualquier semestre — ver README). Excepción: si se está editando una
    // evaluación cuya materia ya no es del semestre activo, se agrega igual
    // al final — si no, su chip desaparecería y la edición quedaría rota.
    var materias = computeMateriasDelActivo();
    if (STATE.editing.evalMateriaId && !materias.some(function (m) { return m.id === STATE.editing.evalMateriaId; })) {
      var materiaActual = computeMateriaById(STATE.editing.evalMateriaId);
      if (materiaActual) materias = materias.concat([materiaActual]);
    }
    materias.forEach(function (m) {
      var node = tpl('chip-materia');
      var on = STATE.editing.evalMateriaId === m.id;
      var chip = qf(node, 'chip');
      chip.textContent = truncate(m.nombre, 24);
      chip.classList.toggle('is-on', on);
      chip.style.background = on ? m.soft : '';
      chip.style.color = on ? m.strong : '';
      chip.style.borderColor = on ? m.strong : '';
      chip.addEventListener('click', function () {
        STATE.editing.evalMateriaId = m.id;
        if (STATE.editing.kind === 'evaluacion' && !STATE.editing.notaMaximaTocada) {
          STATE.editing.evalNotaMaxima = m.esc.total;
          var form = document.getElementById('form-evaluacion');
          form.notaMaxima.value = m.esc.total;
          form.nota.max = m.esc.total;
        }
        renderModalEvalMaterias();
      });
      wrap.appendChild(node);
    });
    var m = computeMateriaById(STATE.editing.evalMateriaId);
    var unidad = m ? (m.esc.tipo === 'nota' ? 'notas 0–12' : (m.esc.tipo === 'pct' ? '%' : 'pts')) : '';
    document.getElementById('modal-eval-nota-label').textContent = 'Nota obtenida (' + unidad + ', opcional)';
    document.getElementById('modal-eval-nota-maxima-label').textContent = 'Nota máxima (' + unidad + ')';
  }
  function renderModalEvalTipos() {
    var wrap = document.getElementById('modal-eval-tipos');
    clear(wrap);
    TIPOS_EVAL.concat(['Otro']).forEach(function (tipo) {
      var node = tpl('tipo-item');
      qf(node, 'label').textContent = tipo;
      node.classList.toggle('is-on', STATE.editing.evalTipo === tipo);
      node.addEventListener('click', function () { STATE.editing.evalTipo = tipo; renderModalEvalTipos(); });
      wrap.appendChild(node);
    });
    var customInput = document.getElementById('modal-eval-tipo-custom');
    customInput.classList.toggle('hidden', STATE.editing.evalTipo !== 'Otro');
    if (STATE.editing.evalTipo === 'Otro' && customInput.value !== STATE.editing.evalTipoCustom) customInput.value = STATE.editing.evalTipoCustom;
    customInput.oninput = function () { STATE.editing.evalTipoCustom = customInput.value; };
  }

  // ---- Selector de etiqueta ----
  // Reusado por el modal de Evaluación/Tarea (kind 'academico') y el de
  // Evento personal (kind 'personal') — mismos ids de STATE.editing (tagId,
  // tagNuevoAbierto, tagNuevoColor), sólo cambian los ids del DOM que le
  // pasa cada caller.
  //
  // Feedback post-Fase 5: acá sólo se elige/crea — nada de editar/eliminar
  // (ese vaivén se probó y resultó confuso: "para un view más limpio").
  // Renombrar/eliminar viven de nuevo en Ajustes (renderAjustesTags), con
  // las predeterminadas (is_default) protegidas ahí. Los presets ya no se
  // ofrecen como botones de creación rápida acá — existen siempre, sembrados
  // por ensureDefaultTagsServerSide(), así que ya aparecen como chips
  // normales de la lista de abajo.
  var TAG_PRESETS = {
    evaluacion: ['Parcial', 'Examen', 'Final', 'Oral'],
    otro: ['Estudiar', 'Leer', 'Entrega', 'Grupal']
  };
  var TAG_PRESET_COLOR = { Parcial: 'coral', Examen: 'rosa', Final: 'indigo', Oral: 'violeta', Estudiar: 'azul', Leer: 'turquesa', Entrega: 'amarillo', Grupal: 'verde' };
  function renderTagPicker(ids) {
    var wrap = document.getElementById(ids.wrap);
    clear(wrap);
    var tags = loadEventTagsRaw().filter(function (t) { return t.kind === ids.kind; });
    tags.forEach(function (t) {
      var node = tpl('chip-materia');
      var on = STATE.editing.tagId === t.id;
      var chip = qf(node, 'chip');
      var a = ACCENTS[t.colorId] || ACCENTS.gris;
      chip.textContent = truncate(t.nombre, 20);
      chip.classList.toggle('is-on', on);
      chip.style.background = a.soft;
      chip.style.color = a.text;
      chip.style.border = '1.5px solid ' + (on ? a.strong : 'transparent');
      chip.addEventListener('click', function () {
        STATE.editing.tagId = on ? null : t.id;
        renderTagPicker(ids);
      });
      wrap.appendChild(node);
    });

    var nuevoNode = tpl('chip-materia');
    var nuevoChip = qf(nuevoNode, 'chip');
    nuevoChip.textContent = '+ Nueva…';
    nuevoChip.classList.toggle('is-on', STATE.editing.tagNuevoAbierto);
    nuevoChip.addEventListener('click', function () {
      STATE.editing.tagNuevoAbierto = !STATE.editing.tagNuevoAbierto;
      renderTagPicker(ids);
      if (STATE.editing.tagNuevoAbierto) document.getElementById(ids.nuevoNombre).focus();
    });
    wrap.appendChild(nuevoNode);

    var nuevoWrap = document.getElementById(ids.nuevoWrap);
    nuevoWrap.classList.toggle('hidden', !STATE.editing.tagNuevoAbierto);
    if (STATE.editing.tagNuevoAbierto) {
      var swWrap = document.getElementById(ids.nuevoSwatches);
      clear(swWrap);
      Object.keys(ACCENTS).forEach(function (colorId) {
        var swNode = tpl('swatch');
        var strong = ACCENTS[colorId].strong;
        swNode.style.background = strong;
        var selected = STATE.editing.tagNuevoColor === colorId;
        swNode.classList.toggle('is-selected', selected);
        if (selected) swNode.style.boxShadow = '0 0 0 3px var(--c-surface), 0 0 0 5px ' + strong;
        swNode.addEventListener('click', function () { STATE.editing.tagNuevoColor = colorId; renderTagPicker(ids); });
        swWrap.appendChild(swNode);
      });
    }
    document.getElementById(ids.nuevoCrear).onclick = async function () {
      var nombreInput = document.getElementById(ids.nuevoNombre);
      var nombre = nombreInput.value.trim();
      if (!nombre) { nombreInput.focus(); return; }
      var nuevoTag = { id: uid(), nombre: nombre, kind: ids.kind, colorId: STATE.editing.tagNuevoColor || 'azul' };
      var arr = loadEventTagsRaw(); arr.push(nuevoTag);
      var btnCrear = document.getElementById(ids.nuevoCrear);
      setBtnBusy(btnCrear, true, 'Creando…');
      var ok = await saveEventTagsRaw(arr);
      setBtnBusy(btnCrear, false);
      if (!ok) { avisarError(); return; }
      STATE.editing.tagId = nuevoTag.id;
      STATE.editing.tagNuevoAbierto = false;
      nombreInput.value = '';
      renderTagPicker(ids);
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('eval-nota-maxima').addEventListener('input', function () {
      STATE.editing.notaMaximaTocada = true;
      STATE.editing.evalNotaMaxima = this.value === '' ? null : Number(this.value);
      document.getElementById('eval-nota').max = this.value || '';
    });
    document.getElementById('btn-eval-view-editar').addEventListener('click', function () {
      STATE.editing.modo = 'form';
      renderModalEvalVisibility();
    });
    // Acción rápida del modo lectura (sin pasar por "Editar"): tarea se
    // completa/despende al toque y cierra; evaluación abre el mini-modal de
    // "Asignar nota" (ver abrirAsignarNotaModal) en vez del form completo de
    // "Editar evaluación".
    document.getElementById('btn-eval-view-completar').addEventListener('click', async function () {
      var ev = agendaRawById(STATE.editing.evaluacionId);
      if (!ev) return;
      if (ev.kind === 'evaluacion') {
        abrirAsignarNotaModal(ev.id);
      } else {
        await toggleAgendaHecho(ev.id, !ev.hecho);
        closeAllModals();
      }
    });
    // "Marcar como entregado" (misma etiqueta que ya usaba row-menu-entregado
    // del long-press mobile — ver cursada-conventions, reusar antes de
    // inventar texto nuevo): rendiste pero todavía no sabés cuánto te
    // sacaste, deja la evaluación en el estado intermedio "Esperando nota"
    // (ver agendaBadgeInfo) sin forzar a cargar una nota todavía.
    document.getElementById('btn-eval-view-entregado').addEventListener('click', async function () {
      var ev = agendaRawById(STATE.editing.evaluacionId);
      if (!ev) return;
      await toggleAgendaHecho(ev.id, true);
      closeAllModals();
    });
    // Mismo patrón que #btn-perfil-logout/#btn-ajustes-logout (ver
    // cursada-conventions): dispara el click del botón real en vez de
    // duplicar el confirm()/la lógica de borrado acá.
    document.getElementById('btn-evaluacion-eliminar-view').addEventListener('click', function () {
      document.getElementById('btn-evaluacion-eliminar').click();
    });
    document.getElementById('form-evaluacion').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var isEval = STATE.editing.kind === 'evaluacion';
      var tipoFinal = isEval ? (STATE.editing.evalTipo === 'Otro' ? (STATE.editing.evalTipoCustom.trim() || 'Otro') : STATE.editing.evalTipo) : 'Tarea';
      var notaMaximaFinal = isEval ? (form.notaMaxima.value === '' ? null : Number(form.notaMaxima.value)) : null;
      var notaFinal = null;
      if (isEval && form.nota.value !== '') {
        notaFinal = Number(form.nota.value);
        // El input ya bloquea con max= (Fase 2) — este clamp es sólo la red
        // de seguridad si algo lo saltea (autofill, devtools).
        if (notaMaximaFinal != null) notaFinal = Math.min(notaFinal, notaMaximaFinal);
      }
      var record = {
        id: STATE.editing.evaluacionId || uid(),
        materiaId: STATE.editing.evalMateriaId,
        kind: STATE.editing.kind,
        tipo: tipoFinal,
        titulo: form.titulo.value.trim(),
        fecha: form.fecha.value,
        hora: form.hora.value,
        hecho: form.hecho.value === '1',
        nota: notaFinal,
        notaMaxima: notaMaximaFinal,
        notas: form.notas.value.trim(),
        tagId: STATE.editing.tagId
      };
      var accionGoogle = STATE.editing.evaluacionId ? 'update' : 'create';
      var arr = loadAgendaRaw();
      if (STATE.editing.evaluacionId) arr = arr.map(function (a) { return a.id === record.id ? record : a; });
      else arr.push(record);
      var btn = form.querySelector('button[type="submit"]');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await saveAgendaRaw(arr);
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      syncToGoogleCalendar(accionGoogle, 'agenda', record.id);
      // "Debo rendir examen" (materia.estado:'pendiente'): hasta acá la nota
      // y el estado vivían totalmente desconectados (ver README, "Cargar
      // progreso anterior en el onboarding") — la única forma de resolver
      // una pendiente era entrar a "Editar materia" y cambiar el estado a
      // mano, sin mirar siquiera la nota. Acá se decide sola en cuanto se
      // carga la nota del examen (ver resolverPendienteSiCorresponde). Sólo
      // dispara para evaluaciones con nota cargada, nunca para tareas ni
      // para una evaluación que se deja sin calificar.
      if (record.kind === 'evaluacion') await resolverPendienteSiCorresponde(record.materiaId, record.nota);
      snapshotModalForm('modal-evaluacion');
      closeAllModals();
      renderRoute();
    });
    document.getElementById('btn-evaluacion-eliminar').addEventListener('click', async function () {
      if (!STATE.editing.evaluacionId) return;
      if (!confirm('¿Eliminar esta ' + (STATE.editing.kind === 'tarea' ? 'tarea' : 'evaluación') + '?')) return;
      var id = STATE.editing.evaluacionId;
      await syncToGoogleCalendar('delete', 'agenda', id);
      var ok = await saveAgendaRaw(loadAgendaRaw().filter(function (a) { return a.id !== id; }));
      if (!ok) avisarError();
      snapshotModalForm('modal-evaluacion');
      closeAllModals();
      renderRoute();
    });
  });

  // Mini-modal "Cargar nota" para materias "debo rendir examen" — a
  // diferencia de "Nueva evaluación" (título/fecha/tipo/etiqueta, pensado
  // para llevar la agenda de parciales) esto es un solo campo: cuánto te
  // sacaste en el examen. Se usa desde la card "Materias pendientes" de
  // Progreso y desde "Cargar nota" en Detalle cuando la materia está
  // pendiente (ver renderProgresoPendientes/renderDetalle). Guarda una
  // evaluación tipo "Examen" (mismo saveAgendaRaw que el resto, la nota
  // vive en la evaluación, nunca en la materia — ver README) y dispara
  // resolverPendienteSiCorresponde() para el pasaje automático a Aprobada.
  var CARGAR_EXAMEN_MATERIA_ID = null;
  function abrirCargarNotaExamenModal(materiaId) {
    var m = computeMateriaById(materiaId);
    if (!m) return;
    CARGAR_EXAMEN_MATERIA_ID = materiaId;
    document.getElementById('modal-cargar-examen-title').textContent = 'Cargar nota — ' + m.nombre;
    document.getElementById('modal-cargar-examen-sub').textContent = 'El examen se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '. Si llega al mínimo, la materia pasa a Aprobada sola; si no, seguís figurando pendiente para volver a rendir.';
    document.getElementById('cargar-examen-label').textContent = 'Nota del examen (' + (m.esc.tipo === 'nota' ? '0–12' : (m.esc.tipo === 'pct' ? '%' : 'sobre ' + val(m.esc.total, m.esc))) + ')';
    var input = document.getElementById('cargar-examen-nota');
    input.value = '';
    input.min = '0'; input.max = String(m.esc.total); input.step = m.esc.tipo === 'nota' ? '0.1' : '1';
    openModal('modal-cargar-examen');
    setTimeout(function () { input.focus(); }, 0);
  }
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('form-cargar-examen');
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var materiaId = CARGAR_EXAMEN_MATERIA_ID;
      var m = computeMateriaById(materiaId);
      if (!m) return;
      var input = document.getElementById('cargar-examen-nota');
      var v = input.value.trim();
      if (v === '' || isNaN(Number(v))) { input.focus(); return; }
      // El input ya bloquea con max= — este clamp es la red de seguridad si
      // algo lo saltea (autofill, devtools), mismo patrón que el resto de
      // los inputs de nota (ver renderProgresoPendientesModal).
      var n = Math.max(0, Math.min(Number(v), m.esc.total));
      var btn = document.getElementById('btn-cargar-examen-guardar');
      setBtnBusy(btn, true, 'Guardando…');
      var nueva = { id: uid(), materiaId: materiaId, kind: 'evaluacion', tipo: 'Examen', titulo: 'Examen', fecha: todayISO(), hora: '', hecho: true, nota: n, notaMaxima: m.esc.total, notas: '' };
      var ok = await saveAgendaRaw(loadAgendaRaw().concat([nueva]));
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      syncToGoogleCalendar('create', 'agenda', nueva.id);
      await resolverPendienteSiCorresponde(materiaId, n);
      closeAllModals();
      renderRoute();
    });
    // Para cuando la materia "Debo rendir examen" se cargó mal (equivocada,
    // duplicada, o el usuario en realidad nunca la cursó) — antes la única
    // acción posible acá era cargarle una nota, no había forma de sacarla.
    document.getElementById('btn-cargar-examen-eliminar').addEventListener('click', async function () {
      var materiaId = CARGAR_EXAMEN_MATERIA_ID;
      if (!materiaId) return;
      var ok = await eliminarMateriaId(materiaId);
      if (!ok) return;
      closeAllModals();
      renderRoute();
    });
  });

  // Mini-modal "Asignar nota" para una evaluación puntual ya agendada — el
  // botón "Asignar nota"/"Cambiar nota" del modo lectura de #modal-evaluacion
  // (ver renderModalEvalViewContent) antes reusaba el form completo de
  // "Editar evaluación" enfocando el campo de nota, lo que se sentía como
  // editar toda la evaluación para cargar un solo número. Mismo patrón que
  // abrirCargarNotaExamenModal de arriba, pero actualiza una evaluación
  // existente en vez de crear una nueva (y por eso precarga la nota actual
  // si ya tenía una — "Cambiar nota").
  var ASIGNAR_NOTA_EVALUACION_ID = null;
  function abrirAsignarNotaModal(evaluacionId) {
    var ev = agendaRawById(evaluacionId);
    if (!ev) return;
    var m = computeMateriaById(ev.materiaId);
    var escRef = m ? m.esc : { tipo: 'puntos' };
    var total = ev.notaMaxima != null ? ev.notaMaxima : (m ? m.esc.total : null);
    ASIGNAR_NOTA_EVALUACION_ID = evaluacionId;
    closeAllModals();
    document.getElementById('modal-asignar-nota-title').textContent = 'Asignar nota — ' + ev.titulo;
    document.getElementById('modal-asignar-nota-sub').textContent = m ? ('Se guarda en ' + m.nombre + '.') : '';
    document.getElementById('asignar-nota-label').textContent = 'Nota' + (total != null ? (' (sobre ' + val(total, escRef) + ')') : '');
    var input = document.getElementById('asignar-nota-nota');
    input.value = ev.nota != null ? ev.nota : '';
    input.min = '0';
    if (total != null) input.max = String(total);
    input.step = escRef.tipo === 'nota' ? '0.1' : '1';
    openModal('modal-asignar-nota');
    setTimeout(function () { input.focus(); input.select(); }, 0);
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('form-asignar-nota').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var item = agendaRawById(ASIGNAR_NOTA_EVALUACION_ID);
      if (!item) return;
      var input = document.getElementById('asignar-nota-nota');
      var v = input.value.trim();
      if (v === '' || isNaN(Number(v))) { input.focus(); return; }
      var m = computeMateriaById(item.materiaId);
      var total = item.notaMaxima != null ? item.notaMaxima : (m ? m.esc.total : null);
      // Mismo clamp de red-de-seguridad que abrirCargarNotaExamenModal/
      // form-evaluacion (el input ya bloquea con max=, esto cubre autofill/devtools).
      var n = total != null ? Math.max(0, Math.min(Number(v), total)) : Math.max(0, Number(v));
      var record = Object.assign({}, item, { nota: n, hecho: true });
      var btn = document.getElementById('btn-asignar-nota-guardar');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await saveAgendaRaw(loadAgendaRaw().map(function (a) { return a.id === record.id ? record : a; }));
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      syncToGoogleCalendar('update', 'agenda', record.id);
      await resolverPendienteSiCorresponde(record.materiaId, record.nota);
      closeAllModals();
      renderRoute();
    });
  });

  // ---- Modal cargar nota (wizard: materia → evaluación pendiente → nota) ----
  // Hasta acá "cargar la nota de una evaluación ya agendada" sólo se podía
  // hacer entrando a Detalle y tocando la fila puntual, o abriendo el
  // mini-modal "Asignar nota" de arriba (ver abrirAsignarNotaModal). Este
  // wizard es la versión "no me acuerdo cuál era": elegís la materia,
  // después cuál de sus evaluaciones sin nota es, y por último la nota —
  // pensado sobre todo para "Cargar primera nota" en el Progreso vacío
  // (antes ese botón sólo hacía location.hash = '#agenda' sin abrir nada,
  // ver el bindeo de #btn-progreso-semestre-cargar más abajo). Mismo
  // patrón de wizard que openMateriaModal/materiaAplicarPaso (steps-track +
  // Atrás/Continuar), pero siempre 3 pasos fijos — acá no hay un modo
  // "edición junta" como en materia, esto siempre arranca de cero.
  var CARGARNOTA_PASOS = [
    { sub: 'Elegí la materia de la que querés cargar una nota.' },
    { sub: 'Elegí cuál evaluación pendiente es.' },
    { sub: 'Cuánto te sacaste — se guarda en esa evaluación.' }
  ];
  // "Pendiente de nota" = evaluación (nunca una tarea) sin nota cargada
  // todavía — mismo criterio que m.notasEvals/m.evaluaciones en computeMateria.
  function materiasConPendientes() {
    return computeMaterias().filter(function (m) { return m.evaluaciones.some(function (a) { return a.nota == null; }); });
  }
  function openCargarNotaModal() {
    var materias = materiasConPendientes();
    // Sin ninguna evaluación pendiente de calificar (incluye "todavía no
    // cargó ninguna evaluación"): no hay nada entre qué elegir, así que en
    // vez de un wizard vacío se va directo a crear una evaluación nueva —
    // mismo espíritu que el guard de openEvaluacionModal con cero materias.
    if (!materias.length) { openEvaluacionModal({ kind: 'evaluacion' }); return; }
    STATE.editing = { cnStep: 0, cnMateriaId: materias[0].id, cnEvaluacionId: null };
    renderCargarNotaMaterias();
    cargarNotaAplicarPaso();
    openModal('modal-cargar-nota');
  }
  function renderCargarNotaMaterias() {
    var wrap = document.getElementById('modal-cargarnota-materias');
    clear(wrap);
    materiasConPendientes().forEach(function (m) {
      var node = tpl('chip-materia');
      var on = STATE.editing.cnMateriaId === m.id;
      var chip = qf(node, 'chip');
      chip.textContent = truncate(m.nombre, 24);
      chip.classList.toggle('is-on', on);
      chip.style.background = on ? m.soft : '';
      chip.style.color = on ? m.strong : '';
      chip.style.borderColor = on ? m.strong : '';
      chip.addEventListener('click', function () {
        if (STATE.editing.cnMateriaId === m.id) return;
        STATE.editing.cnMateriaId = m.id;
        STATE.editing.cnEvaluacionId = null;
        renderCargarNotaMaterias();
      });
      wrap.appendChild(node);
    });
  }
  // Por defecto selecciona la primera pendiente (igual que el materiaStep 0
  // ya arranca con una materia elegida) — así "Continuar" nunca queda
  // esperando una selección que nadie hizo todavía, sólo se cambia si el
  // usuario toca otra fila.
  function renderCargarNotaEvaluaciones() {
    var m = computeMateriaById(STATE.editing.cnMateriaId);
    var pendientes = m ? m.evaluaciones.filter(function (a) { return a.nota == null; }) : [];
    if (!STATE.editing.cnEvaluacionId && pendientes.length) STATE.editing.cnEvaluacionId = pendientes[0].id;
    var wrap = document.getElementById('modal-cargarnota-evals');
    clear(wrap);
    pendientes.forEach(function (a) {
      var node = tpl('wiz-item-row');
      node.classList.add('is-radio');
      node.classList.toggle('is-on', STATE.editing.cnEvaluacionId === a.id);
      qf(node, 'titulo').textContent = a.titulo;
      qf(node, 'meta').textContent = [a.tipo, formatFechaAgenda(a.fecha, a.hora)].filter(Boolean).join(' · ');
      node.addEventListener('click', function () {
        STATE.editing.cnEvaluacionId = a.id;
        renderCargarNotaEvaluaciones();
      });
      wrap.appendChild(node);
    });
  }
  function renderCargarNotaNota() {
    var m = computeMateriaById(STATE.editing.cnMateriaId);
    var a = STATE.editing.cnEvaluacionId ? agendaRawById(STATE.editing.cnEvaluacionId) : null;
    if (!m || !a) return;
    var total = a.notaMaxima != null ? a.notaMaxima : m.esc.total;
    document.getElementById('cargarnota-nota-label').textContent = 'Nota — ' + a.titulo + ' (' + (m.esc.tipo === 'nota' ? '0–12' : (m.esc.tipo === 'pct' ? '%' : 'sobre ' + val(total, m.esc))) + ')';
    var input = document.getElementById('cargarnota-nota');
    input.value = '';
    input.min = '0'; input.max = String(total); input.step = m.esc.tipo === 'nota' ? '0.1' : '1';
  }
  function cargarNotaAplicarPaso() {
    var idx = STATE.editing.cnStep;
    var last = CARGARNOTA_PASOS.length - 1;
    document.querySelectorAll('.cn-step').forEach(function (s) { s.classList.toggle('hidden', Number(s.getAttribute('data-cn-step')) !== idx); });
    var track = document.getElementById('cargarnota-steps-track');
    track.querySelectorAll('.dot').forEach(function (d, i) { d.classList.toggle('is-done', i < idx); d.classList.toggle('is-current', i === idx); });
    document.getElementById('btn-cargarnota-atras').classList.toggle('hidden', idx === 0);
    document.getElementById('modal-cargarnota-sub').textContent = CARGARNOTA_PASOS[idx].sub;
    var hint = document.getElementById('modal-cargarnota-hint');
    hint.classList.toggle('hidden', idx !== last);
    hint.textContent = idx === last ? 'Si esta era la última que faltaba, tu promedio se actualiza solo.' : '';
    document.getElementById('btn-cargarnota-continuar').textContent = idx === last ? 'Guardar nota' : 'Continuar';
    if (idx === 1) renderCargarNotaEvaluaciones();
    if (idx === 2) renderCargarNotaNota();
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-cargarnota-atras').addEventListener('click', function () {
      if (STATE.editing.cnStep > 0) { STATE.editing.cnStep--; cargarNotaAplicarPaso(); }
    });
    document.getElementById('btn-cargarnota-continuar').addEventListener('click', function () {
      var last = CARGARNOTA_PASOS.length - 1;
      if (STATE.editing.cnStep === last) { document.getElementById('form-cargar-nota').requestSubmit(); return; }
      STATE.editing.cnStep++;
      cargarNotaAplicarPaso();
    });
    document.getElementById('form-cargar-nota').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var m = computeMateriaById(STATE.editing.cnMateriaId);
      var item = STATE.editing.cnEvaluacionId ? agendaRawById(STATE.editing.cnEvaluacionId) : null;
      if (!m || !item) return;
      var input = document.getElementById('cargarnota-nota');
      var v = input.value.trim();
      if (v === '' || isNaN(Number(v))) { input.focus(); return; }
      // Mismo clamp de red-de-seguridad que abrirCargarNotaExamenModal/
      // form-evaluacion (el input ya bloquea con max=, esto cubre autofill/devtools).
      var total = item.notaMaxima != null ? item.notaMaxima : m.esc.total;
      var n = Math.max(0, Math.min(Number(v), total));
      var record = Object.assign({}, item, { nota: n, hecho: true });
      var btn = document.getElementById('btn-cargarnota-continuar');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await saveAgendaRaw(loadAgendaRaw().map(function (a) { return a.id === record.id ? record : a; }));
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      syncToGoogleCalendar('update', 'agenda', record.id);
      await resolverPendienteSiCorresponde(record.materiaId, record.nota);
      closeAllModals();
      renderRoute();
    });
  });

  // ---- Modal personal ----
  function openPersonalModal(opts) {
    opts = opts || {};
    var p = opts.editId ? personalRawById(opts.editId) : null;
    STATE.editing = { personalId: opts.editId || null, todoElDia: p ? !!p.todoElDia : false, tagId: p ? p.tagId : null, tagNuevoAbierto: false, tagNuevoColor: 'azul' };
    document.getElementById('btn-personal-eliminar').classList.toggle('hidden', !p);
    var form = document.getElementById('form-personal');
    form.reset();
    form.titulo.value = p ? p.titulo : '';
    form.fecha.value = p ? p.fecha : (opts.fecha || todayISO());
    form.hora.value = p ? (p.hora || '') : '';
    renderPersonalToggle();
    renderTagPicker({ wrap: 'modal-personal-tags', kind: 'personal', presetKind: 'otro', nuevoWrap: 'modal-personal-tag-nueva', nuevoNombre: 'modal-personal-tag-nueva-nombre', nuevoSwatches: 'modal-personal-tag-nueva-swatches', nuevoCrear: 'modal-personal-tag-nueva-crear' });
    openModal('modal-personal');
    snapshotModalForm('modal-personal');
  }
  function renderPersonalToggle() {
    var sw = document.getElementById('toggle-todo-el-dia');
    sw.classList.toggle('is-on', STATE.editing.todoElDia);
    var horaField = document.getElementById('modal-personal-hora-field');
    horaField.style.opacity = STATE.editing.todoElDia ? '.4' : '1';
    horaField.querySelector('input').disabled = STATE.editing.todoElDia;
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('toggle-todo-el-dia').addEventListener('click', function () {
      STATE.editing.todoElDia = !STATE.editing.todoElDia;
      renderPersonalToggle();
    });
    document.getElementById('form-personal').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var record = {
        id: STATE.editing.personalId || uid(),
        titulo: form.titulo.value.trim(),
        fecha: form.fecha.value,
        hora: STATE.editing.todoElDia ? '' : form.hora.value,
        todoElDia: !!STATE.editing.todoElDia,
        tagId: STATE.editing.tagId
      };
      var accionGoogle = STATE.editing.personalId ? 'update' : 'create';
      var arr = loadPersonalRaw();
      if (STATE.editing.personalId) arr = arr.map(function (p) { return p.id === record.id ? record : p; });
      else arr.push(record);
      var btn = form.querySelector('button[type="submit"]');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await savePersonalRaw(arr);
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      syncToGoogleCalendar(accionGoogle, 'personal', record.id);
      snapshotModalForm('modal-personal');
      closeAllModals();
      renderRoute();
    });
    document.getElementById('btn-personal-eliminar').addEventListener('click', async function () {
      if (!STATE.editing.personalId) return;
      if (!confirm('¿Eliminar este evento?')) return;
      var id = STATE.editing.personalId;
      await syncToGoogleCalendar('delete', 'personal', id);
      var ok = await savePersonalRaw(loadPersonalRaw().filter(function (p) { return p.id !== id; }));
      if (!ok) avisarError();
      snapshotModalForm('modal-personal');
      closeAllModals();
      renderRoute();
    });
  });

  // ================================================================
  // ONBOARDING
  // ================================================================
  function showOnboarding() {
    var right = document.getElementById('ob-right');
    clear(right);
    computeMateriasDelActivo().slice(0, 3).forEach(function (m) {
      var card = el('div', 'card'); card.style.cssText = 'padding:18px;display:flex;flex-direction:column;gap:11px';
      var top = el('div'); top.style.cssText = 'display:flex;align-items:center;justify-content:space-between';
      var chip = el('span'); chip.setAttribute('style', chipStyle(m.colorId)); chip.textContent = truncate(m.doc, 18);
      var meta = el('span', 'mono'); meta.style.cssText = 'font-size:11px;color:var(--c-ink3)'; meta.textContent = m.badgeLabel;
      top.appendChild(chip); top.appendChild(meta);
      var nombre = el('span'); nombre.style.cssText = 'font-family:var(--font-display);font-size:17px;font-weight:600;letter-spacing:-.01em'; nombre.textContent = m.nombre;
      var row = el('div'); row.style.cssText = 'display:flex;align-items:center;gap:12px';
      var ring = el('div'); ring.setAttribute('style', ringStyle(m.actual, TONE[m.tone], 46, m.esc.total));
      var inner = el('div'); inner.setAttribute('style', ringInnerStyle(46, 5));
      var v = el('span', 'mono'); v.style.cssText = 'font-size:13px;font-weight:600'; v.textContent = m.notaTxt;
      inner.appendChild(v); ring.appendChild(inner);
      var det = el('span', 'mono'); det.style.cssText = 'font-size:11px;color:var(--c-ink2)'; det.textContent = 'aprueba con ' + m.aprobTxt + ' · ' + m.horario;
      row.appendChild(ring); row.appendChild(det);
      card.appendChild(top); card.appendChild(nombre); card.appendChild(row);
      right.appendChild(card);
    });
    document.getElementById('onboarding').classList.remove('hidden');
  }
  function hideOnboarding() { document.getElementById('onboarding').classList.add('hidden'); }

  // ================================================================
  // WIZARD DE ONBOARDING (catálogo académico — sólo ORT por ahora)
  // ================================================================
  // Se dispara en vez de #onboarding cuando el usuario no tiene materias Y
  // su institución tiene catálogo cargado (ver mostrarOnboardingOCatalogo,
  // sección INIT/SESIÓN más abajo). Siempre salteable ("Prefiero cargarlo a
  // mano", visible en todos los pasos) y reingresable desde Ajustes
  // (btn-rehacer-onboarding) — las RPCs de escritura son idempotentes
  // (aclarado en el enunciado), así que reintentar o re-ejecutar el wizard
  // entero no duplica nada.
  var WIZ_PASOS = ['carrera', 'progreso', 'semestre', 'oferta', 'electivas', 'revision'];
  var WIZ = null; // se inicializa en abrirWizard()

  function wizEstadoInicial() {
    return {
      pasoIdx: 0,
      carreraId: null,
      semestreId: null,
      semestresElegidos: [],
      gruposPorSemestre: {}, // { semestre: [fila cat_grupos] } — cache, uno o ninguno por semestre
      caminoPorSemestre: {}, // { semestre: 'rapido'|'manual' } — override explícito del usuario para ESE semestre (default: 'rapido' si tiene grupos, si no 'manual')
      gruposElegidosPorSemestre: {}, // { semestre: { grupo_id: fila cruda de cat_grupos, con .materias ya resuelto } } — más de un grupo por semestre (ej. una materia del grupo matutino y otra del nocturno)
      grupoMateriasExcluidasPorSemestre: {}, // { semestre: { dictado_id: true } } — materias de los grupos elegidos que el usuario destildó
      dictadosManualPorSemestre: {}, // { semestre: [fila cat_dictados], ya filtrado por el turno de ESE semestre }
      dictadosManualTodos: [], // cat_dictados sin filtrar por turno, de todos los semestres en camino manual — cache para no repetir la RPC al tocar cualquier toggle de turno
      dictadosManualCargadoPorSemestre: {}, // { semestre: true } — ya se pidió cat_dictados para este semestre, no repetir la RPC
      dictadosManualTurnoPorSemestre: {}, // { semestre: turno elegido } — un toggle por semestre, no uno global (feedback: con 2+ semestres en turnos distintos, un solo toggle para todos era poco intuitivo)
      materiasSugeridasPorSemestre: {}, // { semestre: [fila cat_materias_sugeridas] } — sólo semestres sin dictados cargados
      dictadoIdsElegidos: {}, // { dictado_id: fila } — camino manual, cruza semestres
      materiaIdsSinHorario: {}, // { materia_id: fila } — fallback de cat_materias_sugeridas
      aprobadasPorSemestre: {}, // { semestre: [fila cat_materias_sugeridas] } — plan completo 1..8, paso "progreso"
      aprobadasIdsElegidas: {}, // { materia_id: fila } — tildadas como ya aprobadas
      aprobadasIdsYaCargadas: {}, // { materia_id: true } — ya existen como materia estado:'aprobada' del usuario (reingreso al wizard); pre-tildadas y deshabilitadas, nunca se vuelven a crear
      pendientesIdsElegidas: {}, // { materia_id: fila } — cursada pero no aprobada, falta rendir examen (se crea con estado:'pendiente')
      pendientesIdsYaCargadas: {}, // { materia_id: true } — ídem aprobadasIdsYaCargadas, para materias estado:'pendiente' ya existentes
      electivas: [], // último resultado de cat_electivas (turno actual)
      electivaTurno: null,
      electivaIdsElegidos: {}, // { dictado_id: fila }
      conflictos: []
    };
  }

  function wizMostrarPaso(idx) {
    WIZ.pasoIdx = idx;
    WIZ_PASOS.forEach(function (p, i) { document.getElementById('wiz-panel-' + p).classList.toggle('hidden', i !== idx); });
    // Mini-onboarding de "nuevo semestre" (ver abrirWizardNuevoSemestre): el
    // flujo arranca en "semestre", no en "carrera" — el primer paso real para
    // efectos de dots/Atrás es ése, no el índice 0 del array completo.
    var primerPaso = WIZ.soloNuevoSemestre ? WIZ_PASOS.indexOf('semestre') : 0;
    var track = document.getElementById('wiz-steps-track');
    clear(track);
    WIZ_PASOS.forEach(function (p, i) {
      if (i < primerPaso) return;
      track.appendChild(el('span', 'dot' + (i < idx ? ' is-done' : '') + (i === idx ? ' is-current' : '')));
    });
    document.getElementById('btn-wiz-atras').classList.toggle('hidden', idx === primerPaso);
    document.getElementById('btn-wiz-continuar').textContent = idx === WIZ_PASOS.length - 1 ? 'Confirmar' : 'Continuar';
    document.getElementById('wiz-error').classList.add('hidden');
  }

  function wizMostrarError(msg) {
    var e = document.getElementById('wiz-error');
    e.textContent = msg; e.classList.remove('hidden');
  }

  // Salida manual, disponible en todos los pasos — el catálogo acelera,
  // nunca obliga (regla 1 del enunciado). Mismo destino que el botón de
  // #onboarding: a #materias si ya hay algo cargado (p. ej. reingresando
  // desde Ajustes), si no, directo al modal de alta manual.
  function wizSalirAManual() {
    document.getElementById('wizard-onboarding').classList.add('hidden');
    hideOnboarding();
    if (computeMaterias().length) location.hash = '#materias';
    else openMateriaModal(null);
  }

  async function abrirWizard() {
    WIZ = wizEstadoInicial();
    document.getElementById('wizard-onboarding').classList.remove('hidden');
    wizMostrarPaso(0);
    await wizCargarCarreras();
  }

  // Atajo a sólo el paso "progreso" del wizard (¿ya aprobaste materias?),
  // para cuando al usuario le faltó tildar una materia y no quiere volver a
  // pasar por carrera/semestre/oferta/electivas para agregarla — antes la
  // única entrada a este paso era "Rehacer configuración inicial", que
  // rehace el wizard entero. Reusa WIZ.carreraId ya guardado en el perfil
  // (por eso sólo tiene sentido si CURRENT_PROFILE.carrera_id ya existe, ver
  // toggle del botón en openAjustesModal) y wizCrearMateriasAprobadas() sola
  // — esa función no toca nada del semestre activo, sólo crea materias
  // "Aprobada"/"Pendiente" en un semestre histórico (ver su comentario) —
  // así "Guardar" acá no reabre ni duplica nada de la oferta ya armada.
  // Atrás/steps-track se ocultan: no hay a dónde volver ni pasos restantes
  // que mostrar en este modo.
  async function abrirWizardProgreso() {
    WIZ = wizEstadoInicial();
    WIZ.carreraId = CURRENT_PROFILE.carrera_id;
    WIZ.soloProgreso = true;
    document.getElementById('wizard-onboarding').classList.remove('hidden');
    wizMostrarPaso(WIZ_PASOS.indexOf('progreso'));
    document.getElementById('btn-wiz-atras').classList.add('hidden');
    document.getElementById('wiz-steps-track').classList.add('hidden');
    document.getElementById('btn-wiz-continuar').textContent = 'Guardar';
    await wizCargarProgresoAnterior();
  }

  // Mini-onboarding para "Crear semestre" (ver crearSemestreConOnboarding, en
  // la sección SEMESTRES) — mismo wizard de catálogo que el onboarding
  // inicial, saltando "carrera" (ya elegida) y "progreso" (no aplica: es un
  // semestre adicional, no la primera carga). `semestreId` ya viene fijo al
  // que se acaba de crear (activo, vacío) — a diferencia del paso "semestre"
  // del onboarding normal, wizContinuar() NO debe pisarlo llamando a
  // obtenerOCrearSemestrePeriodo() acá (esa función reusaría/reactivaría el
  // semestre existente del período actual — el que se está por dejar de
  // estar activo — en vez de éste, nuevo). El resto del flujo (oferta,
  // electivas, revisión, confirmar) es exactamente el mismo código que el
  // onboarding inicial: las RPCs de aplicar_* sólo tocan el semestre_id que
  // se les pasa, así que el semestre que se estaba cursando antes queda
  // intacto salvo por su flag `activo` (ver crearSemestreConOnboarding).
  async function abrirWizardNuevoSemestre(semestreId, carreraId) {
    WIZ = wizEstadoInicial();
    WIZ.carreraId = carreraId;
    WIZ.semestreId = semestreId;
    WIZ.soloNuevoSemestre = true;
    document.getElementById('wizard-onboarding').classList.remove('hidden');
    document.getElementById('wiz-steps-track').classList.remove('hidden');
    wizMostrarPaso(WIZ_PASOS.indexOf('semestre'));
    wizRenderSemestrePills();
  }

  // ---- Paso 1: institución y carrera ----
  async function wizCargarCarreras() {
    var lista = document.getElementById('wiz-carreras-list');
    clear(lista);
    var loading = el('span'); loading.style.cssText = 'font-size:13px;color:var(--c-ink3)'; loading.textContent = 'Cargando carreras…';
    lista.appendChild(loading);
    try {
      var carreras = await rpc('cat_carreras_de', { p_university_id: ORT_UNIVERSITY_ID });
      clear(lista);
      // Nunca dejar al usuario en una lista vacía (regla 1 del enunciado):
      // si el catálogo no trajo ninguna carrera, directo al alta manual.
      if (!carreras || !carreras.length) { wizSalirAManual(); return; }
      carreras.forEach(function (c) {
        var node = tpl('wiz-carrera-card');
        // plan_version tiene que ganarle en jerarquía visual al nombre —
        // elegir el plan equivocado desalinea toda la sugerencia de
        // materias del resto del wizard (regla explícita del enunciado).
        // Se acepta más de un nombre de campo por si la RPC real no usa
        // literalmente `plan_version` (no se pudo confirmar contra la base
        // real — ver README). Si no viene ninguno Y hay más de una carrera
        // con el mismo nombre en la lista (el caso real que este badge
        // existe para resolver), no se puede simplemente ocultar la
        // etiqueta — quedarían dos tarjetas idénticas e imposibles de
        // distinguir. En ese caso se muestra "Plan no informado" en vez de
        // nada; si el nombre no se repite, no hace falta desambiguar nada
        // y sí se oculta.
        var plan = c.plan_version || c.planVersion || c.plan || '';
        var ambiguo = !plan && carreras.filter(function (x) { return x.nombre === c.nombre; }).length > 1;
        var badgePlan = qf(node, 'plan');
        badgePlan.textContent = plan || (ambiguo ? 'Plan no informado' : '');
        badgePlan.classList.toggle('hidden', !plan && !ambiguo);
        qf(node, 'nombre').textContent = c.nombre;
        qf(node, 'facultad').textContent = c.facultad || '';
        node.classList.toggle('is-on', WIZ.carreraId === c.id);
        node.addEventListener('click', function () {
          WIZ.carreraId = c.id;
          lista.querySelectorAll('.wiz-carrera-card').forEach(function (n) { n.classList.remove('is-on'); });
          node.classList.add('is-on');
        });
        lista.appendChild(node);
      });
    } catch (e) {
      clear(lista);
      wizMostrarError(e.message || 'No se pudo cargar el catálogo de carreras.');
    }
  }

  // ---- Paso 2: progreso anterior (materias ya aprobadas de esta carrera) ----
  // Reusa cat_materias_sugeridas (misma RPC del fallback "sin horario" del
  // paso de oferta) pidiendo el plan completo semestre por semestre — acá no
  // interesa dictado_id/bloques, sólo nombre/créditos/semestre_sugerido.
  async function wizCargarProgresoAnterior() {
    var wrap = document.getElementById('wiz-progreso-list');
    clear(wrap);
    var loading = el('span'); loading.style.cssText = 'font-size:13px;color:var(--c-ink3)'; loading.textContent = 'Cargando el plan de tu carrera…';
    wrap.appendChild(loading);
    try {
      var resultados = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(function (s) {
        return rpc('cat_materias_sugeridas', { p_carrera_id: WIZ.carreraId, p_semestre: s, p_periodo: PERIODO_ACTUAL });
      }));
      WIZ.aprobadasPorSemestre = {};
      // Bloque 4: se etiqueta cada fila con su número de semestre del plan
      // (semestre_sugerido) — wizCrearMateriasAprobadas lo necesita para
      // agruparlas en el semestre histórico correspondiente.
      [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (s, i) {
        WIZ.aprobadasPorSemestre[s] = (resultados[i] || []).map(function (m) { return Object.assign({}, m, { semestre_sugerido: s }); });
      });
      // Pre-marcar (y bloquear) lo que ya está cargado del lado del usuario
      // — nunca se vuelve a crear al reingresar al wizard (ver
      // btn-rehacer-onboarding), ni se borra si se destilda acá. Mismo
      // criterio para 'aprobada' y 'pendiente' (debo rendir examen).
      var yaAprobadasPorCatalogoId = {}, yaPendientesPorCatalogoId = {};
      loadMateriasRaw().forEach(function (m) {
        if (!m.catalogoMateriaId) return;
        if (m.estado === 'aprobada') yaAprobadasPorCatalogoId[m.catalogoMateriaId] = true;
        else if (m.estado === 'pendiente') yaPendientesPorCatalogoId[m.catalogoMateriaId] = true;
      });
      WIZ.aprobadasIdsYaCargadas = yaAprobadasPorCatalogoId;
      WIZ.pendientesIdsYaCargadas = yaPendientesPorCatalogoId;
      [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (s) {
        WIZ.aprobadasPorSemestre[s].forEach(function (m) {
          if (yaAprobadasPorCatalogoId[m.materia_id]) WIZ.aprobadasIdsElegidas[m.materia_id] = m;
          else if (yaPendientesPorCatalogoId[m.materia_id]) WIZ.pendientesIdsElegidas[m.materia_id] = m;
        });
      });
      wizRenderProgresoAnterior();
    } catch (e) {
      clear(wrap);
      wizMostrarError(e.message || 'No se pudo cargar el plan de tu carrera.');
    }
  }

  // Cada materia tiene 3 estados posibles acá (mutuamente excluyentes): sin
  // marcar, Aprobada, o Debo rendir examen (la cursó pero no llegó al
  // mínimo — se crea como materia estado:'pendiente', no 'aprobada'; ver
  // wizCrearMateriasAprobadas). Dos botones chicos en vez de un único
  // check, para dejar los tres estados a un solo click de distancia.
  function wizRenderProgresoAnterior() {
    var wrap = document.getElementById('wiz-progreso-list');
    clear(wrap);
    var huboAlguna = false;
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (s) {
      var materias = WIZ.aprobadasPorSemestre[s] || [];
      if (!materias.length) return;
      huboAlguna = true;
      var titulo = el('span'); titulo.style.cssText = 'font-size:12px;font-weight:700;color:var(--c-ink2);letter-spacing:.04em;text-transform:uppercase;margin-top:8px';
      titulo.textContent = 'Semestre ' + s;
      wrap.appendChild(titulo);
      materias.forEach(function (m) {
        var yaAprobada = !!WIZ.aprobadasIdsYaCargadas[m.materia_id];
        var yaPendiente = !!WIZ.pendientesIdsYaCargadas[m.materia_id];
        var yaCargada = yaAprobada || yaPendiente;
        var node = tpl('wiz-progreso-row');
        qf(node, 'titulo').textContent = m.nombre;
        qf(node, 'meta').textContent = (m.creditos ? m.creditos + ' créditos' : '') + (m.obligatoria === false ? ' · electiva de plan' : '');
        var acciones = qf(node, 'acciones');
        var btnAprobada = el('button', 'wiz-status-btn'); btnAprobada.type = 'button'; btnAprobada.textContent = 'Aprobada';
        var btnPendiente = el('button', 'wiz-status-btn'); btnPendiente.type = 'button'; btnPendiente.textContent = 'Debo rendir examen';
        function refrescar() {
          btnAprobada.classList.toggle('is-on', !!WIZ.aprobadasIdsElegidas[m.materia_id]);
          btnPendiente.classList.toggle('is-on', !!WIZ.pendientesIdsElegidas[m.materia_id]);
        }
        if (yaCargada) {
          btnAprobada.disabled = true; btnPendiente.disabled = true;
          var badge = qf(node, 'badge'); badge.classList.remove('hidden'); badge.textContent = yaAprobada ? 'Ya cargada' : 'Ya cargada · pendiente'; badge.setAttribute('style', badgeStyle('neutral'));
        } else {
          btnAprobada.addEventListener('click', function () {
            if (WIZ.aprobadasIdsElegidas[m.materia_id]) delete WIZ.aprobadasIdsElegidas[m.materia_id];
            else { WIZ.aprobadasIdsElegidas[m.materia_id] = m; delete WIZ.pendientesIdsElegidas[m.materia_id]; }
            refrescar();
          });
          btnPendiente.addEventListener('click', function () {
            if (WIZ.pendientesIdsElegidas[m.materia_id]) delete WIZ.pendientesIdsElegidas[m.materia_id];
            else { WIZ.pendientesIdsElegidas[m.materia_id] = m; delete WIZ.aprobadasIdsElegidas[m.materia_id]; }
            refrescar();
          });
        }
        refrescar();
        acciones.appendChild(btnAprobada); acciones.appendChild(btnPendiente);
        wrap.appendChild(node);
      });
    });
    if (!huboAlguna) {
      var empty = el('span'); empty.style.cssText = 'font-size:13px;color:var(--c-ink3)';
      empty.textContent = 'Todavía no hay materias cargadas en el plan de esta carrera.';
      wrap.appendChild(empty);
    }
  }

  // Crea, al confirmar el wizard, una materia real por cada tildada acá —
  // mismo criterio de esc/color que wizReconciliarMateriasCreadas() más
  // abajo, pero sin dictado/horario (son materias ya aprobadas, no algo que
  // se esté cursando). semestreId apunta a un semestre HISTÓRICO (uno por
  // cada semestre_sugerido presente, ver obtenerOCrearSemestreHistorico) —
  // no a ninguno de los semestres propios del usuario, pero sí a algo que
  // Progreso puede agrupar (Bloque 4 — antes quedaba null y esas materias
  // no aparecían en ningún lado de Progreso).
  async function wizCrearMateriasAprobadas() {
    var idsAprobadas = Object.keys(WIZ.aprobadasIdsElegidas).filter(function (id) { return !WIZ.aprobadasIdsYaCargadas[id]; });
    var idsPendientes = Object.keys(WIZ.pendientesIdsElegidas).filter(function (id) { return !WIZ.pendientesIdsYaCargadas[id]; });
    var idsNuevos = idsAprobadas.concat(idsPendientes);
    if (!idsNuevos.length) return;
    var fuentePorId = {};
    idsAprobadas.forEach(function (id) { fuentePorId[id] = WIZ.aprobadasIdsElegidas[id]; });
    idsPendientes.forEach(function (id) { fuentePorId[id] = WIZ.pendientesIdsElegidas[id]; });
    var escPorMateria = {};
    await Promise.all(idsNuevos.map(async function (id) {
      try {
        var filas = await rpc('cat_esquema', { p_materia_id: id, p_periodo: PERIODO_ACTUAL });
        var f0 = (filas || [])[0];
        if (!f0) return;
        var totalPuntos = (filas || []).filter(function (f) { return f.computa; }).reduce(function (sum, f) { return sum + (Number(f.puntaje_max) || 0); }, 0);
        var aprobPct = Number(f0.min_aprobar) || 0;
        var exonPct = f0.min_exonerar != null ? Number(f0.min_exonerar) : null;
        escPorMateria[id] = {
          tipo: 'puntos',
          total: totalPuntos,
          aprob: totalPuntos > 0 ? Math.round(aprobPct / 100 * totalPuntos) : 0,
          exoneracion: exonPct != null && totalPuntos > 0 ? Math.round(exonPct / 100 * totalPuntos) : null
        };
      } catch (e) {
        console.warn('Cursada: no se pudo resolver la escala de aprobación de una materia aprobada anteriormente', e);
      }
    }));
    // Un semestre histórico por cada semestre_sugerido presente — secuencial
    // (no Promise.all) para no correr saveSemestresRaw() en paralelo contra
    // el mismo CACHE.semestres (ver obtenerOCrearSemestreHistorico/
    // saveSemestresRaw, la segunda llamada pisaría lo que agregó la primera).
    var semestresNecesarios = [];
    idsNuevos.forEach(function (id) {
      var n = fuentePorId[id].semestre_sugerido;
      if (n && semestresNecesarios.indexOf(n) < 0) semestresNecesarios.push(n);
    });
    var semHistoricoPorNumero = {};
    for (var i = 0; i < semestresNecesarios.length; i++) {
      semHistoricoPorNumero[semestresNecesarios[i]] = await obtenerOCrearSemestreHistorico(semestresNecesarios[i]);
    }
    var colorKeys = Object.keys(ACCENTS).filter(function (k) { return k !== 'gris'; });
    var colorIdx = 0;
    var idsPendientesSet = {};
    idsPendientes.forEach(function (id) { idsPendientesSet[id] = true; });
    var nuevas = idsNuevos.map(function (id) {
      var m = fuentePorId[id];
      // Fallback cuando cat_esquema() no devuelve nada para esta materia
      // (catalogo.esquemas sin fila — confirmado en cuenta real con 4
      // materias: Taller de Comunicación Interpersonal y Negociación,
      // Taller de Investigación Aplicada, Introducción a la Programación 1
      // y 2). Antes caía a nota 0–12, pero en ORT toda materia se califica
      // sobre 100 puntos (confirmado por el usuario). aprob:70 (no el 60
      // genérico de ESC_DEFAULTS.puntos, pensado para "+ Nueva materia" sin
      // ningún contexto de universidad) porque es el mínimo real que ya
      // aparece en casi todas las materias de ORT con esquema sí cargado
      // (70/86 puntos/exoneración) — la mejor aproximación posible sin
      // datos propios para esta materia puntual.
      var esc = escPorMateria[id] && escPorMateria[id].total > 0 ? escPorMateria[id] : { tipo: 'puntos', total: ESC_DEFAULTS.puntos.total, aprob: 70 };
      var colorId = colorKeys[colorIdx % colorKeys.length];
      colorIdx++;
      var semestreId = m.semestre_sugerido ? (semHistoricoPorNumero[m.semestre_sugerido] || null) : null;
      return { id: uid(), semestreId: semestreId, nombre: m.nombre, doc: '', colorId: colorId, salon: '', bloques: [], esc: esc, estado: idsPendientesSet[id] ? 'pendiente' : 'aprobada', catalogoMateriaId: id, catalogoDictadoId: null, componentesFijos: [] };
    });
    await saveMateriasRaw(loadMateriasRaw().concat(nuevas));
  }

  // ---- Paso 3: semestre ----
  function wizRenderSemestrePills() {
    var wrap = document.getElementById('wiz-semestres-pills');
    clear(wrap);
    for (var n = 1; n <= 8; n++) {
      (function (n) {
        var on = WIZ.semestresElegidos.indexOf(n) >= 0;
        wrap.appendChild(buildNumPill(on, String(n), function () {
          var idx = WIZ.semestresElegidos.indexOf(n);
          if (idx >= 0) WIZ.semestresElegidos.splice(idx, 1); else WIZ.semestresElegidos.push(n);
          wizRenderSemestrePills();
        }));
      })(n);
    }
  }

  // ---- Paso 4: oferta ----
  // La decisión "grupo armado o materias sueltas" es POR SEMESTRE, no
  // global (bug real: con 2+ semestres elegidos, el camino manual mezclaba
  // en una sola lista los dictados de TODOS los grupos de cada semestre —
  // el usuario no podía elegir un grupo y listo, tenía que revisar materia
  // por materia igual que si no hubiera grupos armados). Cada semestre
  // arranca en modo grupo si el catálogo tiene alguno cargado para ese
  // semestre (cat_grupos), si no cae directo a materias sueltas — mismo
  // fallback de siempre. wizCaminoDeSemestre() es la única fuente de verdad
  // sobre qué modo mostrar; wizCaminoPorSemestreOverride guarda el cambio
  // manual del usuario (el link "elegir materias sueltas"/"ver los grupos")
  // dentro de la sección de ESE semestre.
  function wizCaminoDeSemestre(s) {
    var tieneGrupos = (WIZ.gruposPorSemestre[s] || []).length > 0;
    if (!tieneGrupos) return 'manual';
    return WIZ.caminoPorSemestre[s] === 'manual' ? 'manual' : 'rapido';
  }

  // cat_grupos().materias no siempre trae dictado_id/bloques por materia
  // (la forma exacta no se pudo confirmar contra la RPC real) — para no
  // depender de eso, apenas se elige un grupo se resuelve su detalle real
  // vía cat_dictados (misma RPC del camino manual) filtrando por g.codigo,
  // que sí tiene ese detalle garantizado. Así Paso 5 (preview + conflictos)
  // nunca depende de un campo que puede no venir.
  async function wizResolverMateriasDeGrupo(g) {
    if (!g) return;
    try {
      var dictados = await rpc('cat_dictados', { p_carrera_id: WIZ.carreraId, p_periodo: PERIODO_ACTUAL, p_semestres: [g.semestre], p_turno: g.turno || null });
      var propios = (dictados || []).filter(function (d) { return d.grupo === g.codigo; });
      if (propios.length) g.materias = propios;
    } catch (e) {
      console.warn('Cursada: no se pudo resolver el detalle de horario del grupo', e);
    }
  }

  // Materias de TODOS los grupos elegidos para el semestre `s`, ya
  // deduplicadas por materia — si dos dictados (de grupos distintos, ej.
  // matutino y nocturno) son la MISMA materia y ambos quedaron tildados,
  // gana el último que se tildó (no tiene sentido cursar la misma materia
  // dos veces) en vez de mandar las dos a aplicar_dictados.
  function wizMateriasDeSemestreGrupo(s) {
    var elegidos = WIZ.gruposElegidosPorSemestre[s] || {};
    var excluidas = WIZ.grupoMateriasExcluidasPorSemestre[s] || {};
    var porMateriaId = {}, orden = [];
    Object.keys(elegidos).forEach(function (gid) {
      var g = elegidos[gid];
      if (!Array.isArray(g.materias)) return;
      g.materias.forEach(function (m) {
        if (excluidas[m.dictado_id]) return;
        if (!porMateriaId[m.materia_id]) orden.push(m.materia_id);
        porMateriaId[m.materia_id] = m; // el último tildado gana si hay más de uno
      });
    });
    return orden.map(function (id) { return porMateriaId[id]; });
  }

  // Grupos elegidos para el semestre `s`: checkboxes (no radio) — se puede
  // combinar más de un grupo del mismo semestre (ej. una materia del grupo
  // matutino y otra del nocturno), justo lo que el camino "materias
  // sueltas" resolvía pero obligando a soltar el horario ya armado de cada
  // grupo. Debajo de cada grupo tildado, un checklist de sus materias para
  // destildar la que no corresponda (bug real: antes un grupo era
  // todo-o-nada, sin forma de sacar una sola materia del paquete, mucho
  // más notorio en nocturno porque suele haber un solo grupo armado en vez
  // de 2-3 alternativas como en matutino).
  function wizRenderSemestreGrupo(content, s) {
    var grupos = WIZ.gruposPorSemestre[s] || [];
    var elegidos = WIZ.gruposElegidosPorSemestre[s] || (WIZ.gruposElegidosPorSemestre[s] = {});
    var multiple = grupos.length > 1;
    grupos.forEach(function (g) {
      var node = tpl('wiz-item-row');
      node.classList.add('is-check');
      node.classList.toggle('is-on', !!elegidos[g.id]);
      qf(node, 'titulo').textContent = g.codigo;
      var nMaterias = Array.isArray(g.materias) ? g.materias.length : (g.materias || 0);
      qf(node, 'meta').textContent = [g.turno, g.edificio, nMaterias + (nMaterias === 1 ? ' materia' : ' materias')].filter(Boolean).join(' · ');
      node.addEventListener('click', async function () {
        if (elegidos[g.id]) { delete elegidos[g.id]; await wizRenderOferta(); return; }
        elegidos[g.id] = g;
        await wizResolverMateriasDeGrupo(g);
        // Si el grupo que se acaba de sumar trae una materia que YA está
        // activa desde otro grupo de este semestre (ej. se suma el
        // nocturno teniendo el matutino elegido y ambos dictan "Álgebra"),
        // la del grupo nuevo arranca destildada — se conserva la que ya
        // estaba, el usuario puede swapearla a mano desde el checklist.
        if (Array.isArray(g.materias)) {
          var yaActivasPorMateria = {};
          Object.keys(elegidos).forEach(function (gid) {
            if (gid === String(g.id)) return;
            (elegidos[gid].materias || []).forEach(function (m) {
              if (!(WIZ.grupoMateriasExcluidasPorSemestre[s] || {})[m.dictado_id]) yaActivasPorMateria[m.materia_id] = true;
            });
          });
          var excluidas = WIZ.grupoMateriasExcluidasPorSemestre[s] || (WIZ.grupoMateriasExcluidasPorSemestre[s] = {});
          g.materias.forEach(function (m) { if (yaActivasPorMateria[m.materia_id]) excluidas[m.dictado_id] = true; });
        }
        await wizRenderOferta();
      });
      content.appendChild(node);
    });
    var hayMaterias = Object.keys(elegidos).some(function (gid) { return Array.isArray(elegidos[gid].materias); });
    if (hayMaterias) {
      var sub = el('span'); sub.style.cssText = 'font-size:12px;color:var(--c-ink3);margin:2px 0 -4px';
      sub.textContent = 'Ya vienen con horario armado — destildá alguna si no la vas a cursar (ya la aprobaste, por ejemplo).';
      content.appendChild(sub);
      var excluidas = WIZ.grupoMateriasExcluidasPorSemestre[s] || (WIZ.grupoMateriasExcluidasPorSemestre[s] = {});
      // materia_id -> dictado_id actualmente tildado, para autoexcluir el
      // otro dictado de la MISMA materia si viene de un grupo distinto
      // (ej. tildar "Organización y Gerencia" nocturna cuando la matutina
      // ya estaba tildada) — no tiene sentido cursarla dos veces.
      var dictadoActivoPorMateria = {};
      Object.keys(elegidos).forEach(function (gid) {
        (elegidos[gid].materias || []).forEach(function (m) {
          if (!excluidas[m.dictado_id]) dictadoActivoPorMateria[m.materia_id] = m.dictado_id;
        });
      });
      // Con 2+ grupos tildados, sus materias antes caían todas juntas en una
      // sola lista plana — imposible distinguir a qué grupo pertenecía cada
      // una sin leer el meta de cada fila. Ahora cada grupo tiene su propio
      // contenedor (wiz-suboferta-group, con riel a la izquierda + etiqueta)
      // y las filas usan .is-sub para pesar visualmente menos que la tarjeta
      // de grupo de arriba — es un desglose del paquete, no otra decisión al
      // mismo nivel.
      var variosElegidos = Object.keys(elegidos).length > 1;
      Object.keys(elegidos).forEach(function (gid) {
        var g = elegidos[gid];
        if (!Array.isArray(g.materias) || !g.materias.length) return;
        var grupoWrap = el('div', 'wiz-suboferta-group');
        if (variosElegidos) {
          var label = el('span', 'wiz-suboferta-label');
          label.textContent = g.codigo;
          grupoWrap.appendChild(label);
        }
        g.materias.forEach(function (m) {
          var node = tpl('wiz-item-row');
          node.classList.add('is-check', 'is-sub');
          node.classList.toggle('is-on', !excluidas[m.dictado_id]);
          qf(node, 'titulo').textContent = m.nombre;
          var metaPartes = [m.salon, formatHorario(m.bloques)];
          qf(node, 'meta').textContent = metaPartes.filter(Boolean).join(' · ');
          node.addEventListener('click', async function () {
            if (excluidas[m.dictado_id]) {
              delete excluidas[m.dictado_id];
              // Tildar esta versión de la materia destilda automáticamente
              // cualquier otra versión (de otro grupo) que estuviera activa.
              var otroDictadoId = dictadoActivoPorMateria[m.materia_id];
              if (otroDictadoId && otroDictadoId !== m.dictado_id) excluidas[otroDictadoId] = true;
            } else {
              excluidas[m.dictado_id] = true;
            }
            await wizRenderOferta();
          });
          grupoWrap.appendChild(node);
        });
        content.appendChild(grupoWrap);
      });
    }
    var linkManual = el('button', 'add-link'); linkManual.type = 'button';
    linkManual.textContent = 'Prefiero elegir materias sueltas para este semestre';
    linkManual.addEventListener('click', async function () {
      WIZ.caminoPorSemestre[s] = 'manual';
      await wizRenderOferta();
    });
    content.appendChild(linkManual);
  }

  // Dictados sueltos (+ fallback a materias sugeridas sin horario) para el
  // semestre `s` — misma lógica de siempre, sólo que ahora se invoca por
  // semestre en vez de asumir que TODOS los semestres elegidos están en
  // este modo. WIZ.dictadosManualTodos ya viene filtrado/cargado por
  // wizAsegurarDictadosManual() antes de llamar acá.
  function wizRenderSemestreManual(content, s) {
    var deEsteSemestre = WIZ.dictadosManualTodos.filter(function (d) { return d.semestre_sugerido === s; });
    WIZ.dictadosManualPorSemestre[s] = deEsteSemestre;
    var turnosDeEsteSemestre = [];
    deEsteSemestre.forEach(function (d) { if (d.turno && turnosDeEsteSemestre.indexOf(d.turno) < 0) turnosDeEsteSemestre.push(d.turno); });
    // Toggle propio de ESTE semestre — nada de un único toggle global para
    // todos los semestres elegidos (feedback: con turnos distintos entre
    // semestres, un solo control para todos confundía). Sólo aparece si el
    // semestre en cuestión realmente tiene más de un turno cargado.
    if (turnosDeEsteSemestre.length > 1) {
      var toggle = el('div', 'seg');
      toggle.style.cssText = 'align-self:flex-start';
      turnosDeEsteSemestre.slice().sort().forEach(function (t) {
        var btn = el('button', 'seg-item' + (WIZ.dictadosManualTurnoPorSemestre[s] === t ? ' is-on' : ''));
        btn.type = 'button';
        btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        btn.addEventListener('click', async function () {
          WIZ.dictadosManualTurnoPorSemestre[s] = t;
          await wizRenderOferta();
        });
        toggle.appendChild(btn);
      });
      content.appendChild(toggle);
    }
    var turno = WIZ.dictadosManualTurnoPorSemestre[s];
    var filtrados = deEsteSemestre.filter(function (d) { return !turno || !d.turno || d.turno === turno; });
    if (filtrados.length) {
      filtrados.forEach(function (d) {
        var node = tpl('wiz-item-row');
        node.classList.add('is-check');
        node.classList.toggle('is-on', !!WIZ.dictadoIdsElegidos[d.dictado_id]);
        qf(node, 'titulo').textContent = d.nombre;
        qf(node, 'meta').textContent = [d.grupo, d.turno, d.salon, formatHorario(d.bloques)].filter(Boolean).join(' · ');
        if (d.estado && d.estado !== 'abierto' && d.estado !== 'ofrecido') {
          var badge = qf(node, 'badge'); badge.classList.remove('hidden'); badge.textContent = d.estado; badge.setAttribute('style', badgeStyle('neutral'));
        }
        node.addEventListener('click', function () {
          if (WIZ.dictadoIdsElegidos[d.dictado_id]) delete WIZ.dictadoIdsElegidos[d.dictado_id]; else WIZ.dictadoIdsElegidos[d.dictado_id] = d;
          node.classList.toggle('is-on', !!WIZ.dictadoIdsElegidos[d.dictado_id]);
        });
        content.appendChild(node);
      });
    } else if (deEsteSemestre.length) {
      // Este semestre sí tiene dictados cargados, pero ninguno en el turno
      // elegido — distinto del caso "sin horario en el catálogo" de abajo.
      var aviso2 = el('span'); aviso2.style.cssText = 'font-size:12px;color:var(--c-ink3);font-style:italic';
      aviso2.textContent = 'Este semestre no tiene dictados en el turno elegido — probá el otro turno, arriba.';
      content.appendChild(aviso2);
    } else {
      var nota = el('span'); nota.style.cssText = 'font-size:12px;color:var(--c-ink3);font-style:italic';
      nota.textContent = 'Sin horario cargado en el catálogo todavía — elegí las materias y completá el horario vos después.';
      content.appendChild(nota);
      (WIZ.materiasSugeridasPorSemestre[s] || []).forEach(function (m) {
        var node = tpl('wiz-item-row');
        node.classList.add('is-check');
        node.classList.toggle('is-on', !!WIZ.materiaIdsSinHorario[m.materia_id]);
        qf(node, 'titulo').textContent = m.nombre;
        qf(node, 'meta').textContent = (m.creditos ? m.creditos + ' créditos' : '') + (m.obligatoria === false ? ' · electiva de plan' : '');
        node.addEventListener('click', function () {
          if (WIZ.materiaIdsSinHorario[m.materia_id]) delete WIZ.materiaIdsSinHorario[m.materia_id]; else WIZ.materiaIdsSinHorario[m.materia_id] = m;
          node.classList.toggle('is-on', !!WIZ.materiaIdsSinHorario[m.materia_id]);
        });
        content.appendChild(node);
      });
    }
    if ((WIZ.gruposPorSemestre[s] || []).length) {
      var linkGrupo = el('button', 'add-link'); linkGrupo.type = 'button';
      linkGrupo.textContent = 'Ver los grupos armados para este semestre';
      linkGrupo.addEventListener('click', async function () {
        WIZ.caminoPorSemestre[s] = 'rapido';
        await wizRenderOferta();
      });
      content.appendChild(linkGrupo);
    }
  }

  // Pide cat_dictados (sin turno, para no repetirla al tocar un toggle) y
  // el fallback cat_materias_sugeridas SÓLO para los semestres que están en
  // modo manual y todavía no se cargaron — cachea en
  // WIZ.dictadosManualCargadoPorSemestre para no repetir la RPC si el
  // usuario alterna entre grupo/manual varias veces para el mismo semestre.
  async function wizAsegurarDictadosManual(semestres) {
    var faltantes = semestres.filter(function (s) { return !WIZ.dictadosManualCargadoPorSemestre[s]; });
    if (!faltantes.length) return;
    var dictados = await rpc('cat_dictados', { p_carrera_id: WIZ.carreraId, p_periodo: PERIODO_ACTUAL, p_semestres: faltantes, p_turno: null });
    WIZ.dictadosManualTodos = WIZ.dictadosManualTodos.concat(dictados || []);
    faltantes.forEach(function (s) { WIZ.dictadosManualCargadoPorSemestre[s] = true; });

    var porSemestreSinFiltrar = {};
    WIZ.dictadosManualTodos.forEach(function (d) { (porSemestreSinFiltrar[d.semestre_sugerido] = porSemestreSinFiltrar[d.semestre_sugerido] || []).push(d); });
    // Semestres sin ningún dictado en la respuesta caen a
    // cat_materias_sugeridas — nunca una pantalla vacía sin salida.
    var pendientes = faltantes.filter(function (s) { return !(porSemestreSinFiltrar[s] && porSemestreSinFiltrar[s].length); });
    var resultados = await Promise.all(pendientes.map(function (s) {
      return rpc('cat_materias_sugeridas', { p_carrera_id: WIZ.carreraId, p_semestre: s, p_periodo: PERIODO_ACTUAL });
    }));
    pendientes.forEach(function (s, i) { WIZ.materiasSugeridasPorSemestre[s] = resultados[i] || []; });

    // Default de turno POR SEMESTRE: el más común entre los dictados de ESE
    // semestre en particular (un semestre mayoritariamente nocturno no
    // debería arrancar filtrado en matutino sólo porque otro semestre
    // elegido tenía más dictados matutinos).
    faltantes.forEach(function (s) {
      var deEsteSemestre = porSemestreSinFiltrar[s] || [];
      var turnosDeEsteSemestre = [];
      deEsteSemestre.forEach(function (d) { if (d.turno && turnosDeEsteSemestre.indexOf(d.turno) < 0) turnosDeEsteSemestre.push(d.turno); });
      var turnoActual = WIZ.dictadosManualTurnoPorSemestre[s];
      if (!turnoActual || turnosDeEsteSemestre.indexOf(turnoActual) < 0) {
        var conteo = {};
        deEsteSemestre.forEach(function (d) { if (d.turno) conteo[d.turno] = (conteo[d.turno] || 0) + 1; });
        var mejor = null, max = 0;
        Object.keys(conteo).forEach(function (t) { if (conteo[t] > max) { max = conteo[t]; mejor = t; } });
        WIZ.dictadosManualTurnoPorSemestre[s] = mejor;
      }
    });
  }

  // Render maestro del Paso 4: una sección por semestre elegido, cada una
  // en modo grupo o manual según wizCaminoDeSemestre() — nunca una lista
  // única mezclando todos los semestres/grupos juntos.
  async function wizRenderOferta() {
    var content = document.getElementById('wiz-oferta-content');
    clear(content);
    var loading = el('span'); loading.style.cssText = 'font-size:13px;color:var(--c-ink3)'; loading.textContent = 'Buscando tu oferta…';
    content.appendChild(loading);
    try {
      var semestresManual = WIZ.semestresElegidos.filter(function (s) { return wizCaminoDeSemestre(s) === 'manual'; });
      if (semestresManual.length) await wizAsegurarDictadosManual(semestresManual);
      clear(content);
      var multiple = WIZ.semestresElegidos.length > 1;
      WIZ.semestresElegidos.slice().sort(function (a, b) { return a - b; }).forEach(function (s) {
        if (multiple) {
          var titulo = el('span'); titulo.style.cssText = 'font-size:12px;font-weight:700;color:var(--c-ink2);letter-spacing:.04em;text-transform:uppercase;margin-top:8px';
          titulo.textContent = 'Semestre ' + s;
          content.appendChild(titulo);
        }
        if (wizCaminoDeSemestre(s) === 'rapido') wizRenderSemestreGrupo(content, s);
        else wizRenderSemestreManual(content, s);
      });
    } catch (e) {
      clear(content);
      wizMostrarError(e.message || 'No se pudo cargar la oferta de materias.');
    }
  }

  // Entrada del Paso 4: resuelve qué semestres tienen grupos armados
  // (cat_grupos, una llamada por semestre — la RPC real sólo acepta un
  // semestre a la vez) antes del primer render.
  async function wizCargarOferta() {
    var sub = document.getElementById('wiz-oferta-sub');
    sub.textContent = WIZ.semestresElegidos.length > 1
      ? 'Elegí un grupo armado o materias sueltas, semestre por semestre.'
      : 'Elegí el grupo que estás cursando, o materias sueltas.';
    var faltantes = WIZ.semestresElegidos.filter(function (s) { return !(s in WIZ.gruposPorSemestre); });
    if (faltantes.length) {
      var resultados = await Promise.all(faltantes.map(function (s) {
        return rpc('cat_grupos', { p_carrera_id: WIZ.carreraId, p_periodo: PERIODO_ACTUAL, p_semestre: s });
      }));
      faltantes.forEach(function (s, i) { WIZ.gruposPorSemestre[s] = resultados[i] || []; });
    }
    await wizRenderOferta();
  }

  // ---- Paso 5: electivas ----
  // Turno por defecto: el más común entre los grupos elegidos (puede haber
  // más de uno por semestre) y los dictados manuales elegidos — el usuario
  // puede cambiarlo (el enunciado pide poder ver el otro turno si quiere).
  function wizTurnoPredeterminado() {
    var conteo = {};
    Object.keys(WIZ.gruposElegidosPorSemestre).forEach(function (s) {
      Object.keys(WIZ.gruposElegidosPorSemestre[s]).forEach(function (gid) {
        var g = WIZ.gruposElegidosPorSemestre[s][gid];
        if (g && g.turno) conteo[g.turno] = (conteo[g.turno] || 0) + 1;
      });
    });
    Object.keys(WIZ.dictadoIdsElegidos).forEach(function (id) {
      var t = WIZ.dictadoIdsElegidos[id].turno;
      if (t) conteo[t] = (conteo[t] || 0) + 1;
    });
    var mejor = null, max = 0;
    Object.keys(conteo).forEach(function (t) { if (conteo[t] > max) { max = conteo[t]; mejor = t; } });
    return mejor || 'matutino';
  }

  function wizActualizarTurnoToggle() {
    document.querySelectorAll('#wiz-electivas-turno-toggle [data-turno]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-turno') === WIZ.electivaTurno);
    });
  }

  async function wizCargarElectivasSegunTurno() {
    var lista = document.getElementById('wiz-electivas-list');
    clear(lista);
    var loading = el('span'); loading.style.cssText = 'font-size:13px;color:var(--c-ink3)'; loading.textContent = 'Cargando electivas…';
    lista.appendChild(loading);
    try {
      var electivas = await rpc('cat_electivas', { p_university_id: ORT_UNIVERSITY_ID, p_periodo: PERIODO_ACTUAL, p_turno: WIZ.electivaTurno });
      WIZ.electivas = electivas || [];
      clear(lista);
      if (!WIZ.electivas.length) {
        var empty = el('span'); empty.style.cssText = 'font-size:13px;color:var(--c-ink3)';
        empty.textContent = 'No hay electivas para este turno todavía — podés continuar sin elegir ninguna.';
        lista.appendChild(empty);
        return;
      }
      // Una misma materia aparece varias veces con distinta sección (regla
      // explícita del enunciado) — se agrupan por materia_id, no se
      // muestran como cursos distintos.
      var porMateria = {}, orden = [];
      WIZ.electivas.forEach(function (e) {
        if (!porMateria[e.materia_id]) { porMateria[e.materia_id] = []; orden.push(e.materia_id); }
        porMateria[e.materia_id].push(e);
      });
      orden.forEach(function (materiaId) {
        var secciones = porMateria[materiaId];
        secciones.forEach(function (e) {
          var sinMinimo = e.estado === 'sin_minimo';
          var node = tpl('wiz-item-row');
          node.classList.add('is-check');
          node.classList.toggle('is-on', !!WIZ.electivaIdsElegidos[e.dictado_id]);
          // El nombre de la materia va siempre en el título de la fila (antes
          // sólo se mostraba arriba, agrupado, y la fila decía "Sección N"
          // sin más contexto). La sección se agrega sólo si hay más de una
          // para esa materia — si hay una sola, mostrarla es ruido.
          qf(node, 'titulo').textContent = e.nombre + (secciones.length > 1 ? ' — Sección ' + e.seccion : '');
          qf(node, 'meta').textContent = [e.turno, formatHorario(e.bloques)].filter(Boolean).join(' · ');
          if (sinMinimo) {
            node.disabled = true;
            var motivo = qf(node, 'motivo'); motivo.classList.remove('hidden'); motivo.textContent = 'No se abrió por falta de inscriptos.';
          } else {
            node.addEventListener('click', function () {
              if (WIZ.electivaIdsElegidos[e.dictado_id]) delete WIZ.electivaIdsElegidos[e.dictado_id]; else WIZ.electivaIdsElegidos[e.dictado_id] = e;
              node.classList.toggle('is-on', !!WIZ.electivaIdsElegidos[e.dictado_id]);
            });
          }
          lista.appendChild(node);
        });
      });
    } catch (e) {
      clear(lista);
      wizMostrarError(e.message || 'No se pudo cargar las electivas.');
    }
  }

  async function wizCargarElectivas() {
    if (!WIZ.electivaTurno) WIZ.electivaTurno = wizTurnoPredeterminado();
    wizActualizarTurnoToggle();
    await wizCargarElectivasSegunTurno();
  }

  // ---- Paso 6: revisión y confirmación ----
  // Un color de la paleta de materia por ítem, sólo para que la previsualización
  // se vea coherente — no es una elección real, se resuelve de nuevo (a
  // gusto del usuario) cuando edite la materia después de creada.
  // Materias de los grupos elegidos de TODOS los semestres (puede haber más
  // de un grupo por semestre — ver wizMateriasDeSemestreGrupo para el
  // dedupe por materia dentro de un mismo semestre) — helper compartido
  // por preview y chequeo de conflictos.
  function wizMateriasDeGruposElegidos() {
    var out = [];
    Object.keys(WIZ.gruposElegidosPorSemestre).forEach(function (s) {
      out = out.concat(wizMateriasDeSemestreGrupo(s));
    });
    return out;
  }

  function wizItemsPreview() {
    var items = [];
    var colorKeys = Object.keys(ACCENTS), colorIdx = 0;
    function colorFor() { var acc = ACCENTS[colorKeys[colorIdx % colorKeys.length]]; colorIdx++; return acc; }
    // grupo.materias ya fue resuelto contra cat_dictados en
    // wizResolverMateriasDeGrupo() antes de llegar acá, así que siempre
    // trae dictado_id/bloques reales (Array.isArray queda como defensa
    // extra, no como expectativa de que falte).
    wizMateriasDeGruposElegidos().forEach(function (m) {
      var acc = colorFor();
      items.push({ id: m.dictado_id || m.materia_id || uid(), nombre: m.nombre, salon: m.salon, bloques: m.bloques || [], strong: acc.strong, soft: acc.soft });
    });
    Object.keys(WIZ.dictadoIdsElegidos).forEach(function (id) {
      var d = WIZ.dictadoIdsElegidos[id], acc = colorFor();
      items.push({ id: id, nombre: d.nombre, salon: d.salon, bloques: d.bloques || [], strong: acc.strong, soft: acc.soft });
    });
    Object.keys(WIZ.electivaIdsElegidos).forEach(function (id) {
      var e = WIZ.electivaIdsElegidos[id], acc = colorFor();
      items.push({ id: id, nombre: e.nombre, salon: e.salon, bloques: e.bloques || [], strong: acc.strong, soft: acc.soft });
    });
    return items;
  }

  function wizDictadoIdsParaConflictos() {
    var ids = wizMateriasDeGruposElegidos().map(function (m) { return m.dictado_id; }).filter(Boolean);
    return ids.concat(Object.keys(WIZ.dictadoIdsElegidos), Object.keys(WIZ.electivaIdsElegidos));
  }

  async function wizRenderRevision() {
    var grid = document.getElementById('wiz-horario-grid');
    var conflictosWrap = document.getElementById('wiz-conflictos');
    var resumen = document.getElementById('wiz-revision-resumen');
    conflictosWrap.classList.add('hidden');
    clear(conflictosWrap);
    resumen.textContent = 'Revisando conflictos de horario…';
    var resolversPendientes = [];
    Object.keys(WIZ.gruposElegidosPorSemestre).forEach(function (s) {
      Object.keys(WIZ.gruposElegidosPorSemestre[s]).forEach(function (gid) {
        resolversPendientes.push(wizResolverMateriasDeGrupo(WIZ.gruposElegidosPorSemestre[s][gid]));
      });
    });
    await Promise.all(resolversPendientes);
    var ids = wizDictadoIdsParaConflictos();
    try {
      WIZ.conflictos = ids.length ? ((await rpc('cat_conflictos', { p_dictado_ids: ids })) || []) : [];
    } catch (e) {
      WIZ.conflictos = [];
      console.warn('Cursada: no se pudo chequear conflictos de horario', e);
    }
    if (WIZ.conflictos.length) {
      conflictosWrap.classList.remove('hidden');
      var titulo = el('b'); titulo.textContent = 'Hay materias que se pisan:';
      conflictosWrap.appendChild(titulo);
      WIZ.conflictos.forEach(function (c) {
        var node = tpl('wiz-conflicto-row');
        qf(node, 'materias').textContent = c.materia_a + ' ⚡ ' + c.materia_b;
        qf(node, 'horario').textContent = DIAS_LARGOS[c.dia] + ' ' + horaTexto(c.desde) + '–' + horaTexto(c.hasta);
        conflictosWrap.appendChild(node);
      });
      // No se deja confirmar hasta resolverlo o aceptarlo explícitamente
      // (regla del enunciado) — se valida en wizConfirmar().
      var aceptar = el('label'); aceptar.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;margin-top:4px;cursor:pointer';
      var check = el('input'); check.type = 'checkbox'; check.id = 'wiz-aceptar-solapamiento';
      var span = el('span'); span.textContent = 'Confirmar igual, ya sé que se pisan.';
      aceptar.appendChild(check); aceptar.appendChild(span);
      conflictosWrap.appendChild(aceptar);
    }
    var items = wizItemsPreview();
    buildHorarioGridInto(grid, items, true, {});
    var nSinHorario = Object.keys(WIZ.materiaIdsSinHorario).length;
    resumen.textContent = items.length + (items.length === 1 ? ' materia con horario' : ' materias con horario')
      + (nSinHorario ? ', ' + nSinHorario + (nSinHorario === 1 ? ' materia sin horario (la completás vos después)' : ' materias sin horario (las completás vos después)') : '') + '.';
  }

  // Las RPCs de catálogo escriben materias/agenda del lado del servidor —
  // no controlamos qué color_id/esc terminan dejando ahí, y ninguna de
  // cat_dictados/cat_electivas/cat_grupos devuelve la escala de aprobación
  // (eso vive aparte, en cat_esquema(materia_id, periodo): una fila por
  // instancia, con su propio puntaje_max — min_aprobar/min_exonerar son
  // PORCENTAJES, pero cada evaluación real que arma aplicar_agenda ya
  // guarda su nota_maxima en puntos (i.puntaje_max de esa instancia, no un
  // porcentaje) — así que la materia tiene que calificarse en la MISMA
  // unidad: puntos, con el total real de sumar los puntaje_max de las
  // instancias que computan (no siempre 100 — hay materias del catálogo
  // real que suman menos). Antes de mostrar el semestre armado se
  // reconcilia: colores distintos por materia (si el server les puso el
  // mismo default fijo a todas), esc en puntos resuelto contra cat_esquema
  // si la RPC de catálogo no lo dejó cargado, y los componentes de la nota
  // que computan pero no tienen ningún hito (fecha) en el catálogo — hoy
  // "Participación en clase" — se guardan en `componentesFijos` para que
  // el estudiante los cargue a mano (ver sección nueva en Detalle; no hay
  // ninguna fila de agenda a la que atarlos, aplicar_agenda nunca los
  // inserta porque hace join con catalogo.hitos). Se escribe con
  // saveMateriasRaw, el mismo camino CRUD que usa "Editar materia" — no
  // vuelve a tocar las RPCs de catálogo.
  async function wizReconciliarMateriasCreadas() {
    var raw = loadMateriasRaw();
    var candidatas = raw.filter(function (m) { return m.semestreId === WIZ.semestreId && (m.catalogoDictadoId || m.catalogoMateriaId); });
    var idsAResolver = candidatas
      .filter(function (m) { return !m.esc || m.esc.tipo == null || m.esc.total == null || m.esc.aprob == null; })
      .map(function (m) { return m.catalogoMateriaId; })
      .filter(function (id, i, self) { return id && self.indexOf(id) === i; });

    var escPorMateria = {};
    var componentesFijosPorMateria = {};
    await Promise.all(idsAResolver.map(async function (id) {
      try {
        var filas = await rpc('cat_esquema', { p_materia_id: id, p_periodo: PERIODO_ACTUAL });
        var f0 = (filas || [])[0];
        if (!f0) return;
        var totalPuntos = (filas || [])
          .filter(function (f) { return f.computa; })
          .reduce(function (sum, f) { return sum + (Number(f.puntaje_max) || 0); }, 0);
        var aprobPct = Number(f0.min_aprobar) || 0;
        var exonPct = f0.min_exonerar != null ? Number(f0.min_exonerar) : null;
        escPorMateria[id] = {
          tipo: 'puntos',
          total: totalPuntos,
          aprob: totalPuntos > 0 ? Math.round(aprobPct / 100 * totalPuntos) : 0,
          exoneracion: exonPct != null && totalPuntos > 0 ? Math.round(exonPct / 100 * totalPuntos) : null
        };
        // Instancias que computan pero no tienen ningún hito — sin fecha a
        // la que atarse en agenda, así que quedan sueltas en la materia.
        componentesFijosPorMateria[id] = (filas || [])
          .filter(function (f) { return f.computa && (!f.fechas || !f.fechas.length); })
          .map(function (f) { return { id: f.instancia_id, titulo: f.titulo, puntajeMax: Number(f.puntaje_max) || 0, valor: null }; });
      } catch (e) {
        console.warn('Cursada: no se pudo resolver la escala de aprobación de una materia', e);
      }
    }));

    var colorKeys = Object.keys(ACCENTS).filter(function (k) { return k !== 'gris'; });
    var colorIdx = 0;
    var huboCambios = false;
    var arr = raw.map(function (m) {
      if (m.semestreId !== WIZ.semestreId || !(m.catalogoDictadoId || m.catalogoMateriaId)) return m;
      var cambios = { colorId: colorKeys[colorIdx % colorKeys.length] };
      colorIdx++;
      var escIncompleto = !m.esc || m.esc.tipo == null || m.esc.total == null || m.esc.aprob == null;
      if (escIncompleto) {
        // Mismo fallback que wizCrearMateriasAprobadas (ver comentario ahí):
        // sin esquema en el catálogo, puntos sobre 100 con aprob:70 — no
        // nota 0–12 ni el 60 genérico de ESC_DEFAULTS.puntos.
        cambios.esc = escPorMateria[m.catalogoMateriaId] || { tipo: 'puntos', total: ESC_DEFAULTS.puntos.total, aprob: 70 };
        cambios.componentesFijos = componentesFijosPorMateria[m.catalogoMateriaId] || [];
      }
      huboCambios = true;
      return Object.assign({}, m, cambios);
    });
    if (huboCambios) await saveMateriasRaw(arr);
  }

  // Aplica la selección — las 3 RPCs de escritura son idempotentes, así que
  // no hay drama en reintentar. Al final se recarga todo desde Supabase
  // (en vez de reconstruir CACHE a mano) porque estas RPCs escriben
  // directo en public.materias/public.agenda del lado del servidor, sin
  // pasar por saveMateriasRaw/saveAgendaRaw.
  async function wizConfirmar() {
    if (WIZ.conflictos.length) {
      var check = document.getElementById('wiz-aceptar-solapamiento');
      if (!check || !check.checked) { wizMostrarError('Tildá que confirmás igual, o volvé atrás y sacá alguna materia en conflicto.'); return; }
    }
    var btn = document.getElementById('btn-wiz-continuar');
    setBtnBusy(btn, true, 'Armando tu semestre…');
    try {
      // aplicar_grupo() del lado del servidor no es más que resolver los
      // dictado_id del grupo y llamar aplicar_dictados con todos — al poder
      // destildar materias sueltas de un grupo (wizRenderSemestreGrupo) se
      // llama directo a aplicar_dictados con la lista ya filtrada, en vez
      // de la RPC de grupo completo.
      var dictadoIdsDeGrupos = wizMateriasDeGruposElegidos().map(function (m) { return m.dictado_id; }).filter(Boolean);
      var dictadoIds = dictadoIdsDeGrupos.concat(Object.keys(WIZ.dictadoIdsElegidos), Object.keys(WIZ.electivaIdsElegidos));
      if (dictadoIds.length) {
        await rpc('aplicar_dictados', { p_semestre_id: WIZ.semestreId, p_dictado_ids: dictadoIds });
      }
      var materiaIds = Object.keys(WIZ.materiaIdsSinHorario);
      if (materiaIds.length) {
        await rpc('aplicar_plan', { p_semestre_id: WIZ.semestreId, p_materia_ids: materiaIds, p_periodo: PERIODO_ACTUAL });
      }
      await rpc('aplicar_agenda', { p_semestre_id: WIZ.semestreId });
      await loadAllFromSupabase();
      await wizCrearMateriasAprobadas();
      await wizReconciliarMateriasCreadas();
      // Estas RPCs escriben la agenda directo del lado del servidor, sin
      // pasar por saveAgendaRaw — si ya tenías Google Calendar conectado
      // (re-aplicando el wizard, otro semestre), esas evaluaciones nunca
      // dispararían syncToGoogleCalendar() por su cuenta. No bloqueante:
      // no tiene sentido demorar la revelación de la app por esto.
      sincronizarTodoAGoogleCalendar();
      document.getElementById('wizard-onboarding').classList.add('hidden');
      hideOnboarding();
      renderRoute();
      showToast('¡Listo! Tu semestre ya está armado.');
    } catch (e) {
      wizMostrarError(e.message || 'No se pudo aplicar la selección — intentá de nuevo.');
    } finally {
      setBtnBusy(btn, false);
    }
  }

  // ---- Navegación entre pasos ----
  function wizAtras() {
    // Mini-onboarding de nuevo semestre: no hay "carrera"/"progreso" a los
    // que volver (ver abrirWizardNuevoSemestre) — "semestre" es el piso.
    var primerPaso = WIZ.soloNuevoSemestre ? WIZ_PASOS.indexOf('semestre') : 0;
    if (WIZ.pasoIdx <= primerPaso) return;
    wizMostrarPaso(WIZ.pasoIdx - 1);
  }

  async function wizContinuar() {
    var paso = WIZ_PASOS[WIZ.pasoIdx];
    var btn = document.getElementById('btn-wiz-continuar');
    if (paso === 'carrera') {
      if (!WIZ.carreraId) { wizMostrarError('Elegí tu carrera para continuar.'); return; }
      setBtnBusy(btn, true, 'Guardando…');
      try {
        var res = await sb().from('profiles').upsert({ id: CURRENT_USER.id, carrera_id: WIZ.carreraId });
        if (res.error) throw res.error;
        CURRENT_PROFILE = Object.assign({}, CURRENT_PROFILE, { carrera_id: WIZ.carreraId });
      } catch (e) {
        setBtnBusy(btn, false);
        wizMostrarError('No se pudo guardar tu carrera — revisá tu conexión e intentá de nuevo.');
        return;
      }
      setBtnBusy(btn, false);
      wizMostrarPaso(WIZ.pasoIdx + 1);
      await wizCargarProgresoAnterior();
    } else if (paso === 'progreso') {
      // Atajo abierto con abrirWizardProgreso(): "Guardar" acá mismo en vez
      // de seguir a "semestre" — ver comentario de esa función sobre por
      // qué wizCrearMateriasAprobadas() sola alcanza y no toca la oferta ya
      // armada del semestre activo.
      if (WIZ.soloProgreso) {
        setBtnBusy(btn, true, 'Guardando…');
        try {
          await wizCrearMateriasAprobadas();
        } catch (e) {
          setBtnBusy(btn, false);
          wizMostrarError(e.message || 'No se pudo guardar — intentá de nuevo.');
          return;
        }
        setBtnBusy(btn, false);
        document.getElementById('wizard-onboarding').classList.add('hidden');
        hideOnboarding();
        renderRoute();
        showToast('Progreso actualizado.');
        return;
      }
      wizMostrarPaso(WIZ.pasoIdx + 1);
      wizRenderSemestrePills();
    } else if (paso === 'semestre') {
      if (!WIZ.semestresElegidos.length) { wizMostrarError('Elegí al menos un semestre.'); return; }
      // WIZ.soloNuevoSemestre: WIZ.semestreId ya apunta al semestre recién
      // creado (ver abrirWizardNuevoSemestre) — llamar acá a
      // obtenerOCrearSemestrePeriodo() lo pisaría con el semestre existente
      // del período actual (el que se acaba de desactivar).
      if (!WIZ.soloNuevoSemestre) {
        setBtnBusy(btn, true, 'Preparando…');
        try {
          WIZ.semestreId = await obtenerOCrearSemestrePeriodo(PERIODO_ACTUAL);
        } catch (e) {
          setBtnBusy(btn, false);
          wizMostrarError(e.message);
          return;
        }
        setBtnBusy(btn, false);
      }
      wizMostrarPaso(WIZ.pasoIdx + 1);
      await wizCargarOferta();
    } else if (paso === 'oferta') {
      wizMostrarPaso(WIZ.pasoIdx + 1);
      await wizCargarElectivas();
    } else if (paso === 'electivas') {
      wizMostrarPaso(WIZ.pasoIdx + 1);
      await wizRenderRevision();
    } else if (paso === 'revision') {
      await wizConfirmar();
    }
  }

  function bindWizardUI() {
    document.getElementById('btn-wiz-manual').addEventListener('click', wizSalirAManual);
    document.getElementById('btn-wiz-atras').addEventListener('click', wizAtras);
    document.getElementById('btn-wiz-continuar').addEventListener('click', wizContinuar);
    document.querySelectorAll('#wiz-electivas-turno-toggle [data-turno]').forEach(function (b) {
      b.addEventListener('click', async function () {
        WIZ.electivaTurno = b.getAttribute('data-turno');
        wizActualizarTurnoToggle();
        await wizCargarElectivasSegunTurno();
      });
    });
    document.getElementById('btn-rehacer-onboarding').addEventListener('click', function () {
      closeAllModals();
      abrirWizard();
    });
    document.getElementById('btn-revisar-progreso').addEventListener('click', function () {
      closeAllModals();
      abrirWizardProgreso();
    });
  }

  // Decide entre el wizard de catálogo y la pantalla de onboarding de
  // siempre — sólo ORT tiene catálogo hoy, y sólo mientras el usuario no
  // haya elegido carrera todavía (carrera_id null). Cualquier otra
  // institución, o una cuenta que ya pasó por el wizard antes, cae directo
  // a #onboarding (regla 1 del enunciado: el catálogo acelera, nunca
  // obliga — nunca un dropdown vacío).
  function mostrarOnboardingOCatalogo() {
    if (CURRENT_PROFILE && CURRENT_PROFILE.university_id === ORT_UNIVERSITY_ID && !CURRENT_PROFILE.carrera_id) {
      abrirWizard();
    } else {
      showOnboarding();
    }
  }

  // ================================================================
  // THEME
  // ================================================================
  // El control (único, en Ajustes) guarda una PREFERENCIA de 3 valores:
  // 'sistema' (default) | 'claro' | 'oscuro'. 'sistema' no es un tema en sí
  // — se resuelve en el tema efectivo ('claro'/'oscuro') según
  // prefers-color-scheme, y se re-resuelve solo si el SO cambia de tema en
  // vivo (sin recargar), vía el listener de matchMedia más abajo.
  var THEME_PREF = 'sistema';
  function sistemaPrefiereOscuro() {
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }
  function temaEfectivo(pref) { return pref === 'sistema' ? (sistemaPrefiereOscuro() ? 'oscuro' : 'claro') : pref; }
  // Espejo de --c-bg (claro/oscuro) en styles.css — <meta name="theme-color">
  // no puede leer variables CSS, así que el valor efectivo se empuja acá.
  var THEME_COLOR_BG = { claro: '#EDEDF0', oscuro: '#0F1116' };
  function applyTheme(mode) {
    THEME_PREF = mode;
    var efectivo = temaEfectivo(mode);
    document.documentElement.setAttribute('data-theme', efectivo);
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-theme-btn') === mode); });
    var metaThemeColor = document.getElementById('meta-theme-color');
    if (metaThemeColor) metaThemeColor.setAttribute('content', THEME_COLOR_BG[efectivo]);
    try { localStorage.setItem('cursada:theme', mode); } catch (e) {}
    renderRoute();
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('cursada:theme'); } catch (e) {}
    applyTheme(saved === 'claro' || saved === 'oscuro' || saved === 'sistema' ? saved : 'sistema');
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onCambioSistema = function () { if (THEME_PREF === 'sistema') applyTheme('sistema'); };
      if (mq.addEventListener) mq.addEventListener('change', onCambioSistema);
      else if (mq.addListener) mq.addListener(onCambioSistema);
    } catch (e) {}
  }

  // ================================================================
  // ROUTER
  // ================================================================
  var CORE_VIEWS = ['inicio', 'materias', 'detalle', 'agenda', 'calendario', 'horario', 'progreso'];
  function renderRoute() {
    renderSidenav();
    // Red de seguridad: si quedó un quick-sheet o un row-menu abierto (long
    // press) y la ruta cambia por otro lado (tab bar, deep link), que no
    // quede flotando sobre una vista distinta a la que lo abrió.
    closeQuickSheet();
    closeRowMenu();
    // Transición de vista (redisño Hallmark, ver styles.css ".view-screen"):
    // display:none no es animable, así que al mostrar una vista que estaba
    // escondida se le saca .hidden, se la arranca en .is-entering (opacity
    // 0) y se fuerza un reflow leyendo offsetHeight ANTES de sacarle
    // .is-entering — eso "fija" el estado inicial en el navegador para que
    // la transición de verdad anime desde ahí, en vez de que ambos cambios
    // de clase se apliquen juntos sin transición visible. Se probó primero
    // con doble requestAnimationFrame (patrón más común para esto) pero
    // rAF nunca dispara con la pestaña en background/oculta — la vista se
    // quedaba en opacity:0 para siempre; el reflow síncrono no tiene ese
    // punto ciego. Un re-render de la MISMA vista (ej. cambiar de filtro en
    // Materias) no dispara nada de esto porque el chequeo es sobre si ya
    // tenía .hidden.
    CORE_VIEWS.forEach(function (id) {
      var el = document.getElementById(id);
      var show = STATE.route.view === id;
      if (show && el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.classList.add('is-entering');
        void el.offsetHeight;
        el.classList.remove('is-entering');
      } else if (!show) {
        el.classList.add('hidden');
        el.classList.remove('is-entering');
      }
    });
    if (STATE.route.view === 'inicio') renderInicio();
    else if (STATE.route.view === 'materias') renderMaterias();
    else if (STATE.route.view === 'detalle') renderDetalle(STATE.route.materiaId);
    else if (STATE.route.view === 'agenda') renderAgenda();
    else if (STATE.route.view === 'calendario') renderCalendario();
    else if (STATE.route.view === 'horario') renderHorario();
    else if (STATE.route.view === 'progreso') renderProgreso();
  }
  // Filtros/búsqueda/vista de Materias, Agenda y Calendario viven en la URL
  // (query string después del hash de la vista, ej. "#materias?filtro=cursando&q=algebra")
  // — así el botón atrás del navegador y compartir/recargar el link no pierden
  // lo que estabas viendo. Se llama al final de cada render* correspondiente;
  // usa replaceState (no pushState) para no ensuciar el historial en cada
  // tecla escrita en un buscador, y sólo toca la URL si de verdad cambió.
  function syncStateToURL() {
    var base = (location.hash || '#inicio').split('?')[0];
    var params = new URLSearchParams();
    if (STATE.route.view === 'materias') {
      if (STATE.materiasFiltro !== 'todas') params.set('filtro', STATE.materiasFiltro);
      if (STATE.materiasQuery) params.set('q', STATE.materiasQuery);
      if (STATE.materiasView !== 'tarjetas') params.set('vista', STATE.materiasView);
    } else if (STATE.route.view === 'agenda') {
      if (STATE.agendaFiltroKind) params.set('kind', STATE.agendaFiltroKind);
      if (STATE.agendaFiltroMateria) params.set('materia', STATE.agendaFiltroMateria);
      if (STATE.agendaFiltroEstado) params.set('estado', STATE.agendaFiltroEstado);
      if (STATE.agendaQuery) params.set('q', STATE.agendaQuery);
    } else if (STATE.route.view === 'calendario') {
      if (STATE.calViewMode !== 'mes') params.set('vista', STATE.calViewMode);
    }
    var qs = params.toString();
    var newHash = base + (qs ? '?' + qs : '');
    if (newHash !== location.hash) history.replaceState(null, '', newHash);
  }
  function handleRoute() {
    var full = location.hash || '#inicio';
    var hash = full.split('?')[0];
    var params = new URLSearchParams(full.indexOf('?') >= 0 ? full.slice(full.indexOf('?') + 1) : '');
    // Deep link entrante de una notificación (push con la app cerrada, o
    // "abrir en esta ventana" de notificationclick en sw.js): nid identifica
    // la fila de notification_queue (se marca leída directo por id, sin
    // depender de que CACHE.notificaciones ya esté cargado — puede ser un
    // arranque en frío), hl es el id a resaltar en Agenda si corresponde
    // (ver notifications-generate, arma el deep_link con estos params).
    if (params.has('nid')) {
      var nid = params.get('nid');
      var hl = params.get('hl');
      marcarNotifLeidaPorId(nid);
      history.replaceState(null, '', hash);
      STATE.route = { view: 'agenda' };
      if (hl) STATE.agendaHighlightId = hl;
      renderRoute();
      return;
    }
    if (hash === '#hoy') {
      STATE.calYear = today().getFullYear(); STATE.calMonth = today().getMonth();
      STATE.calWeekStart = mondayOf(today()); STATE.calSelected = todayISO();
      STATE.route = { view: 'calendario' };
      renderRoute();
      return;
    }
    var m = hash.match(/^#materia-(.+)$/);
    if (m) {
      var id = decodeURIComponent(m[1]);
      if (materiaRawById(id)) STATE.route = { view: 'detalle', materiaId: id };
      else { location.hash = '#materias'; return; }
    } else if (CORE_VIEWS.indexOf(hash.slice(1)) >= 0 && hash.slice(1) !== 'detalle') {
      STATE.route = { view: hash.slice(1) };
    } else {
      STATE.route = { view: 'inicio' };
    }
    // Rehidrata filtros/búsqueda/vista desde la URL al entrar a la vista
    // (deep link, recarga, o volver atrás) — para que renderRoute() ya
    // renderice con el estado correcto de una.
    if (STATE.route.view === 'materias') {
      STATE.materiasFiltro = params.get('filtro') || 'todas';
      STATE.materiasQuery = params.get('q') || '';
      STATE.materiasView = params.get('vista') === 'tabla' ? 'tabla' : 'tarjetas';
    } else if (STATE.route.view === 'agenda') {
      STATE.agendaFiltroKind = params.get('kind') || '';
      STATE.agendaFiltroMateria = params.get('materia') || '';
      STATE.agendaFiltroEstado = params.get('estado') || '';
      STATE.agendaQuery = params.get('q') || '';
    } else if (STATE.route.view === 'calendario') {
      STATE.calViewMode = params.get('vista') === 'semana' ? 'semana' : 'mes';
    }
    renderRoute();
  }

  // ================================================================
  // TOOLBAR / EXPORT / IMPORT / GLOBAL BINDINGS
  // ================================================================
  function closeMobileNav() {
    document.getElementById('sidenav').classList.remove('is-open');
    document.getElementById('sidenav-backdrop').classList.remove('is-open');
  }
  function openMobileNav() {
    document.getElementById('sidenav').classList.add('is-open');
    document.getElementById('sidenav-backdrop').classList.add('is-open');
  }

  // ================================================================
  // SEMESTRES
  // ================================================================
  function renderSemestreSwitcher() {
    var s = semestreRawById(activeSemestreId());
    var lbl = document.getElementById('semestre-activo-nombre');
    if (lbl) lbl.textContent = s ? s.nombre : 'Sin semestre';
  }

  function renderSemestresModal() {
    var list = document.getElementById('semestres-list');
    clear(list);
    var activoId = activeSemestreId();
    var ordenados = semestresPropiosOrdenados();
    ordenados.forEach(function (s, idx) {
      var count = loadMateriasRaw().filter(function (m) { return m.semestreId === s.id; }).length;
      var node = tpl('semestre-row');
      var selectBtn = qf(node, 'selectBtn');
      var isActive = s.id === activoId;
      selectBtn.classList.toggle('is-active', isActive);
      qf(node, 'nombre').textContent = s.nombre;
      qf(node, 'meta').textContent = count + (count === 1 ? ' materia' : ' materias');
      selectBtn.addEventListener('click', async function () {
        if (s.id === activeSemestreId()) { closeAllModals(); return; }
        selectBtn.disabled = true;
        var ok = await setSemestreActivo(s.id);
        selectBtn.disabled = false;
        if (!ok) { avisarError(); return; }
        closeAllModals();
        renderRoute();
      });
      // Subir/bajar (bloque D3) — swap de `orden` con el vecino, no
      // reordena nada más. Deshabilitados en los extremos en vez de
      // ocultos: el tamaño de toque no se mueve de lugar entre filas.
      var subirBtn = qf(node, 'subirBtn');
      var bajarBtn = qf(node, 'bajarBtn');
      subirBtn.disabled = idx === 0;
      bajarBtn.disabled = idx === ordenados.length - 1;
      subirBtn.addEventListener('click', async function (ev) {
        ev.stopPropagation();
        subirBtn.disabled = true;
        var ok = await moverSemestre(s.id, -1);
        if (!ok) avisarError();
        renderSemestresModal();
      });
      bajarBtn.addEventListener('click', async function (ev) {
        ev.stopPropagation();
        bajarBtn.disabled = true;
        var ok = await moverSemestre(s.id, 1);
        if (!ok) avisarError();
        renderSemestresModal();
      });
      var editBtn = qf(node, 'editBtn');
      editBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        iniciarRenombreSemestre(node, s);
      });
      var deleteBtn = qf(node, 'deleteBtn');
      deleteBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        eliminarSemestre(s);
      });
      list.appendChild(node);
    });
  }

  // Reemplaza la fila entera por un input (no anida el input dentro del
  // <button> de selección — eso sería HTML inválido y da problemas de foco).
  function iniciarRenombreSemestre(row, s) {
    clear(row);
    var input = el('input', 'semestre-row-nombre-input');
    input.value = s.nombre;
    row.appendChild(input);
    input.focus(); input.select();
    var done = false;
    var commit = async function () {
      if (done) return;
      done = true;
      var nuevo = input.value.trim();
      if (nuevo && nuevo !== s.nombre) {
        var arr = loadSemestresRaw().map(function (x) { return x.id === s.id ? Object.assign({}, x, { nombre: nuevo }) : x; });
        var ok = await saveSemestresRaw(arr);
        if (!ok) avisarError();
      }
      renderSemestresModal();
      renderSemestreSwitcher();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      else if (ev.key === 'Escape') { done = true; renderSemestresModal(); }
    });
  }

  // Mismo patrón de borrado en cascada que ya usa la materia (confirm() ->
  // borrar hijos -> borrar padre -> avisarError() si algo falla,
  // ver btn-materia-eliminar), un nivel más: semestre -> materias -> agenda
  // de esas materias. saveSemestresRaw() ya borra cualquier id que falte del
  // array que se le pasa, no hace falta una ruta de borrado nueva para eso.
  async function eliminarSemestre(s) {
    var materiasDelSemestre = loadMateriasRaw().filter(function (m) { return m.semestreId === s.id; });
    var msg = materiasDelSemestre.length
      ? '¿Eliminar "' + s.nombre + '"? También se van a borrar sus ' + materiasDelSemestre.length + (materiasDelSemestre.length === 1 ? ' materia' : ' materias') + ' y todas sus evaluaciones de la agenda. Esta acción no se puede deshacer.'
      : '¿Eliminar "' + s.nombre + '"? Esta acción no se puede deshacer.';
    if (!confirm(msg)) return;
    var materiaIds = {};
    materiasDelSemestre.forEach(function (m) { materiaIds[m.id] = true; });
    var restantes = loadSemestresRaw().filter(function (x) { return x.id !== s.id; });
    // Si el que se borra estaba activo, pasa a activo el más nuevo de los
    // que quedan (mismo orden de semestresOrdenados — nada de "el
    // anteúltimo del array"). Se puede borrar el último semestre sin
    // bloquear nada: la app ya sabe mostrar "sin materias" con sus estados
    // vacíos existentes, y crear una materia sin semestre activo ya
    // auto-crea uno — no hace falta un caso especial nuevo para esto.
    if (s.activo && restantes.length) {
      var candidatos = semestresPropiosOrdenados().filter(function (x) { return x.id !== s.id; });
      var masNuevo = candidatos.slice(-1)[0];
      if (masNuevo) restantes = restantes.map(function (x) { return Object.assign({}, x, { activo: x.id === masNuevo.id }); });
    }
    var idsAgendaBorrados = loadAgendaRaw().filter(function (a) { return materiaIds[a.materiaId]; }).map(function (a) { return a.id; });
    // Antes de borrar de Supabase: sync-google-event lee la fila para
    // conseguir el google_event_id — después de borrada ya no la encuentra.
    for (var i = 0; i < idsAgendaBorrados.length; i++) await syncToGoogleCalendar('delete', 'agenda', idsAgendaBorrados[i]);
    var okSem = await saveSemestresRaw(restantes);
    var okMat = await saveMateriasRaw(loadMateriasRaw().filter(function (m) { return !materiaIds[m.id]; }));
    var okAg = await saveAgendaRaw(loadAgendaRaw().filter(function (a) { return !materiaIds[a.materiaId]; }));
    if (!okSem || !okMat || !okAg) avisarError();
    renderSemestresModal();
    renderRoute();
  }

  // Sugerencia de nombre para un semestre nuevo, en base a la fecha real —
  // el campo sigue siendo texto libre, esto es sólo un punto de partida
  // razonable que el usuario puede reescribir por completo (ver README).
  function sugerirNombreSemestre() {
    var t = today();
    var mitad = t.getMonth() < 6 ? 'Primer semestre' : 'Segundo semestre';
    return t.getFullYear() + ' · ' + mitad;
  }

  async function crearSemestre(nombre) {
    nombre = (nombre || '').trim();
    if (!nombre) return;
    var arr = loadSemestresRaw().map(function (s) { return Object.assign({}, s, { activo: false }); });
    arr.push({ id: uid(), nombre: nombre, activo: true, orden: proximoOrdenSemestre() });
    var btn = document.getElementById('btn-crear-semestre');
    setBtnBusy(btn, true, 'Creando…');
    var ok = await saveSemestresRaw(arr);
    setBtnBusy(btn, false);
    if (!ok) { avisarError(); return; }
    document.getElementById('input-nuevo-semestre').value = '';
    closeAllModals();
    renderRoute();
  }

  // "Crear" en el gestor de semestres: si hay catálogo (ORT) y la carrera ya
  // está elegida, no crea un semestre vacío de una — dispara un
  // mini-onboarding (abrirWizardNuevoSemestre) para volver a elegir qué
  // materias se cursan, igual que el onboarding inicial pero apuntando
  // siempre a ESTE semestre nuevo. El semestre se crea acá mismo (mismo
  // patrón de crearSemestre: desactiva los demás, éste nace activo) — el
  // wizard sólo AGREGA materias sobre un semestre que ya existe, nunca las
  // reemplaza ni toca las de otro semestre. Sin catálogo (o sin carrera
  // elegida todavía), cae al alta vacía de siempre: no hay de dónde elegir
  // materias.
  async function crearSemestreConOnboarding(nombre) {
    nombre = (nombre || '').trim();
    if (!nombre) return;
    if (!(CURRENT_PROFILE && CURRENT_PROFILE.university_id === ORT_UNIVERSITY_ID && CURRENT_PROFILE.carrera_id)) {
      return crearSemestre(nombre);
    }
    var arr = loadSemestresRaw().map(function (s) { return Object.assign({}, s, { activo: false }); });
    var id = uid();
    arr.push({ id: id, nombre: nombre, activo: true, orden: proximoOrdenSemestre(), periodo: PERIODO_ACTUAL });
    var btn = document.getElementById('btn-crear-semestre');
    setBtnBusy(btn, true, 'Creando…');
    var ok = await saveSemestresRaw(arr);
    setBtnBusy(btn, false);
    if (!ok) { avisarError(); return; }
    document.getElementById('input-nuevo-semestre').value = '';
    closeAllModals();
    renderRoute();
    await abrirWizardNuevoSemestre(id, CURRENT_PROFILE.carrera_id);
  }

  // Nombre sugerido para un semestre creado a partir de un período del
  // catálogo ('2026-2' -> "2026 · Segundo semestre") — mismo formato que
  // sugerirNombreSemestre(), pero derivado del período que el usuario eligió
  // en el wizard de onboarding, no de la fecha real del dispositivo.
  function nombreDesdePeriodo(periodo) {
    var partes = (periodo || '').split('-');
    var anio = partes[0] || String(today().getFullYear());
    var mitad = partes[1] === '1' ? 'Primer semestre' : 'Segundo semestre';
    return anio + ' · ' + mitad;
  }

  // Reusa un semestre existente con este período (re-ejecutar el wizard de
  // onboarding no duplica) o crea uno nuevo y lo activa — mismo patrón de
  // activar/desactivar secuencial que crearSemestre() (ver saveSemestresRaw,
  // la restricción de "un solo activo" vive en la base).
  async function obtenerOCrearSemestrePeriodo(periodo) {
    var existente = loadSemestresRaw().filter(function (s) { return s.periodo === periodo; })[0];
    if (existente) {
      if (!existente.activo && !(await setSemestreActivo(existente.id))) throw new Error('No se pudo activar el semestre.');
      return existente.id;
    }
    var arr = loadSemestresRaw().map(function (s) { return Object.assign({}, s, { activo: false }); });
    var id = uid();
    arr.push({ id: id, nombre: nombreDesdePeriodo(periodo), activo: true, orden: proximoOrdenSemestre(), periodo: periodo });
    if (!(await saveSemestresRaw(arr))) throw new Error('No se pudo crear el semestre.');
    return id;
  }

  // Bloque 4: semestre sintético que agrupa las materias aprobadas/pendientes
  // de "antes de usar la app" (onboarding, paso progreso anterior) según el
  // número de semestre del plan (1..8) — no un semestre propio del usuario:
  // nunca activo, nunca aparece en el selector/gestor (ver
  // semestresPropiosOrdenados), sólo alimenta la sección Progreso. `orden`
  // bien negativo para que siempre ordene antes que cualquier semestre
  // propio, y entre sí por n. Idempotente por nombre: reingresar al wizard
  // (btn-rehacer-onboarding) reusa el mismo en vez de duplicarlo.
  async function obtenerOCrearSemestreHistorico(n) {
    var nombre = 'Semestre ' + n + ' (antes de Cursada)';
    var existente = loadSemestresRaw().filter(function (s) { return s.historico && s.nombre === nombre; })[0];
    if (existente) return existente.id;
    var id = uid();
    var arr = loadSemestresRaw().concat([{ id: id, nombre: nombre, activo: false, orden: -1000 + n, historico: true }]);
    if (!(await saveSemestresRaw(arr))) throw new Error('No se pudo crear el semestre histórico.');
    return id;
  }

  function bindGlobalUI() {
    document.getElementById('btn-menu').addEventListener('click', openMobileNav);
    // Mobile: cada .topbar tiene su propio ☰ (ver .topbar-menu) porque
    // .app-toolbar — donde vive #btn-menu — se oculta en mobile; sin esto no
    // había forma de abrir el cajón desde ahí. Delegado porque son 6 botones
    // repetidos, no un solo id.
    document.addEventListener('click', function (e) { if (e.target.closest('[data-menu]')) openMobileNav(); });
    document.getElementById('sidenav-backdrop').addEventListener('click', closeMobileNav);
    document.querySelectorAll('[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () { location.hash = '#' + btn.getAttribute('data-nav'); closeMobileNav(); });
    });
    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () { applyTheme(btn.getAttribute('data-theme-btn')); });
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (bd) {
      bd.addEventListener('click', function (e) { if (e.target === bd) closeModalEl(bd); });
      bd.querySelectorAll('[data-close-modal]').forEach(function (btn) { btn.addEventListener('click', function () { closeModalEl(bd); }); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAllModals(); closeMobileNav(); closeQuickSheet(); closeRowMenu(); } });

    document.getElementById('btn-semestre-switcher').addEventListener('click', function () {
      renderSemestresModal();
      // Placeholder, no value: sugerimos un nombre pero no lo dejamos
      // pre-cargado — si el input quedara con un valor real, tocar "Crear"
      // sin querer (p. ej. para simplemente ver la lista) crearía un
      // semestre de más.
      document.getElementById('input-nuevo-semestre').placeholder = sugerirNombreSemestre();
      openModal('modal-semestres');
    });
    document.getElementById('btn-crear-semestre').addEventListener('click', function () { crearSemestreConOnboarding(document.getElementById('input-nuevo-semestre').value); });
    document.getElementById('input-nuevo-semestre').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); crearSemestreConOnboarding(ev.target.value); } });

    bindNuevoMenus();
    document.getElementById('inicio-search').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = e.target.value.trim();
      if (!q) return;
      var ql = q.toLowerCase();
      // materiaHits se busca acotado al semestre activo porque el destino
      // ambiguo (#materias) también lo está; agendaHits se busca sin acotar
      // porque su destino (#agenda) tampoco se acota por semestre — ver
      // README, sección Semestres.
      var materiaHits = computeMateriasDelActivo().filter(function (m) { return (m.nombre + ' ' + m.doc).toLowerCase().indexOf(ql) >= 0; });
      var agendaHits = loadAgendaRaw().filter(function (a) { return (a.titulo + ' ' + (a.materiaId ? materiaNombre(a.materiaId) : '')).toLowerCase().indexOf(ql) >= 0; });
      var targetHash, apply;
      if (materiaHits.length === 1 && agendaHits.length === 0) {
        targetHash = '#materia-' + materiaHits[0].id;
        apply = function () {};
      } else if (materiaHits.length >= agendaHits.length) {
        targetHash = '#materias';
        apply = function () { STATE.materiasQuery = q; };
      } else {
        targetHash = '#agenda';
        apply = function () { STATE.agendaQuery = q; };
      }
      apply();
      if (location.hash === targetHash) handleRoute(); else location.hash = targetHash;
    });
    document.getElementById('btn-materias-nueva').addEventListener('click', function () { openMateriaModal(null); });
    document.getElementById('btn-empty-primera').addEventListener('click', function () { openMateriaModal(null); });
    document.getElementById('acceso-materia').addEventListener('click', function () { openMateriaModal(null); });
    document.getElementById('acceso-entrega').addEventListener('click', function () { openEvaluacionModal({}); });
    document.getElementById('acceso-evento').addEventListener('click', function () { openPersonalModal({}); });
    document.getElementById('btn-progreso-semestre-cargar').addEventListener('click', function () { openCargarNotaModal(); });
    document.getElementById('btn-inicio-notas-pendientes').addEventListener('click', function () {
      renderProgresoPendientesModal();
      openModal('modal-progreso-pendientes');
    });
    document.getElementById('btn-agenda-nuevo').addEventListener('click', function () { openEvaluacionModal({}); });
    document.getElementById('agenda-search').addEventListener('input', function (e) { STATE.agendaQuery = e.target.value; renderAgenda(); });
    document.getElementById('btn-horario-editar').addEventListener('click', function () { openMateriaModal(null); });

    // ---- Mobile: FAB (tap = alta principal de la vista, long-press = hoja
    // con las 3 altas) ----
    // Mismo mapeo que ya usan los botones "+" de cada topbar/Accesos
    // rápidos — el FAB no es una ruta de guardado nueva, sólo un atajo a la
    // misma función según STATE.route.view en el momento del click.
    function fabAction() {
      var view = STATE.route.view;
      if (view === 'detalle') { openEvaluacionModal({ materiaId: STATE.route.materiaId, kind: 'evaluacion' }); return; }
      if (view === 'agenda') { openEvaluacionModal({}); return; }
      if (view === 'calendario') { openPersonalModal({ fecha: STATE.calSelected }); return; }
      openMateriaModal(null); // inicio, materias, horario
    }
    var btnFab = document.getElementById('btn-fab');
    var fabPressTimer = null, fabLongPressed = false;
    btnFab.addEventListener('pointerdown', function () {
      fabLongPressed = false;
      fabPressTimer = setTimeout(function () { fabLongPressed = true; openQuickSheet(); }, 500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evName) {
      btnFab.addEventListener(evName, function () { clearTimeout(fabPressTimer); });
    });
    btnFab.addEventListener('click', function () {
      if (fabLongPressed) { fabLongPressed = false; return; } // el long-press ya abrió la hoja; no ejecutar además la acción corta
      fabAction();
    });
    document.getElementById('quick-materia').addEventListener('click', function () { closeQuickSheet(); openMateriaModal(null); });
    document.getElementById('quick-entrega').addEventListener('click', function () { closeQuickSheet(); openEvaluacionModal({}); });
    document.getElementById('quick-evento').addEventListener('click', function () { closeQuickSheet(); openPersonalModal({}); });
    // Cerrar la hoja tocando afuera (no tiene backdrop propio).
    document.addEventListener('click', function (e) {
      var sheet = document.getElementById('quick-sheet');
      if (sheet.classList.contains('is-open') && !sheet.contains(e.target) && e.target !== btnFab && !btnFab.contains(e.target)) closeQuickSheet();
      var menu = document.getElementById('row-menu');
      if (menu.classList.contains('is-open') && !menu.contains(e.target)) closeRowMenu();
    });

    // ---- Mobile: buscador que se expande en el header ----
    document.querySelectorAll('[data-toggle-search]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var topbar = btn.closest('.topbar');
        topbar.classList.toggle('is-searching');
        var input = topbar.querySelector('.search-input');
        if (topbar.classList.contains('is-searching') && input) input.focus();
      });
    });

    // ---- Mobile: arrastrar el grabber de una hoja inferior (semestres,
    // importar-local) para cerrarla. Cierra vía closeModalEl(bd) — nunca
    // saca .is-open a mano — para no esquivar el aviso de "¿descartar
    // cambios?" si alguna vez una hoja con formulario usa este patrón.
    document.querySelectorAll('.sheet-grabber').forEach(function (grabber) {
      var modal = grabber.closest('.modal');
      var bd = grabber.closest('.modal-backdrop');
      var dragging = false, dragStartY = 0;
      grabber.addEventListener('pointerdown', function (e) {
        dragging = true; dragStartY = e.clientY;
        bd.classList.add('is-dragging');
        grabber.setPointerCapture(e.pointerId);
      });
      grabber.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        modal.style.setProperty('--dy', Math.max(0, e.clientY - dragStartY) + 'px');
      });
      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        bd.classList.remove('is-dragging');
        if (Math.max(0, e.clientY - dragStartY) > 96) closeModalEl(bd);
        modal.style.setProperty('--dy', '0px');
      }
      grabber.addEventListener('pointerup', endDrag);
      grabber.addEventListener('pointercancel', endDrag);
    });

    document.getElementById('btn-ob-empezar').addEventListener('click', function () {
      hideOnboarding();
      if (computeMaterias().length) location.hash = '#materias';
      else openMateriaModal(null);
    });

    document.getElementById('materias-search').addEventListener('input', function (e) { STATE.materiasQuery = e.target.value; renderMaterias(); });

    document.querySelectorAll('[data-materias-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        STATE.materiasView = btn.getAttribute('data-materias-view');
        document.querySelectorAll('[data-materias-view]').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        renderMaterias();
      });
    });

    document.getElementById('cal-prev').addEventListener('click', function () {
      if (STATE.calViewMode === 'semana') { STATE.calWeekStart = new Date(STATE.calWeekStart.getFullYear(), STATE.calWeekStart.getMonth(), STATE.calWeekStart.getDate() - 7); }
      else { STATE.calMonth--; if (STATE.calMonth < 0) { STATE.calMonth = 11; STATE.calYear--; } }
      renderCalendario();
    });
    document.getElementById('cal-next').addEventListener('click', function () {
      if (STATE.calViewMode === 'semana') { STATE.calWeekStart = new Date(STATE.calWeekStart.getFullYear(), STATE.calWeekStart.getMonth(), STATE.calWeekStart.getDate() + 7); }
      else { STATE.calMonth++; if (STATE.calMonth > 11) { STATE.calMonth = 0; STATE.calYear++; } }
      renderCalendario();
    });
    document.getElementById('cal-today-label').addEventListener('click', calGoToday);
    document.querySelectorAll('#cal-view-toggle [data-cal-view]').forEach(function (b) {
      b.addEventListener('click', function () { STATE.calViewMode = b.getAttribute('data-cal-view'); renderCalendario(); });
    });

    document.getElementById('toggle-personales').addEventListener('click', function () {
      STATE.mostrarPersonales = !STATE.mostrarPersonales;
      this.classList.toggle('is-on', STATE.mostrarPersonales);
      renderRoute();
    });
    document.getElementById('toggle-clases').addEventListener('click', function () {
      STATE.mostrarClases = !STATE.mostrarClases;
      this.classList.toggle('is-on', STATE.mostrarClases);
      guardarMostrarClasesPref(STATE.mostrarClases);
      renderRoute();
    });
    document.getElementById('toggle-evaluaciones').addEventListener('click', function () {
      STATE.mostrarEvaluaciones = !STATE.mostrarEvaluaciones;
      this.classList.toggle('is-on', STATE.mostrarEvaluaciones);
      renderRoute();
    });
    document.getElementById('toggle-sabado').addEventListener('click', function () {
      STATE.mostrarSabado = !STATE.mostrarSabado;
      this.classList.toggle('is-on', STATE.mostrarSabado);
      renderHorario();
    });

    document.getElementById('btn-exportar').addEventListener('click', function () {
      var data = { version: 2, exportadoEl: new Date().toISOString(), cuenta: CURRENT_USER ? CURRENT_USER.email : null, semestres: loadSemestresRaw(), materias: loadMateriasRaw(), agenda: loadAgendaRaw(), personal: loadPersonalRaw() };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = el('a'); a.href = url; a.download = 'cursada-datos.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    document.getElementById('btn-importar').addEventListener('click', function () { document.getElementById('input-importar').click(); });
    document.getElementById('input-importar').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = async function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data || !Array.isArray(data.materias) || !Array.isArray(data.agenda) || !Array.isArray(data.personal)) throw new Error('forma inválida');
          var ok = await importCollections(data);
          if (!ok) { avisarError('No se pudo importar todo el archivo — revisá tu conexión e intentá de nuevo.'); return; }
          renderRoute();
        } catch (err) {
          avisarError('No se pudo importar el archivo: formato inválido.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    document.getElementById('btn-borrar-todo').addEventListener('click', async function () {
      if (!confirm('¿Borrar todas tus materias, entregas, eventos personales y semestres? Esta acción no se puede deshacer.')) return;
      var btn = document.getElementById('btn-borrar-todo');
      setBtnBusy(btn, true, 'Borrando…');
      // Mismo motivo que en eliminarMateria/eliminarSemestre: sync-google-event
      // lee la fila de agenda/personal para conseguir su google_event_id —
      // tiene que correr antes de que saveAgendaRaw/savePersonalRaw las borren
      // de Supabase, si no siempre responde "Registro no encontrado" y el
      // evento queda huérfano en Google Calendar.
      var idsAgenda = loadAgendaRaw().map(function (a) { return a.id; });
      var idsPersonal = loadPersonalRaw().map(function (p) { return p.id; });
      var i;
      for (i = 0; i < idsAgenda.length; i++) await syncToGoogleCalendar('delete', 'agenda', idsAgenda[i]);
      for (i = 0; i < idsPersonal.length; i++) await syncToGoogleCalendar('delete', 'personal', idsPersonal[i]);
      var okMat = await saveMateriasRaw([]);
      var okAg = await saveAgendaRaw([]);
      var okPer = await savePersonalRaw([]);
      var okSem = await saveSemestresRaw([]);
      setBtnBusy(btn, false);
      if (!okMat || !okAg || !okPer || !okSem) avisarError();
      location.hash = '#materias';
      renderRoute();
    });
  }

  // ================================================================
  // AUTENTICACIÓN
  // ================================================================
  var AUTH_MODE = 'signin'; // 'signin' | 'signup'
  var JUST_SIGNED_UP = false; // true entre un signUp() con sesión inmediata y el próximo onSignedIn()
  // true entre el evento PASSWORD_RECOVERY y que se guarde la contraseña
  // nueva (o se abandone la pantalla) — mientras tanto hay una sesión
  // temporal activa que NO debe arrancar la app normal (ver onAuthStateChange
  // más abajo).
  var EN_RECUPERACION_PASSWORD = false;
  // true sólo durante el signOut() que dispara el propio botón "Cerrar
  // sesión" (o el botón de la pantalla de sesión vencida) — así el listener
  // de SIGNED_OUT puede distinguir "elegiste cerrar sesión" de "Supabase te
  // cerró la sesión sola" (token/refresh token inválido) y mostrar la
  // pantalla correcta en cada caso.
  var CERRANDO_SESION_DELIBERADO = false;

  // Controla qué pantalla de nivel superior se ve: 'gate-loading' (cargando
  // sesión o datos), 'auth-screen' (sin sesión, incluye recuperar
  // contraseña), 'gate-error' (falló la carga de datos), 'gate-sesion-vencida'
  // (la sesión venció en medio del uso) — o null para mostrar #app (ya con
  // sesión y datos listos).
  function setGate(id) {
    ['gate-loading', 'auth-screen', 'gate-error', 'gate-sesion-vencida'].forEach(function (x) {
      document.getElementById(x).classList.toggle('hidden', x !== id);
    });
    document.getElementById('app').classList.toggle('hidden', !!id);
  }
  function setGateLoadingText(msg) { document.getElementById('gate-loading-text').textContent = msg; }

  function traducirErrorAuth(e) {
    var msg = (e && e.message) || '';
    if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
    if (/Email not confirmed/i.test(msg)) return 'Todavía no confirmaste tu email — revisá tu casilla (y spam) y tocá el link que te mandamos.';
    if (/already registered/i.test(msg)) return 'Ya existe una cuenta con ese email — probá iniciar sesión.';
    if (/Password should be at least/i.test(msg)) return 'La contraseña tiene que tener al menos 6 caracteres.';
    if (/invalid.*email/i.test(msg)) return 'Ese email no parece válido.';
    if (/rate limit/i.test(msg)) return 'Demasiados intentos — esperá un minuto y probá de nuevo.';
    if (/provider is not enabled/i.test(msg)) return 'El login con Google todavía no está habilitado en el proyecto.';
    // Va ANTES que el chequeo de access_denied de acá abajo: Supabase manda
    // `error=access_denied` como código genérico tanto para "cancelaste el
    // consentimiento de Google" como para "este link de mail venció o ya se
    // usó" (confirmación de cuenta o recuperación de contraseña) —
    // `error_code=otp_expired` (o esta frase en `error_description`) es la
    // señal específica que desambigua, así que tiene que ganarle a la
    // genérica si las dos aparecen en el mismo mensaje.
    if (/otp_expired|email link is invalid or has expired/i.test(msg)) return 'Ese link venció o ya se usó — pedí uno nuevo desde "¿Olvidaste tu contraseña?".';
    if (/access_denied/i.test(msg)) return 'Cancelaste el inicio de sesión con Google.';
    return msg || 'No se pudo completar la operación. Revisá tu conexión a internet.';
  }

  function setAuthMode(mode) {
    AUTH_MODE = mode;
    document.querySelectorAll('#auth-mode-toggle [data-auth-mode]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-auth-mode') === mode); });
    document.getElementById('auth-submit').textContent = mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión';
    document.getElementById('auth-signup-fields').classList.toggle('hidden', mode !== 'signup');
    if (mode === 'signup') {
      poblarSelectNacimiento('auth-nac');
      initSelectPais('auth-tel-pais', 'auth-telefono', null, null);
      initSelectUniversidad('auth-universidad', 'auth-universidad-otra-wrap', 'auth-universidad-otra', null, null, function (universityId, esPrecarga) {
        initSelectCarrera('auth-carrera-select', 'auth-carrera', universityId, esPrecarga ? document.getElementById('auth-carrera').value : '');
      });
    }
    // No tiene sentido "¿olvidaste tu contraseña?" en el formulario de
    // registro (todavía no existe una).
    document.getElementById('auth-forgot-row').classList.toggle('hidden', mode === 'signup');
    showAuthError('');
  }
  function showAuthError(msg) {
    var e = document.getElementById('auth-error');
    e.textContent = msg || ''; e.classList.toggle('hidden', !msg);
  }

  // .auth-card tiene 5 paneles mutuamente excluyentes (login, confirmá tu
  // cuenta, y los 3 de recuperación de contraseña) — un solo punto que
  // oculta los otros 4 y muestra el pedido, en vez de un par de
  // show/hide sueltos por cada combinación (así lo agregado para
  // recuperación de contraseña no tuvo que reinventar el mecanismo).
  var AUTH_PANELS = ['auth-form-panel', 'auth-check-email-panel', 'auth-forgot-panel', 'auth-forgot-sent-panel', 'auth-reset-password-panel'];
  function showAuthPanel(id) {
    AUTH_PANELS.forEach(function (p) { document.getElementById(p).classList.toggle('hidden', p !== id); });
  }

  // Pantalla dedicada de "confirmá tu cuenta" — reemplaza al formulario
  // entero (no un texto chico al lado, fácil de pasar por alto) cuando el
  // registro no devuelve sesión porque el proyecto tiene confirmación de
  // email activada.
  var ULTIMO_EMAIL_REGISTRADO = '';
  function showCheckEmailPanel(email) {
    ULTIMO_EMAIL_REGISTRADO = email;
    document.getElementById('auth-check-email').textContent = email;
    document.getElementById('auth-resend-info').classList.add('hidden');
    showAuthPanel('auth-check-email-panel');
  }
  function showFormPanel() {
    showAuthPanel('auth-form-panel');
  }

  // Toast breve para feedback puntual que no necesita bloquear la pantalla
  // (p. ej. "cuenta creada" cuando el registro sí devuelve sesión de una —
  // proyectos sin confirmación de email activada).
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-open'); }, 4000);
  }

  // Destino de vuelta compartido por cualquier flujo que le pida a Supabase
  // redirigir el navegador (OAuth de Google, el link de recuperación de
  // contraseña por mail): el propio location.href sin el hash. Si estabas en
  // #materias antes de entrar, no hace falta preservarlo — al volver
  // autenticado (o al elegir la contraseña nueva) arrancás en Inicio como
  // cualquier login nuevo.
  function authRedirectUrl() { return location.href.split('#')[0]; }

  // ================================================================
  // FECHA DE NACIMIENTO / TELÉFONO CON PAÍS / UNIVERSIDAD (bloque A)
  // Compartido entre el formulario de registro (auth-*) y el de perfil
  // (perfil-*) — mismos helpers, dos prefijos de id distintos.
  // ================================================================
  function poblarSelectNacimiento(prefix) {
    var selDia = document.getElementById(prefix + '-dia');
    var selMes = document.getElementById(prefix + '-mes');
    var selAnio = document.getElementById(prefix + '-anio');
    if (!selDia || selDia.options.length) return; // ya poblado
    var optDia = el('option'); optDia.value = ''; optDia.textContent = 'Día'; selDia.appendChild(optDia);
    for (var d = 1; d <= 31; d++) { var o = el('option'); o.value = String(d); o.textContent = String(d); selDia.appendChild(o); }
    var optMes = el('option'); optMes.value = ''; optMes.textContent = 'Mes'; selMes.appendChild(optMes);
    MESES_LARGOS.forEach(function (nombre, i) {
      var om = el('option'); om.value = String(i + 1); om.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1); selMes.appendChild(om);
    });
    var optAnio = el('option'); optAnio.value = ''; optAnio.textContent = 'Año'; selAnio.appendChild(optAnio);
    // 15 a 100 años — mismo rango que valida el check constraint en Supabase.
    var anioActual = today().getFullYear();
    for (var y = anioActual - 15; y >= anioActual - 100; y--) { var oy = el('option'); oy.value = String(y); oy.textContent = String(y); selAnio.appendChild(oy); }
  }
  function leerNacimientoISO(prefix) {
    var dia = document.getElementById(prefix + '-dia').value;
    var mes = document.getElementById(prefix + '-mes').value;
    var anio = document.getElementById(prefix + '-anio').value;
    if (!dia || !mes || !anio) return null;
    return anio + '-' + (mes.length < 2 ? '0' + mes : mes) + '-' + (dia.length < 2 ? '0' + dia : dia);
  }
  function initNacimiento(prefix, iso) {
    poblarSelectNacimiento(prefix);
    var selDia = document.getElementById(prefix + '-dia');
    var selMes = document.getElementById(prefix + '-mes');
    var selAnio = document.getElementById(prefix + '-anio');
    if (!iso) { selDia.value = ''; selMes.value = ''; selAnio.value = ''; return; }
    var partes = iso.split('-');
    selAnio.value = partes[0]; selMes.value = String(Number(partes[1])); selDia.value = String(Number(partes[2]));
  }

  // Uruguay primero (default) — resto pensado para estudiantes de la
  // región + los destinos de intercambio más comunes, no la lista completa
  // de países del mundo.
  var PAISES_TEL = [
    { iso: 'UY', nombre: 'Uruguay', prefijo: '+598', bandera: '🇺🇾' },
    { iso: 'AR', nombre: 'Argentina', prefijo: '+54', bandera: '🇦🇷' },
    { iso: 'BR', nombre: 'Brasil', prefijo: '+55', bandera: '🇧🇷' },
    { iso: 'CL', nombre: 'Chile', prefijo: '+56', bandera: '🇨🇱' },
    { iso: 'PY', nombre: 'Paraguay', prefijo: '+595', bandera: '🇵🇾' },
    { iso: 'BO', nombre: 'Bolivia', prefijo: '+591', bandera: '🇧🇴' },
    { iso: 'PE', nombre: 'Perú', prefijo: '+51', bandera: '🇵🇪' },
    { iso: 'EC', nombre: 'Ecuador', prefijo: '+593', bandera: '🇪🇨' },
    { iso: 'CO', nombre: 'Colombia', prefijo: '+57', bandera: '🇨🇴' },
    { iso: 'VE', nombre: 'Venezuela', prefijo: '+58', bandera: '🇻🇪' },
    { iso: 'MX', nombre: 'México', prefijo: '+52', bandera: '🇲🇽' },
    { iso: 'ES', nombre: 'España', prefijo: '+34', bandera: '🇪🇸' },
    { iso: 'US', nombre: 'Estados Unidos', prefijo: '+1', bandera: '🇺🇸' }
  ];
  function paisPorIso(iso) {
    var found = null;
    PAISES_TEL.forEach(function (p) { if (p.iso === iso) found = p; });
    return found || PAISES_TEL[0];
  }
  // Formatea "mientras se escribe" con libphonenumber-js si está disponible
  // (bundle standalone por CDN, ver build-app.mjs) — si no cargó (offline,
  // CDN caído), se degrada a dejar el número tal cual lo escribió el
  // usuario, sin romper el formulario.
  function formatearTelefonoInput(inputEl, paisIso) {
    if (!window.libphonenumber) return;
    try {
      var formateado = new window.libphonenumber.AsYouType(paisIso).input(inputEl.value);
      if (formateado) inputEl.value = formateado;
    } catch (e) {}
  }
  // { telefono_e164, telefono_pais } a partir del select de país + el input
  // — si libphonenumber no está disponible o el número no valida para ese
  // país, guarda un E.164 "mejor esfuerzo" (prefijo + dígitos) en vez de
  // perder el dato.
  function calcularTelefono(paisIso, valorInput) {
    var digits = (valorInput || '').replace(/[^\d]/g, '');
    if (!digits) return { telefono_e164: null, telefono_pais: null };
    if (window.libphonenumber) {
      try {
        var pn = window.libphonenumber.parsePhoneNumberFromString(valorInput, paisIso);
        if (pn) return { telefono_e164: pn.number, telefono_pais: paisIso };
      } catch (e) {}
    }
    return { telefono_e164: paisPorIso(paisIso).prefijo + digits, telefono_pais: paisIso };
  }
  // Número nacional legible para mostrar en el input al editar (sin
  // prefijo — ese ya lo muestra el select de país aparte).
  function telefonoNacionalDesdeE164(e164, paisIso) {
    if (!e164) return '';
    if (window.libphonenumber) {
      try {
        var pn = window.libphonenumber.parsePhoneNumberFromString(e164);
        if (pn) return pn.formatNational();
      } catch (e) {}
    }
    var prefijo = paisPorIso(paisIso).prefijo;
    return e164.indexOf(prefijo) === 0 ? e164.slice(prefijo.length).trim() : e164;
  }
  function initSelectPais(selectId, telInputId, e164, paisIso) {
    var sel = document.getElementById(selectId);
    var input = document.getElementById(telInputId);
    if (!sel.options.length) {
      PAISES_TEL.forEach(function (p) { var o = el('option'); o.value = p.iso; o.textContent = p.bandera + ' ' + p.prefijo; o.title = p.nombre; sel.appendChild(o); });
    }
    sel.value = paisIso || 'UY';
    input.value = e164 ? telefonoNacionalDesdeE164(e164, sel.value) : '';
    sel.onchange = function () { formatearTelefonoInput(input, sel.value); };
    input.oninput = function () { formatearTelefonoInput(input, sel.value); };
  }

  // universities: tabla de lectura pública (RLS `using (true)`) — se cachea
  // en memoria porque no cambia durante la sesión y se usa en dos
  // formularios (registro y perfil).
  var UNIVERSIDADES_CACHE = null;
  function cargarUniversidades() {
    if (UNIVERSIDADES_CACHE) return Promise.resolve(UNIVERSIDADES_CACHE);
    return sb().from('universities').select('*').order('nombre').then(function (res) {
      UNIVERSIDADES_CACHE = res.error ? [] : res.data;
      return UNIVERSIDADES_CACHE;
    });
  }
  // onUniversidadChange(universityId|null, esPrecarga): opcional, la usa el
  // selector de carrera para saber de qué institución traer el catálogo.
  // esPrecarga=true sólo en la carga inicial (con el valor ya guardado del
  // perfil) — en un cambio manual del usuario esPrecarga es false, así el
  // que escucha sabe que tiene que arrancar de cero (la carrera ya elegida
  // puede no existir en la universidad nueva).
  function initSelectUniversidad(selectId, otraWrapId, otraInputId, universityId, universityOther, onUniversidadChange) {
    var sel = document.getElementById(selectId);
    var wrap = document.getElementById(otraWrapId);
    var otraInput = document.getElementById(otraInputId);
    function notificar(esPrecarga) {
      if (onUniversidadChange) onUniversidadChange(sel.value && sel.value !== 'otra' ? sel.value : null, esPrecarga);
    }
    cargarUniversidades().then(function (unis) {
      if (!sel.options.length) {
        var optVacia = el('option'); optVacia.value = ''; optVacia.textContent = 'Elegí tu universidad'; sel.appendChild(optVacia);
        unis.forEach(function (u) { var o = el('option'); o.value = u.id; o.textContent = u.nombre; sel.appendChild(o); });
        var optOtra = el('option'); optOtra.value = 'otra'; optOtra.textContent = 'Otra…'; sel.appendChild(optOtra);
      }
      if (universityId) { sel.value = universityId; wrap.classList.add('hidden'); otraInput.value = ''; }
      else if (universityOther) { sel.value = 'otra'; wrap.classList.remove('hidden'); otraInput.value = universityOther; }
      else { sel.value = ''; wrap.classList.add('hidden'); otraInput.value = ''; }
      notificar(true);
    });
    sel.onchange = function () { wrap.classList.toggle('hidden', sel.value !== 'otra'); notificar(false); };
  }

  // Carreras por universidad: catálogo real (misma RPC `cat_carreras_de` que
  // usa el wizard de onboarding, ver wizCargarCarreras) — hoy sólo ORT tiene
  // datos cargados, pero esta función no asume eso: cualquier universidad
  // para la que la RPC devuelva carreras pasa a elegirse de una lista en vez
  // de tipearse; el resto (todas menos ORT, hoy) sigue cayendo directo al
  // campo de texto libre de siempre. El día que se cargue el catálogo de
  // otra institución, esto arranca a funcionar solo, sin tocar este código.
  var CARRERAS_CACHE_POR_UNI = {};
  function cargarCarrerasDeUniversidad(universityId) {
    if (!universityId) return Promise.resolve([]);
    if (!CARRERAS_CACHE_POR_UNI[universityId]) {
      CARRERAS_CACHE_POR_UNI[universityId] = rpc('cat_carreras_de', { p_university_id: universityId })
        .then(function (carreras) { return carreras || []; })
        .catch(function () { return []; });
    }
    return CARRERAS_CACHE_POR_UNI[universityId];
  }
  // El campo que se guarda (`profiles.carrera`) sigue siendo texto libre —
  // esto sólo le precarga un valor elegido de una lista en vez de tipeado a
  // mano; no toca `carrera_id` (eso lo asigna el wizard de catálogo más
  // adelante, con su propio paso dedicado — ver WIZ_PASOS). Mientras no hay
  // catálogo para la universidad elegida, el campo sigue siendo texto libre
  // de siempre. Si SÍ hay catálogo, el input de texto libre se oculta apenas
  // el <select> se puebla — se vuelve a mostrar únicamente si el usuario
  // elige "No está en la lista" (antes quedaba visible también con el
  // placeholder "Elegí tu carrera" sin elegir nada, y la gente terminaba
  // tipeando ahí directo en vez de usar el desplegable).
  // Bloque 7: un solo control de "Carrera" — antes el <select> del catálogo
  // y el <input> de texto libre vivían en .field separados, cada uno con su
  // propio label (el del input cambiaba a "¿No está en la lista?"), y se
  // leían como dos campos distintos. Ahora los dos viven en el mismo .field
  // bajo un único label fijo ("Carrera"); "No está en la lista" es la
  // última opción del propio <select> — elegirla revela el input debajo,
  // dentro del mismo campo.
  function initSelectCarrera(selectId, inputId, universityId, carreraActual) {
    var sel = document.getElementById(selectId);
    var input = document.getElementById(inputId);
    clear(sel);
    sel.classList.add('hidden');
    input.classList.remove('hidden');
    input.value = carreraActual || '';
    function sincronizarVisibilidad() {
      var hayCatalogo = sel.options.length > 0;
      var esOtra = sel.value === 'otra';
      input.classList.toggle('hidden', hayCatalogo && !esOtra);
      if (hayCatalogo && !esOtra && sel.value) input.value = sel.value;
    }
    cargarCarrerasDeUniversidad(universityId).then(function (carreras) {
      if (!carreras.length) return; // sin catálogo para esta institución: sigue siendo texto libre
      var optVacia = el('option'); optVacia.value = ''; optVacia.textContent = 'Elegí tu carrera'; sel.appendChild(optVacia);
      carreras.forEach(function (c) {
        // Mismo criterio que el wizard (wizCargarCarreras): si hay dos
        // carreras con el mismo nombre, hay que distinguirlas en la lista —
        // plan_version (plan nuevo/viejo) es la etiqueta correcta, no la
        // facultad (las dos suelen compartir la misma facultad, así que
        // eso solo no alcanza para diferenciarlas). No hace falta el id
        // porque este campo no elige un plan, sólo precarga el nombre.
        var dup = carreras.filter(function (x) { return x.nombre === c.nombre; }).length > 1;
        var plan = c.plan_version || c.planVersion || c.plan || '';
        var o = el('option'); o.value = c.nombre;
        var etiqueta = c.nombre;
        if (dup) etiqueta += ' — ' + (plan || c.facultad || 'plan no informado');
        o.textContent = etiqueta;
        sel.appendChild(o);
      });
      var optOtra = el('option'); optOtra.value = 'otra'; optOtra.textContent = 'No está en la lista'; sel.appendChild(optOtra);
      var coincide = carreraActual && carreras.some(function (c) { return c.nombre === carreraActual; });
      sel.value = coincide ? carreraActual : (carreraActual ? 'otra' : '');
      sel.classList.remove('hidden');
      sincronizarVisibilidad();
    });
    sel.onchange = function () {
      if (sel.value === 'otra') input.value = '';
      sincronizarVisibilidad();
      if (sel.value === 'otra') input.focus();
    };
  }

  function bindAuthUI() {
    // El botón de Google redirige el navegador entero a Google y vuelve acá
    // (Supabase se encarga del intercambio de tokens); eso necesita una URL
    // http(s) real como destino de vuelta — no funciona si el archivo se
    // abrió con doble clic (file://). Se deja visible pero deshabilitado en
    // ese caso, con una explicación, en vez de fallar sin avisar.
    var btnGoogle = document.getElementById('btn-auth-google');
    if (location.protocol === 'file:') {
      btnGoogle.disabled = true;
      btnGoogle.title = 'Para entrar con Google, abrí esta página desde una URL http(s) (no funciona con el archivo abierto directamente).';
    } else {
      btnGoogle.addEventListener('click', async function () {
        showAuthError('');
        setBtnBusy(btnGoogle, true, 'Redirigiendo…');
        try {
          var res = await sb().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectUrl() } });
          if (res.error) throw res.error;
          // Si no tiró error, el navegador ya está siendo redirigido a
          // Google — no hay nada más que hacer en esta pestaña.
        } catch (e) {
          showAuthError(traducirErrorAuth(e));
          setBtnBusy(btnGoogle, false);
        }
      });
    }
    document.querySelectorAll('#auth-mode-toggle [data-auth-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setAuthMode(b.getAttribute('data-auth-mode')); });
    });
    document.getElementById('form-auth').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var email = form.email.value.trim();
      var password = form.password.value;
      showAuthError('');
      var btn = document.getElementById('auth-submit');
      setBtnBusy(btn, true, AUTH_MODE === 'signup' ? 'Creando cuenta…' : 'Entrando…');
      try {
        var res;
        if (AUTH_MODE === 'signup') {
          // Estos campos no son obligatorios (podés crear la cuenta sin
          // completarlos) — el trigger de la base los copia solos a
          // `profiles` si vienen, y si no, la pantalla de "completá tu
          // perfil" te los va a volver a pedir en el próximo login.
          var birthDate = leerNacimientoISO('auth-nac');
          var telSel = document.getElementById('auth-tel-pais').value || 'UY';
          var tel = calcularTelefono(telSel, form.telefono.value.trim());
          var uniSel = document.getElementById('auth-universidad').value;
          res = await sb().auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                nombre: form.nombre.value.trim(),
                apellido: form.apellido.value.trim(),
                birth_date: birthDate,
                carrera: form.carrera.value.trim(),
                telefono_e164: tel.telefono_e164,
                telefono_pais: tel.telefono_pais,
                university_id: uniSel && uniSel !== 'otra' ? uniSel : null,
                university_other: uniSel === 'otra' ? form.universidad_otra.value.trim() : null
              }
            }
          });
        } else {
          res = await sb().auth.signInWithPassword({ email: email, password: password });
        }
        if (res.error) throw res.error;
        if (AUTH_MODE === 'signup') {
          if (res.data && !res.data.session) {
            // El proyecto tiene confirmación de email activada: no hay sesión
            // todavía hasta que confirme el mail — se muestra la pantalla
            // dedicada en vez de intentar arrancar la app.
            showCheckEmailPanel(email);
          } else {
            // Sesión inmediata (confirmación de email desactivada en el
            // proyecto): la cuenta ya quedó creada y activa — se lo
            // confirmamos con un toast antes de que entre a la app (el
            // listener de onAuthStateChange dispara el arranque solo).
            JUST_SIGNED_UP = true;
          }
        }
        // Con sesión, el listener de onAuthStateChange (SIGNED_IN) es el
        // que dispara la carga de datos y muestra la app.
      } catch (e) {
        showAuthError(traducirErrorAuth(e));
      } finally {
        setBtnBusy(btn, false);
      }
    });
    document.getElementById('btn-auth-check-volver').addEventListener('click', function () {
      showFormPanel();
      setAuthMode('signin');
      var emailInput = document.querySelector('#form-auth [name="email"]');
      if (emailInput) emailInput.value = ULTIMO_EMAIL_REGISTRADO;
    });
    document.getElementById('btn-auth-resend').addEventListener('click', async function () {
      var btn = document.getElementById('btn-auth-resend');
      var info = document.getElementById('auth-resend-info');
      setBtnBusy(btn, true, 'Reenviando…');
      try {
        var res = await sb().auth.resend({ type: 'signup', email: ULTIMO_EMAIL_REGISTRADO });
        if (res.error) throw res.error;
        info.textContent = 'Listo, te lo volvimos a mandar.';
        info.classList.remove('hidden');
      } catch (e) {
        info.textContent = traducirErrorAuth(e);
        info.classList.remove('hidden');
      } finally {
        setBtnBusy(btn, false);
      }
    });

    // ---- Recuperar contraseña ----
    document.getElementById('btn-auth-forgot').addEventListener('click', function () {
      showAuthError('');
      document.getElementById('forgot-error').classList.add('hidden');
      // Mismo caso que el botón de Google: el link del mail necesita volver a
      // una URL http(s) real, no funciona con el archivo abierto directo.
      if (location.protocol === 'file:') {
        showAuthError('Para recuperar tu contraseña, abrí esta página desde una URL http(s) (no funciona con el archivo abierto directamente).');
        return;
      }
      var emailInput = document.querySelector('#form-auth [name="email"]');
      document.getElementById('forgot-email').value = (emailInput && emailInput.value.trim()) || '';
      showAuthPanel('auth-forgot-panel');
    });
    document.getElementById('btn-forgot-volver').addEventListener('click', function () { showFormPanel(); });
    document.getElementById('btn-forgot-sent-volver').addEventListener('click', function () { showFormPanel(); });
    document.getElementById('form-forgot').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var email = ev.target.email.value.trim();
      var errEl = document.getElementById('forgot-error');
      errEl.classList.add('hidden');
      var btn = document.getElementById('forgot-submit');
      setBtnBusy(btn, true, 'Mandando…');
      try {
        var res = await sb().auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
        if (res.error) throw res.error;
        // Supabase no distingue en la respuesta si el email existe o no (por
        // diseño, para no filtrar qué cuentas están registradas) — el mismo
        // mensaje de "listo" se muestra siempre que la llamada no tira error
        // de red/formato, nunca uno condicional según si mandó el mail de
        // verdad.
        document.getElementById('forgot-sent-email').textContent = email;
        showAuthPanel('auth-forgot-sent-panel');
      } catch (e) {
        errEl.textContent = traducirErrorAuth(e);
        errEl.classList.remove('hidden');
      } finally {
        setBtnBusy(btn, false);
      }
    });

    // ---- Elegir contraseña nueva (volviendo del link del mail) ----
    document.getElementById('form-reset-password').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var pass = form.password.value;
      var confirm2 = form.passwordConfirm.value;
      var errEl = document.getElementById('reset-password-error');
      errEl.classList.add('hidden');
      if (pass !== confirm2) {
        errEl.textContent = 'Las contraseñas no coinciden.';
        errEl.classList.remove('hidden');
        return;
      }
      if (pass.length < 6) {
        errEl.textContent = 'La contraseña tiene que tener al menos 6 caracteres.';
        errEl.classList.remove('hidden');
        return;
      }
      var btn = document.getElementById('reset-password-submit');
      setBtnBusy(btn, true, 'Guardando…');
      try {
        var res = await sb().auth.updateUser({ password: pass });
        if (res.error) throw res.error;
        EN_RECUPERACION_PASSWORD = false;
        // La sesión temporal que creó el link de recuperación ya queda
        // como una sesión normal y válida después de este cambio — no hace
        // falta un login aparte, se entra directo con el usuario que
        // devuelve updateUser().
        onSignedIn(res.data.user);
      } catch (e) {
        errEl.textContent = traducirErrorAuth(e);
        errEl.classList.remove('hidden');
        setBtnBusy(btn, false);
      }
    });
  }

  // ================================================================
  // PERFIL
  // ================================================================
  var PERFIL_CAMPOS = ['nombre', 'apellido', 'nac_dia', 'nac_mes', 'nac_anio', 'universidad', 'carrera', 'telefono'];
  function esCuentaGoogle() {
    return !!(CURRENT_USER && CURRENT_USER.app_metadata && CURRENT_USER.app_metadata.provider === 'google');
  }

  // modo: 'editar' (default, desde el side nav) | 'completar' (aviso
  // post-login no bloqueante, cuentas de email que dejaron datos sin llenar)
  // | 'completar-obligatorio' (cuentas de Google recién creadas — Google no
  // deja interponer un formulario propio antes del alta, así que el único
  // lugar posible para pedir estos datos es acá, y por eso son obligatorios;
  // ver README). Es el mismo modal y el mismo formulario en los tres casos,
  // sólo cambia el título, el texto de contexto, si se puede posponer y si
  // los campos son obligatorios — no hay tres formularios de perfil.
  function openPerfilModal(modo) {
    var p = CURRENT_PROFILE || {};
    var form = document.getElementById('form-perfil');
    form.nombre.value = p.nombre || '';
    form.apellido.value = p.apellido || '';
    initNacimiento('perfil-nac', p.birth_date || null);
    initSelectPais('perfil-tel-pais', 'perfil-telefono', p.telefono_e164 || null, p.telefono_pais || null);
    initSelectUniversidad('perfil-universidad', 'perfil-universidad-otra-wrap', 'perfil-universidad-otra', p.university_id || null, p.university_other || null, function (universityId, esPrecarga) {
      initSelectCarrera('perfil-carrera-select', 'perfil-carrera', universityId, esPrecarga ? (p.carrera || '') : '');
    });
    document.getElementById('perfil-email').textContent = CURRENT_USER ? CURRENT_USER.email : '';
    // Duplicado del de arriba: en mobile el perfil pasa a ser una pantalla
    // propia con su propia identidad grande (.perfil-hero) — el subtítulo
    // del modal-head se oculta ahí (ver CSS), así que hace falta un segundo
    // elemento con el mismo texto, no reusar el mismo id dos veces en el DOM.
    document.getElementById('perfil-email-hero').textContent = CURRENT_USER ? CURRENT_USER.email : '';
    document.getElementById('perfil-nombre-completo').textContent = nombreCompletoDeUsuario(p);

    var obligatorio = modo === 'completar-obligatorio';
    var completar = obligatorio || modo === 'completar';
    PERFIL_MODAL_BLOQUEANTE = obligatorio;

    document.getElementById('modal-perfil-titulo').textContent = obligatorio ? 'Completá tu perfil para continuar' : (completar ? 'Completá tu perfil' : 'Tu perfil');
    document.getElementById('modal-perfil-intro').classList.toggle('hidden', !completar);
    if (obligatorio) document.getElementById('modal-perfil-intro').textContent = 'Con Google no pudimos pedirte estos datos antes de crear tu cuenta — completalos para poder seguir usando Cursada.';
    else if (completar) document.getElementById('modal-perfil-intro').textContent = 'Nos ayuda a personalizar tu experiencia — podés completarlo ahora o más tarde desde tu perfil.';

    // Sin forma de posponer ni de cerrar sin guardar en modo obligatorio —
    // ni botón de cancelar ni la X (closeModalEl también lo bloquea por las
    // dudas, p. ej. click en el backdrop o Escape).
    document.getElementById('btn-perfil-cancelar').classList.toggle('hidden', obligatorio);
    document.getElementById('btn-perfil-cancelar').textContent = completar ? 'Completar más tarde' : 'Cancelar';
    document.getElementById('btn-perfil-cerrar-x').classList.toggle('hidden', obligatorio);

    // Modo obligatorio: se muestra como una pantalla más (fondo sólido,
    // igual tratamiento que auth-screen), no como un modal flotando encima
    // del dashboard — ver onSignedIn(), que llama a esto ANTES de revelar
    // #app, así que ni siquiera hay "fondo" que tapar.
    document.getElementById('modal-perfil').classList.toggle('is-gate', obligatorio);

    PERFIL_CAMPOS.forEach(function (n) { form[n].required = obligatorio; });

    renderAvatarInto(document.getElementById('modal-perfil-avatar'), 72);
    openModal('modal-perfil');
    snapshotModalForm('modal-perfil');
  }

  // ================================================================
  // NOTIFICACIONES (in-app + Web Push)
  // ================================================================

  // ---- Service Worker + suscripción --------------------------------
  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var out = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
    return out;
  }
  // iOS/Safari soporta Web Push desde 16.4 sólo con la app agregada a la
  // pantalla de inicio (standalone) — fuera de eso, en vez del banner de
  // permiso normal se muestra el de "Agregar a pantalla de inicio".
  function esIOSSafariNoStandalone() {
    var ua = navigator.userAgent || '';
    var esIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var esSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    var esStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    return esIOS && esSafari && !esStandalone;
  }
  var SW_REGISTRATION = null;
  async function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      SW_REGISTRATION = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      return SW_REGISTRATION;
    } catch (e) {
      console.warn('Cursada: no se pudo registrar el service worker', e);
      return null;
    }
  }
  // Deep link entrante desde notificationclick (sw.js) cuando YA había una
  // ventana de Cursada abierta y enfocada (en vez de abrir una pestaña
  // nueva) — reusa handleRoute()/STATE.agendaHighlightId, el mismo
  // mecanismo que ya resuelve el caso de ventana nueva vía ?nid= en la URL,
  // no hay un segundo camino de navegación.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'cursada-notification-click' || !event.data.url) return;
      var hash = event.data.url.indexOf('#') >= 0 ? event.data.url.slice(event.data.url.indexOf('#')) : '#inicio';
      if (hash === location.hash) handleRoute(); else location.hash = hash;
    });
  }
  async function suscribirPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    var permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return false;
    var reg = SW_REGISTRATION || (await registrarServiceWorker());
    if (!reg) return false;
    try {
      var sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      var json = sub.toJSON();
      var res = await sb().from('push_subscriptions').upsert(
        { user_id: CURRENT_USER.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent },
        { onConflict: 'endpoint' }
      );
      if (res.error) throw res.error;
      await cargarNotificaciones();
      return true;
    } catch (e) {
      console.warn('Cursada: no se pudo suscribir a push', e);
      return false;
    }
  }
  async function desconectarDispositivo(id) {
    var device = CACHE.pushDevices.filter(function (d) { return d.id === id; })[0];
    var res = await sb().from('push_subscriptions').delete().in('id', [id]);
    if (res.error) { avisarError(); return; }
    // Si es la suscripción de ESTE navegador, desuscribir también acá —
    // si no, sigue mandando push a un endpoint sin fila hasta que
    // notifications-send lo borre solo por el 410 (best-effort, no crítico).
    if (SW_REGISTRATION && device) {
      try {
        var subActual = await SW_REGISTRATION.pushManager.getSubscription();
        if (subActual && subActual.endpoint === device.endpoint) await subActual.unsubscribe();
      } catch (e) { /* best-effort */ }
    }
    await cargarNotificaciones();
    renderAjustesNotificaciones();
  }

  // ---- Permission priming --------------------------------------------
  // No se pide el permiso al cargar la app: se muestra un card propio en
  // Inicio, con contexto (recién cuando ya hay al menos una evaluación o
  // tarea cargada — nunca en el onboarding). "Ahora no" no vuelve a
  // mostrarse por 30 días — se guarda en profiles.push_prompt_snoozed_until
  // (server-side, sobrevive cambio de dispositivo), no en localStorage.
  // CACHE.agenda sólo contiene ítems de materia (evaluación/tarea) — los
  // eventos personales viven en CACHE.personal aparte — así que cualquier
  // fila ya cumple "ya cargó su primera evaluación o tarea".
  function tieneEvaluacionOTarea() {
    return CACHE.agenda.length > 0;
  }
  function pushPrompSnoozed() {
    return !!(CURRENT_PROFILE && CURRENT_PROFILE.push_prompt_snoozed_until && new Date(CURRENT_PROFILE.push_prompt_snoozed_until) > new Date());
  }
  function maybeMostrarBannerPush() {
    var banner = document.getElementById('inicio-push-banner');
    var bannerIOS = document.getElementById('inicio-push-banner-ios');
    if (!banner || !bannerIOS) return;
    if (!tieneEvaluacionOTarea()) { banner.classList.add('hidden'); bannerIOS.classList.add('hidden'); return; }
    if (esIOSSafariNoStandalone()) {
      banner.classList.add('hidden');
      bannerIOS.classList.toggle('hidden', pushPrompSnoozed());
      return;
    }
    bannerIOS.classList.add('hidden');
    var permisoDecidido = ('Notification' in window) && Notification.permission !== 'default';
    banner.classList.toggle('hidden', permisoDecidido || pushPrompSnoozed());
  }
  async function posponerBannerPush() {
    var hasta = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    var res = await sb().from('profiles').update({ push_prompt_snoozed_until: hasta }).eq('id', CURRENT_USER.id);
    if (!res.error) CURRENT_PROFILE = Object.assign({}, CURRENT_PROFILE, { push_prompt_snoozed_until: hasta });
    maybeMostrarBannerPush();
  }
  function bindPushBanner() {
    document.getElementById('btn-push-banner-si').addEventListener('click', async function (ev) {
      ev.target.disabled = true;
      var ok = await suscribirPush();
      ev.target.disabled = false;
      if (ok) { document.getElementById('inicio-push-banner').classList.add('hidden'); showToast('Listo — te vamos a avisar de tus entregas.'); }
      else avisarError();
    });
    document.getElementById('btn-push-banner-no').addEventListener('click', posponerBannerPush);
    document.getElementById('btn-push-banner-ios-entendido').addEventListener('click', posponerBannerPush);
  }

  // ---- Panel in-app ----------------------------------------------------
  function notifsVisibles() {
    return CACHE.notificaciones.filter(function (n) { return !n.dismissedAt; });
  }
  function renderNotifBadge() {
    var unread = notifsVisibles().filter(function (n) { return !n.readAt; }).length;
    document.getElementById('btn-notif-bell').classList.toggle('has-unread', unread > 0);
  }
  function relativoNotif(iso) {
    var diffMin = Math.round((new Date() - new Date(iso)) / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return 'hace ' + diffMin + ' min';
    var diffH = Math.round(diffMin / 60);
    if (diffH < 24) return 'hace ' + diffH + (diffH === 1 ? ' hora' : ' horas');
    var diffD = Math.round(diffH / 24);
    return 'hace ' + diffD + (diffD === 1 ? ' día' : ' días');
  }
  function grupoDeNotif(iso, t) {
    var d = new Date(iso);
    var diff = diffDias(new Date(d.getFullYear(), d.getMonth(), d.getDate()), t);
    if (diff === 0) return 'Hoy';
    if (diff === -1) return 'Ayer';
    if (diff < -1 && diff >= -7) return 'Esta semana';
    return diff > 0 ? 'Próximas' : 'Anteriores';
  }
  function buildNotifRow(n) {
    var row = el('div', 'notif-row' + (n.readAt ? '' : ' is-unread'));
    var main = el('div', 'notif-row-main');
    var titulo = el('div', 'notif-row-title'); titulo.textContent = n.title;
    var body = el('div', 'notif-row-body'); body.textContent = n.body;
    var tiempo = el('div', 'notif-row-time'); tiempo.textContent = relativoNotif(n.scheduledFor);
    main.appendChild(titulo); main.appendChild(body); main.appendChild(tiempo);
    main.addEventListener('click', function () { abrirNotif(n); });
    var dismiss = el('button', 'icon-btn notif-row-dismiss');
    dismiss.type = 'button'; dismiss.title = 'Descartar'; dismiss.setAttribute('aria-label', 'Descartar'); dismiss.textContent = '×';
    dismiss.addEventListener('click', function (ev) { ev.stopPropagation(); descartarNotif(n.id); });
    row.appendChild(main); row.appendChild(dismiss);
    return row;
  }
  function renderNotifPanel() {
    var listNode = document.getElementById('notif-panel-list');
    clear(listNode);
    var visibles = notifsVisibles();
    if (!visibles.length) {
      var vacio = el('div', 'notif-empty');
      vacio.textContent = 'No tenés notificaciones todavía. Acá vas a ver los avisos de tus próximas entregas.';
      listNode.appendChild(vacio);
      return;
    }
    var t = today();
    var grupos = {};
    visibles.forEach(function (n) {
      var g = grupoDeNotif(n.scheduledFor, t);
      (grupos[g] = grupos[g] || []).push(n);
    });
    ['Hoy', 'Ayer', 'Esta semana', 'Próximas', 'Anteriores'].forEach(function (g) {
      if (!grupos[g] || !grupos[g].length) return;
      var wrap = el('div', 'notif-day-group');
      var label = el('div', 'notif-day-label'); label.textContent = g;
      wrap.appendChild(label);
      grupos[g].forEach(function (n) { wrap.appendChild(buildNotifRow(n)); });
      listNode.appendChild(wrap);
    });
  }
  async function marcarNotifLeidaPorId(id) {
    var local = CACHE.notificaciones.filter(function (n) { return n.id === id; })[0];
    if (local && local.readAt) return;
    if (local) local.readAt = new Date().toISOString();
    renderNotifBadge();
    if (!document.getElementById('notif-panel').classList.contains('hidden')) renderNotifPanel();
    try {
      await sb().from('notification_queue').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
    } catch (e) { console.warn('Cursada: no se pudo marcar la notificación como leída', e); }
  }
  async function marcarTodasNotifLeidas() {
    var pendientes = notifsVisibles().filter(function (n) { return !n.readAt; });
    if (!pendientes.length) return;
    var ahora = new Date().toISOString();
    pendientes.forEach(function (n) { n.readAt = ahora; });
    renderNotifBadge(); renderNotifPanel();
    try {
      var ids = pendientes.map(function (n) { return n.id; });
      await sb().from('notification_queue').update({ read_at: ahora }).in('id', ids);
    } catch (e) { console.warn('Cursada: no se pudieron marcar todas como leídas', e); }
  }
  async function descartarNotif(id) {
    var local = CACHE.notificaciones.filter(function (n) { return n.id === id; })[0];
    if (local) local.dismissedAt = new Date().toISOString();
    renderNotifBadge(); renderNotifPanel();
    try {
      await sb().from('notification_queue').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
    } catch (e) { console.warn('Cursada: no se pudo descartar la notificación', e); }
  }
  // Mismo criterio de navegación que "Ver en agenda" (Bloque 6, ver el
  // onclick de #btn-inicio-proximo-ver): sólo toca location.hash, deja que
  // el listener de hashchange dispare handleRoute()/renderRoute() — salvo
  // que ya se esté en #agenda, donde el hash no cambia y hay que llamarlo
  // a mano para no perder el resaltado.
  function abrirNotif(n) {
    marcarNotifLeidaPorId(n.id);
    closeNotifPanel();
    STATE.agendaFiltroKind = ''; STATE.agendaFiltroMateria = ''; STATE.agendaFiltroEstado = ''; STATE.agendaQuery = '';
    if (n.entityId && n.entityType !== 'digest') STATE.agendaHighlightId = n.entityId;
    if (location.hash === '#agenda') handleRoute(); else location.hash = '#agenda';
  }
  function openNotifPanel() {
    document.getElementById('notif-panel').classList.remove('hidden');
    document.getElementById('btn-notif-bell').setAttribute('aria-expanded', 'true');
    renderNotifPanel();
  }
  function closeNotifPanel() {
    document.getElementById('notif-panel').classList.add('hidden');
    document.getElementById('btn-notif-bell').setAttribute('aria-expanded', 'false');
  }
  function bindNotifBell() {
    var btn = document.getElementById('btn-notif-bell');
    var panel = document.getElementById('notif-panel');
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (panel.classList.contains('hidden')) openNotifPanel(); else closeNotifPanel();
    });
    document.getElementById('btn-notif-marcar-todas').addEventListener('click', marcarTodasNotifLeidas);
    document.addEventListener('click', function (ev) {
      if (!panel.classList.contains('hidden') && !panel.contains(ev.target) && !btn.contains(ev.target)) closeNotifPanel();
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeNotifPanel(); });
  }

  // ---- Preferencias (dentro de Ajustes) --------------------------------
  function labelAnticipacion(h) {
    if (h == null) return '';
    return h < 24 ? h + ' h' : (h / 24) + ' d';
  }
  function notifPrefDe(eventType, channel) {
    return CACHE.notifPrefs.filter(function (p) { return p.eventType === eventType && p.channel === channel; })[0] || null;
  }
  async function guardarNotifPref(eventType, channel, patch) {
    var pref = notifPrefDe(eventType, channel);
    var row = Object.assign({ user_id: CURRENT_USER.id, event_type: eventType, channel: channel }, patch);
    var res = await sb().from('notification_preferences').upsert(row, { onConflict: 'user_id,event_type,channel' });
    if (res.error) { avisarError(); return; }
    // Optimista, sin volver a pedir la fila (mismo criterio que
    // supaUpsert() para el resto de la app): se actualiza CACHE a mano con
    // lo que ya se sabe que se mandó.
    if (pref) {
      if ('enabled' in patch) pref.enabled = patch.enabled;
      if ('lead_time_hours' in patch) pref.leadTimeHours = patch.lead_time_hours;
    } else {
      CACHE.notifPrefs.push({ id: (res.data && res.data[0] && res.data[0].id) || uid(), eventType: eventType, channel: channel, enabled: patch.enabled !== undefined ? patch.enabled : true, leadTimeHours: patch.lead_time_hours !== undefined ? patch.lead_time_hours : null, quietHoursStart: '23:00', quietHoursEnd: '07:00', timezone: 'America/Montevideo' });
    }
  }
  function renderAjustesNotificaciones() {
    var permisoEl = document.getElementById('ajustes-notif-permiso');
    var permiso = ('Notification' in window) ? Notification.permission : 'unsupported';
    var permisoTxt = { granted: 'Concedido', denied: 'Denegado — revertilo desde la configuración del sitio en tu navegador para volver a activarlo', default: 'Todavía no lo pediste', unsupported: 'Tu navegador no soporta notificaciones push' }[permiso];
    permisoEl.textContent = permisoTxt;
    var master = document.getElementById('ajustes-notif-master');
    master.checked = permiso === 'granted';
    master.disabled = permiso === 'denied' || permiso === 'unsupported';

    var grid = document.getElementById('ajustes-notif-grid');
    clear(grid);
    NOTIF_EVENT_TYPES.forEach(function (eventType) {
      var row = el('div', 'ajustes-notif-grid-row');
      var lbl = el('div', 'ajustes-notif-grid-label'); lbl.textContent = NOTIF_EVENT_LABELS[eventType];
      row.appendChild(lbl);
      ['inapp', 'push'].forEach(function (channel) {
        var pref = notifPrefDe(eventType, channel);
        var cell = el('label', 'ajustes-notif-grid-cell');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'ajustes-switch ajustes-switch-sm';
        input.checked = !pref || pref.enabled;
        input.addEventListener('change', function () { guardarNotifPref(eventType, channel, { enabled: input.checked }); });
        var span = document.createElement('span'); span.textContent = channel === 'inapp' ? 'In-app' : 'Push';
        cell.appendChild(input); cell.appendChild(span);
        row.appendChild(cell);
      });
      var pushPref = notifPrefDe(eventType, 'push');
      if (pushPref && pushPref.leadTimeHours != null) {
        var selWrap = el('div', 'ajustes-notif-grid-lead');
        var sel = document.createElement('select');
        NOTIF_LEAD_OPTIONS.forEach(function (h) {
          var opt = document.createElement('option'); opt.value = h; opt.textContent = labelAnticipacion(h);
          if (pushPref.leadTimeHours === h) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', function () { guardarNotifPref(eventType, 'push', { lead_time_hours: Number(sel.value) }); });
        selWrap.appendChild(sel);
        row.appendChild(selWrap);
      } else {
        row.appendChild(el('div', 'ajustes-notif-grid-lead'));
      }
      grid.appendChild(row);
    });

    // Quiet hours: una sola vez por usuario (no por event_type) — se lee/
    // escribe contra cualquiera de las filas de push, todas comparten el
    // mismo valor porque notifications-send las evalúa igual sin importar
    // el tipo de evento.
    var referencia = CACHE.notifPrefs.filter(function (p) { return p.channel === 'push'; })[0];
    var qStart = document.getElementById('ajustes-notif-quiet-start');
    var qEnd = document.getElementById('ajustes-notif-quiet-end');
    if (referencia) { qStart.value = (referencia.quietHoursStart || '').slice(0, 5); qEnd.value = (referencia.quietHoursEnd || '').slice(0, 5); }
    var guardarQuiet = async function () {
      var patch = { quiet_hours_start: qStart.value, quiet_hours_end: qEnd.value };
      await Promise.all(CACHE.notifPrefs.filter(function (p) { return p.channel === 'push'; }).map(function (p) {
        return sb().from('notification_preferences').update(patch).eq('id', p.id);
      }));
      CACHE.notifPrefs.forEach(function (p) { if (p.channel === 'push') { p.quietHoursStart = qStart.value; p.quietHoursEnd = qEnd.value; } });
    };
    qStart.onchange = guardarQuiet; qEnd.onchange = guardarQuiet;

    var devicesList = document.getElementById('ajustes-notif-devices');
    clear(devicesList);
    if (!CACHE.pushDevices.length) {
      var vacio = el('div', 'hint'); vacio.textContent = 'No hay dispositivos conectados todavía.';
      devicesList.appendChild(vacio);
    } else {
      CACHE.pushDevices.forEach(function (d) {
        var row = el('div', 'ajustes-notif-device-row');
        var nombre = el('span'); nombre.textContent = nombreDispositivo(d.userAgent);
        var btn = el('button', 'btn btn-sm'); btn.type = 'button'; btn.textContent = 'Desconectar';
        btn.addEventListener('click', function () { if (confirm('¿Desconectar este dispositivo de las notificaciones push?')) desconectarDispositivo(d.id); });
        row.appendChild(nombre); row.appendChild(btn);
        devicesList.appendChild(row);
      });
    }
  }
  // Best-effort, sólo para mostrarle al usuario cuál es cuál en la lista —
  // no se usa para nada funcional, un user agent que no matchea ninguno
  // cae en "Dispositivo" sin romper nada.
  function nombreDispositivo(ua) {
    ua = ua || '';
    var so = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Dispositivo';
    var nav = /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'navegador';
    return so + ' · ' + nav;
  }
  function bindAjustesNotificaciones() {
    document.getElementById('ajustes-notif-master').addEventListener('change', async function (ev) {
      if (ev.target.checked) {
        var ok = await suscribirPush();
        if (!ok) { ev.target.checked = false; avisarError(); }
        renderAjustesNotificaciones();
      }
      // Revocar el permiso del navegador no se puede hacer por API — sólo
      // se puede prender desde acá, apagar es cosa de la config del sitio
      // (el texto de permisoTxt ya lo explica cuando está denegado).
    });
  }

  // ================================================================
  // GOOGLE CALENDAR
  // ================================================================
  // Integración vía 3 Edge Functions ya desplegadas (backend fuera de
  // alcance acá, ver README del proyecto): google-oauth-start (redirect a
  // Google), google-oauth-callback (la maneja Google solo, nunca se llama
  // desde acá) y sync-google-event (crear/actualizar/borrar el evento
  // espejo en el Google Calendar del usuario). El estado de conexión se
  // cachea en GOOGLE_CALENDAR_CONECTADO — syncToGoogleCalendar() lo
  // consulta en memoria en vez de pegarle a `google_calendar_accounts` en
  // cada alta/baja/modificación de agenda o personal.
  var GOOGLE_OAUTH_START_URL = 'https://kbihslsbzyhyiroyzxxq.supabase.co/functions/v1/google-oauth-start';
  var GOOGLE_SYNC_URL = 'https://kbihslsbzyhyiroyzxxq.supabase.co/functions/v1/sync-google-event';
  var GOOGLE_CALENDAR_CONECTADO = false;

  function renderAjustesGoogle() {
    var estado = document.getElementById('ajustes-google-estado');
    var btnConectar = document.getElementById('btn-google-conectar');
    var btnDesconectar = document.getElementById('btn-google-desconectar');
    var btnSyncTodo = document.getElementById('btn-google-sync-todo');
    if (!estado || !btnConectar || !btnDesconectar || !btnSyncTodo) return;
    estado.textContent = GOOGLE_CALENDAR_CONECTADO ? 'Conectado — tus evaluaciones, tareas y eventos personales se sincronizan automáticamente.' : 'No conectado.';
    btnConectar.classList.toggle('hidden', GOOGLE_CALENDAR_CONECTADO);
    btnDesconectar.classList.toggle('hidden', !GOOGLE_CALENDAR_CONECTADO);
    btnSyncTodo.classList.toggle('hidden', !GOOGLE_CALENDAR_CONECTADO);
  }
  // Sólo SELECT (respeta RLS) — la fila en sí la crea/borra la Edge
  // Function/desconectarGoogleCalendar(), nunca este cliente.
  async function refrescarEstadoGoogleCalendar() {
    if (!CURRENT_USER) return;
    try {
      var res = await sb().from('google_calendar_accounts').select('user_id').eq('user_id', CURRENT_USER.id).maybeSingle();
      if (res.error) throw res.error;
      GOOGLE_CALENDAR_CONECTADO = !!res.data;
    } catch (e) {
      console.warn('Cursada: error consultando el estado de Google Calendar', e);
    }
    renderAjustesGoogle();
  }
  function conectarGoogleCalendar() {
    if (!CURRENT_USER) return;
    location.href = GOOGLE_OAUTH_START_URL + '?user_id=' + encodeURIComponent(CURRENT_USER.id);
  }
  async function desconectarGoogleCalendar() {
    if (!CURRENT_USER) return;
    if (!confirm('¿Desconectar Google Calendar? Dejarán de sincronizarse tus evaluaciones, tareas y eventos personales.')) return;
    var btn = document.getElementById('btn-google-desconectar');
    setBtnBusy(btn, true, 'Desconectando…');
    try {
      var res = await sb().from('google_calendar_accounts').delete().eq('user_id', CURRENT_USER.id);
      if (res.error) throw res.error;
      GOOGLE_CALENDAR_CONECTADO = false;
      renderAjustesGoogle();
      showToast('Google Calendar desconectado.');
    } catch (e) {
      console.warn('Cursada: error desconectando Google Calendar', e);
      if (esErrorSesionVencida(e)) mostrarSesionVencida(); else avisarError('No se pudo desconectar Google Calendar. Intentá de nuevo.');
    }
    setBtnBusy(btn, false);
  }
  function bindAjustesGoogle() {
    document.getElementById('btn-google-conectar').addEventListener('click', conectarGoogleCalendar);
    document.getElementById('btn-google-desconectar').addEventListener('click', desconectarGoogleCalendar);
    document.getElementById('btn-google-sync-todo').addEventListener('click', async function () {
      var btn = document.getElementById('btn-google-sync-todo');
      setBtnBusy(btn, true, 'Sincronizando…');
      var total = await sincronizarTodoAGoogleCalendar();
      setBtnBusy(btn, false);
      showToast(total ? 'Sincronizado — ' + total + (total === 1 ? ' evento.' : ' eventos.') : 'No había nada para sincronizar.');
    });
  }
  // Vuelta de google-oauth-start con `?google=conectado|error` en la URL
  // (la pone la Edge Function al redirigir de vuelta) — mismo criterio que
  // mostrarErrorOAuthSiHay() para el `#error=` de Supabase Auth: se lee una
  // sola vez al entrar y se limpia el query string para que un refresh no
  // vuelva a mostrar el aviso.
  async function mostrarResultadoGoogleCalendarSiHay() {
    var params = new URLSearchParams(location.search);
    var resultado = params.get('google');
    if (!resultado) return;
    if (resultado === 'conectado') {
      showToast('Google Calendar conectado.');
      // Al conectar por primera vez, la cuenta puede ya tener evaluaciones/
      // tareas/eventos cargados de antes (wizard de onboarding, uso previo
      // sin Google conectado) — refrescarEstadoGoogleCalendar() primero para
      // que GOOGLE_CALENDAR_CONECTADO ya esté en true al llamar al backfill.
      await refrescarEstadoGoogleCalendar();
      await sincronizarTodoAGoogleCalendar();
    }
    else if (resultado === 'error') avisarError('No se pudo conectar con Google Calendar. Probá de nuevo desde Ajustes.');
    params.delete('google');
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  // Único punto de llamada a sync-google-event — falla en silencio a
  // propósito (sólo console.warn) para que un Google caído o con el token
  // vencido nunca rompa el alta/edición/borrado real en Cursada, que ya
  // quedó guardado en Supabase antes de llegar acá. No se llama si el
  // usuario no tiene Google Calendar conectado (evita pegarle a la Edge
  // Function en cada guardado de quien nunca lo conectó).
  async function syncToGoogleCalendar(action, table, recordId) {
    if (!GOOGLE_CALENDAR_CONECTADO || !CURRENT_USER) return;
    try {
      var sesion = await sb().auth.getSession();
      var token = sesion.data && sesion.data.session && sesion.data.session.access_token;
      if (!token) return;
      var res = await fetch(GOOGLE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: action, table: table, recordId: recordId })
      });
      if (!res.ok) console.warn('Cursada: sync-google-event respondió ' + res.status + ' (' + action + '/' + table + '/' + recordId + ')');
    } catch (e) {
      console.warn('Cursada: error sincronizando con Google Calendar', e);
    }
  }
  // Backfill manual/automático de todo lo que ya existía antes de conectar
  // (o que se creó del lado del servidor sin pasar por syncToGoogleCalendar
  // — el wizard de onboarding aplica materias/agenda vía RPC directo, ver
  // wizConfirmar()). Siempre manda action:'update', nunca 'create': el
  // Edge Function ya resuelve solo el caso "sin google_event_id todavía"
  // creando el evento (ver sync-google-event), así que 'update' es
  // idempotente acá — reintentarlo (este botón, o un wizConfirmar()
  // posterior) nunca duplica eventos en Google, a diferencia de 'create'.
  // Secuencial (no Promise.all) para no ráfaguear la cuota de la API de
  // Google Calendar con decenas de POSTs simultáneos.
  async function sincronizarTodoAGoogleCalendar() {
    if (!GOOGLE_CALENDAR_CONECTADO) return 0;
    var agenda = loadAgendaRaw();
    var personal = loadPersonalRaw();
    var i;
    for (i = 0; i < agenda.length; i++) await syncToGoogleCalendar('update', 'agenda', agenda[i].id);
    for (i = 0; i < personal.length; i++) await syncToGoogleCalendar('update', 'personal', personal[i].id);
    return agenda.length + personal.length;
  }

  // ================================================================
  // AJUSTES
  // ================================================================
  // Fase 6: se saca la edición del margen de riesgo — confundía y no
  // sumaba (7 pills para un concepto que casi nadie tocaba). Queda fijo en
  // MARGEN_RIESGO (margenDe() ya no lee profiles.margen_riesgo). La
  // columna sigue existiendo en `profiles` con datos viejos — no vale una
  // migración destructiva sólo para borrar un campo que ya no se lee.
  function openAjustesModal() {
    var p = CURRENT_PROFILE || {};
    var form = document.getElementById('form-ajustes');
    form.materias_carrera.value = p.materias_carrera != null ? p.materias_carrera : '';
    // El wizard de catálogo sólo tiene sentido para instituciones con
    // catálogo cargado (hoy, sólo ORT) — ver mostrarOnboardingOCatalogo().
    document.getElementById('btn-rehacer-onboarding').classList.toggle('hidden', p.university_id !== ORT_UNIVERSITY_ID);
    // El atajo de "revisar aprobadas/pendientes" (ver abrirWizardProgreso)
    // necesita WIZ.carreraId de arranque — sin carrera todavía elegida no
    // hay plan de estudios contra el cual mostrar el paso "progreso", así
    // que en ese caso "Rehacer configuración inicial" (arriba) ya cubre el
    // caso, de punta a punta.
    document.getElementById('btn-revisar-progreso').classList.toggle('hidden', p.university_id !== ORT_UNIVERSITY_ID || !p.carrera_id);
    STATE.editing = { ajustesTagNuevoAbierto: false, ajustesTagNuevoColor: 'azul' };
    renderAjustesTags();
    renderAjustesAprobadas();
    renderAjustesNotificaciones();
    renderAjustesGoogle();
    refrescarEstadoGoogleCalendar(); // por si se conectó/desconectó desde otra pestaña
    openModal('modal-ajustes');
    snapshotModalForm('modal-ajustes');
  }

  // Etiquetas en Ajustes (feedback post-Fase 5): renombrar/eliminar volvió
  // acá — el selector del modal de evaluación/tarea/evento (renderTagPicker)
  // sólo elige/crea, para no repetir ✎/🗑 en cada chip chiquito. Las
  // predeterminadas (is_default) no muestran ningún botón de acción —
  // sólo se pueden agregar/modificar las que crea el usuario; RLS también
  // las protege del lado del servidor para el borrado (event_tags_delete_
  // own_not_default), pero el renombrado no tenía esa misma protección acá
  // (feedback: "no es la idea, sólo agregar y modificar las que el usuario
  // crea") — ahora ambos botones se ocultan igual para las predeterminadas.
  //
  // ensureDefaultTagsServerSide() siembra cada preset de TAG_PRESETS.otro
  // una vez por kind (académico Y personal, para que esté disponible en los
  // dos contextos) — eso hace que "Entrega", "Estudiar", "Leer" y "Grupal"
  // existan como DOS filas con el mismo nombre (una por kind). Sin agrupar
  // se leían como si la etiqueta estuviera duplicada por error (feedback:
  // "las etiquetas aparecen duplicadas"), así que acá se muestran juntas en
  // una sola fila con los dos kinds listados.
  var KIND_LABEL = { academico: 'Académica', personal: 'Personal' };
  function renderAjustesTags() {
    var wrap = document.getElementById('ajustes-tags-list');
    clear(wrap);
    var tags = loadEventTagsRaw();
    if (!tags.length) {
      var empty = el('span'); empty.style.cssText = 'font-size:12px;color:var(--c-ink3)'; empty.textContent = 'Todavía no hay etiquetas.';
      wrap.appendChild(empty);
    } else {
      var grupos = [];
      var porNombre = {};
      tags.forEach(function (t) {
        if (t.esPredeterminada) {
          var g = porNombre[t.nombre];
          if (!g) { g = { nombre: t.nombre, colorId: t.colorId, esPredeterminada: true, kinds: [], tag: t }; porNombre[t.nombre] = g; grupos.push(g); }
          g.kinds.push(t.kind);
        } else {
          grupos.push({ nombre: t.nombre, colorId: t.colorId, esPredeterminada: false, kinds: [t.kind], tag: t });
        }
      });
      grupos.forEach(function (g) {
        var node = tpl('tag-row');
        qf(node, 'chip').setAttribute('style', chipStyle(g.colorId));
        qf(node, 'chip').textContent = truncate(g.nombre, 20);
        qf(node, 'kind').textContent = g.kinds.map(function (k) { return KIND_LABEL[k] || k; }).join(' y ');
        if (g.esPredeterminada) {
          qf(node, 'editBtn').remove();
          qf(node, 'deleteBtn').remove();
        } else {
          qf(node, 'editBtn').addEventListener('click', function () { iniciarRenombreTag(node, g.tag); });
          qf(node, 'deleteBtn').addEventListener('click', function () { eliminarTagAjustes(g.tag); });
        }
        wrap.appendChild(node);
      });
    }
    renderAjustesTagNuevaForm();
  }

  // Fila de Ajustes: sólo asoma el botón "Cargar notas pendientes" cuando
  // hay algo que cargar — la lista en sí vive en su propio modal (ver
  // renderProgresoPendientesModal), no acá, para no ocupar espacio del
  // modal de Ajustes con algo que la mayoría de las sesiones no necesita.
  function renderAjustesAprobadas() {
    var group = document.getElementById('ajustes-aprobadas-group');
    group.classList.toggle('hidden', !materiasAprobadasSinNota().length);
  }

  // Carga rápida de nota para materias "Aprobada"/"Pendiente" sin ninguna
  // evaluación todavía (típicamente las que vienen del paso "progreso" del
  // wizard) — guarda una única evaluación tipo Final por materia (mismo
  // camino, saveAgendaRaw, que usa el modal real de evaluación) para que el
  // ring, el promedio y Progreso la tomen sin ningún caso especial. Ver
  // decisión en README: la nota vive en la evaluación, nunca en la materia.
  function renderProgresoPendientesModal() {
    var wrap = document.getElementById('progreso-pendientes-list');
    clear(wrap);
    var materias = materiasAprobadasSinNota();
    if (!materias.length) {
      var empty = el('span'); empty.style.cssText = 'font-size:13px;color:var(--c-ink3)';
      empty.textContent = 'No tenés notas pendientes de cargar.';
      wrap.appendChild(empty);
      return;
    }
    materias.forEach(function (m) {
      var node = tpl('progreso-pendiente-row');
      qf(node, 'dot').style.background = m.strong;
      qf(node, 'nombre').textContent = m.nombre;
      var label = qf(node, 'notaLabel'); label.textContent = 'Nota /' + val(m.esc.total, m.esc); label.setAttribute('for', 'progreso-pendiente-nota-' + m.id);
      var input = qf(node, 'notaInput'); input.id = 'progreso-pendiente-nota-' + m.id;
      input.step = m.esc.tipo === 'nota' ? '0.1' : '1'; input.min = '0'; input.max = String(m.esc.total);
      var btn = qf(node, 'guardarBtn');
      btn.addEventListener('click', async function () {
        var v = input.value.trim();
        var n = Number(v);
        if (v === '' || isNaN(n)) return;
        // El input ya bloquea con max= (igual que el modal completo de
        // evaluación) — este clamp es la red de seguridad si algo lo
        // saltea (autofill, devtools, o el propio máx. no aplicado al
        // tipear). Sin esto, una materia 0–12 podía terminar con una nota
        // tipo 93 cargada acá y arruinar el promedio del semestre entero
        // (bug real encontrado en cuenta de producción: dos "Nota final"
        // de materias escala 0–12 con nota 93 y 89, ~700% normalizado,
        // hacían que el punto del gráfico de Progreso se fuera del canvas
        // y se viera "cortado").
        n = Math.max(0, Math.min(n, m.esc.total));
        setBtnBusy(btn, true, 'Guardando…');
        var nueva = { id: uid(), materiaId: m.id, kind: 'evaluacion', tipo: 'Final', titulo: 'Nota final', fecha: todayISO(), hora: '', hecho: true, nota: n, notaMaxima: m.esc.total, notas: '' };
        var ok = await saveAgendaRaw(loadAgendaRaw().concat([nueva]));
        setBtnBusy(btn, false);
        if (ok) {
          // Sin syncToGoogleCalendar acá a propósito: `fecha` es un
          // placeholder (el día que cargaste la nota, no una fecha real de
          // la materia aprobada en otro semestre) — sincronizarlo creaba un
          // evento "Nota final" fantasma hoy en el Google Calendar del
          // usuario por cada materia que backfillea (bug reportado por el
          // usuario tras el onboarding).
          showToast('Nota cargada.');
          renderProgresoPendientesModal();
          renderAjustesAprobadas();
          renderProgreso();
          renderInicio();
        } else {
          avisarError();
        }
      });
      qf(node, 'eliminarBtn').addEventListener('click', async function () {
        var ok = await eliminarMateriaId(m.id);
        if (!ok) return;
        renderProgresoPendientesModal();
        renderAjustesAprobadas();
        renderProgreso();
        renderInicio();
      });
      wrap.appendChild(node);
    });
  }
  function renderAjustesTagNuevaForm() {
    var abierto = !!STATE.editing.ajustesTagNuevoAbierto;
    document.getElementById('ajustes-tag-nueva').classList.toggle('hidden', !abierto);
    document.getElementById('btn-ajustes-tag-nueva-abrir').classList.toggle('hidden', abierto);
    if (!abierto) return;
    var swWrap = document.getElementById('ajustes-tag-nueva-swatches');
    clear(swWrap);
    Object.keys(ACCENTS).forEach(function (colorId) {
      var swNode = tpl('swatch');
      var strong = ACCENTS[colorId].strong;
      swNode.style.background = strong;
      var selected = STATE.editing.ajustesTagNuevoColor === colorId;
      swNode.classList.toggle('is-selected', selected);
      if (selected) swNode.style.boxShadow = '0 0 0 3px var(--c-surface), 0 0 0 5px ' + strong;
      swNode.addEventListener('click', function () { STATE.editing.ajustesTagNuevoColor = colorId; renderAjustesTagNuevaForm(); });
      swWrap.appendChild(swNode);
    });
  }
  function iniciarRenombreTag(row, t) {
    clear(row);
    var input = el('input', 'semestre-row-nombre-input');
    input.value = t.nombre;
    row.appendChild(input);
    input.focus(); input.select();
    var done = false;
    var commit = async function () {
      if (done) return;
      done = true;
      var nuevo = input.value.trim();
      if (nuevo && nuevo !== t.nombre) {
        var arr = loadEventTagsRaw().map(function (x) { return x.id === t.id ? Object.assign({}, x, { nombre: nuevo }) : x; });
        var ok = await saveEventTagsRaw(arr);
        if (!ok) avisarError();
      }
      renderAjustesTags();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      else if (ev.key === 'Escape') { done = true; renderAjustesTags(); }
    });
  }
  // ON DELETE SET NULL en agenda.tag_id/personal.tag_id: la base suelta el
  // tag de cualquier evento que lo tuviera.
  async function eliminarTagAjustes(t) {
    if (!confirm('¿Eliminar la etiqueta "' + t.nombre + '"? Los eventos que la tenían se quedan sin etiqueta.')) return;
    var ok = await saveEventTagsRaw(loadEventTagsRaw().filter(function (x) { return x.id !== t.id; }));
    if (!ok) avisarError();
    renderAjustesTags();
  }

  // Los únicos 3 campos que gatillan el aviso — nombre/apellido/fecha de
  // nacimiento/foto pueden quedar sin completar sin que la app insista,
  // salvo en el modo obligatorio de cuentas de Google (ver README), donde
  // se piden todos.
  function perfilIncompleto(p) {
    if (!p) return true;
    return !(p.university_id || p.university_other) || !p.carrera || !p.telefono_e164;
  }

  // Cuentas de Google: se resuelve ANTES de mostrar la app (ver onSignedIn),
  // como una pantalla más — no un modal encima del dashboard. Google no
  // permite un formulario propio antes de crear la cuenta, así que estos
  // datos nunca se pidieron todavía; se piden acá, ahora, de forma
  // obligatoria, y recién cuando se guardan la app sigue su curso normal
  // (revela #app y, si no hay materias, la pantalla de "crear tu primera
  // materia"). Devuelve una Promise que se resuelve al guardar.
  var PERFIL_GATE_RESOLVE = null;
  function esperarCompletarPerfilObligatorio() {
    return new Promise(function (resolve) {
      PERFIL_GATE_RESOLVE = resolve;
      openPerfilModal('completar-obligatorio');
    });
  }

  // Cuentas de email: no bloqueante, se puede posponer ("Completar más
  // tarde") sin impedir usar el resto de la app (se ve como un modal normal,
  // encima del dashboard, porque para este caso sí corresponde) — si siguen
  // faltando datos, vuelve a aparecer en el próximo login, sin un flag de
  // "no preguntar más" (a diferencia del aviso de importar datos locales,
  // acá si se pospone es a propósito que se repita). Las cuentas de Google
  // no llegan hasta acá: su completado obligatorio ya se resolvió antes de
  // revelar la app, ver esperarCompletarPerfilObligatorio().
  function maybeOfrecerCompletarPerfilNoBloqueante() {
    if (esCuentaGoogle()) return false;
    if (!perfilIncompleto(CURRENT_PROFILE)) return false;
    openPerfilModal('completar');
    return true;
  }

  // Recorta a cuadrado (centrado) y reescala a 256px de lado — no hace falta
  // un avatar más grande en ningún lugar de la interfaz.
  function comprimirImagenAAvatar(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var size = 256;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var side = Math.min(img.width, img.height);
        var sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')); }, 'image/jpeg', .85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }

  async function subirAvatar(file) {
    var blob = await comprimirImagenAAvatar(file);
    var path = CURRENT_USER.id + '/avatar.jpg';
    var up = await sb().storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;
    var pub = sb().storage.from('avatars').getPublicUrl(path);
    // El path no cambia entre subidas — se agrega un query param para evitar
    // que el navegador siga mostrando la foto vieja desde caché.
    var fotoUrl = pub.data.publicUrl + '?t=' + Date.now();
    var res = await sb().from('profiles').update({ foto_url: fotoUrl }).eq('id', CURRENT_USER.id);
    if (res.error) throw res.error;
    CURRENT_PROFILE = Object.assign({}, CURRENT_PROFILE, { foto_url: fotoUrl });
  }

  function bindProfileUI() {
    document.getElementById('sidenav-user').addEventListener('click', function (ev) {
      if (ev.target.closest('#btn-logout') || ev.target.closest('#btn-ajustes')) return;
      openPerfilModal('editar');
    });
    document.getElementById('btn-ajustes').addEventListener('click', function (ev) {
      ev.stopPropagation();
      openAjustesModal();
    });
    // Mobile: "Cerrar sesión" vive también dentro de la pantalla de perfil
    // y del panel de Ajustes, no sólo el ⏻ del cajón (ahí es donde la gente
    // lo busca). Dispara el mismo #btn-logout en vez de duplicar el
    // confirm()/signOut() — una sola fuente de verdad para cerrar sesión.
    document.getElementById('btn-perfil-logout').addEventListener('click', function () {
      document.getElementById('btn-logout').click();
    });
    document.getElementById('btn-ajustes-logout').addEventListener('click', function () {
      document.getElementById('btn-logout').click();
    });
    document.getElementById('btn-logout').addEventListener('click', async function (ev) {
      ev.stopPropagation();
      if (!confirm('¿Cerrar sesión?')) return;
      // Marca este signOut() como deliberado — así el listener de SIGNED_OUT
      // sabe que no es un vencimiento de sesión inesperado (ver
      // onAuthStateChange) y no muestra el aviso de "tu sesión venció".
      CERRANDO_SESION_DELIBERADO = true;
      await sb().auth.signOut();
      // Cerrar sesión a propósito vuelve a la landing (index.html), no al
      // formulario de login dentro de la app — es "salir del producto", no
      // "quedate acá para volver a entrar". Ruta relativa: los dos archivos
      // se sirven siempre desde el mismo directorio (ver README, sección
      // Landing page). El aviso de sesión vencida es la excepción: ese botón
      // sigue yendo al login de acá adentro, porque ahí sí es "reingresá
      // para seguir donde estabas", no un logout elegido.
      location.href = 'index.html';
    });
    document.getElementById('input-avatar').addEventListener('change', async function (e) {
      var file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        await subirAvatar(file);
        renderAvatarInto(document.getElementById('modal-perfil-avatar'), 72);
        renderSidenavUser();
      } catch (err) {
        avisarError('No se pudo subir la foto: ' + (err && err.message ? err.message : 'revisá tu conexión.'));
      }
    });
    document.getElementById('btn-perfil-foto').addEventListener('click', function () { document.getElementById('input-avatar').click(); });
    document.getElementById('form-perfil').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var uniSel = document.getElementById('perfil-universidad').value;
      var telSel = document.getElementById('perfil-tel-pais').value || 'UY';
      var tel = calcularTelefono(telSel, form.telefono.value.trim());
      var patch = {
        id: CURRENT_USER.id,
        nombre: form.nombre.value.trim(),
        apellido: form.apellido.value.trim(),
        birth_date: leerNacimientoISO('perfil-nac'),
        carrera: form.carrera.value.trim(),
        telefono_e164: tel.telefono_e164,
        telefono_pais: tel.telefono_pais,
        university_id: uniSel && uniSel !== 'otra' ? uniSel : null,
        university_other: uniSel === 'otra' ? form.universidad_otra.value.trim() : null
      };
      var btn = document.getElementById('btn-perfil-guardar');
      setBtnBusy(btn, true, 'Guardando…');
      try {
        var res = await sb().from('profiles').upsert(patch);
        if (res.error) throw res.error;
        CURRENT_PROFILE = Object.assign({}, CURRENT_PROFILE, patch);
        PERFIL_MODAL_BLOQUEANTE = false; // ya se guardó — closeAllModals() de acá abajo puede cerrarlo
        snapshotModalForm('modal-perfil');
        closeAllModals();
        document.getElementById('modal-perfil').classList.remove('is-gate');
        if (PERFIL_GATE_RESOLVE) { var resolver = PERFIL_GATE_RESOLVE; PERFIL_GATE_RESOLVE = null; resolver(); }
        renderSidenavUser();
        renderRoute();
      } catch (err) {
        avisarError();
      } finally {
        setBtnBusy(btn, false);
      }
    });
    document.getElementById('btn-ajustes-tag-nueva-abrir').addEventListener('click', function () {
      STATE.editing.ajustesTagNuevoAbierto = true;
      renderAjustesTagNuevaForm();
      document.getElementById('ajustes-tag-nueva-nombre').focus();
    });
    document.getElementById('btn-ajustes-progreso-abrir').addEventListener('click', function () {
      renderProgresoPendientesModal();
      openModal('modal-progreso-pendientes');
    });
    document.getElementById('ajustes-tag-nueva-crear').addEventListener('click', async function () {
      var nombreInput = document.getElementById('ajustes-tag-nueva-nombre');
      var nombre = nombreInput.value.trim();
      if (!nombre) { nombreInput.focus(); return; }
      var kind = document.getElementById('ajustes-tag-nueva-kind').value;
      var nuevoTag = { id: uid(), nombre: nombre, kind: kind, colorId: STATE.editing.ajustesTagNuevoColor || 'azul' };
      var arr = loadEventTagsRaw(); arr.push(nuevoTag);
      var btnCrear = document.getElementById('ajustes-tag-nueva-crear');
      setBtnBusy(btnCrear, true, 'Creando…');
      var ok = await saveEventTagsRaw(arr);
      setBtnBusy(btnCrear, false);
      if (!ok) { avisarError(); return; }
      nombreInput.value = '';
      STATE.editing.ajustesTagNuevoAbierto = false;
      renderAjustesTags();
    });
    document.getElementById('form-ajustes').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var materiasTxt = form.materias_carrera.value.trim();
      var patch = {
        id: CURRENT_USER.id,
        materias_carrera: materiasTxt === '' ? null : Number(materiasTxt)
      };
      var btn = document.getElementById('btn-ajustes-guardar');
      setBtnBusy(btn, true, 'Guardando…');
      try {
        var res = await sb().from('profiles').upsert(patch);
        if (res.error) throw res.error;
        CURRENT_PROFILE = Object.assign({}, CURRENT_PROFILE, patch);
        snapshotModalForm('modal-ajustes');
        closeAllModals();
        renderRoute();
      } catch (err) {
        avisarError();
      } finally {
        setBtnBusy(btn, false);
      }
    });
  }

  // ================================================================
  // IMPORTAR DATOS LOCALES (migración desde la versión sin cuenta)
  // ================================================================
  // Devuelve true si mostró el aviso (para que INIT/SESIÓN decida si además
  // corresponde mostrar el onboarding — ambos son overlays de pantalla
  // completa, y el aviso de importación tiene prioridad porque hay datos
  // reales de por medio, ver más abajo).
  function maybeOfrecerImportLocal() {
    if (importLocalYaResuelto()) return false;
    var legacy = readLegacyLocalData();
    if (!legacy) { marcarImportLocalResuelto(); return false; }
    document.getElementById('import-local-resumen').textContent =
      legacy.materias.length + (legacy.materias.length === 1 ? ' materia' : ' materias') + ', ' +
      legacy.agenda.length + (legacy.agenda.length === 1 ? ' evaluación' : ' evaluaciones') + ' y ' +
      legacy.personal.length + (legacy.personal.length === 1 ? ' evento personal' : ' eventos personales') +
      ' guardados en este navegador, de antes de tener cuenta.';
    var btnSi = document.getElementById('btn-import-local-si');
    var btnNo = document.getElementById('btn-import-local-no');
    btnSi.onclick = async function () {
      setBtnBusy(btnSi, true, 'Importando…');
      var ok = await importCollections(legacy);
      setBtnBusy(btnSi, false);
      if (!ok) { avisarError('No se pudo importar todo — revisá tu conexión e intentá de nuevo desde el mismo aviso.'); return; }
      marcarImportLocalResuelto();
      closeAllModals();
      renderRoute();
    };
    btnNo.onclick = function () {
      marcarImportLocalResuelto();
      closeAllModals();
      // Misma prioridad que en onSignedIn(): completar perfil (no
      // bloqueante — las cuentas de Google ya lo resolvieron antes de
      // llegar hasta acá, ver onSignedIn) antes que onboarding.
      if (!maybeOfrecerCompletarPerfilNoBloqueante() && !CACHE.materias.length) mostrarOnboardingOCatalogo();
    };
    openModal('modal-importar-local');
    return true;
  }

  // ================================================================
  // INIT / SESIÓN
  // ================================================================
  async function onSignedIn(user) {
    CURRENT_USER = user;
    // Bloque 7: preferencia de "Ver clases" del Calendario, por usuario —
    // recién acá hay CURRENT_USER.id para armar la clave de localStorage.
    STATE.mostrarClases = cargarMostrarClasesPref();
    setGateLoadingText('Cargando tus datos…');
    setGate('gate-loading');
    try {
      await loadAllFromSupabase();
      await ensureSemestresServerSide();
      await ensureDefaultTagsServerSide();
    } catch (e) {
      console.warn('Cursada: error cargando datos de la cuenta', e);
      // Mismo criterio que en las funciones de guardado: si esto falló
      // porque el token ya estaba vencido (p. ej. una pestaña que quedó
      // dormida horas y el usuario la reactivó) en vez del genérico "no se
      // pudo cargar" (que sugiere revisar la conexión) se muestra el aviso
      // correcto — acá sí es la sesión, no la red.
      if (esErrorSesionVencida(e)) mostrarSesionVencida(); else setGate('gate-error');
      return;
    }

    // Cuentas de Google con el perfil sin completar: se piden esos datos
    // ANTES de revelar #app — es una pantalla más (fondo sólido, mismo
    // tratamiento que el login), no un modal encima del dashboard. Se
    // espera acá a que la Promise se resuelva (al guardar) antes de seguir.
    if (esCuentaGoogle() && perfilIncompleto(CURRENT_PROFILE)) {
      await esperarCompletarPerfilObligatorio();
    }

    setGate(null);
    renderSidenavUser();
    handleRoute();
    // No bloqueante a propósito (ver cargarNotificaciones) — no tiene que
    // demorar la revelación de #app.
    cargarNotificaciones();
    refrescarEstadoGoogleCalendar();
    mostrarResultadoGoogleCalendarSiHay();
    if (JUST_SIGNED_UP) { JUST_SIGNED_UP = false; showToast('¡Cuenta creada! Bienvenido/a.'); }
    // Con el perfil de Google ya resuelto (si correspondía), quedan estos
    // avisos posibles al entrar a la app — nunca más de uno a la vez (si
    // no, uno tapa al otro). Orden de prioridad: importar datos locales
    // primero (hay datos reales de por medio); completar perfil no
    // bloqueante después (cuentas de email que dejaron datos sin llenar);
    // onboarding al final, sólo si seguís sin ninguna materia.
    var mostroImportLocal = maybeOfrecerImportLocal();
    var mostroCompletarPerfil = !mostroImportLocal && maybeOfrecerCompletarPerfilNoBloqueante();
    if (!mostroImportLocal && !mostroCompletarPerfil && !CACHE.materias.length) mostrarOnboardingOCatalogo();
  }

  function onSignedOut() {
    CURRENT_USER = null; CURRENT_PROFILE = null;
    CACHE.semestres = []; CACHE.materias = []; CACHE.agenda = []; CACHE.personal = [];
    CACHE.notificaciones = []; CACHE.notifPrefs = []; CACHE.pushDevices = [];
    GOOGLE_CALENDAR_CONECTADO = false;
    renderNotifBadge();
    showFormPanel();
    setAuthMode('signin');
    setGate('auth-screen');
  }

  // Si volviste de Google con un error (cancelaste el consentimiento, el
  // proveedor no está bien configurado en Supabase, etc.) o de un link de
  // mail vencido/ya usado (confirmación de cuenta o recuperación de
  // contraseña — Supabase usa el mismo mecanismo para los tres), volvés acá
  // con `#error=...&error_description=...` en la URL en vez de una sesión.
  // Se muestra ese error en la pantalla de login (con el link vencido, no
  // llega a haber sesión ni evento PASSWORD_RECOVERY — por eso este es el
  // único lugar que necesita manejar ese caso) y se limpia el hash (si no,
  // el router de la app lo intenta leer como si fuera una vista y además
  // queda pegado en la URL para el próximo refresh).
  function mostrarErrorOAuthSiHay() {
    var hash = location.hash || '';
    if (hash.indexOf('error=') < 0) return;
    var params = new URLSearchParams(hash.replace(/^#/, ''));
    var codigo = params.get('error') || '';
    var desc = params.get('error_description') || codigo;
    if (desc) showAuthError(traducirErrorAuth({ message: codigo + ' ' + desc }));
    history.replaceState(null, '', location.pathname + location.search);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    bindGlobalUI();
    bindAuthUI();
    bindProfileUI();
    bindWizardUI();
    iniciarCountdownGlobal();
    bindNotifBell();
    bindPushBanner();
    bindAjustesNotificaciones();
    bindAjustesGoogle();
    // El registro del Service Worker no depende de haber iniciado sesión
    // (scope sobre /, sirve tanto a la landing como a la app) — se hace acá,
    // apenas carga el documento. La SUSCRIPCIÓN a push sí requiere sesión y
    // permiso explícito (ver suscribirPush(), disparado desde el banner o
    // desde Ajustes).
    registrarServiceWorker();
    // Parte 3: nada de Supabase Realtime acá — refresco en foco, no en vivo.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && CURRENT_USER) cargarNotificaciones();
    });
    document.getElementById('btn-gate-retry').addEventListener('click', function () {
      if (CURRENT_USER) onSignedIn(CURRENT_USER); else location.reload();
    });
    document.getElementById('btn-sesion-vencida-login').addEventListener('click', function () {
      // La sesión ya está vencida (por eso se llegó a esta pantalla) —
      // signOut() acá es sólo higiene, para que el SDK no se quede con un
      // token muerto guardado localmente. Se marca como deliberado por la
      // misma razón que el botón de logout: si el signOut() dispara su
      // propio SIGNED_OUT (puede ser asíncrono), que no vuelva a mostrar
      // esta misma pantalla en vez de dejar ver el login.
      SESION_VENCIDA_MOSTRADA = false;
      CERRANDO_SESION_DELIBERADO = true;
      sb().auth.signOut().catch(function () {});
      onSignedOut();
    });
    window.addEventListener('hashchange', handleRoute);
    // Reubica "Lo próximo" y "Accesos rápidos" si se cruza el breakpoint de
    // 760px sin navegar (redimensionar la ventana, girar el dispositivo) —
    // ver posicionarInicioHero()/posicionarAccesosRapidos(). No hace falta
    // re-renderizar todo Inicio.
    window.addEventListener('resize', function () {
      if (STATE.route.view === 'inicio' && document.getElementById('inicio-hero')) { posicionarInicioHero(); posicionarAccesosRapidos(); }
    });

    sb().auth.onAuthStateChange(function (event, session) {
      // Volviendo del link de recuperación de contraseña: Supabase establece
      // una sesión temporal a partir del token de la URL y dispara este
      // evento en vez de SIGNED_IN — se intercepta ACÁ, antes de que caiga
      // en la rama de abajo y arranque la app normal con esa sesión
      // temporal. Se vuelve a bindAuthUI() (auth-screen), no a la app.
      if (event === 'PASSWORD_RECOVERY') {
        EN_RECUPERACION_PASSWORD = true;
        document.getElementById('reset-password-error').classList.add('hidden');
        document.getElementById('form-reset-password').reset();
        setGate('auth-screen');
        showAuthPanel('auth-reset-password-panel');
        return;
      }
      if (event === 'SIGNED_OUT') {
        if (CERRANDO_SESION_DELIBERADO) { CERRANDO_SESION_DELIBERADO = false; onSignedOut(); }
        // Puede dispararse solo, sin ninguna acción de guardado de por
        // medio, si Supabase determina que el refresh token ya no sirve
        // (pestaña abierta mucho tiempo, token revocado, etc.) — se avisa
        // con la pantalla dedicada en vez de devolver al login sin
        // explicación. La única excepción es en medio de la recuperación de
        // contraseña: ahí un SIGNED_OUT es parte normal del flujo (Supabase
        // cierra la sesión temporal si se abandona esa pantalla), no un
        // vencimiento real.
        else if (!EN_RECUPERACION_PASSWORD) { mostrarSesionVencida(); }
        return;
      }
      if (EN_RECUPERACION_PASSWORD) return; // no arrancar la app con la sesión temporal de recuperación
      if (session && session.user && (!CURRENT_USER || CURRENT_USER.id !== session.user.id)) { onSignedIn(session.user); }
    });

    setGateLoadingText('Cargando sesión…');
    setGate('gate-loading');
    sb().auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) {
        setAuthMode('signin');
        setGate('auth-screen');
        // Después de setAuthMode() (que limpia el error al resetear el
        // formulario) — si no, un error de vuelta de Google quedaría
        // pisado por ese reset antes de llegar a mostrarse.
        mostrarErrorOAuthSiHay();
      }
      // Si hay sesión, el evento inicial de onAuthStateChange se encarga.
    });
  });
})();
