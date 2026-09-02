/* Mock de supabase-js para probar la UI autenticada de Cursada sin depender
 * de confirmación de email real. Sólo para testing en este entorno — no es
 * parte del entregable. */
(function () {
  'use strict';
  var TABLES = {
    profiles: [{ id: 'test-user-id-000', nombre: 'Quimey', apellido: 'Test', birth_date: '2003-04-12', carrera: 'Sistemas', telefono_e164: '+59891112233', telefono_pais: 'UY', university_id: 'uni-ort', university_other: null, foto_url: null, materias_carrera: 40, margen_riesgo: 1.5 }],
    universities: [
      { id: 'uni-ort', nombre: 'ORT Uruguay', created_at: '2026-08-30T00:00:00Z' },
      { id: 'uni-ucu', nombre: 'UCU – Universidad Católica del Uruguay', created_at: '2026-08-30T00:00:00Z' },
      { id: 'uni-um', nombre: 'UM – Universidad de Montevideo', created_at: '2026-08-30T00:00:00Z' },
      { id: 'uni-udelar', nombre: 'UdelaR', created_at: '2026-08-30T00:00:00Z' },
      { id: 'uni-ude', nombre: 'UDE – Universidad de la Empresa', created_at: '2026-08-30T00:00:00Z' }
    ],
    event_tags: [
      { id: 'tag-1', user_id: 'test-user-id-000', name: 'Difícil', kind: 'academico', color: 'coral', created_at: '2026-08-01T00:00:00Z' },
      { id: 'tag-2', user_id: 'test-user-id-000', name: 'Familia', kind: 'personal', color: 'turquesa', created_at: '2026-08-01T00:00:00Z' }
    ],
    semestres: [
      { id: 'sem-1', user_id: 'test-user-id-000', nombre: '2do cuatrimestre 2026', activo: true, created_at: '2026-08-01T00:00:00Z' },
      { id: 'sem-0', user_id: 'test-user-id-000', nombre: '1er cuatrimestre 2026', activo: false, created_at: '2026-02-01T00:00:00Z' }
    ],
    materias: [
      { id: 'mat-1', user_id: 'test-user-id-000', semestre_id: 'sem-1', cod: 'AM2', nombre: 'Análisis Matemático II', doc: 'Dra. Pérez', color_id: 'azul', creditos: 6, salon: 'Aula 204', bloques: [{ dia: 1, ini: 8, fin: 10 }, { dia: 3, ini: 8, fin: 10 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      { id: 'mat-2', user_id: 'test-user-id-000', semestre_id: 'sem-1', cod: 'ALG', nombre: 'Álgebra', doc: 'Dr. Gómez', color_id: 'coral', creditos: 6, salon: 'Aula 110', bloques: [{ dia: 2, ini: 10, fin: 12.5 }, { dia: 4, ini: 10, fin: 12.5 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'cursando' },
      { id: 'mat-3', user_id: 'test-user-id-000', semestre_id: 'sem-1', cod: 'FIS1', nombre: 'Física I', doc: 'Ing. Ruiz', color_id: 'violeta', creditos: 5, salon: 'Lab 3', bloques: [{ dia: 1, ini: 14, fin: 16.5 }, { dia: 5, ini: 14, fin: 16 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'cursando' },
      { id: 'mat-4', user_id: 'test-user-id-000', semestre_id: 'sem-1', cod: 'PROG', nombre: 'Programación II', doc: 'Ing. Sosa', color_id: 'verde', creditos: 6, salon: 'Lab 1', bloques: [{ dia: 3, ini: 16, fin: 19 }], esc: { tipo: 'pct', total: 100, aprob: 60 }, estado: 'cursando' },
      { id: 'mat-old-1', user_id: 'test-user-id-000', semestre_id: 'sem-0', cod: 'FIL', nombre: 'Filosofía', doc: 'Dr. Rossi', color_id: 'azul', creditos: 5, salon: 'Aula 1', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      { id: 'mat-old-2', user_id: 'test-user-id-000', semestre_id: 'sem-0', cod: 'HIS', nombre: 'Historia', doc: 'Dra. Luna', color_id: 'coral', creditos: 4, salon: 'Aula 2', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' }
    ],
    agenda: [
      { id: 'ag-1', user_id: 'test-user-id-000', materia_id: 'mat-1', tipo: 'parcial', titulo: 'Primer parcial', fecha: todayPlus(2), hora: '08:00', hecho: true, nota: 10, notas: '', tag_id: 'tag-1' },
      { id: 'ag-2', user_id: 'test-user-id-000', materia_id: 'mat-2', tipo: 'tp', titulo: 'Entrega TP3', fecha: todayPlus(2), hora: '23:59', hecho: true, nota: 12, notas: '' },
      { id: 'ag-3', user_id: 'test-user-id-000', materia_id: 'mat-3', tipo: 'final', titulo: 'Recuperatorio de laboratorio', fecha: todayPlus(5), hora: '14:00', hecho: false, nota: null, notas: '' },
      { id: 'ag-4', user_id: 'test-user-id-000', materia_id: 'mat-4', tipo: 'tp', titulo: 'Entrega proyecto final', fecha: todayPlus(9), hora: '20:00', hecho: false, nota: null, notas: '' },
      { id: 'ag-5', user_id: 'test-user-id-000', materia_id: 'mat-1', tipo: 'coloquio', titulo: 'Coloquio integrador', fecha: todayPlus(9), hora: '10:00', hecho: false, nota: null, notas: '' },
      { id: 'ag-old-1', user_id: 'test-user-id-000', materia_id: 'mat-old-1', tipo: 'final', titulo: 'Final Filosofía', fecha: '2026-06-15', hora: '10:00', hecho: true, nota: 8, notas: '' },
      { id: 'ag-old-2', user_id: 'test-user-id-000', materia_id: 'mat-old-2', tipo: 'final', titulo: 'Final Historia', fecha: '2026-06-20', hora: '10:00', hecho: true, nota: 9, notas: '' }
    ],
    personal: [
      { id: 'p-1', user_id: 'test-user-id-000', titulo: 'Gimnasio', fecha: todayPlus(0), hora: '19:00', todo_el_dia: false, tag_id: 'tag-2' },
      { id: 'p-3', user_id: 'test-user-id-000', titulo: 'Llamar al dentista', fecha: todayPlus(0), hora: '11:00', todo_el_dia: false },
      { id: 'p-2', user_id: 'test-user-id-000', titulo: 'Cumpleaños de Ana', fecha: todayPlus(5), hora: null, todo_el_dia: true }
    ]
  };
  function todayPlus(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  var FAKE_USER = { id: 'test-user-id-000', email: 'qa@example.com', app_metadata: { provider: 'email' } };
  var authListeners = [];

  function makeSession() { return { user: FAKE_USER, access_token: 'fake' }; }
  // ?nosession=1 en la URL: arranca deslogueado (para probar auth-screen,
  // en vez del auto-login que usa el resto de los tests de este harness).
  window.__CURSADA_MOCK_NO_SESSION__ = /[?&]nosession=1/.test(location.search);

  // Para probar el manejo de sesión vencida sin esperar a que un JWT real
  // venza (~1h): window.__CURSADA_MOCK_FORCE_SESSION_EXPIRED__ = true hace
  // que la próxima escritura (upsert/delete) tire un error con la forma que
  // esErrorSesionVencida() espera de PostgREST.
  function sesionVencidaErrorSiCorresponde() {
    if (!window.__CURSADA_MOCK_FORCE_SESSION_EXPIRED__) return null;
    return { message: 'JWT expired', code: 'PGRST301' };
  }

  function queryBuilder(table) {
    var state = { filters: [] };
    var api = {
      select: function () { return api; },
      order: function () { return api; },
      eq: function (col, val) { state.filters.push([col, val]); return api; },
      in: function (col, vals) {
        var err = sesionVencidaErrorSiCorresponde();
        if (err) return Promise.resolve({ data: null, error: err });
        TABLES[table] = TABLES[table].filter(function (row) { return vals.indexOf(row.id) < 0; });
        return Promise.resolve({ data: null, error: null });
      },
      maybeSingle: function () {
        var rows = applyFilters();
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      upsert: function (rowsOrRow) {
        var err = sesionVencidaErrorSiCorresponde();
        if (err) return Promise.resolve({ data: null, error: err });
        var rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
        rows.forEach(function (r) {
          var idx = TABLES[table].findIndex(function (x) { return x.id === r.id; });
          if (idx >= 0) TABLES[table][idx] = Object.assign({}, TABLES[table][idx], r);
          else TABLES[table].push(Object.assign({}, r));
        });
        return Promise.resolve({ data: rows, error: null });
      },
      update: function (patch) {
        return {
          eq: function (col, val) {
            TABLES[table].forEach(function (r) { if (r[col] === val) Object.assign(r, patch); });
            return Promise.resolve({ data: null, error: null });
          }
        };
      },
      delete: function () { return api; },
      then: function (resolve) { resolve({ data: applyFilters(), error: null }); }
    };
    function applyFilters() {
      return TABLES[table].filter(function (row) {
        return state.filters.every(function (f) { return row[f[0]] === f[1]; });
      });
    }
    return api;
  }

  window.__CURSADA_MOCK_TABLES__ = TABLES;
  // Para disparar a mano PASSWORD_RECOVERY (volver del link del mail) o un
  // SIGNED_OUT inesperado (sesión vencida sola, sin logout deliberado) sin
  // depender de un flujo de mail/token real.
  window.__CURSADA_MOCK_FIRE_AUTH_EVENT__ = function (event, session) {
    authListeners.forEach(function (cb) { cb(event, session === undefined ? makeSession() : session); });
  };
  window.CURSADA_SUPABASE = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: window.__CURSADA_MOCK_NO_SESSION__ ? null : makeSession() }, error: null }); },
      onAuthStateChange: function (cb) {
        authListeners.push(cb);
        if (!window.__CURSADA_MOCK_NO_SESSION__) setTimeout(function () { cb('SIGNED_IN', makeSession()); }, 0);
        return { data: { subscription: { unsubscribe: function () {} } } };
      },
      signOut: function () {
        authListeners.forEach(function (cb) { cb('SIGNED_OUT', null); });
        return Promise.resolve({ error: null });
      },
      signUp: function () { return Promise.resolve({ data: {}, error: null }); },
      signInWithPassword: function () {
        var session = makeSession();
        setTimeout(function () { authListeners.forEach(function (cb) { cb('SIGNED_IN', session); }); }, 0);
        return Promise.resolve({ data: { session: session }, error: null });
      },
      resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); },
      updateUser: function (patch) {
        if (window.__CURSADA_MOCK_RESET_PW_ERROR__) return Promise.resolve({ data: null, error: { message: window.__CURSADA_MOCK_RESET_PW_ERROR__ } });
        Object.assign(FAKE_USER, patch.password ? {} : patch);
        return Promise.resolve({ data: { user: FAKE_USER }, error: null });
      }
    },
    from: queryBuilder,
    storage: {
      from: function () {
        return {
          upload: function () { return Promise.resolve({ data: {}, error: null }); },
          getPublicUrl: function () { return { data: { publicUrl: 'https://placehold.co/256x256/0A63F0/ffffff.jpg?text=Q' } }; }
        };
      }
    }
  };
})();
