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
  // Las 3 familias tipográficas del bundle anterior se reemplazan por la pila
  // de fuente del sistema (ver styles.css); MONO queda como alias para no
  // tocar cada llamada de chip()/badge()/ring() una por una.
  var MONO = "-apple-system,BlinkMacSystemFont,system-ui,'SF Pro Text','Helvetica Neue',Arial,sans-serif";
  // margen de riesgo (escala 0-12), constante de runtime — no hay pantalla de ajustes
  // en este entregable. Cambiá este valor (0 a 3, pasos de .5) para ajustar cuándo
  // una materia pasa de "warning" a "danger" en el semáforo de riesgo.
  var MARGEN_RIESGO = 1;
  var NOTA_APROBACION_DEFECTO = 3;

  var ESTADO_LABEL = { cursando: 'Cursando', aprobada: 'Aprobada', recursando: 'Recursando', pendiente: 'Pendiente' };
  var ESTADO_TONE = { cursando: 'neutral', aprobada: 'success', recursando: 'danger', pendiente: 'neutral' };

  var DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS_BLOQUE = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var DIAS_BLOQUE_MINI = ['L', 'M', 'X', 'J', 'V', 'S'];
  var TIPOS_EVAL = ['Parcial', 'Final', 'Entrega', 'Tarea', 'Presentación'];

  // ---------- utilidades ----------
  function uid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function truncate(s, n) { return (s && s.length > n) ? s.slice(0, n - 1) + '…' : (s || ''); }
  function css(obj) {
    return Object.keys(obj).map(function (k) {
      var v = obj[k];
      if (v == null || v === '') return '';
      var kebab = k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
      return kebab + ':' + v;
    }).filter(Boolean).join(';');
  }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'oscuro'; }
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
  function dotStyle(color, r) { return css({ width: '10px', height: '10px', borderRadius: r || '3px', background: color, flex: 'none' }); }
  function ringStyle(v, color, size, total) {
    var pct = Math.max(0, Math.min(100, ((v == null ? 0 : v) / (total || 12)) * 100));
    return css({ width: size + 'px', height: size + 'px', borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'conic-gradient(' + color + ' 0% ' + pct + '%, var(--c-line) ' + pct + '% 100%)' });
  }
  function ringInnerStyle(size, thick) {
    return css({ width: (size - thick * 2) + 'px', height: (size - thick * 2) + 'px', borderRadius: '50%', background: 'var(--c-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' });
  }

  // ---------- sistema de calificación (mirror exacto) ----------
  function val(v, e) { return v == null ? '—' : (e.tipo === 'nota' ? fmt(v) : String(Math.round(v))); }
  function uni(e) { return e.tipo === 'nota' ? '' : (e.tipo === 'pct' ? '%' : ' pts'); }
  function valU(v, e) { return v == null ? '—' : val(v, e) + uni(e); }
  function escLabel(e) { return e.tipo === 'nota' ? 'Nota 0–12' : (e.tipo === 'pct' ? 'Porcentaje' : 'Puntaje ' + e.total); }
  function margenDe(e) { return MARGEN_RIESGO / 12 * e.total; }
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
      return diasTxt + ' · ' + pad2(ini) + ':00–' + pad2(fin) + ':00';
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

  var CACHE = { semestres: [], materias: [], agenda: [], personal: [] };
  var CURRENT_USER = null;    // objeto `user` de supabase-js: id, email, …
  var CURRENT_PROFILE = null; // fila de `profiles`: {id, nombre, foto_url}

  // ---- mapeo camelCase (JS, como ya usaba todo el código) <-> snake_case
  // (columnas reales de Supabase) — queda todo acá, nada de conversiones
  // sueltas en el resto del archivo. ----
  function materiaToRow(m) {
    return { id: m.id, user_id: CURRENT_USER.id, semestre_id: m.semestreId || null, cod: m.cod, nombre: m.nombre, doc: m.doc, color_id: m.colorId, creditos: m.creditos, salon: m.salon, bloques: m.bloques || [], esc: m.esc, estado: m.estado };
  }
  function rowToMateria(r) {
    return { id: r.id, semestreId: r.semestre_id, cod: r.cod, nombre: r.nombre, doc: r.doc, colorId: r.color_id, creditos: r.creditos, salon: r.salon, bloques: r.bloques || [], esc: r.esc, estado: r.estado };
  }
  function agendaToRow(a) {
    return { id: a.id, user_id: CURRENT_USER.id, materia_id: a.materiaId || null, tipo: a.tipo, titulo: a.titulo, fecha: a.fecha, hora: a.hora || '', hecho: !!a.hecho, nota: a.nota == null ? null : a.nota, notas: a.notas || '' };
  }
  function rowToAgenda(r) {
    return { id: r.id, materiaId: r.materia_id, tipo: r.tipo, titulo: r.titulo, fecha: r.fecha, hora: r.hora || '', hecho: !!r.hecho, nota: r.nota == null ? null : r.nota, notas: r.notas || '' };
  }
  function personalToRow(p) {
    return { id: p.id, user_id: CURRENT_USER.id, titulo: p.titulo, fecha: p.fecha, hora: p.todoElDia ? '' : (p.hora || ''), todo_el_dia: !!p.todoElDia };
  }
  function rowToPersonal(r) {
    return { id: r.id, titulo: r.titulo, fecha: r.fecha, hora: r.hora || '', todoElDia: !!r.todo_el_dia };
  }
  function semestreToRow(s) {
    return { id: s.id, user_id: CURRENT_USER.id, nombre: s.nombre, activo: !!s.activo };
  }
  function rowToSemestre(r) {
    return { id: r.id, nombre: r.nombre, activo: !!r.activo };
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
      return false;
    }
  }

  function materiaRawById(id) { return loadMateriasRaw().filter(function (m) { return m.id === id; })[0] || null; }
  function agendaRawById(id) { return loadAgendaRaw().filter(function (a) { return a.id === id; })[0] || null; }
  function personalRawById(id) { return loadPersonalRaw().filter(function (p) { return p.id === id; })[0] || null; }
  function semestreRawById(id) { return loadSemestresRaw().filter(function (s) { return s.id === id; })[0] || null; }

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

  async function loadAllFromSupabase() {
    var uidActual = CURRENT_USER.id;
    var results = await Promise.all([
      sb().from('profiles').select('*').eq('id', uidActual).maybeSingle(),
      sb().from('semestres').select('*'),
      sb().from('materias').select('*'),
      sb().from('agenda').select('*'),
      sb().from('personal').select('*')
    ]);
    results.forEach(function (r) { if (r.error) throw r.error; });
    CURRENT_PROFILE = results[0].data || { id: uidActual, nombre: '', foto_url: null };
    CACHE.semestres = results[1].data.map(rowToSemestre);
    CACHE.materias = results[2].data.map(rowToMateria);
    CACHE.agenda = results[3].data.map(rowToAgenda);
    CACHE.personal = results[4].data.map(rowToPersonal);
  }

  function avisarError(msg) {
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
    var evaluaciones = agenda.filter(function (a) { return a.materiaId === m.id; })
      .sort(function (a, b) { return parseISODate(a.fecha) - parseISODate(b.fecha) || (a.hora || '').localeCompare(b.hora || ''); });
    var notasEvals = evaluaciones.filter(function (a) { return a.nota != null; });
    var parciales = notasEvals.map(function (a) { return a.nota; });
    var e = m.esc;
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
    out.actual = actual;
    out.tone = tone;
    out.toneColor = TONE[tone];
    out.strong = acc.strong;
    out.soft = acc.soft;
    out.notaTxt = val(actual, e);
    out.aprobTxt = valU(e.aprob, e);
    out.escalaTxt = escLabel(e);
    out.totalTxt = val(e.total, e) + uni(e);
    out.horario = formatHorario(m.bloques);
    out.badgeLabel = ESTADO_LABEL[m.estado];
    out.badgeTone = ESTADO_TONE[m.estado];
    out.riesgoTxt = riesgoTxt;
    out.necesita = necesita;
    out.evaluaciones = evaluaciones;
    out.notasEvals = notasEvals;
    out.parciales = parciales;
    return out;
  }
  // Sin `opts.semestreId`: todas las materias, de cualquier semestre (así lo
  // usan Agenda/Calendario/el selector de materia de una evaluación — ver
  // README, sección Semestres, sobre por qué esas vistas no se acotan).
  // Con `opts.semestreId`: sólo las materias de ese semestre (Inicio,
  // Materias, Horario).
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
  function materiaCod(id) { var m = materiaRawById(id); return m ? m.cod : ''; }

  // ================================================================
  // ESTADO EN MEMORIA (sólo UI, nunca persiste solo)
  // ================================================================
  var STATE = {
    route: { view: 'inicio', materiaId: null },
    materiasFiltro: 'todas',
    materiasQuery: '',
    materiasView: 'tarjetas',
    agendaFiltroTipo: 'Todo',
    agendaFiltroMateria: '',
    agendaFiltroEstado: '',
    agendaQuery: '',
    calYear: today().getFullYear(),
    calMonth: today().getMonth(),
    calViewMode: 'mes',
    calWeekStart: mondayOf(today()),
    calSelected: todayISO(),
    mostrarPersonales: true,
    mostrarSabado: true,
    editing: {}
  };

  // ================================================================
  // SIDENAV / TOOLBAR
  // ================================================================
  var VIEW_LABELS = { inicio: 'Inicio', materias: 'Materias', detalle: 'Materias', agenda: 'Agenda', calendario: 'Calendario', horario: 'Horario' };

  function buildLeyendaItem(label, color) {
    var node = tpl('leyenda-item');
    qf(node, 'dot').setAttribute('style', dotStyle(color));
    qf(node, 'label').textContent = label;
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
    document.querySelectorAll('.nav-item[data-nav]').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-nav') === activeKey); });
    document.querySelectorAll('.toolbar-btn[data-nav]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-nav') === activeKey); });
    var lbl = document.getElementById('toolbar-view-label');
    if (lbl) lbl.textContent = VIEW_LABELS[STATE.route.view] || '';

    var legend = document.getElementById('sidenav-legend');
    var list = document.getElementById('sidenav-legend-list');
    clear(list);
    if (STATE.route.view === 'calendario') {
      legend.classList.remove('hidden');
      document.getElementById('sidenav-legend-lbl').textContent = 'Referencias';
      var ms = computeMaterias();
      ms.slice(0, 6).forEach(function (m) { list.appendChild(buildLeyendaItem(truncate(m.nombre, 22), m.strong)); });
      if (STATE.mostrarPersonales) list.appendChild(buildLeyendaItem('Personal', PERSONAL_COLOR));
    } else if (STATE.route.view === 'horario') {
      legend.classList.remove('hidden');
      document.getElementById('sidenav-legend-lbl').textContent = 'Materias en la grilla';
      computeMateriasDelActivo().filter(function (m) { return m.bloques && m.bloques.length; }).forEach(function (m) { list.appendChild(buildLeyendaItem(truncate(m.nombre, 22), m.strong)); });
    } else {
      legend.classList.add('hidden');
    }
    document.getElementById('toggle-sabado-row').classList.toggle('hidden', STATE.route.view !== 'horario');
  }

  // ================================================================
  // INICIO
  // ================================================================
  function computeKpis() {
    var materias = computeMateriasDelActivo();
    var cursando = materias.filter(function (m) { return m.estado === 'cursando' || m.estado === 'recursando'; });
    var creditos = cursando.reduce(function (s, m) { return s + (Number(m.creditos) || 0); }, 0);
    var t = today();
    var agenda = agendaDeSemestre(activeSemestreId());
    var pendientes = agenda.filter(function (a) { return !a.hecho; });
    var proxExamen = pendientes
      .filter(function (a) { return a.tipo === 'Parcial' || a.tipo === 'Final'; })
      .map(function (a) { return { a: a, d: parseISODate(a.fecha) }; })
      .filter(function (x) { return x.d >= t; })
      .sort(function (x, y) { return x.d - y.d; })[0];
    var proms = materias.filter(function (m) { return m.actual != null; }).map(function (m) { return m.actual / m.esc.total * 100; });
    var promedio = proms.length ? Math.round(proms.reduce(function (a, b) { return a + b; }, 0) / proms.length) : null;
    var estaSemana = pendientes.filter(function (a) { var d = diffDias(parseISODate(a.fecha), t); return d >= 0 && d <= 6; });
    var vencidas = pendientes.filter(function (a) { return parseISODate(a.fecha) < t; });
    return [
      { label: 'Materias cursando', valor: String(cursando.length), sub: creditos + ' créditos en el semestre', tone: 'neutral' },
      { label: 'Próxima evaluación', valor: proxExamen ? (DIAS_CORTOS[proxExamen.d.getDay()] + ' ' + proxExamen.d.getDate()) : '—', sub: proxExamen ? (proxExamen.a.tipo + ' · ' + materiaNombre(proxExamen.a.materiaId)) : 'sin evaluaciones cargadas', tone: 'warning' },
      { label: 'Promedio general', valor: promedio != null ? promedio + '%' : '—', sub: 'normalizado · 3 escalas distintas', tone: 'success' },
      { label: 'Pendientes esta semana', valor: String(estaSemana.length), sub: vencidas.length ? (vencidas.length + (vencidas.length === 1 ? ' vencida de antes' : ' vencidas de antes')) : 'sin vencidas', tone: vencidas.length ? 'danger' : 'neutral' }
    ];
  }

  function renderInicio() {
    var t = today();
    var nombre = primerNombre(CURRENT_PROFILE && CURRENT_PROFILE.nombre);
    document.getElementById('inicio-hello').textContent = nombre ? ('Hola, ' + nombre) : 'Hola';
    document.getElementById('inicio-date').textContent = DIAS_LARGOS[t.getDay()].toLowerCase() + ' ' + t.getDate() + ' de ' + MESES_LARGOS[t.getMonth()] + ' de ' + t.getFullYear();
    var agenda = agendaDeSemestre(activeSemestreId()).filter(function (a) { return !a.hecho; });
    document.getElementById('inicio-note').innerHTML = 'Tenés <b style="color:var(--c-ink)">' + agenda.length + '</b> ' + (agenda.length === 1 ? 'entrega pendiente' : 'entregas pendientes');

    var kpiRow = document.getElementById('kpi-row');
    clear(kpiRow);
    computeKpis().forEach(function (k) {
      var node = tpl('kpi-card');
      qf(node, 'label').textContent = k.label;
      qf(node, 'valor').textContent = k.valor;
      var sub = qf(node, 'sub');
      sub.textContent = k.sub;
      sub.style.color = k.tone === 'neutral' ? 'var(--c-ink3)' : TONE[k.tone];
      kpiRow.appendChild(node);
    });

    var proxList = document.getElementById('proximos-list');
    clear(proxList);
    var t7 = today();
    var proximos = [];
    agendaDeSemestre(activeSemestreId()).forEach(function (a) {
      var d = parseISODate(a.fecha);
      var diff = diffDias(d, t7);
      if (diff >= 0 && diff <= 7) proximos.push({ tipo: 'materia', d: d, item: a });
    });
    if (STATE.mostrarPersonales) loadPersonalRaw().forEach(function (p) {
      var d = parseISODate(p.fecha);
      var diff = diffDias(d, t7);
      if (diff >= 0 && diff <= 7) proximos.push({ tipo: 'personal', d: d, item: p });
    });
    proximos.sort(function (a, b) { return a.d - b.d; });
    if (!proximos.length) {
      var empty = el('div'); empty.style.cssText = 'padding:24px 0;text-align:center;color:var(--c-ink3);font-size:13px';
      empty.textContent = 'No tenés nada agendado para los próximos 7 días.';
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
        var chip = qf(node, 'chip'); chip.setAttribute('style', m ? chipStyle(m.colorId) : personalChipStyle()); chip.textContent = m ? m.cod : 'Personal';
        qf(node, 'metaTxt').textContent = (p.item.hora || '') + (p.item.hora ? ' · ' : '') + p.item.tipo;
        var badgeInfo = agendaBadgeInfo(p.item, t7);
        var b = qf(node, 'badge'); b.setAttribute('style', badgeStyle(badgeInfo.tone)); b.textContent = badgeInfo.label;
      } else {
        qf(node, 'bar').setAttribute('style', barStyle(PERSONAL_COLOR));
        qf(node, 'titulo').textContent = p.item.titulo;
        var chip2 = qf(node, 'chip'); chip2.setAttribute('style', personalChipStyle()); chip2.textContent = 'Personal';
        qf(node, 'metaTxt').textContent = p.item.todoElDia ? 'Todo el día' : (p.item.hora || '');
        var b2 = qf(node, 'badge'); b2.setAttribute('style', badgeStyle('neutral')); b2.textContent = 'Personal';
      }
      node.style.cursor = p.tipo === 'materia' ? 'pointer' : 'default';
      if (p.tipo === 'materia') node.addEventListener('click', function () { openEvaluacionModal({ editId: p.item.id }); });
      proxList.appendChild(node);
    });

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
        node.style.cursor = 'pointer';
        node.addEventListener('click', function () { location.hash = '#materia-' + m.id; });
        riesgoList.appendChild(node);
      });
    }
  }

  function agendaBadgeInfo(item, t) {
    if (item.hecho) return { tone: 'success', label: (item.tipo === 'Parcial' || item.tipo === 'Final') ? 'Rendido' : 'Entregado' };
    var d = parseISODate(item.fecha);
    var diff = diffDias(d, t);
    if (diff < 0) return { tone: 'danger', label: 'Vencida hace ' + Math.abs(diff) + (Math.abs(diff) === 1 ? ' día' : ' días') };
    if (diff === 0) return { tone: 'warning', label: 'Hoy' };
    if (diff === 1) return { tone: 'warning', label: 'Mañana' };
    if (diff <= 6) return { tone: 'neutral', label: 'Esta semana' };
    return { tone: 'neutral', label: 'Pendiente' };
  }

  // ================================================================
  // MATERIAS
  // ================================================================
  function renderMaterias() {
    var materias = computeMateriasDelActivo();
    document.getElementById('materias-count').textContent = materias.length + (materias.length === 1 ? ' materia' : ' materias') + ' · ' + materias.reduce(function (s, m) { return s + (Number(m.creditos) || 0); }, 0) + ' créditos';

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
    if (q) filtradas = filtradas.filter(function (m) { return (m.nombre + ' ' + m.cod + ' ' + m.doc).toLowerCase().indexOf(q) >= 0; });

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
        qf(row, 'cod').textContent = m.cod;
        qf(row, 'nombre').textContent = m.nombre;
        qf(row, 'doc').textContent = m.doc;
        qf(row, 'creditos').textContent = String(m.creditos);
        qf(row, 'notaTxt').textContent = m.notaTxt + '/' + val(m.esc.aprob, m.esc);
        var b = qf(row, 'badge'); b.setAttribute('style', badgeStyle(ESTADO_TONE[m.estado])); b.textContent = m.badgeLabel;
        row.addEventListener('click', function () { location.hash = '#materia-' + m.id; });
        tbody.appendChild(row);
      });
    }
  }

  function buildMateriaCard(m) {
    var node = tpl('materia-card');
    var tile = qf(node, 'tile'); tile.style.background = tileGradient(m.colorId); tile.textContent = m.cod.split('-')[0].slice(0, 4);
    var badge = qf(node, 'badge'); badge.setAttribute('style', badgeStyle(ESTADO_TONE[m.estado])); badge.textContent = m.badgeLabel;
    qf(node, 'nombre').textContent = m.nombre;
    qf(node, 'doc').textContent = m.doc;
    qf(node, 'ring').setAttribute('style', ringStyle(m.actual, TONE[m.tone], 56, m.esc.total));
    var inner = qf(node, 'ringInner'); inner.setAttribute('style', ringInnerStyle(56, 6));
    var v = el('span', 'ring-val mono'); v.style.fontSize = '14px'; v.textContent = m.notaTxt;
    inner.appendChild(v);
    qf(node, 'salon').textContent = m.salon || 'Sin salón asignado';
    qf(node, 'horario').textContent = m.horario;
    qf(node, 'escalaTxt').textContent = m.escalaTxt + ' · aprueba ' + m.aprobTxt;
    qf(node, 'toneDot').setAttribute('style', dotStyle(TONE[m.tone], '50%'));
    node.addEventListener('click', function () { location.hash = '#materia-' + m.id; });
    return node;
  }

  // ================================================================
  // DETALLE
  // ================================================================
  function renderDetalle(id) {
    var m = computeMateriaById(id);
    if (!m) { location.hash = '#materias'; return; }
    document.getElementById('detalle-crumb').textContent = m.nombre;
    var av = document.getElementById('detalle-avatar');
    av.style.background = tileGradient(m.colorId);
    av.textContent = m.cod.split('-')[0];
    document.getElementById('detalle-nombre').textContent = m.nombre;
    var badge = document.getElementById('detalle-estado-badge');
    badge.setAttribute('style', badgeStyle(ESTADO_TONE[m.estado])); badge.textContent = m.badgeLabel;
    document.getElementById('detalle-meta').textContent = m.cod + ' · ' + m.creditos + ' créditos · ' + m.doc + ' · ' + m.escalaTxt.toLowerCase();
    document.getElementById('detalle-salon').textContent = m.salon || 'Sin salón asignado';
    document.getElementById('detalle-cursada').textContent = m.horario;

    var escBadge = document.getElementById('detalle-escala-badge'); escBadge.textContent = m.escalaTxt;
    document.getElementById('detalle-ring').setAttribute('style', ringStyle(m.actual, TONE[m.tone], 140, m.esc.total));
    var ringInner = document.getElementById('detalle-ring-inner');
    ringInner.setAttribute('style', ringInnerStyle(140, 13));
    clear(ringInner);
    var v1 = el('span'); v1.className = 'mono'; v1.style.cssText = 'font-size:34px;font-weight:600;line-height:1'; v1.textContent = m.notaTxt;
    var v2 = el('span'); v2.className = 'mono'; v2.style.cssText = 'font-size:11px;color:var(--c-ink3)'; v2.textContent = 'aprueba ' + m.aprobTxt;
    ringInner.appendChild(v1); ringInner.appendChild(v2);

    var notasList = document.getElementById('detalle-notas-list');
    clear(notasList);
    m.notasEvals.forEach(function (a) {
      var node = tpl('nota-row');
      node.title = 'Editar esta evaluación';
      node.style.cursor = 'pointer';
      qf(node, 'label').textContent = truncate(a.titulo, 28);
      qf(node, 'barFill').setAttribute('style', css({ width: ((a.nota / m.esc.total) * 100) + '%', height: '100%', borderRadius: '3px', background: m.strong }));
      qf(node, 'val').textContent = valU(a.nota, m.esc);
      node.addEventListener('click', function () { openEvaluacionModal({ editId: a.id }); });
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
    } else if (!count) {
      document.getElementById('detalle-callout-t').textContent = 'Todavía no cargaste notas';
      document.getElementById('detalle-callout-s').textContent = 'Esta materia se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '. Agregá tu primer parcial para ver la proyección.';
    } else if (m.actual >= m.esc.aprob) {
      document.getElementById('detalle-callout-t').textContent = m.tone === 'warning' ? 'Vas aprobando, pero raspando' : 'Vas aprobando esta materia';
      document.getElementById('detalle-callout-s').textContent = 'Esta materia se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '. Con ' + count + (count === 1 ? ' nota cargada' : ' notas cargadas') + ' tu promedio es ' + valU(m.actual, m.esc) + ', por encima del mínimo.';
    } else {
      document.getElementById('detalle-callout-t').textContent = 'Te faltan ' + valU(m.necesita, m.esc) + ' para llegar a la aprobación';
      document.getElementById('detalle-callout-s').textContent = 'Esta materia se califica por ' + m.escalaTxt.toLowerCase() + ' sobre ' + m.totalTxt + ' y aprueba con ' + m.aprobTxt + '. Con ' + count + (count === 1 ? ' nota cargada' : ' notas cargadas') + ' tu promedio es ' + valU(m.actual, m.esc) + ', así que te faltan ' + valU(m.necesita, m.esc) + ' para llegar al mínimo.';
    }

    var evals = m.evaluaciones;
    document.getElementById('detalle-eval-count').textContent = evals.length + (evals.length === 1 ? ' ítem' : ' ítems');
    var evalList = document.getElementById('detalle-eval-list');
    clear(evalList);
    var t = today();
    evals.forEach(function (a) {
      var node = tpl('eval-row');
      node.style.cursor = 'pointer';
      node.title = 'Editar esta evaluación';
      var check = qf(node, 'check'); check.checked = !!a.hecho;
      check.addEventListener('change', function (ev) { ev.stopPropagation(); toggleAgendaHecho(a.id, check.checked); });
      check.addEventListener('click', function (ev) { ev.stopPropagation(); });
      var mark = qf(node, 'checkMark'); mark.textContent = a.hecho ? '✓' : '';
      var titulo = qf(node, 'titulo'); titulo.textContent = a.titulo; titulo.classList.toggle('done', !!a.hecho);
      qf(node, 'metaTxt').textContent = a.tipo + ' · ' + formatFechaAgenda(a.fecha, a.hora) + (a.nota != null ? ' · ' + valU(a.nota, m.esc) : '');
      var info = agendaBadgeInfo(a, t);
      var b = qf(node, 'badge'); b.setAttribute('style', badgeStyle(info.tone)); b.textContent = info.label;
      node.addEventListener('click', function () { openEvaluacionModal({ editId: a.id }); });
      evalList.appendChild(node);
    });

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
        box.textContent = pad2(b.ini) + ':00–' + pad2(b.fin) + ':00' + (m.salon ? ' · ' + m.salon.replace('Edificio ', '') : '');
        box.setAttribute('style', css({ height: '54px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: '11px', fontWeight: 600, textAlign: 'center', padding: '0 8px', background: m.soft, color: m.strong, border: '1px solid ' + rgba(m.strong, .28) }));
      } else {
        box.textContent = '';
      }
      miniDays.appendChild(node);
    });

    document.getElementById('btn-detalle-editar').onclick = function () { openMateriaModal(m.id); };
    document.getElementById('btn-detalle-nueva-eval').onclick = function () { openEvaluacionModal({ materiaId: m.id }); };
    document.getElementById('btn-detalle-cargar-nota').onclick = function () { openEvaluacionModal({ materiaId: m.id }); };
    document.getElementById('btn-detalle-escala').onclick = function () { openMateriaModal(m.id); };
  }

  async function toggleAgendaHecho(id, hecho) {
    var arr = loadAgendaRaw();
    arr.forEach(function (a) { if (a.id === id) a.hecho = hecho; });
    var ok = await saveAgendaRaw(arr);
    if (!ok) avisarError();
    renderRoute();
  }

  // ================================================================
  // AGENDA
  // ================================================================
  function agendaEntries() {
    var out = [];
    loadAgendaRaw().forEach(function (a) { out.push({ kind: 'materia', id: a.id, materiaId: a.materiaId, tipo: a.tipo, titulo: a.titulo, fecha: a.fecha, hora: a.hora, hecho: a.hecho }); });
    if (STATE.mostrarPersonales) loadPersonalRaw().forEach(function (p) { out.push({ kind: 'personal', id: p.id, tipo: 'Evento personal', titulo: p.titulo, fecha: p.fecha, hora: p.todoElDia ? '' : p.hora, hecho: false, todoElDia: p.todoElDia }); });
    return out;
  }

  function renderAgenda() {
    var t = today();
    var materiaSel = document.getElementById('agenda-filtro-materia');
    var prevVal = STATE.agendaFiltroMateria;
    clear(materiaSel);
    var optTodas = el('option'); optTodas.value = ''; optTodas.textContent = 'Todas las materias'; materiaSel.appendChild(optTodas);
    computeMaterias().forEach(function (m) { var o = el('option'); o.value = m.id; o.textContent = m.cod + ' · ' + m.nombre; materiaSel.appendChild(o); });
    materiaSel.value = prevVal;
    materiaSel.onchange = function () { STATE.agendaFiltroMateria = materiaSel.value; renderAgenda(); };
    document.getElementById('agenda-filtro-estado').value = STATE.agendaFiltroEstado;
    document.getElementById('agenda-filtro-estado').onchange = function (e) { STATE.agendaFiltroEstado = e.target.value; renderAgenda(); };

    var tipoValues = ['Todo'].concat(TIPOS_EVAL);
    var filtrosNode = document.getElementById('agenda-filtros');
    clear(filtrosNode);
    tipoValues.forEach(function (tv, i) {
      var node = tpl('filtro-pill');
      node.classList.toggle('is-on', STATE.agendaFiltroTipo === tv);
      qf(node, 'label').textContent = tv === 'Todo' ? 'Todo' : tv + 's';
      node.addEventListener('click', function () { STATE.agendaFiltroTipo = tv; renderAgenda(); });
      filtrosNode.appendChild(node);
    });

    var agendaSearchInput = document.getElementById('agenda-search');
    if (agendaSearchInput.value !== STATE.agendaQuery) agendaSearchInput.value = STATE.agendaQuery;
    var aq = STATE.agendaQuery.trim().toLowerCase();
    var entries = agendaEntries().filter(function (e) {
      if (STATE.agendaFiltroTipo !== 'Todo' && e.tipo !== STATE.agendaFiltroTipo) return false;
      if (STATE.agendaFiltroMateria && e.materiaId !== STATE.agendaFiltroMateria) return false;
      if (STATE.agendaFiltroEstado === 'pendiente' && e.hecho) return false;
      if (STATE.agendaFiltroEstado === 'hecho' && !e.hecho) return false;
      if (aq) {
        var cod = e.materiaId ? materiaCod(e.materiaId) : 'personal';
        if ((e.titulo + ' ' + cod + ' ' + e.tipo).toLowerCase().indexOf(aq) < 0) return false;
      }
      return true;
    });

    var vencidas = [], estaSemana = [], proximamente = [];
    entries.forEach(function (e) {
      var d = parseISODate(e.fecha);
      var diff = diffDias(d, t);
      if (diff < 0) vencidas.push(e); else if (diff <= 6) estaSemana.push(e); else proximamente.push(e);
    });
    var sortFn = function (a, b) { return parseISODate(a.fecha) - parseISODate(b.fecha) || (a.hora || '').localeCompare(b.hora || ''); };
    vencidas.sort(sortFn); estaSemana.sort(sortFn); proximamente.sort(sortFn);

    document.getElementById('agenda-count').textContent = entries.length + (entries.length === 1 ? ' ítem' : ' ítems') + (vencidas.length ? ' · ' + vencidas.length + (vencidas.length === 1 ? ' vencido' : ' vencidos') : '');

    var groupsNode = document.getElementById('agenda-groups');
    clear(groupsNode);
    [['Vencidas', vencidas, true], ['Esta semana', estaSemana, false], ['Próximamente', proximamente, false]].forEach(function (g) {
      if (!g[1].length) return;
      groupsNode.appendChild(buildAgendaGroup(g[0], g[1], g[2], t));
    });
    if (!entries.length) {
      var empty = el('div'); empty.style.cssText = 'padding:40px 0;text-align:center;color:var(--c-ink3);font-size:14px';
      empty.textContent = 'No hay ítems con estos filtros.';
      groupsNode.appendChild(empty);
    }
  }

  function buildAgendaGroup(titulo, items, danger, t) {
    var wrap = el('div', 'agenda-group');
    var head = el('div', 'agenda-group-head');
    var tEl = el('span', 't' + (danger ? ' danger' : '')); tEl.textContent = titulo;
    var n = el('span', 'n'); n.textContent = items.length + (items.length === 1 ? ' ítem' : ' ítems');
    var rule = el('div', 'rule');
    head.appendChild(tEl); head.appendChild(n); head.appendChild(rule);
    var list = el('div', 'card agenda-list');
    items.forEach(function (item) {
      var node = tpl('agenda-row');
      var check = qf(node, 'check');
      var mark = qf(node, 'checkMark');
      if (item.kind === 'materia') {
        check.checked = !!item.hecho;
        check.addEventListener('change', function () { toggleAgendaHecho(item.id, check.checked); });
        mark.textContent = item.hecho ? '✓' : '';
      } else {
        check.disabled = true; check.title = 'Los eventos personales no tienen estado de entrega';
      }
      var m = item.materiaId ? computeMateriaById(item.materiaId) : null;
      qf(node, 'bar').setAttribute('style', barStyle(m ? m.strong : PERSONAL_COLOR));
      var titleEl = qf(node, 'titulo'); titleEl.textContent = item.titulo; titleEl.classList.toggle('done', !!item.hecho);
      var chip = qf(node, 'chip'); chip.setAttribute('style', m ? chipStyle(m.colorId) : personalChipStyle()); chip.textContent = m ? m.cod : 'Personal';
      qf(node, 'tipo').textContent = item.tipo;
      qf(node, 'fecha').textContent = formatFechaAgenda(item.fecha, item.hora);
      var info = item.kind === 'materia' ? agendaBadgeInfo(item, t) : { tone: 'neutral', label: item.todoElDia ? 'Todo el día' : 'Personal' };
      var b = qf(node, 'badge'); b.setAttribute('style', badgeStyle(info.tone)); b.textContent = info.label;
      node.style.cursor = 'pointer';
      node.addEventListener('click', function (ev) {
        if (ev.target === check) return;
        if (item.kind === 'materia') openEvaluacionModal({ editId: item.id }); else openPersonalModal({ editId: item.id });
      });
      list.appendChild(node);
    });
    wrap.appendChild(head); wrap.appendChild(list);
    return wrap;
  }

  // ================================================================
  // CALENDARIO
  // ================================================================
  function clasesPorDiaSemana() {
    // Usa el semestre activo: es el patrón semanal "de ahora", no una
    // reconstrucción histórica exacta por fecha (ver README, sección
    // Semestres) — el Calendario puede navegar a meses de semestres viejos
    // sin que este contador cambie de fuente.
    var out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    computeMateriasDelActivo().forEach(function (m) { (m.bloques || []).forEach(function (b) { out[b.dia] = (out[b.dia] || 0) + 1; }); });
    return out;
  }

  function eventosDeDia(iso) {
    var out = [];
    loadAgendaRaw().forEach(function (a) { if (a.fecha === iso) { var m = computeMateriaById(a.materiaId); out.push({ kind: 'materia', item: a, color: m ? m.strong : PERSONAL_COLOR, label: a.titulo, allDay: false, materia: m }); } });
    if (STATE.mostrarPersonales) loadPersonalRaw().forEach(function (p) { if (p.fecha === iso) out.push({ kind: 'personal', item: p, color: PERSONAL_COLOR, label: p.titulo, allDay: !!p.todoElDia }); });
    return out;
  }

  function mondayOf(d) { var dow = designDia(d); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow - 1)); }

  function buildDayCell(d, opts) {
    opts = opts || {};
    var muted = !!opts.muted;
    var iso = toISODate(d);
    var isHoy = iso === todayISO();
    var clases = clasesPorDiaSemana();
    var node = tpl('cal-cell');
    node.classList.toggle('is-muted', muted);
    node.classList.toggle('is-hoy', isHoy);
    node.classList.toggle('is-semana', !!opts.semana);
    node.classList.toggle('is-selected', iso === STATE.calSelected);
    if (isHoy) { var badge = el('span', 'cal-hoy-badge'); badge.textContent = 'HOY'; node.appendChild(badge); }
    var numEl = qf(node, 'num'); numEl.textContent = opts.semana ? (DIAS_CORTOS[d.getDay()] + ' ' + d.getDate()) : String(d.getDate());
    numEl.classList.toggle('is-hoy', isHoy && !muted);
    numEl.classList.toggle('is-muted', muted);
    var dow = designDia(d);
    qf(node, 'clases').textContent = (!muted && clases[dow]) ? (clases[dow] + (clases[dow] === 1 ? ' clase' : ' clases')) : '';
    var eventosNode = qf(node, 'eventos');
    if (!muted) {
      eventosDeDia(iso).forEach(function (ev) {
        if (ev.allDay) {
          var bar = el('div', 'cal-event');
          bar.style.background = rgba(PERSONAL_COLOR, .16);
          bar.style.color = PERSONAL_COLOR;
          bar.style.borderLeftColor = PERSONAL_COLOR;
          bar.textContent = ev.label;
          bar.style.cursor = 'pointer';
          bar.addEventListener('click', function (evClick) { evClick.stopPropagation(); if (ev.kind === 'materia') openEvaluacionModal({ editId: ev.item.id }); else openPersonalModal({ editId: ev.item.id }); });
          eventosNode.appendChild(bar);
        } else {
          var row = el('div'); row.style.cssText = 'display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0';
          var dot = el('span'); dot.style.cssText = 'width:7px;height:7px;border-radius:50%;flex:none;background:' + ev.color;
          var lbl = el('span'); lbl.style.cssText = 'font-size:11px;color:var(--c-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
          lbl.textContent = ev.label + (opts.semana && ev.item && ev.item.hora ? ' · ' + ev.item.hora : '');
          row.appendChild(dot); row.appendChild(lbl);
          row.style.cursor = 'pointer';
          row.addEventListener('click', function (evClick) { evClick.stopPropagation(); if (ev.kind === 'materia') openEvaluacionModal({ editId: ev.item.id }); else openPersonalModal({ editId: ev.item.id }); });
          eventosNode.appendChild(row);
        }
      });
    }
    node.addEventListener('click', function () {
      STATE.calSelected = iso;
      renderCalSide();
      document.querySelectorAll('.cal-cell.is-selected').forEach(function (c) { c.classList.remove('is-selected'); });
      node.classList.add('is-selected');
    });
    return node;
  }

  function renderCalendario() {
    document.getElementById('cal-today-label').textContent = 'hoy · ' + DIAS_CORTOS[today().getDay()] + ' ' + today().getDate();
    document.querySelectorAll('#cal-view-toggle [data-cal-view]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-cal-view') === STATE.calViewMode); });

    var weekdaysNode = document.getElementById('cal-weekdays');
    clear(weekdaysNode);
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(function (d) { var s = el('span'); s.textContent = d; weekdaysNode.appendChild(s); });

    var grid = document.getElementById('cal-grid');
    clear(grid);
    grid.classList.toggle('is-semana', STATE.calViewMode === 'semana');

    if (STATE.calViewMode === 'semana') {
      var start = STATE.calWeekStart;
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      var sameMonth = start.getMonth() === end.getMonth();
      var label = sameMonth
        ? (start.getDate() + '–' + end.getDate() + ' de ' + MESES_LARGOS[start.getMonth()] + ' ' + start.getFullYear())
        : (start.getDate() + ' ' + MESES_CORTOS[start.getMonth()] + ' – ' + end.getDate() + ' ' + MESES_CORTOS[end.getMonth()] + ' ' + end.getFullYear());
      document.getElementById('cal-month-label').textContent = label;
      for (var i = 0; i < 7; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        grid.appendChild(buildDayCell(d, { semana: true }));
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
    var claseEntries = [];
    var dow = designDia(d);
    computeMateriasDelActivo().forEach(function (m) {
      (m.bloques || []).forEach(function (b) {
        if (b.dia === dow) claseEntries.push({ chipColor: m.colorId, materiaTxt: m.cod, hora: pad2(b.ini) + ':00 – ' + pad2(b.fin) + ':00', titulo: 'Clase de ' + m.nombre, lugar: m.salon || 'Sin salón asignado', strong: m.strong, sortHora: b.ini });
      });
    });
    var evData = eventosDeDia(iso).map(function (ev) {
      if (ev.kind === 'materia') {
        return { chipColor: ev.materia ? ev.materia.colorId : null, materiaTxt: ev.materia ? ev.materia.cod : '', hora: ev.item.hora || '', titulo: ev.item.titulo, lugar: ev.materia ? (ev.materia.salon || 'Sin salón asignado') : '', strong: ev.color, sortHora: ev.item.hora || '00:00', personal: false, refItem: ev.item };
      }
      return { chipColor: null, materiaTxt: 'Personal', hora: ev.allDay ? 'Todo el día' : (ev.item.hora || ''), titulo: ev.item.titulo, lugar: '', strong: PERSONAL_COLOR, sortHora: ev.allDay ? '00:00' : (ev.item.hora || '00:00'), personal: true, refItem: ev.item };
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
      qf(node, 'hora').textContent = item.hora;
      qf(node, 'titulo').textContent = item.titulo;
      qf(node, 'lugar').textContent = item.lugar;
      if (item.refItem) {
        node.style.cursor = 'pointer';
        node.addEventListener('click', function () { item.personal ? openPersonalModal({ editId: item.refItem.id }) : openEvaluacionModal({ editId: item.refItem.id }); });
      }
      list.appendChild(node);
    });
    document.getElementById('btn-cal-side-add').onclick = function () { openEvaluacionModal({ fecha: iso }); };
  }

  // ================================================================
  // HORARIO
  // ================================================================
  function renderHorario() {
    var dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].concat(STATE.mostrarSabado ? ['Sáb'] : []);
    var horas = []; for (var h = 8; h <= 21; h++) horas.push(h);
    var cols = dias.length;
    document.getElementById('horario-meta').textContent = (horas.length) + ' horas de grilla · 8:00 a 22:00' + (STATE.mostrarSabado ? '' : ' · sábado oculto');
    var grid = document.getElementById('horario-grid');
    clear(grid);
    grid.style.gridTemplateColumns = '58px repeat(' + cols + ',1fr)';
    grid.style.gridTemplateRows = '30px repeat(' + horas.length + ',1fr)';

    var corner = el('div'); corner.style.cssText = 'grid-column:1;grid-row:1'; grid.appendChild(corner);
    dias.forEach(function (dd, i) {
      var lbl = el('div', 'hg-day-label'); lbl.style.gridColumn = (i + 2); lbl.style.gridRow = 1; lbl.textContent = dd;
      grid.appendChild(lbl);
    });
    horas.forEach(function (hh, r) {
      var lbl = el('div', 'hg-hour-label'); lbl.style.gridColumn = 1; lbl.style.gridRow = r + 2; lbl.textContent = pad2(hh) + ':00';
      grid.appendChild(lbl);
      for (var c = 0; c < cols; c++) {
        var cell = el('div', 'hg-cell'); cell.style.gridColumn = c + 2; cell.style.gridRow = r + 2;
        grid.appendChild(cell);
      }
    });

    // Bloques por día, para poder detectar superposiciones (dos materias en el mismo
    // horario) y ubicarlas lado a lado en vez de una encima de la otra.
    var porDia = {};
    computeMateriasDelActivo().forEach(function (m) {
      (m.bloques || []).forEach(function (b) {
        if (b.dia > cols) return;
        (porDia[b.dia] = porDia[b.dia] || []).push({ m: m, ini: b.ini, fin: b.fin });
      });
    });
    Object.keys(porDia).forEach(function (dia) {
      asignarColumnas(porDia[dia]).forEach(function (b) {
        var node = tpl('horario-block');
        node.style.gridColumn = Number(dia) + 1;
        node.style.gridRow = (b.ini - 8 + 2) + ' / span ' + (b.fin - b.ini);
        node.style.background = b.m.soft; node.style.color = b.m.strong;
        node.style.borderColor = rgba(b.m.strong, .35); node.style.borderLeftColor = b.m.strong;
        var anchoPct = 100 / b.cols;
        node.style.width = 'calc(' + anchoPct + '% - 2px)';
        node.style.marginLeft = 'calc(' + (anchoPct * b.slot) + '% + 1px)';
        qf(node, 'nombre').textContent = b.m.nombre;
        qf(node, 'hora').textContent = pad2(b.ini) + ':00–' + pad2(b.fin) + ':00';
        qf(node, 'salon').textContent = (b.m.salon || '').replace('Edificio ', '');
        node.addEventListener('click', function () { location.hash = '#materia-' + b.m.id; });
        grid.appendChild(node);
      });
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
  function openModal(id) { document.getElementById(id).classList.add('is-open'); }
  function closeModalEl(elm) { elm.classList.remove('is-open'); }
  function closeAllModals() { document.querySelectorAll('.modal-backdrop.is-open').forEach(closeModalEl); }
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
      if (!groups[key]) { groups[key] = { dias: {}, inicio: pad2(b.ini) + ':00', fin: pad2(b.fin) + ':00' }; order.push(key); }
      groups[key].dias[b.dia] = true;
    });
    return order.map(function (k) { return groups[k]; });
  }

  function openMateriaModal(id) {
    var editing = !!id;
    var m = editing ? materiaRawById(id) : null;
    STATE.editing = {
      materiaId: id || null,
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
    form.cod.value = m ? m.cod : '';
    form.doc.value = m ? m.doc : '';
    form.creditos.value = m ? m.creditos : '';
    form.salon.value = m ? m.salon : '';
    form.estado.value = m ? m.estado : 'cursando';
    renderModalMateriaSwatches();
    renderModalMateriaHorarioRows();
    renderModalMateriaSistema();
    openModal('modal-materia');
  }

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
      var inicio = qf(node, 'inicio'); inicio.value = row.inicio || '';
      inicio.addEventListener('input', function () { row.inicio = inicio.value; });
      var fin = qf(node, 'fin'); fin.value = row.fin || '';
      fin.addEventListener('input', function () { row.fin = fin.value; });
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

    var escSel = STATE.editing.esc;
    var hint = document.getElementById('modal-materia-hint');
    hint.textContent = tipo === 'nota'
      ? 'La materia se califica de 0 a 12 y aprueba con ' + valU(escSel.aprob, escSel) + '.'
      : 'La materia se califica sobre ' + val(escSel.total, escSel) + uni(escSel) + ' y aprueba con ' + valU(escSel.aprob, escSel) + ' (' + (escSel.total ? Math.round(escSel.aprob / escSel.total * 100) : 0) + '% del total).';
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

  function parseHour(hhmm) { if (!hhmm) return null; return parseInt(hhmm.split(':')[0], 10); }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('form-materia').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var bloques = [];
      STATE.editing.horarioRows.forEach(function (row) {
        var ini = parseHour(row.inicio), fin = parseHour(row.fin);
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
      var record = {
        id: STATE.editing.materiaId || uid(),
        semestreId: semestreId,
        cod: form.cod.value.trim() || autoCod(form.nombre.value),
        nombre: form.nombre.value.trim(),
        doc: form.doc.value.trim(),
        colorId: STATE.editing.colorId,
        creditos: Number(form.creditos.value) || 0,
        salon: form.salon.value.trim(),
        bloques: bloques,
        esc: STATE.editing.esc,
        estado: form.estado.value
      };
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
      closeAllModals();
      renderRoute();
    });
    document.getElementById('btn-materia-eliminar').addEventListener('click', async function () {
      if (!STATE.editing.materiaId) return;
      if (!confirm('¿Eliminar esta materia? También se van a borrar sus evaluaciones de la agenda.')) return;
      var id = STATE.editing.materiaId;
      var okMat = await saveMateriasRaw(loadMateriasRaw().filter(function (m) { return m.id !== id; }));
      var okAg = await saveAgendaRaw(loadAgendaRaw().filter(function (a) { return a.materiaId !== id; }));
      if (!okMat || !okAg) avisarError();
      closeAllModals();
      location.hash = '#materias';
      renderRoute();
    });
  });

  function autoCod(nombre) {
    var letras = (nombre || 'MAT').replace(/[^a-zA-ZÀ-ÿ ]/g, '').split(' ').filter(Boolean).slice(0, 1)[0] || 'MAT';
    return letras.slice(0, 3).toUpperCase() + '-' + (100 + Math.floor(Math.random() * 900));
  }

  // ---- Modal evaluación ----
  function openEvaluacionModal(opts) {
    opts = opts || {};
    if (!computeMaterias().length) { alert('Agregá primero una materia para poder cargar evaluaciones.'); return; }
    var ev = opts.editId ? agendaRawById(opts.editId) : null;
    var tipoEsPreset = ev ? TIPOS_EVAL.indexOf(ev.tipo) >= 0 : true;
    STATE.editing = {
      evaluacionId: opts.editId || null,
      // El selector de materia del modal lista TODAS (cualquier semestre —
      // ver README), pero si hay que elegir un default preferimos una del
      // semestre activo antes que una vieja al azar.
      evalMateriaId: ev ? ev.materiaId : (opts.materiaId || (computeMateriasDelActivo()[0] || computeMaterias()[0]).id),
      evalTipo: ev ? (tipoEsPreset ? ev.tipo : 'Otro') : 'Parcial',
      evalTipoCustom: ev && !tipoEsPreset ? ev.tipo : ''
    };
    document.getElementById('modal-evaluacion-title').textContent = ev ? 'Editar examen o entrega' : 'Nuevo examen o entrega';
    document.getElementById('btn-evaluacion-eliminar').classList.toggle('hidden', !ev);
    var form = document.getElementById('form-evaluacion');
    form.reset();
    form.titulo.value = ev ? ev.titulo : '';
    form.fecha.value = ev ? ev.fecha : (opts.fecha || todayISO());
    form.hora.value = ev ? (ev.hora || '') : '';
    form.hecho.value = ev && ev.hecho ? '1' : '';
    form.nota.value = ev && ev.nota != null ? ev.nota : '';
    form.notas.value = ev ? (ev.notas || '') : '';
    renderModalEvalMaterias();
    renderModalEvalTipos();
    openModal('modal-evaluacion');
  }

  function renderModalEvalMaterias() {
    var wrap = document.getElementById('modal-eval-materias');
    clear(wrap);
    computeMaterias().forEach(function (m) {
      var node = tpl('chip-materia');
      var on = STATE.editing.evalMateriaId === m.id;
      var chip = qf(node, 'chip');
      chip.textContent = m.cod + ' · ' + truncate(m.nombre, 18);
      chip.classList.toggle('is-on', on);
      chip.style.background = on ? m.soft : '';
      chip.style.color = on ? m.strong : '';
      chip.style.borderColor = on ? m.strong : '';
      chip.addEventListener('click', function () { STATE.editing.evalMateriaId = m.id; renderModalEvalMaterias(); });
      wrap.appendChild(node);
    });
    var m = computeMateriaById(STATE.editing.evalMateriaId);
    var unidad = m ? (m.esc.tipo === 'nota' ? 'notas 0–12' : (m.esc.tipo === 'pct' ? '%' : 'pts')) : '';
    document.getElementById('modal-eval-nota-label').textContent = 'Nota obtenida (' + unidad + ', opcional)';
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

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('form-evaluacion').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var tipoFinal = STATE.editing.evalTipo === 'Otro' ? (STATE.editing.evalTipoCustom.trim() || 'Otro') : STATE.editing.evalTipo;
      var record = {
        id: STATE.editing.evaluacionId || uid(),
        materiaId: STATE.editing.evalMateriaId,
        tipo: tipoFinal,
        titulo: form.titulo.value.trim(),
        fecha: form.fecha.value,
        hora: form.hora.value,
        hecho: form.hecho.value === '1',
        nota: form.nota.value === '' ? null : Number(form.nota.value),
        notas: form.notas.value.trim()
      };
      var arr = loadAgendaRaw();
      if (STATE.editing.evaluacionId) arr = arr.map(function (a) { return a.id === record.id ? record : a; });
      else arr.push(record);
      var btn = form.querySelector('button[type="submit"]');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await saveAgendaRaw(arr);
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      closeAllModals();
      renderRoute();
    });
    document.getElementById('btn-evaluacion-eliminar').addEventListener('click', async function () {
      if (!STATE.editing.evaluacionId) return;
      if (!confirm('¿Eliminar esta evaluación?')) return;
      var id = STATE.editing.evaluacionId;
      var ok = await saveAgendaRaw(loadAgendaRaw().filter(function (a) { return a.id !== id; }));
      if (!ok) avisarError();
      closeAllModals();
      renderRoute();
    });
  });

  // ---- Modal personal ----
  function openPersonalModal(opts) {
    opts = opts || {};
    var p = opts.editId ? personalRawById(opts.editId) : null;
    STATE.editing = { personalId: opts.editId || null, todoElDia: p ? !!p.todoElDia : false };
    document.getElementById('btn-personal-eliminar').classList.toggle('hidden', !p);
    var form = document.getElementById('form-personal');
    form.reset();
    form.titulo.value = p ? p.titulo : '';
    form.fecha.value = p ? p.fecha : (opts.fecha || todayISO());
    form.hora.value = p ? (p.hora || '') : '';
    renderPersonalToggle();
    openModal('modal-personal');
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
        todoElDia: !!STATE.editing.todoElDia
      };
      var arr = loadPersonalRaw();
      if (STATE.editing.personalId) arr = arr.map(function (p) { return p.id === record.id ? record : p; });
      else arr.push(record);
      var btn = form.querySelector('button[type="submit"]');
      setBtnBusy(btn, true, 'Guardando…');
      var ok = await savePersonalRaw(arr);
      setBtnBusy(btn, false);
      if (!ok) { avisarError(); return; }
      closeAllModals();
      renderRoute();
    });
    document.getElementById('btn-personal-eliminar').addEventListener('click', async function () {
      if (!STATE.editing.personalId) return;
      if (!confirm('¿Eliminar este evento?')) return;
      var id = STATE.editing.personalId;
      var ok = await savePersonalRaw(loadPersonalRaw().filter(function (p) { return p.id !== id; }));
      if (!ok) avisarError();
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
      var chip = el('span'); chip.setAttribute('style', chipStyle(m.colorId)); chip.textContent = m.cod;
      var meta = el('span', 'mono'); meta.style.cssText = 'font-size:11px;color:var(--c-ink3)'; meta.textContent = m.creditos + ' créditos';
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
  // THEME
  // ================================================================
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-theme-btn') === mode); });
    try { localStorage.setItem('cursada:theme', mode); } catch (e) {}
    renderRoute();
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('cursada:theme'); } catch (e) {}
    applyTheme(saved === 'oscuro' ? 'oscuro' : 'claro');
  }

  // ================================================================
  // ROUTER
  // ================================================================
  var CORE_VIEWS = ['inicio', 'materias', 'detalle', 'agenda', 'calendario', 'horario'];
  function renderRoute() {
    renderSidenav();
    CORE_VIEWS.forEach(function (id) { document.getElementById(id).classList.toggle('hidden', STATE.route.view !== id); });
    if (STATE.route.view === 'inicio') renderInicio();
    else if (STATE.route.view === 'materias') renderMaterias();
    else if (STATE.route.view === 'detalle') renderDetalle(STATE.route.materiaId);
    else if (STATE.route.view === 'agenda') renderAgenda();
    else if (STATE.route.view === 'calendario') renderCalendario();
    else if (STATE.route.view === 'horario') renderHorario();
  }
  function handleRoute() {
    var hash = location.hash || '#inicio';
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
    loadSemestresRaw().forEach(function (s) {
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
      var editBtn = qf(node, 'editBtn');
      editBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        iniciarRenombreSemestre(node, s);
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
    arr.push({ id: uid(), nombre: nombre, activo: true });
    var btn = document.getElementById('btn-crear-semestre');
    setBtnBusy(btn, true, 'Creando…');
    var ok = await saveSemestresRaw(arr);
    setBtnBusy(btn, false);
    if (!ok) { avisarError(); return; }
    document.getElementById('input-nuevo-semestre').value = '';
    closeAllModals();
    renderRoute();
  }

  function bindGlobalUI() {
    document.getElementById('btn-menu').addEventListener('click', openMobileNav);
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAllModals(); closeMobileNav(); } });

    document.getElementById('btn-semestre-switcher').addEventListener('click', function () {
      renderSemestresModal();
      // Placeholder, no value: sugerimos un nombre pero no lo dejamos
      // pre-cargado — si el input quedara con un valor real, tocar "Crear"
      // sin querer (p. ej. para simplemente ver la lista) crearía un
      // semestre de más.
      document.getElementById('input-nuevo-semestre').placeholder = sugerirNombreSemestre();
      openModal('modal-semestres');
    });
    document.getElementById('btn-crear-semestre').addEventListener('click', function () { crearSemestre(document.getElementById('input-nuevo-semestre').value); });
    document.getElementById('input-nuevo-semestre').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); crearSemestre(ev.target.value); } });

    document.getElementById('btn-inicio-nuevo').addEventListener('click', function () { openMateriaModal(null); });
    document.getElementById('inicio-search').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = e.target.value.trim();
      if (!q) return;
      var ql = q.toLowerCase();
      // materiaHits se busca acotado al semestre activo porque el destino
      // ambiguo (#materias) también lo está; agendaHits se busca sin acotar
      // porque su destino (#agenda) tampoco se acota por semestre — ver
      // README, sección Semestres.
      var materiaHits = computeMateriasDelActivo().filter(function (m) { return (m.nombre + ' ' + m.cod + ' ' + m.doc).toLowerCase().indexOf(ql) >= 0; });
      var agendaHits = loadAgendaRaw().filter(function (a) { return (a.titulo + ' ' + (a.materiaId ? materiaCod(a.materiaId) : '')).toLowerCase().indexOf(ql) >= 0; });
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
    document.getElementById('btn-agenda-nuevo').addEventListener('click', function () { openEvaluacionModal({}); });
    document.getElementById('agenda-search').addEventListener('input', function (e) { STATE.agendaQuery = e.target.value; renderAgenda(); });
    document.getElementById('btn-cal-evento').addEventListener('click', function () { openPersonalModal({ fecha: STATE.calSelected }); });
    document.getElementById('btn-horario-editar').addEventListener('click', function () { openMateriaModal(null); });
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
          alert('No se pudo importar el archivo: formato inválido.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    document.getElementById('btn-borrar-todo').addEventListener('click', async function () {
      if (!confirm('¿Borrar todas tus materias, entregas y eventos personales? Esta acción no se puede deshacer.')) return;
      var okMat = await saveMateriasRaw([]);
      var okAg = await saveAgendaRaw([]);
      var okPer = await savePersonalRaw([]);
      if (!okMat || !okAg || !okPer) avisarError();
      location.hash = '#materias';
      renderRoute();
    });
    document.getElementById('btn-imprimir').addEventListener('click', function () { window.print(); });
  }

  // ================================================================
  // AUTENTICACIÓN
  // ================================================================
  var AUTH_MODE = 'signin'; // 'signin' | 'signup'

  // Controla qué pantalla de nivel superior se ve: 'gate-loading' (cargando
  // sesión o datos), 'auth-screen' (sin sesión), 'gate-error' (falló la carga
  // de datos) — o null para mostrar #app (ya con sesión y datos listos).
  function setGate(id) {
    ['gate-loading', 'auth-screen', 'gate-error'].forEach(function (x) {
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
    return msg || 'No se pudo completar la operación. Revisá tu conexión a internet.';
  }

  function setAuthMode(mode) {
    AUTH_MODE = mode;
    document.querySelectorAll('#auth-mode-toggle [data-auth-mode]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-auth-mode') === mode); });
    document.getElementById('auth-submit').textContent = mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión';
    showAuthError(''); showAuthInfo('');
  }
  function showAuthError(msg) {
    var e = document.getElementById('auth-error');
    if (msg) document.getElementById('auth-info').classList.add('hidden');
    e.textContent = msg || ''; e.classList.toggle('hidden', !msg);
  }
  function showAuthInfo(msg) {
    var i = document.getElementById('auth-info');
    if (msg) document.getElementById('auth-error').classList.add('hidden');
    i.textContent = msg || ''; i.classList.toggle('hidden', !msg);
  }

  function bindAuthUI() {
    document.querySelectorAll('#auth-mode-toggle [data-auth-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setAuthMode(b.getAttribute('data-auth-mode')); });
    });
    document.getElementById('form-auth').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var email = form.email.value.trim();
      var password = form.password.value;
      showAuthError(''); showAuthInfo('');
      var btn = document.getElementById('auth-submit');
      setBtnBusy(btn, true, AUTH_MODE === 'signup' ? 'Creando cuenta…' : 'Entrando…');
      try {
        var res = AUTH_MODE === 'signup'
          ? await sb().auth.signUp({ email: email, password: password })
          : await sb().auth.signInWithPassword({ email: email, password: password });
        if (res.error) throw res.error;
        if (AUTH_MODE === 'signup' && res.data && !res.data.session) {
          // El proyecto tiene confirmación de email activada: no hay sesión
          // todavía hasta que confirme el mail — no intentamos arrancar la app.
          showAuthInfo('Te mandamos un mail para confirmar tu cuenta. Confirmalo y después iniciá sesión.');
          setAuthMode('signin');
        }
        // Si sí hay sesión, el listener de onAuthStateChange (SIGNED_IN) es
        // el que dispara la carga de datos y muestra la app.
      } catch (e) {
        showAuthError(traducirErrorAuth(e));
      } finally {
        setBtnBusy(btn, false);
      }
    });
  }

  // ================================================================
  // PERFIL
  // ================================================================
  function openPerfilModal() {
    document.getElementById('form-perfil').nombre.value = (CURRENT_PROFILE && CURRENT_PROFILE.nombre) || '';
    document.getElementById('perfil-email').textContent = CURRENT_USER ? CURRENT_USER.email : '';
    renderAvatarInto(document.getElementById('modal-perfil-avatar'), 72);
    openModal('modal-perfil');
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
      if (ev.target.closest('#btn-logout')) return;
      openPerfilModal();
    });
    document.getElementById('btn-logout').addEventListener('click', async function (ev) {
      ev.stopPropagation();
      if (!confirm('¿Cerrar sesión?')) return;
      await sb().auth.signOut();
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
      var nombre = ev.target.nombre.value.trim();
      var btn = document.getElementById('btn-perfil-guardar');
      setBtnBusy(btn, true, 'Guardando…');
      try {
        var res = await sb().from('profiles').upsert({ id: CURRENT_USER.id, nombre: nombre });
        if (res.error) throw res.error;
        CURRENT_PROFILE = Object.assign({}, CURRENT_PROFILE, { id: CURRENT_USER.id, nombre: nombre });
        closeAllModals();
        renderSidenavUser();
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
  function maybeOfrecerImportLocal() {
    if (importLocalYaResuelto()) return;
    var legacy = readLegacyLocalData();
    if (!legacy) { marcarImportLocalResuelto(); return; }
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
    btnNo.onclick = function () { marcarImportLocalResuelto(); closeAllModals(); };
    openModal('modal-importar-local');
  }

  // ================================================================
  // INIT / SESIÓN
  // ================================================================
  async function onSignedIn(user) {
    CURRENT_USER = user;
    setGateLoadingText('Cargando tus datos…');
    setGate('gate-loading');
    try {
      await loadAllFromSupabase();
      await ensureSemestresServerSide();
    } catch (e) {
      console.warn('Cursada: error cargando datos de la cuenta', e);
      setGate('gate-error');
      return;
    }
    setGate(null);
    renderSidenavUser();
    handleRoute();
    if (!CACHE.materias.length) showOnboarding();
    maybeOfrecerImportLocal();
  }

  function onSignedOut() {
    CURRENT_USER = null; CURRENT_PROFILE = null;
    CACHE.semestres = []; CACHE.materias = []; CACHE.agenda = []; CACHE.personal = [];
    setAuthMode('signin');
    setGate('auth-screen');
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    bindGlobalUI();
    bindAuthUI();
    bindProfileUI();
    document.getElementById('btn-gate-retry').addEventListener('click', function () {
      if (CURRENT_USER) onSignedIn(CURRENT_USER); else location.reload();
    });
    window.addEventListener('hashchange', handleRoute);

    sb().auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT') { onSignedOut(); }
      else if (session && session.user && (!CURRENT_USER || CURRENT_USER.id !== session.user.id)) { onSignedIn(session.user); }
    });

    setGateLoadingText('Cargando sesión…');
    setGate('gate-loading');
    sb().auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) { setAuthMode('signin'); setGate('auth-screen'); }
      // Si hay sesión, el evento inicial de onAuthStateChange se encarga.
    });
  });
})();
