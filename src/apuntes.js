/*
 * Cursada — Cuadernos de apuntes (pestaña "Apuntes" del detalle de materia).
 *
 * Vive en su propio archivo (concatenado antes de runtime.js por
 * build/build-app.mjs) en vez de sumar otras ~1000 líneas a runtime.js. No
 * puede ver las variables privadas del IIFE de runtime.js, así que expone una
 * fábrica — `window.CursadaApuntes(ctx)` — que runtime.js llama una vez con
 * los helpers que necesita (cliente de Supabase, usuario actual, manejo de
 * sesión vencida). Devuelve la API que usa runtime.js:
 *
 *   mostrar(panel, materiaId, apunteId)   pestaña Apuntes (lista o editor)
 *   salir()                               se fue de la pestaña: guarda y desmonta
 *   borrarArchivosDeMaterias(ids)         Storage, antes de borrar materias
 *   renderUso(el)                         indicador de almacenamiento (Ajustes)
 *   reset()                               cierre de sesión
 *
 * Esquema, rutas del bucket y formato de contenido: docs/apuntes-backend.md.
 * El editor (Tiptap) es un bundle aparte, out/apuntes-editor.js, que se
 * carga recién la primera vez que se abre una nota.
 */
(function () {
  'use strict';

  var BUCKET = 'apuntes';
  // Espejo del file_size_limit del bucket (20 MB) — el bucket es quien manda;
  // esto es sólo para avisar antes de subir. La cuota total NO se repite acá:
  // sale de uso_almacenamiento() (constante única en apuntes_cuota_bytes()).
  var MAX_ARCHIVO_BYTES = 20 * 1024 * 1024;
  var AUTOGUARDADO_MS = 1500;
  var REINTENTO_MIN_MS = 2000, REINTENTO_MAX_MS = 30000;
  var EDITOR_SRC = 'apuntes-editor.js';

  var MIME_POR_EXT = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    heic: 'image/heic', heif: 'image/heif',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  var MIMES_PERMITIDOS = {};
  Object.keys(MIME_POR_EXT).forEach(function (k) { MIMES_PERMITIDOS[MIME_POR_EXT[k]] = k; });
  var ACCEPT = Object.keys(MIME_POR_EXT).map(function (e) { return '.' + e; }).join(',') + ',' + Object.keys(MIMES_PERMITIDOS).join(',');

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

  var SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var ICO = {
    nota: '<svg ' + SVG + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
    pdf: '<svg ' + SVG + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    imagen: '<svg ' + SVG + '><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    office: '<svg ' + SVG + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="11" x2="12" y2="18"/></svg>',
    subir: '<svg ' + SVG + '><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    lapiz: '<svg ' + SVG + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    tacho: '<svg ' + SVG + '><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    arriba: '<svg ' + SVG + '><polyline points="18 15 12 9 6 15"/></svg>',
    abajo: '<svg ' + SVG + '><polyline points="6 9 12 15 18 9"/></svg>',
    atras: '<svg ' + SVG + '><polyline points="15 18 9 12 15 6"/></svg>',
    cerrar: '<svg ' + SVG + '><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    descargar: '<svg ' + SVG + '><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    externo: '<svg ' + SVG + '><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    // toolbar
    bold: '<svg ' + SVG + ' stroke-width="2.4"><path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/></svg>',
    italic: '<svg ' + SVG + '><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
    underline: '<svg ' + SVG + '><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
    bulletList: '<svg ' + SVG + '><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    orderedList: '<svg ' + SVG + '><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
    taskList: '<svg ' + SVG + '><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="17" x2="21" y2="17"/></svg>',
    blockquote: '<svg ' + SVG + '><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    codeBlock: '<svg ' + SVG + '><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    link: '<svg ' + SVG + '><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    table: '<svg ' + SVG + '><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>'
  };

  // ---------- utilidades puras ----------
  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toLocaleString('es-UY', { maximumFractionDigits: 0 }) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toLocaleString('es-UY', { maximumFractionDigits: n < 10 * 1024 * 1024 ? 1 : 0 }) + ' MB';
    return (n / (1024 * 1024 * 1024)).toLocaleString('es-UY', { maximumFractionDigits: 2 }) + ' GB';
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtFecha(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var dia = new Date(d); dia.setHours(0, 0, 0, 0);
    var diff = Math.round((hoy - dia) / 86400000);
    var hora = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    if (diff === 0) return 'hoy ' + hora;
    if (diff === 1) return 'ayer ' + hora;
    return d.getDate() + ' ' + MESES[d.getMonth()] + (d.getFullYear() !== hoy.getFullYear() ? ' ' + d.getFullYear() : '');
  }
  function extension(nombre) {
    var m = /\.([A-Za-z0-9]{1,8})$/.exec(nombre || '');
    return m ? m[1].toLowerCase() : '';
  }
  function sinExtension(nombre) { return (nombre || '').replace(/\.[A-Za-z0-9]{1,8}$/, ''); }
  // {uuid}-{nombre_original_saneado}: ASCII, sin espacios ni barras, ≤ 100
  // caracteres, extensión en minúscula. El nombre "bonito" vive en
  // apuntes.titulo — el de la ruta sólo tiene que ser estable y seguro.
  function sanearNombre(nombre) {
    var ext = extension(nombre);
    var base = sinExtension(nombre || '');
    try { base = base.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    base = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
    if (!base) base = 'archivo';
    base = base.slice(0, 100 - (ext ? ext.length + 1 : 0));
    return base + (ext ? '.' + ext : '');
  }
  function uuid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function detectarMime(file) {
    if (file.type && MIMES_PERMITIDOS[file.type]) return file.type;
    // HEIC (y a veces docx/xlsx) llega con type vacío u octet-stream según
    // el navegador/SO — se cae a la extensión.
    return MIME_POR_EXT[extension(file.name)] || null;
  }
  function claseArchivo(mime) {
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
    if (/^image\//.test(mime || '')) return 'imagen';
    return 'office';
  }
  var ETIQUETA_TIPO = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/heic': 'HEIC', 'image/heif': 'HEIF' };
  function etiquetaTipo(a) {
    if (a.tipo === 'nota') return 'Nota';
    return ETIQUETA_TIPO[a.mime_type] || (MIMES_PERMITIDOS[a.mime_type] || 'Archivo').toUpperCase();
  }
  // Safari (macOS/iOS) decodifica HEIC nativo; Chrome/Firefox/Edge no.
  function navegadorMuestraHeic() {
    var ua = navigator.userAgent || '';
    return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|Edg\/|Firefox\/|FxiOS\//.test(ua);
  }
  function docVacio(json) {
    if (!json || !Array.isArray(json.content) || json.content.length === 0) return true;
    if (json.content.length > 1) return false;
    var n = json.content[0];
    return n.type === 'paragraph' && (!n.content || n.content.length === 0);
  }
  var DOC_VACIO = { type: 'doc', content: [{ type: 'paragraph' }] };

  // ---------- carga diferida del bundle del editor ----------
  var editorBundlePromise = null;
  function cargarEditorBundle() {
    if (window.CursadaEditor) return Promise.resolve(window.CursadaEditor);
    if (editorBundlePromise) return editorBundlePromise;
    editorBundlePromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = EDITOR_SRC;
      s.async = true;
      s.onload = function () { window.CursadaEditor ? resolve(window.CursadaEditor) : reject(new Error('bundle sin CursadaEditor')); };
      s.onerror = function () { editorBundlePromise = null; s.remove(); reject(new Error('No se pudo cargar el editor')); };
      document.head.appendChild(s);
    });
    return editorBundlePromise;
  }

  window.CursadaApuntes = function (ctx) {
    function sb() { return ctx.sb(); }
    function uid() { var u = ctx.getUser(); return u && u.id; }
    var el = ctx.el, clear = ctx.clear;

    function texto(tag, cls, t) { var n = el(tag, cls); n.textContent = t; return n; }
    function boton(cls, label, icono, attrs) {
      var b = el('button', cls); b.type = 'button';
      if (icono) b.insertAdjacentHTML('beforeend', ICO[icono]);
      if (label) b.appendChild(texto('span', null, label));
      Object.keys(attrs || {}).forEach(function (k) { b.setAttribute(k, attrs[k]); });
      return b;
    }
    // Errores de sesión vencida → la pantalla dedicada de runtime.js; el resto
    // los maneja quien llama (cada uno con su propio mensaje en contexto).
    function esSesionVencida(err) {
      if (err && ctx.esErrorSesionVencida(err)) { ctx.mostrarSesionVencida(); return true; }
      return false;
    }
    function hashLista(materiaId) { return '#materia-' + encodeURIComponent(materiaId) + '/apuntes'; }
    function hashNota(materiaId, id) { return hashLista(materiaId) + '/' + encodeURIComponent(id); }

    // ================================================================
    // Estado
    // ================================================================
    var S = {
      panel: null, materiaId: null, apunteId: null, montado: false,
      cuadernos: {},        // materiaId -> fila de cuadernos
      apuntes: [],          // filas (sin contenido) del cuaderno actual
      estado: 'idle',       // idle | cargando | listo | error
      uploads: [],          // { id, nombre, progreso (0-1 | null), error }
      rechazos: [],         // { nombre, motivo }
      uso: null,            // { usado, cuota }
      renombrando: null,    // id del apunte en edición inline de título
      orden: leerPreferenciaOrden()
    };
    var E = null; // editor abierto (ver abrirEditor)
    // Notas que se cerraron con cambios todavía sin confirmar por el servidor:
    // id -> { payload, delay, timer }. Se siguen reintentando en segundo plano
    // y, si se vuelve a abrir la nota, se usa este contenido (no el viejo).
    var PENDIENTES = {};

    function claveOrden() { return 'cursada:apuntes-orden:' + (uid() || ''); }
    function leerPreferenciaOrden() { try { return localStorage.getItem('cursada:apuntes-orden:' + ((ctx.getUser() || {}).id || '')) === 'manual' ? 'manual' : 'recientes'; } catch (e) { return 'recientes'; } }
    function guardarPreferenciaOrden() { try { localStorage.setItem(claveOrden(), S.orden); } catch (e) {} }
    function claveBorrador(id) { return 'cursada:apunte-borrador:' + (uid() || '') + ':' + id; }
    function escribirBorrador(id, payload) { try { localStorage.setItem(claveBorrador(id), JSON.stringify({ payload: payload, ts: Date.now() })); } catch (e) {} }
    function leerBorrador(id) { try { var v = localStorage.getItem(claveBorrador(id)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
    function borrarBorrador(id) { try { localStorage.removeItem(claveBorrador(id)); } catch (e) {} }

    // ================================================================
    // Datos
    // ================================================================
    async function obtenerCuaderno(materiaId) {
      if (S.cuadernos[materiaId]) return S.cuadernos[materiaId];
      var r = await sb().rpc('obtener_cuaderno_default', { p_materia_id: materiaId });
      if (r.error) throw r.error;
      var c = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!c || !c.id) throw new Error('No se pudo crear el cuaderno');
      S.cuadernos[materiaId] = c;
      return c;
    }
    async function cargarApuntes(cuadernoId) {
      var r = await sb().from('apuntes')
        .select('id,cuaderno_id,tipo,titulo,contenido_texto,storage_path,mime_type,tamano_bytes,orden,created_at,updated_at')
        .eq('cuaderno_id', cuadernoId);
      if (r.error) throw r.error;
      return r.data || [];
    }
    async function cargarUso() {
      var r = await sb().rpc('uso_almacenamiento');
      if (r.error) throw r.error;
      var d = Array.isArray(r.data) ? r.data[0] : r.data;
      if (typeof d === 'string') d = JSON.parse(d);
      S.uso = { usado: Number(d.usado) || 0, cuota: Number(d.cuota) || 0 };
      return S.uso;
    }

    function ordenados() {
      var arr = S.apuntes.slice();
      if (S.orden === 'manual') {
        arr.sort(function (a, b) {
          // Sin orden (recién creados) arriba, después por orden manual.
          var ao = a.orden == null ? -Infinity : a.orden, bo = b.orden == null ? -Infinity : b.orden;
          if (ao !== bo) return ao - bo;
          return String(b.updated_at).localeCompare(String(a.updated_at));
        });
      } else {
        arr.sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); });
      }
      return arr;
    }

    // ================================================================
    // Entrada / salida
    // ================================================================
    function mostrar(panel, materiaId, apunteId) {
      apunteId = apunteId || null;
      if (S.montado && S.panel === panel && S.materiaId === materiaId && S.apunteId === apunteId) return;
      var cambioMateria = S.materiaId !== materiaId;
      cerrarEditor();
      S.panel = panel; S.materiaId = materiaId; S.apunteId = apunteId; S.montado = true;
      if (cambioMateria) { S.apuntes = []; S.rechazos = []; S.renombrando = null; }
      if (apunteId) abrirEditor(apunteId);
      else abrirLista();
    }
    function salir() {
      cerrarEditor();
      cerrarVisor();
      S.montado = false; S.apunteId = null; S.renombrando = null;
    }
    // Cierre de sesión: no se intenta guardar contra el servidor (ya no hay
    // sesión y un 401 dispararía la pantalla de "sesión vencida" encima de
    // un logout deliberado) — lo pendiente queda como borrador local y se
    // recupera al volver a abrir la nota con la misma cuenta.
    function reset() {
      if (E) {
        var cur = E;
        E = null;
        clearTimeout(cur.timer); clearTimeout(cur.retryTimer);
        if (cur.version !== cur.guardada || cur.guardando) escribirBorrador(cur.id, payloadActual(cur));
        try { cur.editor.destroy(); } catch (e) {}
      }
      salir();
      Object.keys(PENDIENTES).forEach(function (id) { clearTimeout(PENDIENTES[id].timer); });
      PENDIENTES = {};
      S.cuadernos = {}; S.apuntes = []; S.uso = null; S.materiaId = null; S.panel = null;
      S.orden = leerPreferenciaOrden();
    }

    // ================================================================
    // Lista
    // ================================================================
    async function abrirLista() {
      S.estado = S.apuntes.length ? 'listo' : 'cargando';
      renderLista();
      var materiaId = S.materiaId;
      try {
        var c = await obtenerCuaderno(materiaId);
        var filas = await cargarApuntes(c.id);
        if (S.materiaId !== materiaId) return;
        // Lo que todavía no llegó al servidor manda sobre lo que devolvió.
        S.apuntes = filas;
        Object.keys(PENDIENTES).forEach(function (id) { actualizarFilaLocal(id, PENDIENTES[id].payload); });
        S.estado = 'listo';
      } catch (err) {
        if (esSesionVencida(err)) return;
        if (S.materiaId !== materiaId) return;
        S.estado = 'error';
      }
      if (S.montado && !S.apunteId) renderLista();
      cargarUso().then(function () { if (S.montado && !S.apunteId) renderUsoPie(); }, function () {});
    }

    function renderLista() {
      var panel = S.panel;
      if (!panel) return;
      clear(panel);
      var card = el('section', 'card apuntes-card');
      card.setAttribute('aria-label', 'Apuntes');

      // Encabezado
      var head = el('div', 'apuntes-head');
      head.appendChild(texto('h2', 'panel-title', 'Apuntes'));
      var acciones = el('div', 'apuntes-head-actions');
      if (S.apuntes.length > 1) {
        var seg = el('div', 'seg apuntes-orden');
        seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Orden');
        [['recientes', 'Recientes'], ['manual', 'Manual']].forEach(function (o) {
          var b = boton('seg-item' + (S.orden === o[0] ? ' is-on' : ''), o[1], null, { 'aria-pressed': S.orden === o[0] ? 'true' : 'false' });
          b.addEventListener('click', function () { S.orden = o[0]; guardarPreferenciaOrden(); renderLista(); });
          seg.appendChild(b);
        });
        acciones.appendChild(seg);
      }
      var input = el('input', 'file-input-hidden');
      input.type = 'file'; input.multiple = true; input.accept = ACCEPT;
      input.addEventListener('change', function () { var f = Array.prototype.slice.call(input.files || []); input.value = ''; if (f.length) subirArchivos(f); });
      var bSubir = boton('btn', 'Subir archivo', 'subir');
      bSubir.addEventListener('click', function () { input.click(); });
      var bNota = boton('btn btn-primary', '+ Nueva nota');
      bNota.addEventListener('click', function () { crearNota(bNota); });
      acciones.appendChild(input); acciones.appendChild(bSubir); acciones.appendChild(bNota);
      head.appendChild(acciones);
      card.appendChild(head);

      // Notas con cambios que todavía no llegaron al servidor
      var pendientesAqui = Object.keys(PENDIENTES).filter(function (id) { return S.apuntes.some(function (a) { return a.id === id; }); });
      if (pendientesAqui.length) {
        var avisoP = el('div', 'apuntes-aviso is-warning');
        avisoP.setAttribute('role', 'status');
        avisoP.appendChild(texto('span', null, pendientesAqui.length === 1 ? 'Una nota tiene cambios que todavía no se guardaron. Reintentando…' : pendientesAqui.length + ' notas tienen cambios que todavía no se guardaron. Reintentando…'));
        var bR = boton('btn btn-sm', 'Reintentar ahora');
        bR.addEventListener('click', function () { pendientesAqui.forEach(function (id) { guardarPendiente(id, true); }); });
        avisoP.appendChild(bR);
        card.appendChild(avisoP);
      }

      // Archivos rechazados en la última subida
      if (S.rechazos.length) {
        var avisoR = el('div', 'apuntes-aviso is-danger');
        avisoR.setAttribute('role', 'alert');
        var ul = el('ul', 'apuntes-aviso-lista');
        S.rechazos.forEach(function (r) {
          var li = el('li'); li.appendChild(texto('b', null, r.nombre)); li.appendChild(document.createTextNode(' — ' + r.motivo)); ul.appendChild(li);
        });
        avisoR.appendChild(ul);
        var bX = boton('icon-btn apuntes-aviso-cerrar', null, 'cerrar', { 'aria-label': 'Cerrar aviso' });
        bX.addEventListener('click', function () { S.rechazos = []; renderLista(); });
        avisoR.appendChild(bX);
        card.appendChild(avisoR);
      }

      // Subidas en curso
      if (S.uploads.length) {
        var ups = el('ul', 'apuntes-uploads');
        ups.setAttribute('aria-live', 'polite');
        S.uploads.forEach(function (u) {
          var li = el('li', 'apuntes-upload' + (u.error ? ' is-error' : ''));
          li.appendChild(texto('span', 'apuntes-upload-nombre', u.nombre));
          var est = u.error ? u.error : (u.progreso == null ? 'Subiendo…' : 'Subiendo… ' + Math.round(u.progreso * 100) + '%');
          li.appendChild(texto('span', 'apuntes-upload-estado', est));
          var bar = el('div', 'apuntes-bar' + (u.progreso == null && !u.error ? ' is-indeterminate' : ''));
          bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Subiendo ' + u.nombre);
          if (u.progreso != null) bar.setAttribute('aria-valuenow', String(Math.round(u.progreso * 100)));
          var fill = el('span'); fill.style.width = (u.progreso == null ? 30 : Math.round(u.progreso * 100)) + '%';
          bar.appendChild(fill); li.appendChild(bar);
          ups.appendChild(li);
        });
        card.appendChild(ups);
      }

      // Cuerpo
      if (S.estado === 'cargando') {
        var sk = el('ul', 'apuntes-list is-loading');
        sk.setAttribute('aria-busy', 'true'); sk.setAttribute('aria-label', 'Cargando apuntes');
        for (var i = 0; i < 3; i++) { var li0 = el('li', 'apunte-row apunte-row-skeleton'); li0.appendChild(el('span', 'sk sk-ico')); var c0 = el('span', 'sk-col'); c0.appendChild(el('span', 'sk sk-t')); c0.appendChild(el('span', 'sk sk-m')); li0.appendChild(c0); sk.appendChild(li0); }
        card.appendChild(sk);
      } else if (S.estado === 'error') {
        var er = el('div', 'apuntes-vacio');
        er.appendChild(texto('p', 'apuntes-vacio-t', 'No pudimos cargar tus apuntes'));
        er.appendChild(texto('p', 'apuntes-vacio-s', 'Revisá tu conexión a internet e intentá de nuevo.'));
        var bRe = boton('btn', 'Reintentar');
        bRe.addEventListener('click', function () { abrirLista(); });
        er.appendChild(bRe);
        card.appendChild(er);
      } else if (!S.apuntes.length) {
        var v = el('div', 'apuntes-vacio');
        v.insertAdjacentHTML('beforeend', '<span class="apuntes-vacio-ico">' + ICO.nota + '</span>');
        v.appendChild(texto('p', 'apuntes-vacio-t', 'Todavía no tenés apuntes en esta materia'));
        v.appendChild(texto('p', 'apuntes-vacio-s', 'Escribí una nota o subí PDFs, fotos y documentos. También podés arrastrarlos acá.'));
        card.appendChild(v);
      } else {
        var list = el('ul', 'apuntes-list');
        var arr = ordenados();
        arr.forEach(function (a, idx) { list.appendChild(renderFila(a, idx, arr)); });
        card.appendChild(list);
      }

      // Pie: uso de almacenamiento
      var pie = el('div', 'apuntes-pie');
      pie.id = 'apuntes-uso-pie';
      card.appendChild(pie);

      // Drag & drop sobre toda la tarjeta
      var overlay = el('div', 'apuntes-drop');
      overlay.insertAdjacentHTML('beforeend', ICO.subir);
      overlay.appendChild(texto('span', null, 'Soltá para subir'));
      card.appendChild(overlay);
      var dragDepth = 0;
      card.addEventListener('dragenter', function (e) { if (!tieneArchivos(e)) return; e.preventDefault(); dragDepth++; card.classList.add('is-dragover'); });
      card.addEventListener('dragover', function (e) { if (!tieneArchivos(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      card.addEventListener('dragleave', function () { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) card.classList.remove('is-dragover'); });
      card.addEventListener('drop', function (e) {
        if (!tieneArchivos(e)) return;
        e.preventDefault(); dragDepth = 0; card.classList.remove('is-dragover');
        var files = Array.prototype.slice.call(e.dataTransfer.files || []);
        if (files.length) subirArchivos(files);
      });

      panel.appendChild(card);
      renderUsoPie();
    }
    function tieneArchivos(e) {
      var t = e.dataTransfer && e.dataTransfer.types;
      return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0;
    }

    function renderFila(a, idx, arr) {
      var li = el('li', 'apunte-row');
      var clase = a.tipo === 'nota' ? 'nota' : claseArchivo(a.mime_type);
      var ico = el('span', 'apunte-ico is-' + clase);
      ico.innerHTML = ICO[clase === 'heic' ? 'imagen' : clase];
      li.appendChild(ico);

      var main = el('div', 'apunte-main');
      if (S.renombrando === a.id) {
        var inp = el('input', 'apunte-rename');
        inp.type = 'text'; inp.value = a.titulo || ''; inp.maxLength = 300;
        inp.setAttribute('aria-label', 'Nuevo nombre');
        var terminado = false;
        var fin = function (guardar) {
          if (terminado) return; terminado = true;
          S.renombrando = null;
          if (guardar && inp.value.trim() !== (a.titulo || '')) renombrar(a, inp.value.trim());
          else renderLista();
        };
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); fin(true); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); }
        });
        inp.addEventListener('blur', function () { fin(true); });
        main.appendChild(inp);
        setTimeout(function () { inp.focus(); inp.select(); }, 0);
      } else {
        var abrir = el('button', 'apunte-open');
        abrir.type = 'button';
        abrir.appendChild(texto('span', 'apunte-titulo', a.titulo || (a.tipo === 'nota' ? 'Nota sin título' : 'Archivo sin nombre')));
        var meta = [etiquetaTipo(a)];
        if (a.tipo === 'archivo') meta.push(fmtBytes(a.tamano_bytes));
        meta.push((a.tipo === 'nota' ? 'editada ' : 'subido ') + fmtFecha(a.tipo === 'nota' ? a.updated_at : a.created_at));
        if (PENDIENTES[a.id]) meta.push('sin guardar');
        abrir.appendChild(texto('span', 'apunte-meta', meta.join(' · ')));
        if (a.tipo === 'nota' && a.contenido_texto) abrir.appendChild(texto('span', 'apunte-snippet', a.contenido_texto.slice(0, 160)));
        abrir.addEventListener('click', function () {
          if (a.tipo === 'nota') location.hash = hashNota(S.materiaId, a.id);
          else abrirArchivo(a, abrir);
        });
        main.appendChild(abrir);
      }
      li.appendChild(main);

      var acc = el('div', 'apunte-actions');
      if (S.orden === 'manual' && arr.length > 1) {
        var up = boton('icon-btn icon-btn-sm', null, 'arriba', { 'aria-label': 'Subir "' + (a.titulo || 'apunte') + '" en la lista' });
        up.disabled = idx === 0;
        up.addEventListener('click', function () { mover(a.id, -1); });
        var dn = boton('icon-btn icon-btn-sm', null, 'abajo', { 'aria-label': 'Bajar "' + (a.titulo || 'apunte') + '" en la lista' });
        dn.disabled = idx === arr.length - 1;
        dn.addEventListener('click', function () { mover(a.id, 1); });
        acc.appendChild(up); acc.appendChild(dn);
      }
      var ren = boton('icon-btn icon-btn-sm', null, 'lapiz', { 'aria-label': 'Renombrar "' + (a.titulo || 'apunte') + '"', title: 'Renombrar' });
      ren.addEventListener('click', function () { S.renombrando = a.id; renderLista(); });
      var del = boton('icon-btn icon-btn-sm apunte-del', null, 'tacho', { 'aria-label': 'Eliminar "' + (a.titulo || 'apunte') + '"', title: 'Eliminar' });
      del.addEventListener('click', function () { eliminar(a); });
      acc.appendChild(ren); acc.appendChild(del);
      li.appendChild(acc);
      return li;
    }

    function renderUsoPie() {
      var pie = document.getElementById('apuntes-uso-pie');
      if (pie) pintarUso(pie, S.uso, true);
    }
    function pintarUso(cont, uso, conHint) {
      clear(cont);
      if (!uso) { cont.appendChild(texto('span', 'apuntes-uso-txt', 'Calculando almacenamiento…')); return; }
      var pct = uso.cuota ? Math.min(1, uso.usado / uso.cuota) : 0;
      var fila = el('div', 'apuntes-uso');
      var bar = el('div', 'apuntes-bar apuntes-uso-bar' + (pct >= .9 ? ' is-warning' : ''));
      bar.setAttribute('role', 'meter'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
      bar.setAttribute('aria-label', 'Almacenamiento de apuntes usado');
      var fill = el('span'); fill.style.width = Math.max(pct * 100, uso.usado ? 1 : 0) + '%';
      bar.appendChild(fill);
      fila.appendChild(bar);
      fila.appendChild(texto('span', 'apuntes-uso-txt', fmtBytes(uso.usado) + ' de ' + fmtBytes(uso.cuota) + ' usados'));
      cont.appendChild(fila);
      if (conHint) cont.appendChild(texto('span', 'apuntes-uso-hint', 'PDF, imágenes, Word, PowerPoint y Excel · hasta ' + fmtBytes(MAX_ARCHIVO_BYTES) + ' por archivo'));
    }

    // ================================================================
    // Acciones de la lista
    // ================================================================
    async function crearNota(btn) {
      if (btn) { btn.disabled = true; }
      try {
        var c = await obtenerCuaderno(S.materiaId);
        var r = await sb().from('apuntes').insert({
          user_id: uid(), cuaderno_id: c.id, tipo: 'nota', titulo: '',
          contenido_json: DOC_VACIO, contenido_html: '<p></p>', contenido_texto: ''
        }).select().single();
        if (r.error) throw r.error;
        S.apuntes.push(r.data);
        location.hash = hashNota(S.materiaId, r.data.id);
      } catch (err) {
        if (!esSesionVencida(err)) ctx.avisarError('No se pudo crear la nota. Revisá tu conexión e intentá de nuevo.');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function renombrar(a, titulo) {
      var previo = a.titulo;
      a.titulo = titulo;
      renderLista();
      var r = await sb().from('apuntes').update({ titulo: titulo }).eq('id', a.id);
      if (r.error) {
        a.titulo = previo;
        renderLista();
        if (!esSesionVencida(r.error)) ctx.avisarError('No se pudo renombrar. Revisá tu conexión e intentá de nuevo.');
      }
    }

    async function mover(id, delta) {
      var arr = ordenados();
      var i = arr.findIndex(function (a) { return a.id === id; });
      var j = i + delta;
      if (i < 0 || j < 0 || j >= arr.length) return;
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      var cambios = [];
      arr.forEach(function (a, k) { if (a.orden !== k) cambios.push({ a: a, previo: a.orden, nuevo: k }); });
      cambios.forEach(function (c) { c.a.orden = c.nuevo; });
      renderLista();
      var res = await Promise.all(cambios.map(function (c) { return sb().from('apuntes').update({ orden: c.nuevo }).eq('id', c.a.id); }));
      var fallo = res.filter(function (r) { return r.error; })[0];
      if (fallo) {
        cambios.forEach(function (c) { c.a.orden = c.previo; });
        renderLista();
        if (!esSesionVencida(fallo.error)) ctx.avisarError('No se pudo cambiar el orden. Revisá tu conexión e intentá de nuevo.');
      }
    }

    async function eliminar(a, desdeEditor) {
      var nombre = a.titulo || (a.tipo === 'nota' ? 'esta nota' : 'este archivo');
      if (!confirm('¿Eliminar "' + nombre + '"? Esta acción no se puede deshacer.')) return false;
      if (a.tipo === 'archivo' && a.storage_path) {
        // Primero el objeto: si falla, la fila sigue ahí y se puede reintentar.
        // (Borrar un objeto que ya no existe no es error en Storage.)
        var rs = await sb().storage.from(BUCKET).remove([a.storage_path]);
        if (rs.error) {
          if (!esSesionVencida(rs.error)) ctx.avisarError('No se pudo eliminar el archivo. Revisá tu conexión e intentá de nuevo.');
          return false;
        }
      }
      var r = await sb().from('apuntes').delete().eq('id', a.id);
      if (r.error) {
        if (!esSesionVencida(r.error)) ctx.avisarError('No se pudo eliminar. Revisá tu conexión e intentá de nuevo.');
        return false;
      }
      if (PENDIENTES[a.id]) { clearTimeout(PENDIENTES[a.id].timer); delete PENDIENTES[a.id]; }
      borrarBorrador(a.id);
      S.apuntes = S.apuntes.filter(function (x) { return x.id !== a.id; });
      if (a.tipo === 'archivo' && S.uso) S.uso.usado = Math.max(0, S.uso.usado - (Number(a.tamano_bytes) || 0));
      if (!desdeEditor && S.montado && !S.apunteId) renderLista();
      return true;
    }

    // ================================================================
    // Subida de archivos
    // ================================================================
    async function subirArchivos(files) {
      var materiaId = S.materiaId;
      S.rechazos = [];
      var cuaderno, uso;
      try {
        cuaderno = await obtenerCuaderno(materiaId);
        uso = await cargarUso(); // fresco: puede haber subido desde otro dispositivo
      } catch (err) {
        if (!esSesionVencida(err)) ctx.avisarError('No se pudo preparar la subida. Revisá tu conexión e intentá de nuevo.');
        return;
      }
      var usado = uso.usado;
      var aceptados = [];
      files.forEach(function (f) {
        var mime = detectarMime(f);
        if (!mime) { S.rechazos.push({ nombre: f.name, motivo: 'tipo de archivo no permitido (PDF, JPG, PNG, HEIC, WEBP, DOCX, PPTX o XLSX)' }); return; }
        if (f.size > MAX_ARCHIVO_BYTES) { S.rechazos.push({ nombre: f.name, motivo: 'pesa ' + fmtBytes(f.size) + ', el máximo es ' + fmtBytes(MAX_ARCHIVO_BYTES) }); return; }
        if (f.size === 0) { S.rechazos.push({ nombre: f.name, motivo: 'el archivo está vacío' }); return; }
        if (usado + f.size > uso.cuota) { S.rechazos.push({ nombre: f.name, motivo: 'no te alcanza el espacio (te quedan ' + fmtBytes(Math.max(0, uso.cuota - usado)) + ')' }); return; }
        usado += f.size;
        aceptados.push({ file: f, mime: mime });
      });
      var items = aceptados.map(function (x) { return { id: uuid(), nombre: x.file.name, progreso: 0, error: null, x: x }; });
      S.uploads = S.uploads.concat(items);
      refrescarListaSiVisible(materiaId);
      for (var i = 0; i < items.length; i++) {
        await subirUno(items[i], cuaderno, materiaId);
      }
      // Las fallidas quedan visibles unos segundos con su error.
      setTimeout(function () {
        S.uploads = S.uploads.filter(function (u) { return items.indexOf(u) < 0; });
        refrescarListaSiVisible(materiaId);
      }, items.some(function (u) { return u.error; }) ? 6000 : 0);
      cargarUso().then(function () { renderUsoPie(); }, function () {});
    }
    function refrescarListaSiVisible(materiaId) {
      if (S.montado && !S.apunteId && S.materiaId === materiaId && S.renombrando == null) renderLista();
    }

    async function subirUno(item, cuaderno, materiaId) {
      var f = item.x.file, mime = item.x.mime;
      var path = uid() + '/' + materiaId + '/' + uuid() + '-' + sanearNombre(f.name);
      var ultimoRender = 0;
      try {
        await subirConProgreso(path, f, mime, function (p) {
          item.progreso = p;
          var ahora = Date.now();
          if (ahora - ultimoRender > 120 || p === 1) { ultimoRender = ahora; refrescarListaSiVisible(materiaId); }
        });
      } catch (err) {
        if (esSesionVencida(err)) return;
        item.error = /exceeded|too large|413/i.test(err && (err.message || err.statusCode || '') + '') ? 'supera el tamaño permitido' : 'no se pudo subir — revisá tu conexión';
        refrescarListaSiVisible(materiaId);
        return;
      }
      var r = await sb().from('apuntes').insert({
        user_id: uid(), cuaderno_id: cuaderno.id, tipo: 'archivo',
        titulo: sinExtension(f.name).slice(0, 300) || 'Archivo',
        storage_path: path, mime_type: mime, tamano_bytes: f.size
      }).select().single();
      if (r.error) {
        // Sin fila no hay forma de verlo ni de contarlo: se borra el objeto.
        await sb().storage.from(BUCKET).remove([path]);
        if (esSesionVencida(r.error)) return;
        item.error = /cuota_excedida/.test(r.error.message || '') ? 'no te alcanza el espacio' : 'no se pudo guardar — revisá tu conexión';
        refrescarListaSiVisible(materiaId);
        return;
      }
      S.uploads = S.uploads.filter(function (u) { return u !== item; });
      if (S.materiaId === materiaId) S.apuntes.push(r.data);
      if (S.uso) S.uso.usado += f.size;
      refrescarListaSiVisible(materiaId);
    }

    // supabase-js no expone progreso de subida: se usa el mismo endpoint REST
    // de Storage con XHR (mismos headers que manda el SDK). Si el cliente no
    // expone la URL/clave (ej. el mock de pruebas), se cae al SDK sin progreso.
    async function subirConProgreso(path, file, mime, onProgress) {
      var client = sb();
      var base = client.supabaseUrl || (client.rest && client.rest.url && client.rest.url.replace(/\/rest\/v1\/?$/, ''));
      var key = client.supabaseKey;
      if (!base || !key || typeof XMLHttpRequest === 'undefined') {
        onProgress(null);
        var r = await client.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false });
        if (r.error) throw r.error;
        onProgress(1);
        return;
      }
      var ses = await client.auth.getSession();
      var token = ses.data && ses.data.session && ses.data.session.access_token;
      if (!token) throw { status: 401, message: 'session missing' };
      await new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        var url = String(base).replace(/\/$/, '') + '/storage/v1/object/' + BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
        xhr.open('POST', url);
        xhr.setRequestHeader('authorization', 'Bearer ' + token);
        xhr.setRequestHeader('apikey', key);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.setRequestHeader('cache-control', 'max-age=3600');
        xhr.setRequestHeader('content-type', mime);
        xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) { onProgress(1); resolve(); return; }
          var body = {};
          try { body = JSON.parse(xhr.responseText); } catch (e) {}
          reject({ status: xhr.status, statusCode: body.statusCode, message: body.message || body.error || ('HTTP ' + xhr.status) });
        };
        xhr.onerror = function () { reject({ message: 'network error' }); };
        xhr.send(file);
      });
    }

    // ================================================================
    // Visor (imágenes en lightbox, PDF embebido, Office como descarga)
    // ================================================================
    var visor = null;
    function nombreDescarga(a) {
      var ext = extension(a.storage_path) || MIMES_PERMITIDOS[a.mime_type] || '';
      var base = (a.titulo || 'archivo').replace(/[\\/:*?"<>|]+/g, '-');
      return ext && extension(base) !== ext ? base + '.' + ext : base;
    }
    async function descargar(a) {
      var r = await sb().storage.from(BUCKET).createSignedUrl(a.storage_path, 60, { download: nombreDescarga(a) });
      if (r.error || !r.data) { if (!esSesionVencida(r.error)) ctx.avisarError('No se pudo descargar el archivo. Revisá tu conexión e intentá de nuevo.'); return; }
      var link = document.createElement('a');
      link.href = r.data.signedUrl; link.rel = 'noopener';
      link.setAttribute('download', nombreDescarga(a));
      document.body.appendChild(link); link.click(); link.remove();
    }
    async function abrirArchivo(a, origen) {
      var clase = claseArchivo(a.mime_type);
      if (clase === 'office' || (clase === 'heic' && !navegadorMuestraHeic())) { descargar(a); return; }
      var r = await sb().storage.from(BUCKET).createSignedUrl(a.storage_path, 600);
      if (r.error || !r.data) { if (!esSesionVencida(r.error)) ctx.avisarError('No se pudo abrir el archivo. Revisá tu conexión e intentá de nuevo.'); return; }
      var url = r.data.signedUrl;
      cerrarVisor();
      var back = el('div', 'apuntes-visor' + (clase === 'pdf' ? ' is-pdf' : ' is-imagen'));
      back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', a.titulo || 'Archivo');
      var barra = el('div', 'apuntes-visor-bar');
      barra.appendChild(texto('span', 'apuntes-visor-titulo', a.titulo || 'Archivo'));
      var accs = el('div', 'apuntes-visor-actions');
      if (clase === 'pdf') {
        var ext = el('a', 'btn btn-sm apuntes-visor-btn');
        ext.href = url; ext.target = '_blank'; ext.rel = 'noopener';
        ext.insertAdjacentHTML('beforeend', ICO.externo); ext.appendChild(texto('span', null, 'Abrir en pestaña'));
        accs.appendChild(ext);
      }
      var bD = boton('btn btn-sm apuntes-visor-btn', 'Descargar', 'descargar');
      bD.addEventListener('click', function () { descargar(a); });
      var bC = boton('icon-btn apuntes-visor-cerrar', null, 'cerrar', { 'aria-label': 'Cerrar' });
      bC.addEventListener('click', cerrarVisor);
      accs.appendChild(bD); accs.appendChild(bC);
      barra.appendChild(accs);
      back.appendChild(barra);
      var cuerpo = el('div', 'apuntes-visor-body');
      if (clase === 'pdf') {
        var fr = el('iframe', 'apuntes-visor-pdf');
        fr.src = url; fr.title = a.titulo || 'PDF';
        cuerpo.appendChild(fr);
      } else {
        var img = el('img', 'apuntes-visor-img');
        img.alt = a.titulo || 'Imagen'; img.src = url;
        img.addEventListener('error', function () { clear(cuerpo); cuerpo.appendChild(texto('p', 'apuntes-visor-err', 'No se pudo mostrar la imagen. Probá descargarla.')); });
        cuerpo.appendChild(img);
        cuerpo.addEventListener('click', function (e) { if (e.target === cuerpo) cerrarVisor(); });
      }
      back.appendChild(cuerpo);
      document.body.appendChild(back);
      document.body.classList.add('apuntes-visor-abierto');
      var onKey = function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); cerrarVisor(); }
        else if (e.key === 'Tab') {
          var f = Array.prototype.slice.call(back.querySelectorAll('a[href],button,iframe'));
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      };
      document.addEventListener('keydown', onKey, true);
      visor = { el: back, onKey: onKey, origen: origen };
      setTimeout(function () { bC.focus(); }, 0);
    }
    function cerrarVisor() {
      if (!visor) return;
      document.removeEventListener('keydown', visor.onKey, true);
      visor.el.remove();
      document.body.classList.remove('apuntes-visor-abierto');
      var o = visor.origen;
      visor = null;
      if (o && document.body.contains(o)) o.focus();
    }

    // ================================================================
    // Editor + autoguardado
    // ================================================================
    async function abrirEditor(apunteId) {
      var panel = S.panel, materiaId = S.materiaId;
      clear(panel);
      var card = el('section', 'card apunte-editor is-loading');
      card.setAttribute('aria-busy', 'true');
      card.appendChild(texto('p', 'apunte-editor-cargando', 'Cargando nota…'));
      panel.appendChild(card);

      var fila, Ed;
      try {
        var res = await Promise.all([
          cargarEditorBundle(),
          sb().from('apuntes').select('*').eq('id', apunteId).maybeSingle()
        ]);
        Ed = res[0];
        if (res[1].error) throw res[1].error;
        fila = res[1].data;
      } catch (err) {
        if (esSesionVencida(err)) return;
        if (S.apunteId !== apunteId) return;
        renderEditorError(card, materiaId, 'No pudimos abrir la nota', 'Revisá tu conexión a internet e intentá de nuevo.', function () { S.montado = false; mostrar(panel, materiaId, apunteId); });
        return;
      }
      if (S.apunteId !== apunteId || !S.montado) return; // se fue mientras cargaba
      if (!fila) { renderEditorError(card, materiaId, 'Esta nota no existe', 'Puede que la hayas eliminado desde otro dispositivo.'); return; }
      if (fila.tipo !== 'nota') { location.replace(hashLista(materiaId)); return; }

      // Contenido más nuevo que el del servidor, en este orden: un guardado
      // pendiente en memoria, o un borrador local que quedó de una sesión
      // anterior (pestaña cerrada / sin conexión / sesión vencida).
      var inicial = { titulo: fila.titulo || '', json: fila.contenido_json || DOC_VACIO };
      var sucio = false;
      if (PENDIENTES[apunteId]) {
        inicial = { titulo: PENDIENTES[apunteId].payload.titulo, json: PENDIENTES[apunteId].payload.contenido_json };
        clearTimeout(PENDIENTES[apunteId].timer); delete PENDIENTES[apunteId];
        sucio = true;
      } else {
        var b = leerBorrador(apunteId);
        if (b && b.payload && (!fila.updated_at || b.ts > Date.parse(fila.updated_at))) {
          inicial = { titulo: b.payload.titulo, json: b.payload.contenido_json };
          sucio = true;
        } else if (b) borrarBorrador(apunteId);
      }

      card.classList.remove('is-loading'); card.removeAttribute('aria-busy');
      clear(card);

      // Barra superior: volver · estado de guardado · eliminar
      var top = el('div', 'apunte-editor-top');
      var volver = el('a', 'btn btn-ghost btn-sm apunte-volver');
      volver.href = hashLista(materiaId);
      volver.insertAdjacentHTML('beforeend', ICO.atras); volver.appendChild(texto('span', null, 'Apuntes'));
      top.appendChild(volver);
      var estado = el('span', 'apunte-estado');
      estado.setAttribute('role', 'status'); estado.setAttribute('aria-live', 'polite');
      top.appendChild(estado);
      var bDel = boton('btn btn-danger btn-sm', 'Eliminar', 'tacho');
      top.appendChild(bDel);
      card.appendChild(top);

      var tit = el('input', 'apunte-titulo-input');
      tit.type = 'text'; tit.placeholder = 'Sin título'; tit.maxLength = 300; tit.value = inicial.titulo;
      tit.setAttribute('aria-label', 'Título de la nota');
      card.appendChild(tit);

      var toolbar = el('div', 'apunte-toolbar');
      toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Formato');
      card.appendChild(toolbar);
      var linkbar = el('div', 'apunte-linkbar hidden');
      card.appendChild(linkbar);

      var cuerpo = el('div', 'apunte-cuerpo');
      card.appendChild(cuerpo);

      var editor;
      try {
        editor = Ed.create(cuerpo, { content: inicial.json, placeholder: 'Empezá a escribir…', onUpdate: function () { marcarCambio(); } });
      } catch (err) {
        renderEditorError(card, materiaId, 'No pudimos abrir la nota', 'El contenido no se pudo leer en este editor.');
        return;
      }

      E = {
        id: apunteId, materiaId: materiaId, Ed: Ed, editor: editor, tit: tit, estadoEl: estado,
        version: sucio ? 1 : 0, guardada: 0, guardando: false, otraVez: false,
        timer: null, retryTimer: null, retryDelay: REINTENTO_MIN_MS, estado: 'guardado', fila: fila
      };
      tit.addEventListener('input', marcarCambio);
      tit.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); editor.commands.focus('start'); } });
      bDel.addEventListener('click', async function () {
        var cur = E;
        if (!cur) return;
        clearTimeout(cur.timer); clearTimeout(cur.retryTimer);
        var ok = await eliminar({ id: cur.id, tipo: 'nota', titulo: cur.tit.value.trim() }, true);
        if (ok && E === cur) { E.version = E.guardada; cerrarEditor(true); location.hash = hashLista(materiaId); }
      });
      armarToolbar(toolbar, linkbar, editor);
      pintarEstado(sucio ? 'pendiente' : 'guardado');
      if (sucio) programarGuardado(0);
      if (!inicial.titulo && docVacio(inicial.json)) tit.focus();
      else editor.commands.focus('end');
    }

    function renderEditorError(card, materiaId, t, s, reintentar) {
      card.classList.remove('is-loading'); card.removeAttribute('aria-busy');
      clear(card);
      var v = el('div', 'apuntes-vacio');
      v.appendChild(texto('p', 'apuntes-vacio-t', t));
      v.appendChild(texto('p', 'apuntes-vacio-s', s));
      var acc = el('div', 'apuntes-vacio-actions');
      if (reintentar) { var r = boton('btn', 'Reintentar'); r.addEventListener('click', reintentar); acc.appendChild(r); }
      var vol = el('a', 'btn btn-ghost'); vol.href = hashLista(materiaId); vol.textContent = 'Volver a Apuntes';
      acc.appendChild(vol);
      v.appendChild(acc);
      card.appendChild(v);
    }

    function pintarEstado(estado) {
      if (!E) return;
      E.estado = estado;
      var txt = {
        guardado: 'Guardado',
        pendiente: 'Guardando…',
        guardando: 'Guardando…',
        error: navigator.onLine === false ? 'Sin conexión · se guarda al volver' : 'No se pudo guardar · reintentando'
      }[estado];
      var n = E.estadoEl;
      clear(n);
      n.className = 'apunte-estado is-' + estado;
      n.appendChild(texto('span', null, txt));
      if (estado === 'error') {
        var b = boton('apunte-estado-retry', 'Reintentar');
        b.addEventListener('click', function () { if (E) { clearTimeout(E.retryTimer); E.retryDelay = REINTENTO_MIN_MS; guardar(); } });
        n.appendChild(b);
      }
    }
    function marcarCambio() {
      if (!E) return;
      E.version++;
      if (E.estado !== 'error') pintarEstado('pendiente');
      programarGuardado(AUTOGUARDADO_MS);
    }
    function programarGuardado(ms) {
      clearTimeout(E.timer);
      E.timer = setTimeout(guardar, ms);
    }
    function payloadActual(cur) {
      cur = cur || E;
      var s = cur.Ed.serializar(cur.editor);
      return { titulo: cur.tit.value.trim().slice(0, 300), contenido_json: s.contenido_json, contenido_html: s.contenido_html, contenido_texto: s.contenido_texto };
    }
    async function guardar() {
      var cur = E;
      if (!cur) return;
      clearTimeout(cur.timer);
      if (cur.guardando) { cur.otraVez = true; return; }
      if (cur.version === cur.guardada) { pintarEstado('guardado'); return; }
      var v = cur.version;
      var payload = payloadActual();
      cur.guardando = true;
      pintarEstado('guardando');
      var r = await sb().from('apuntes').update(payload).eq('id', cur.id);
      cur.guardando = false;
      if (E !== cur) return; // se cerró mientras guardaba: cerrarEditor ya se encargó
      if (r.error) {
        escribirBorrador(cur.id, payload);
        if (esSesionVencida(r.error)) return;
        pintarEstado('error');
        clearTimeout(cur.retryTimer);
        cur.retryTimer = setTimeout(guardar, cur.retryDelay);
        cur.retryDelay = Math.min(cur.retryDelay * 2, REINTENTO_MAX_MS);
        return;
      }
      cur.guardada = v;
      cur.retryDelay = REINTENTO_MIN_MS;
      actualizarFilaLocal(cur.id, payload);
      if (cur.version === v) { borrarBorrador(cur.id); pintarEstado('guardado'); }
      else { pintarEstado('pendiente'); }
      if (cur.otraVez) { cur.otraVez = false; guardar(); }
    }
    function actualizarFilaLocal(id, payload) {
      var a = S.apuntes.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      a.titulo = payload.titulo; a.contenido_texto = payload.contenido_texto; a.updated_at = new Date().toISOString();
    }

    // Cerrar el editor (cambio de pestaña/ruta/materia, logout): nunca se
    // descarta lo escrito. Si hay cambios sin confirmar, se pasan a
    // PENDIENTES (memoria + borrador local) y se siguen reintentando.
    // Una nota que quedó completamente vacía se borra en vez de guardarse.
    function cerrarEditor(sinGuardar) {
      var cur = E;
      if (!cur) return;
      E = null;
      clearTimeout(cur.timer); clearTimeout(cur.retryTimer);
      if (!sinGuardar) {
        var payload = payloadActual(cur);
        var vacia = !payload.titulo && !payload.contenido_texto && docVacio(payload.contenido_json);
        if (vacia) {
          borrarBorrador(cur.id);
          S.apuntes = S.apuntes.filter(function (x) { return x.id !== cur.id; });
          sb().from('apuntes').delete().eq('id', cur.id).then(function () {}, function () {});
        } else if (cur.version !== cur.guardada || cur.guardando) {
          escribirBorrador(cur.id, payload);
          actualizarFilaLocal(cur.id, payload);
          PENDIENTES[cur.id] = { payload: payload, delay: REINTENTO_MIN_MS, timer: null };
          guardarPendiente(cur.id);
        }
      }
      try { cur.editor.destroy(); } catch (e) {}
    }
    async function guardarPendiente(id, ahora) {
      var p = PENDIENTES[id];
      if (!p) return;
      clearTimeout(p.timer);
      if (ahora) p.delay = REINTENTO_MIN_MS;
      var r = await sb().from('apuntes').update(p.payload).eq('id', id);
      if (PENDIENTES[id] !== p) return; // se reabrió o se eliminó mientras tanto
      if (!r.error) {
        delete PENDIENTES[id];
        borrarBorrador(id);
        actualizarFilaLocal(id, p.payload);
        refrescarListaSiVisible(S.materiaId);
        return;
      }
      if (esSesionVencida(r.error)) return;
      p.timer = setTimeout(function () { guardarPendiente(id); }, p.delay);
      p.delay = Math.min(p.delay * 2, REINTENTO_MAX_MS);
      refrescarListaSiVisible(S.materiaId);
    }

    // ---------- toolbar ----------
    var MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl+';
    function armarToolbar(toolbar, linkbar, editor) {
      var grupos = [
        [
          { id: 'h1', label: 'H1', title: 'Título 1 (' + MOD + 'Alt+1)', run: function (c) { return c.toggleHeading({ level: 1 }); }, active: ['heading', { level: 1 }] },
          { id: 'h2', label: 'H2', title: 'Título 2 (' + MOD + 'Alt+2)', run: function (c) { return c.toggleHeading({ level: 2 }); }, active: ['heading', { level: 2 }] },
          { id: 'h3', label: 'H3', title: 'Título 3 (' + MOD + 'Alt+3)', run: function (c) { return c.toggleHeading({ level: 3 }); }, active: ['heading', { level: 3 }] }
        ],
        [
          { id: 'bold', title: 'Negrita (' + MOD + 'B)', run: function (c) { return c.toggleBold(); }, active: ['bold'] },
          { id: 'italic', title: 'Cursiva (' + MOD + 'I)', run: function (c) { return c.toggleItalic(); }, active: ['italic'] },
          { id: 'underline', title: 'Subrayado (' + MOD + 'U)', run: function (c) { return c.toggleUnderline(); }, active: ['underline'] }
        ],
        [
          { id: 'bulletList', title: 'Lista con viñetas (' + MOD + 'Shift+8)', run: function (c) { return c.toggleBulletList(); }, active: ['bulletList'] },
          { id: 'orderedList', title: 'Lista numerada (' + MOD + 'Shift+7)', run: function (c) { return c.toggleOrderedList(); }, active: ['orderedList'] },
          { id: 'taskList', title: 'Checklist (' + MOD + 'Shift+9)', run: function (c) { return c.toggleTaskList(); }, active: ['taskList'] }
        ],
        [
          { id: 'blockquote', title: 'Cita (' + MOD + 'Shift+B)', run: function (c) { return c.toggleBlockquote(); }, active: ['blockquote'] },
          { id: 'codeBlock', title: 'Bloque de código (' + MOD + 'Alt+C)', run: function (c) { return c.toggleCodeBlock(); }, active: ['codeBlock'] },
          { id: 'link', title: 'Link (' + MOD + 'K)', toggleLink: true, active: ['link'] },
          { id: 'table', title: 'Insertar tabla', run: function (c) { return c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }); }, active: ['table'] }
        ]
      ];
      var botones = [];
      grupos.forEach(function (g) {
        var gr = el('div', 'apunte-tb-group');
        g.forEach(function (d) {
          var b = el('button', 'apunte-tb-btn');
          b.type = 'button'; b.title = d.title; b.setAttribute('aria-label', d.title); b.setAttribute('aria-pressed', 'false');
          if (d.label) b.appendChild(texto('span', 'apunte-tb-txt', d.label)); else b.innerHTML = ICO[d.id];
          b.addEventListener('mousedown', function (e) { e.preventDefault(); }); // no robar la selección
          b.addEventListener('click', function () {
            if (d.toggleLink) { abrirLinkbar(); return; }
            d.run(editor.chain().focus()).run();
          });
          gr.appendChild(b);
          botones.push({ b: b, d: d });
        });
        toolbar.appendChild(gr);
      });
      // Operaciones de tabla: sólo con el cursor adentro de una tabla.
      var tablaOps = el('div', 'apunte-tb-group apunte-tb-tabla hidden');
      [
        ['+ Fila', 'Agregar fila abajo', function (c) { return c.addRowAfter(); }],
        ['+ Columna', 'Agregar columna a la derecha', function (c) { return c.addColumnAfter(); }],
        ['− Fila', 'Eliminar fila', function (c) { return c.deleteRow(); }],
        ['− Columna', 'Eliminar columna', function (c) { return c.deleteColumn(); }],
        ['Quitar tabla', 'Eliminar la tabla', function (c) { return c.deleteTable(); }]
      ].forEach(function (op) {
        var b = el('button', 'apunte-tb-btn is-text'); b.type = 'button'; b.title = op[1]; b.textContent = op[0];
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { op[2](editor.chain().focus()).run(); });
        tablaOps.appendChild(b);
      });
      toolbar.appendChild(tablaOps);

      function refrescar() {
        botones.forEach(function (x) {
          var on = editor.isActive.apply(editor, x.d.active);
          x.b.classList.toggle('is-on', on);
          x.b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        tablaOps.classList.toggle('hidden', !editor.isActive('table'));
      }
      editor.on('transaction', refrescar);
      editor.on('selectionUpdate', refrescar);
      refrescar();

      // Barra de link (en línea, no un prompt() del navegador)
      var lInput = el('input', 'apunte-link-input');
      lInput.type = 'url'; lInput.placeholder = 'https://…'; lInput.setAttribute('aria-label', 'Dirección del link');
      var lOk = boton('btn btn-sm btn-primary', 'Aplicar');
      var lQuitar = boton('btn btn-sm btn-ghost', 'Quitar link');
      var lCancel = boton('btn btn-sm btn-ghost', 'Cancelar');
      linkbar.appendChild(lInput); linkbar.appendChild(lOk); linkbar.appendChild(lQuitar); linkbar.appendChild(lCancel);
      function abrirLinkbar() {
        lInput.value = editor.getAttributes('link').href || '';
        lQuitar.classList.toggle('hidden', !editor.isActive('link'));
        linkbar.classList.remove('hidden');
        setTimeout(function () { lInput.focus(); lInput.select(); }, 0);
      }
      function cerrarLinkbar() { linkbar.classList.add('hidden'); editor.commands.focus(); }
      function aplicar() {
        var href = lInput.value.trim();
        var chain = editor.chain().focus().extendMarkRange('link');
        if (!href) { chain.unsetLink().run(); cerrarLinkbar(); return; }
        if (!/^(https?:|mailto:)/i.test(href)) href = (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href) ? 'mailto:' : 'https://') + href;
        if (editor.state.selection.empty && !editor.isActive('link')) {
          chain.insertContent({ type: 'text', text: lInput.value.trim(), marks: [{ type: 'link', attrs: { href: href } }] }).run();
        } else {
          chain.setLink({ href: href }).run();
        }
        cerrarLinkbar();
      }
      lOk.addEventListener('click', aplicar);
      lQuitar.addEventListener('click', function () { editor.chain().focus().extendMarkRange('link').unsetLink().run(); cerrarLinkbar(); });
      lCancel.addEventListener('click', cerrarLinkbar);
      lInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); aplicar(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarLinkbar(); }
      });
      // ⌘K / Ctrl+K abre la barra de link
      editor.view.dom.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); abrirLinkbar(); }
      });
    }

    // ---------- salvaguardas globales ----------
    window.addEventListener('beforeunload', function (e) {
      var hayCambios = (E && (E.version !== E.guardada || E.guardando)) || Object.keys(PENDIENTES).length > 0;
      if (!hayCambios) return;
      if (E) { escribirBorrador(E.id, payloadActual()); guardar(); }
      e.preventDefault();
      e.returnValue = '';
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'hidden' || !E) return;
      if (E.version !== E.guardada) { escribirBorrador(E.id, payloadActual()); guardar(); }
    });
    window.addEventListener('online', function () {
      if (E && E.estado === 'error') { clearTimeout(E.retryTimer); E.retryDelay = REINTENTO_MIN_MS; guardar(); }
      Object.keys(PENDIENTES).forEach(function (id) { guardarPendiente(id, true); });
    });
    window.addEventListener('offline', function () { if (E && E.estado === 'error') pintarEstado('error'); });

    // ================================================================
    // Integraciones con el resto de la app
    // ================================================================

    // Antes de borrar materias (eliminar materia/semestre, "borrar todo"):
    // las filas de cuadernos/apuntes se van solas por ON DELETE CASCADE, pero
    // los objetos de Storage no — hay que borrarlos acá. Lista cada carpeta
    // {user_id}/{materia_id}/ (no las filas) así también limpia huérfanos.
    async function borrarArchivosDeMaterias(materiaIds) {
      var u = uid();
      if (!u || !materiaIds || !materiaIds.length) return true;
      var store = sb().storage.from(BUCKET);
      for (var i = 0; i < materiaIds.length; i++) {
        var carpeta = u + '/' + materiaIds[i];
        for (var vuelta = 0; vuelta < 50; vuelta++) {
          var l = await store.list(carpeta, { limit: 100, offset: 0 });
          if (l.error) { esSesionVencida(l.error); return false; }
          var paths = (l.data || []).filter(function (o) { return o && o.name && o.id !== null; }).map(function (o) { return carpeta + '/' + o.name; });
          if (!paths.length) break;
          var rm = await store.remove(paths);
          if (rm.error) { esSesionVencida(rm.error); return false; }
          if (paths.length < 100) break;
        }
        delete S.cuadernos[materiaIds[i]];
      }
      S.uso = null;
      return true;
    }

    async function renderUso(cont) {
      if (!cont) return;
      pintarUso(cont, null);
      try { pintarUso(cont, await cargarUso()); }
      catch (err) { clear(cont); cont.appendChild(texto('span', 'apuntes-uso-txt', 'No se pudo calcular el almacenamiento usado.')); }
    }

    return {
      mostrar: mostrar,
      salir: salir,
      reset: reset,
      borrarArchivosDeMaterias: borrarArchivosDeMaterias,
      renderUso: renderUso,
      // para tests
      _util: { sanearNombre: sanearNombre, detectarMime: detectarMime, fmtBytes: fmtBytes }
    };
  };
})();
