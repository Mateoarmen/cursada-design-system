/* Mock de supabase-js para probar la UI autenticada de Cursada sin depender
 * de confirmación de email real. Sólo para testing en este entorno — no es
 * parte del entregable. */
(function () {
  'use strict';
  // Wizard de onboarding (catálogo): mismo UUID que ORT_UNIVERSITY_ID en
  // runtime.js — si cambia uno, tiene que cambiar el otro.
  var ORT_UNIVERSITY_ID = '29e5e219-2967-4a63-99d7-5edd936d9b70';
  var PERIODO_ACTUAL = '2026-2';
  function isoPlusHoras(h) { return new Date(Date.now() + h * 3600000).toISOString(); }
  var TABLES = {
    profiles: [{ id: 'test-user-id-000', nombre: 'Quimey', apellido: 'Test', birth_date: '2003-04-12', carrera: 'Sistemas', carrera_id: null, telefono_e164: '+59891112233', telefono_pais: 'UY', university_id: ORT_UNIVERSITY_ID, university_other: null, foto_url: null, materias_carrera: 40, margen_riesgo: 1.5, push_prompt_snoozed_until: null, last_seen_at: null }],
    // Notificaciones: 10 filas de preferencias (defaults reales, ver
    // migración notificaciones_schema), unas pocas de notification_queue
    // (channel inapp — leídas, no leídas, hoy/ayer/semana, una de tipo
    // digest sin entity_id) y un dispositivo push de ejemplo.
    notification_preferences: [
      { id: 'np-1', user_id: 'test-user-id-000', event_type: 'evaluacion_proxima', channel: 'inapp', enabled: true, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-2', user_id: 'test-user-id-000', event_type: 'tarea_proxima', channel: 'inapp', enabled: true, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-3', user_id: 'test-user-id-000', event_type: 'evento_personal_proximo', channel: 'inapp', enabled: true, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-4', user_id: 'test-user-id-000', event_type: 'resumen_diario', channel: 'inapp', enabled: true, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-5', user_id: 'test-user-id-000', event_type: 'resumen_semanal', channel: 'inapp', enabled: true, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-6', user_id: 'test-user-id-000', event_type: 'evaluacion_proxima', channel: 'push', enabled: true, lead_time_hours: 24, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-7', user_id: 'test-user-id-000', event_type: 'tarea_proxima', channel: 'push', enabled: true, lead_time_hours: 24, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-8', user_id: 'test-user-id-000', event_type: 'evento_personal_proximo', channel: 'push', enabled: false, lead_time_hours: 24, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-9', user_id: 'test-user-id-000', event_type: 'resumen_diario', channel: 'push', enabled: true, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' },
      { id: 'np-10', user_id: 'test-user-id-000', event_type: 'resumen_semanal', channel: 'push', enabled: false, lead_time_hours: null, quiet_hours_start: '23:00', quiet_hours_end: '07:00', timezone: 'America/Montevideo' }
    ],
    notification_queue: [
      { id: 'nq-1', user_id: 'test-user-id-000', event_type: 'evaluacion_proxima', channel: 'inapp', entity_type: 'evaluacion', entity_id: 'ag-hero-test', title: 'Control de práctico — Álgebra', body: 'Es hoy a las 09:00.', deep_link: '#agenda?nid=nq-1&hl=ag-hero-test', scheduled_for: isoPlusHoras(-1), status: 'sent', sent_at: isoPlusHoras(-1), read_at: null, dismissed_at: null },
      { id: 'nq-2', user_id: 'test-user-id-000', event_type: 'evaluacion_proxima', channel: 'inapp', entity_type: 'evaluacion', entity_id: 'ag-1', title: 'Primer parcial — Análisis Matemático II', body: 'Vence en 2 días.', deep_link: '#agenda?nid=nq-2&hl=ag-1', scheduled_for: isoPlusHoras(-26), status: 'sent', sent_at: isoPlusHoras(-26), read_at: isoPlusHoras(-25), dismissed_at: null },
      { id: 'nq-3', user_id: 'test-user-id-000', event_type: 'tarea_proxima', channel: 'inapp', entity_type: 'tarea', entity_id: 'ag-4', title: 'Entregar informe del proyecto final', body: 'Vence en 9 días.', deep_link: '#agenda?nid=nq-3&hl=ag-4', scheduled_for: isoPlusHoras(-72), status: 'sent', sent_at: isoPlusHoras(-72), read_at: null, dismissed_at: null },
      { id: 'nq-4', user_id: 'test-user-id-000', event_type: 'resumen_diario', channel: 'inapp', entity_type: 'digest', entity_id: null, title: 'Tenés 3 entregas esta semana', body: 'Revisá tu agenda para no perderte nada.', deep_link: '#agenda?nid=nq-4', scheduled_for: isoPlusHoras(-96), status: 'sent', sent_at: isoPlusHoras(-96), read_at: isoPlusHoras(-95), dismissed_at: null }
    ],
    push_subscriptions: [
      { id: 'ps-1', user_id: 'test-user-id-000', endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint-1', p256dh: 'mock-p256dh', auth: 'mock-auth', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', created_at: '2026-09-01T00:00:00Z', last_success_at: '2026-09-08T00:00:00Z', failure_count: 0 }
    ],
    universities: [
      { id: ORT_UNIVERSITY_ID, nombre: 'ORT Uruguay', created_at: '2026-08-30T00:00:00Z' },
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
      { id: 'sem-0', user_id: 'test-user-id-000', nombre: '1er cuatrimestre 2026', activo: false, created_at: '2026-02-01T00:00:00Z' },
      // Bloque 4: semestre histórico simulando lo que arma el onboarding
      // para materias aprobadas "antes de usar la app" — nunca activo, no
      // aparece en el selector/gestor (ver semestresPropiosOrdenados).
      // sem-historico-1/2, con nota cargada: junto con sem-0/sem-1/
      // sem-historico-3 suman 5 semestres con promedio — dispara el
      // gráfico SVG de línea de buildProgresoChartSvg() (>=4 puntos), no
      // sólo el fallback en barras. Sin esto el fixture nunca ejercitaba
      // ese código (bug reportado: "se ve todo cortado").
      { id: 'sem-historico-1', user_id: 'test-user-id-000', nombre: 'Semestre 1 (antes de Cursada)', activo: false, orden: -999, historico: true, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sem-historico-2', user_id: 'test-user-id-000', nombre: 'Semestre 2 (antes de Cursada)', activo: false, orden: -998, historico: true, created_at: '2026-01-01T00:00:00Z' },
      { id: 'sem-historico-3', user_id: 'test-user-id-000', nombre: 'Semestre 3 (antes de Cursada)', activo: false, orden: -997, historico: true, created_at: '2026-01-01T00:00:00Z' },
      // Semestre histórico sin ninguna materia con nota todavía — prueba el
      // caso "sin promedio" de renderProgresoSemestresLista.
      { id: 'sem-historico-5', user_id: 'test-user-id-000', nombre: 'Semestre 5 (antes de Cursada)', activo: false, orden: -995, historico: true, created_at: '2026-01-01T00:00:00Z' }
    ],
    materias: [
      { id: 'mat-1', user_id: 'test-user-id-000', semestre_id: 'sem-1', nombre: 'Análisis Matemático II', doc: 'Dra. Pérez', color_id: 'azul', salon: 'Aula 204', bloques: [{ dia: 1, ini: 8, fin: 10 }, { dia: 3, ini: 8, fin: 10 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      { id: 'mat-2', user_id: 'test-user-id-000', semestre_id: 'sem-1', nombre: 'Álgebra', doc: 'Dr. Gómez', color_id: 'coral', salon: 'Aula 110', bloques: [{ dia: 2, ini: 10, fin: 12.5 }, { dia: 4, ini: 10, fin: 12.5 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'cursando' },
      { id: 'mat-3', user_id: 'test-user-id-000', semestre_id: 'sem-1', nombre: 'Física I', doc: 'Ing. Ruiz', color_id: 'violeta', salon: 'Lab 3', bloques: [{ dia: 1, ini: 14, fin: 16.5 }, { dia: 5, ini: 14, fin: 16 }], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'cursando' },
      // A propósito sin evaluaciones cargadas (Fase 2, caso borde "materia
      // sin evaluaciones") — Programación II no aparece en `agenda` abajo.
      { id: 'mat-4', user_id: 'test-user-id-000', semestre_id: 'sem-1', nombre: 'Programación II', doc: 'Ing. Sosa', color_id: 'verde', salon: 'Lab 1', bloques: [{ dia: 3, ini: 16, fin: 19 }], esc: { tipo: 'pct', total: 100, aprob: 60 }, estado: 'cursando' },
      // Σ nota_maxima de sus evaluaciones (50+30=80) ≠ esc.total (100) —
      // Fase 2, caso borde a avisar sin romper.
      { id: 'mat-5', user_id: 'test-user-id-000', semestre_id: 'sem-1', nombre: 'Contabilidad II', doc: 'Cra. Nieves', color_id: 'amarillo', salon: 'Aula 305', bloques: [], esc: { tipo: 'puntos', total: 100, aprob: 60 }, estado: 'cursando' },
      // Con exoneración definida + un componente fijo sin valor (ver
      // Bloques 2 y 3): 80 (parcial) + 20 (participación) = 100 = esc.total,
      // sin inconsistencia de escala a propósito.
      { id: 'mat-6', user_id: 'test-user-id-000', semestre_id: 'sem-1', nombre: 'Bases de Datos', doc: 'Ing. Fontán', color_id: 'turquesa', salon: 'Lab 2', bloques: [{ dia: 4, ini: 16, fin: 18 }], esc: { tipo: 'puntos', total: 100, aprob: 60, exoneracion: 85 }, estado: 'cursando', componentes_fijos: [{ id: 'fijo-part-1', titulo: 'Participación en clase', puntajeMax: 20, valor: null }] },
      { id: 'mat-old-1', user_id: 'test-user-id-000', semestre_id: 'sem-0', nombre: 'Filosofía', doc: 'Dr. Rossi', color_id: 'azul', salon: 'Aula 1', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      { id: 'mat-old-2', user_id: 'test-user-id-000', semestre_id: 'sem-0', nombre: 'Historia', doc: 'Dra. Luna', color_id: 'coral', salon: 'Aula 2', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      // Bloque 4: materias del semestre histórico — sin nota cargada (el
      // caso típico recién salido del onboarding) y con nota (para probar
      // el conteo de "exoneradas" y que sí aporte promedio al gráfico).
      { id: 'mat-hist-4', user_id: 'test-user-id-000', semestre_id: 'sem-historico-1', nombre: 'Algoritmos I', doc: '', color_id: 'gris', salon: '', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      { id: 'mat-hist-5', user_id: 'test-user-id-000', semestre_id: 'sem-historico-2', nombre: 'Redes', doc: '', color_id: 'gris', salon: '', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' },
      { id: 'mat-hist-1', user_id: 'test-user-id-000', semestre_id: 'sem-historico-3', nombre: 'Cálculo I', doc: '', color_id: 'gris', salon: '', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6, exoneracion: 10 }, estado: 'aprobada' },
      { id: 'mat-hist-2', user_id: 'test-user-id-000', semestre_id: 'sem-historico-3', nombre: 'Química General', doc: '', color_id: 'gris', salon: '', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6, exoneracion: 10 }, estado: 'aprobada' },
      { id: 'mat-hist-3', user_id: 'test-user-id-000', semestre_id: 'sem-historico-5', nombre: 'Física II', doc: '', color_id: 'gris', salon: '', bloques: [], esc: { tipo: 'nota', total: 12, aprob: 6 }, estado: 'aprobada' }
    ],
    // Fase 1: kind ('tarea'|'evaluacion') + nota_maxima (sólo evaluación).
    agenda: [
      { id: 'ag-1', user_id: 'test-user-id-000', materia_id: 'mat-1', kind: 'evaluacion', tipo: 'Parcial', titulo: 'Primer parcial', fecha: todayPlus(2), hora: '08:00', hecho: true, nota: 10, nota_maxima: 12, notas: '', tag_id: 'tag-1' },
      { id: 'ag-5', user_id: 'test-user-id-000', materia_id: 'mat-1', kind: 'evaluacion', tipo: 'Final', titulo: 'Coloquio integrador', fecha: todayPlus(9), hora: '10:00', hecho: false, nota: null, nota_maxima: 12, notas: '' },
      { id: 'ag-2', user_id: 'test-user-id-000', materia_id: 'mat-2', kind: 'evaluacion', tipo: 'Parcial', titulo: 'Primer parcial', fecha: todayPlus(2), hora: '23:59', hecho: true, nota: 10, nota_maxima: 12, notas: '' },
      { id: 'ag-2b', user_id: 'test-user-id-000', materia_id: 'mat-2', kind: 'evaluacion', tipo: 'Parcial', titulo: 'Segundo parcial', fecha: todayPlus(16), hora: '14:00', hecho: false, nota: null, nota_maxima: 12, notas: '' },
      { id: 'ag-3', user_id: 'test-user-id-000', materia_id: 'mat-3', kind: 'evaluacion', tipo: 'Obligatorio', titulo: 'Recuperatorio de laboratorio', fecha: todayPlus(5), hora: '14:00', hecho: false, nota: null, nota_maxima: 12, notas: '' },
      // Bloque 6: evaluación de materia pendiente para HOY, antes de
      // cualquier evento personal — así "Lo próximo" en Inicio muestra el
      // caso tipo:'materia' (Abrir materia / Ver en agenda + resaltado)
      // sin tener que esperar a que cambie la fecha del sistema.
      { id: 'ag-hero-test', user_id: 'test-user-id-000', materia_id: 'mat-2', kind: 'evaluacion', tipo: 'Control', titulo: 'Control de práctico', fecha: todayPlus(0), hora: '09:00', hecho: false, nota: null, nota_maxima: 12, notas: '' },
      { id: 'ag-4', user_id: 'test-user-id-000', materia_id: 'mat-4', kind: 'tarea', tipo: 'Tarea', titulo: 'Entregar informe del proyecto final', fecha: todayPlus(9), hora: '20:00', hecho: false, nota: null, nota_maxima: null, notas: '' },
      { id: 'ag-6', user_id: 'test-user-id-000', materia_id: 'mat-1', kind: 'tarea', tipo: 'Tarea', titulo: 'Estudiar capítulo 4', fecha: todayPlus(1), hora: '', hecho: true, nota: null, nota_maxima: null, notas: '' },
      { id: 'ag-5b', user_id: 'test-user-id-000', materia_id: 'mat-5', kind: 'evaluacion', tipo: 'Parcial', titulo: 'Parcial 1', fecha: todayPlus(6), hora: '10:00', hecho: false, nota: null, nota_maxima: 50, notas: '' },
      { id: 'ag-5c', user_id: 'test-user-id-000', materia_id: 'mat-5', kind: 'evaluacion', tipo: 'Parcial', titulo: 'Parcial 2', fecha: todayPlus(20), hora: '10:00', hecho: false, nota: null, nota_maxima: 30, notas: '' },
      { id: 'ag-6a', user_id: 'test-user-id-000', materia_id: 'mat-6', kind: 'evaluacion', tipo: 'Parcial', titulo: 'Parcial único', fecha: todayPlus(2), hora: '08:00', hecho: true, nota: 50, nota_maxima: 80, notas: '' },
      { id: 'ag-old-1', user_id: 'test-user-id-000', materia_id: 'mat-old-1', kind: 'evaluacion', tipo: 'Final', titulo: 'Final Filosofía', fecha: '2026-06-15', hora: '10:00', hecho: true, nota: 8, nota_maxima: 12, notas: '' },
      { id: 'ag-old-2', user_id: 'test-user-id-000', materia_id: 'mat-old-2', kind: 'evaluacion', tipo: 'Final', titulo: 'Final Historia', fecha: '2026-06-20', hora: '10:00', hecho: true, nota: 9, nota_maxima: 12, notas: '' },
      // mat-hist-1 (Cálculo I) a propósito sin ítem de agenda — simula una
      // materia aprobada en el onboarding sin nota cargada todavía.
      { id: 'ag-hist-2', user_id: 'test-user-id-000', materia_id: 'mat-hist-2', kind: 'evaluacion', tipo: 'Final', titulo: 'Final Química', fecha: '2025-12-10', hora: '10:00', hecho: true, nota: 11, nota_maxima: 12, notas: '' },
      { id: 'ag-hist-4', user_id: 'test-user-id-000', materia_id: 'mat-hist-4', kind: 'evaluacion', tipo: 'Final', titulo: 'Nota final', fecha: '2025-06-10', hora: '', hecho: true, nota: 8, nota_maxima: 12, notas: '' },
      { id: 'ag-hist-5', user_id: 'test-user-id-000', materia_id: 'mat-hist-5', kind: 'evaluacion', tipo: 'Final', titulo: 'Nota final', fecha: '2025-08-10', hora: '', hecho: true, nota: 10, nota_maxima: 12, notas: '' }
    ],
    personal: [
      { id: 'p-1', user_id: 'test-user-id-000', titulo: 'Gimnasio', fecha: todayPlus(0), hora: '19:00', todo_el_dia: false, tag_id: 'tag-2' },
      { id: 'p-3', user_id: 'test-user-id-000', titulo: 'Llamar al dentista', fecha: todayPlus(0), hora: '11:00', todo_el_dia: false },
      { id: 'p-2', user_id: 'test-user-id-000', titulo: 'Cumpleaños de Ana', fecha: todayPlus(5), hora: null, todo_el_dia: true },
      // Fase 6, caso borde a propósito: un día con muchos eventos (bug de
      // solapamiento en el panel lateral del Calendario).
      { id: 'p-busy-1', user_id: 'test-user-id-000', titulo: 'Reunión de equipo', fecha: todayPlus(3), hora: '08:00', todo_el_dia: false },
      { id: 'p-busy-2', user_id: 'test-user-id-000', titulo: 'Desayuno con Fer', fecha: todayPlus(3), hora: '09:00', todo_el_dia: false },
      { id: 'p-busy-3', user_id: 'test-user-id-000', titulo: 'Dentista (control)', fecha: todayPlus(3), hora: '10:30', todo_el_dia: false },
      { id: 'p-busy-4', user_id: 'test-user-id-000', titulo: 'Almuerzo con la familia', fecha: todayPlus(3), hora: '12:30', todo_el_dia: false },
      { id: 'p-busy-5', user_id: 'test-user-id-000', titulo: 'Gimnasio', fecha: todayPlus(3), hora: '14:00', todo_el_dia: false },
      { id: 'p-busy-6', user_id: 'test-user-id-000', titulo: 'Llamada con el tutor', fecha: todayPlus(3), hora: '15:30', todo_el_dia: false },
      { id: 'p-busy-7', user_id: 'test-user-id-000', titulo: 'Cumpleaños de Nico', fecha: todayPlus(3), hora: null, todo_el_dia: true },
      { id: 'p-busy-8', user_id: 'test-user-id-000', titulo: 'Turno peluquería', fecha: todayPlus(3), hora: '17:00', todo_el_dia: false },
      { id: 'p-busy-9', user_id: 'test-user-id-000', titulo: 'Cena con amigos', fecha: todayPlus(3), hora: '20:30', todo_el_dia: false }
    ]
  };
  function todayPlus(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  var FAKE_USER = { id: 'test-user-id-000', email: 'qa@example.com', app_metadata: { provider: 'email' } };
  var authListeners = [];

  function makeSession() { return { user: FAKE_USER, access_token: 'fake' }; }
  // ?nosession=1 en la URL: arranca deslogueado (para probar auth-screen,
  // en vez del auto-login que usa el resto de los tests de este harness).
  window.__CURSADA_MOCK_NO_SESSION__ = /[?&]nosession=1/.test(location.search);

  // ?onboarding=1: arranca logueado pero sin nada cargado (0 semestres, 0
  // materias) — el disparador del wizard de onboarding es justamente "no
  // hay ninguna materia", así que el fixture con datos de siempre (usado
  // por el resto de los tests de este harness) nunca lo dispararía.
  if (/[?&]onboarding=1/.test(location.search)) {
    TABLES.semestres = []; TABLES.materias = []; TABLES.agenda = []; TABLES.personal = [];
    TABLES.profiles[0].carrera_id = null;
  }

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
      limit: function () { return api; },
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
      // opts.onConflict (Notificaciones: push_subscriptions por endpoint,
      // notification_preferences por user_id+event_type+channel): cuando la
      // fila no trae `id` (lo genera la DB real, acá se simula con un
      // contador), matchea por esas columnas en vez de por id.
      upsert: function (rowsOrRow, opts) {
        var err = sesionVencidaErrorSiCorresponde();
        if (err) return Promise.resolve({ data: null, error: err });
        var rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
        var conflictCols = opts && opts.onConflict ? opts.onConflict.split(',') : null;
        var saved = rows.map(function (r) {
          var idx = -1;
          if (r.id != null) idx = TABLES[table].findIndex(function (x) { return x.id === r.id; });
          else if (conflictCols) idx = TABLES[table].findIndex(function (x) { return conflictCols.every(function (c) { return x[c] === r[c]; }); });
          if (idx >= 0) { TABLES[table][idx] = Object.assign({}, TABLES[table][idx], r); return TABLES[table][idx]; }
          var row = Object.assign({ id: 'mock-' + table + '-' + (TABLES[table].length + 1) }, r);
          TABLES[table].push(row);
          return row;
        });
        return Promise.resolve({ data: saved, error: null });
      },
      // Encadenable (a diferencia de la versión vieja, sólo .eq()) — soporta
      // cualquier combinación de .eq()/.in()/.is() antes de resolverse, como
      // el cliente real.
      update: function (patch) {
        var filters = [];
        var builder = {
          eq: function (col, val) { filters.push(function (r) { return r[col] === val; }); return builder; },
          in: function (col, vals) { filters.push(function (r) { return vals.indexOf(r[col]) >= 0; }); return builder; },
          is: function (col, val) { filters.push(function (r) { return r[col] === val; }); return builder; },
          then: function (resolve, reject) {
            var e = sesionVencidaErrorSiCorresponde();
            if (e) return Promise.resolve({ data: null, error: e }).then(resolve, reject);
            TABLES[table].forEach(function (r) { if (filters.every(function (f) { return f(r); })) Object.assign(r, patch); });
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          }
        };
        return builder;
      },
      delete: function () { return api; },
      // Tiene que ser un thenable de verdad (devolver la promesa, no sólo
      // invocar resolve) — si no, `sb().from(x)....then(fn)` no es
      // encadenable y un segundo `.then()` del caller sobre ese resultado
      // explota con "Cannot read properties of undefined (reading 'then')"
      // la primera vez que se llama (antes de que algún caché lo evite).
      // Encontrado con cargarUniversidades(), que hace exactamente eso.
      then: function (resolve, reject) { return Promise.resolve({ data: applyFilters(), error: null }).then(resolve, reject); }
    };
    function applyFilters() {
      return TABLES[table].filter(function (row) {
        return state.filters.every(function (f) { return row[f[0]] === f[1]; });
      });
    }
    return api;
  }

  // ---------------------------------------------------------------
  // Catálogo académico (wizard de onboarding) — fixture de prueba. Sólo el
  // semestre 4 tiene grupos/dictados cargados, a propósito (mismo
  // comportamiento que describe el enunciado real): el resto cae al
  // fallback de materias sugeridas sin horario.
  // ---------------------------------------------------------------
  var CARRERA_ACTUAL_ID = 'carrera-ga-actual';
  var CARRERA_2028_ID = 'carrera-ga-2028';
  var CAT_CARRERAS = [
    { id: CARRERA_ACTUAL_ID, nombre: 'Gerencia y Administración', facultad: 'Facultad de Administración y Ciencias Sociales', slug: 'gerencia-administracion-actual', plan_version: 'Plan actual' },
    { id: CARRERA_2028_ID, nombre: 'Gerencia y Administración', facultad: 'Facultad de Administración y Ciencias Sociales', slug: 'gerencia-administracion-2028', plan_version: 'Plan 2028' }
  ];
  var CAT_MATERIAS_SEM4 = [
    { materia_id: 'mat-orggerencia', nombre: 'Organización y Gerencia', doc: 'Prof. Ana Bianchi' },
    { materia_id: 'mat-costos', nombre: 'Costos y Presupuestos', doc: 'Cra. Rosa Delgado' },
    { materia_id: 'mat-derecho', nombre: 'Derecho Empresarial', doc: 'Dr. Iván Ferro' },
    { materia_id: 'mat-marketing2', nombre: 'Marketing II', doc: 'Prof. Lucía Gómez' }
  ];
  // Mismo horario docente, corrido 10hs para el turno nocturno.
  function bloquesTurno(matutino, diasIni) {
    return diasIni.map(function (d) { var ini = matutino ? d[1] : d[1] + 10; return { dia: d[0], ini: ini, fin: ini + 2 }; });
  }
  var CAT_DICTADOS_SEM4 = [];
  ['matutino', 'nocturno'].forEach(function (turno) {
    var mat = turno === 'matutino';
    var grupoCod = mat ? 'LA_M4B' : 'LA_N4A';
    [
      { m: 'mat-orggerencia', dias: [[1, 8], [3, 8]], salon: mat ? 'Aula 301' : 'Aula 210' },
      { m: 'mat-costos', dias: [[2, 8], [4, 8]], salon: mat ? 'Aula 302' : 'Aula 211' },
      { m: 'mat-derecho', dias: [[1, 10]], salon: mat ? 'Aula 303' : 'Aula 212' },
      { m: 'mat-marketing2', dias: [[5, 8]], salon: mat ? 'Aula 304' : 'Aula 213' }
    ].forEach(function (d) {
      var nombre = CAT_MATERIAS_SEM4.filter(function (x) { return x.materia_id === d.m; })[0].nombre;
      CAT_DICTADOS_SEM4.push({ dictado_id: 'dict-' + d.m + '-' + turno, materia_id: d.m, nombre: nombre, semestre_sugerido: 4, obligatoria: true, grupo: grupoCod, turno: turno, seccion: null, salon: d.salon, estado: 'abierto', bloques: bloquesTurno(mat, d.dias) });
    });
  });
  function dictadosDeGrupo(codigo) { return CAT_DICTADOS_SEM4.filter(function (d) { return d.grupo === codigo; }); }
  var CAT_GRUPOS_SEM4 = ['LA_M4B', 'LA_N4A'].map(function (codigo) {
    var dictados = dictadosDeGrupo(codigo);
    return {
      id: 'grupo-' + codigo.toLowerCase(), codigo: codigo, turno: dictados[0].turno, semestre: 4,
      edificio: dictados[0].turno === 'matutino' ? 'Edificio Central' : 'Edificio Cuareim',
      // La RPC real cat_grupos devuelve "materias" como CONTEO (bigint), no
      // como array — wizResolverMateriasDeGrupo() ignora este array y
      // siempre resuelve el detalle real contra cat_dictados.
      materias: dictados.length,
      materiasDetalle: dictados.map(function (d) {
        return { materia_id: d.materia_id, dictado_id: d.dictado_id, nombre: d.nombre, salon: d.salon, bloques: d.bloques, doc: CAT_MATERIAS_SEM4.filter(function (m) { return m.materia_id === d.materia_id; })[0].doc };
      })
    };
  });
  // cat_esquema(materia_id, periodo): escala de aprobación real, ausente de
  // cat_dictados/cat_electivas/cat_grupos — siempre sobre 100. Mezcla de los
  // 3 "sistema" que existen en la base real: Curso (aprobación directa, sin
  // exoneración), Curso+Examen con exoneración (aprobación + exoneración
  // más alta), y Examen con exoneración (sólo exonera, no hay aprobación
  // intermedia).
  // `instancias`: opcional, sólo para probar el desglose real por
  // instancia (total en puntos + componentes fijos sin fecha) — si falta,
  // cae al esquema genérico de siempre (una sola instancia "Evaluación" de
  // 100 puntos, con fecha, para no generar puntos fijos donde no se están
  // probando explícitamente).
  var CAT_ESQUEMAS = {
    'mat-orggerencia': { sistema: 'Curso+Examen con exoneración', min_aprobar: '70', min_exonerar: '86', instancias: [
      { titulo: 'Parcial', puntaje_max: 85, tieneFecha: true },
      { titulo: 'Participación en clase', puntaje_max: 15, tieneFecha: false }
    ] },
    'mat-costos': { sistema: 'Curso', min_aprobar: '70', min_exonerar: null },
    'mat-derecho': { sistema: 'Examen con exoneración', min_aprobar: '0', min_exonerar: '70' },
    'mat-marketing2': { sistema: 'Curso+Examen con exoneración', min_aprobar: '70', min_exonerar: '86' },
    'elec-consumidor': { sistema: 'Curso', min_aprobar: '70', min_exonerar: null },
    'elec-finanzas': { sistema: 'Curso+Examen con exoneración', min_aprobar: '70', min_exonerar: '86' }
  };
  // Semestres sin dictados/grupos cargados (todo menos el 4) — fallback a
  // materias sugeridas sin horario (el usuario completa la grilla después).
  var CAT_MATERIAS_SUGERIDAS_POR_SEMESTRE = {
    2: [
      { materia_id: 'mat-microeco', nombre: 'Microeconomía', creditos: 8, semestre_sugerido: 2, obligatoria: true },
      { materia_id: 'mat-estadistica', nombre: 'Estadística I', creditos: 8, semestre_sugerido: 2, obligatoria: true }
    ],
    3: [
      { materia_id: 'mat-macroeco', nombre: 'Macroeconomía', creditos: 8, semestre_sugerido: 3, obligatoria: true },
      { materia_id: 'mat-contabilidad2', nombre: 'Contabilidad II', creditos: 8, semestre_sugerido: 3, obligatoria: true }
    ]
  };
  // Electivas: "Comportamiento del Consumidor" con 2 secciones abiertas;
  // "Finanzas Personales" con 3, una sin_minimo (deshabilitada con motivo).
  var CAT_ELECTIVAS = [
    { dictado_id: 'elec-consumidor-m', materia_id: 'elec-consumidor', nombre: 'Comportamiento del Consumidor', turno: 'matutino', seccion: 'M', estado: 'abierto', salon: 'Aula 401', bloques: [{ dia: 1, ini: 8, fin: 10 }] },
    { dictado_id: 'elec-consumidor-n', materia_id: 'elec-consumidor', nombre: 'Comportamiento del Consumidor', turno: 'nocturno', seccion: 'N', estado: 'abierto', salon: 'Aula 401', bloques: [{ dia: 1, ini: 18, fin: 20 }] },
    { dictado_id: 'elec-finanzas-ma', materia_id: 'elec-finanzas', nombre: 'Finanzas Personales', turno: 'matutino', seccion: 'M-A', estado: 'abierto', salon: 'Aula 402', bloques: [{ dia: 2, ini: 10, fin: 12 }] },
    { dictado_id: 'elec-finanzas-mb', materia_id: 'elec-finanzas', nombre: 'Finanzas Personales', turno: 'matutino', seccion: 'M-B', estado: 'abierto', salon: 'Aula 403', bloques: [{ dia: 4, ini: 10, fin: 12 }] },
    { dictado_id: 'elec-finanzas-ming', materia_id: 'elec-finanzas', nombre: 'Finanzas Personales', turno: 'matutino', seccion: 'M-ING', estado: 'sin_minimo', salon: null, bloques: [] }
  ];
  // Índice de todo dictado con id conocido (dictados del plan + electivas,
  // comparten el mismo espacio de ids) — permite calcular conflictos reales
  // entre cualquier combinación, no una lista hardcodeada de pares.
  var DICTADOS_INDEX = {};
  CAT_DICTADOS_SEM4.concat(CAT_ELECTIVAS).forEach(function (d) { DICTADOS_INDEX[d.dictado_id] = d; });

  function mockConflictos(dictadoIds) {
    var out = [];
    var items = (dictadoIds || []).map(function (id) { return DICTADOS_INDEX[id]; }).filter(Boolean);
    for (var i = 0; i < items.length; i++) {
      for (var j = i + 1; j < items.length; j++) {
        (items[i].bloques || []).forEach(function (a) {
          (items[j].bloques || []).forEach(function (b) {
            if (a.dia === b.dia && a.ini < b.fin && b.ini < a.fin) {
              out.push({ dictado_a: items[i].dictado_id, materia_a: items[i].nombre, dictado_b: items[j].dictado_id, materia_b: items[j].nombre, dia: a.dia, desde: Math.max(a.ini, b.ini), hasta: Math.min(a.fin, b.fin) });
            }
          });
        });
      }
    }
    return out;
  }

  // aplicar_grupo/aplicar_dictados/aplicar_plan/aplicar_agenda: escriben
  // directo en TABLES.materias/TABLES.agenda, como harían las RPCs reales —
  // por eso son idempotentes (buscan por catalogo_dictado_id/
  // catalogo_materia_id antes de insertar, nunca duplican en un re-run).
  function mockUpsertMateriaDesdeDictado(semestreId, dictado, extra) {
    if (!dictado) return;
    var idx = TABLES.materias.findIndex(function (m) { return m.catalogo_dictado_id === dictado.dictado_id && m.semestre_id === semestreId; });
    var row = {
      id: idx >= 0 ? TABLES.materias[idx].id : ('mat-' + dictado.dictado_id),
      user_id: FAKE_USER.id, semestre_id: semestreId, nombre: dictado.nombre, doc: (extra && extra.doc) || '',
      color_id: 'azul', salon: dictado.salon || '', bloques: dictado.bloques || [],
      esc: null, estado: 'cursando',
      catalogo_materia_id: dictado.materia_id, catalogo_dictado_id: dictado.dictado_id
    };
    if (idx >= 0) TABLES.materias[idx] = row; else TABLES.materias.push(row);
  }
  function mockUpsertMateriaSinHorario(semestreId, materiaId) {
    var fila = null;
    Object.keys(CAT_MATERIAS_SUGERIDAS_POR_SEMESTRE).some(function (s) {
      var hit = CAT_MATERIAS_SUGERIDAS_POR_SEMESTRE[s].filter(function (m) { return m.materia_id === materiaId; })[0];
      if (hit) { fila = hit; return true; }
      return false;
    });
    if (!fila) return;
    var idx = TABLES.materias.findIndex(function (m) { return m.catalogo_materia_id === materiaId && m.semestre_id === semestreId; });
    var row = { id: idx >= 0 ? TABLES.materias[idx].id : ('mat-' + materiaId), user_id: FAKE_USER.id, semestre_id: semestreId, nombre: fila.nombre, doc: '', color_id: 'gris', salon: '', bloques: [], esc: null, estado: 'cursando', catalogo_materia_id: materiaId, catalogo_dictado_id: null };
    if (idx >= 0) TABLES.materias[idx] = row; else TABLES.materias.push(row);
  }
  // Turno-consciente (regla del enunciado: el mismo parcial es a las 09:00
  // para matutino y a las 18:00 para nocturno) — sólo genera para materias
  // con dictado de catálogo (las sin-horario no tienen fecha real todavía).
  // Puntaje real de una instancia con nombre puntual (Parcial, etc.) si la
  // materia trae `instancias` en CAT_ESQUEMAS (ver cat_esquema arriba);
  // si no, cae al fallback de siempre — mismo motivo por el que
  // cat_esquema también cae a su forma genérica sin `instancias`.
  function mockPuntajeInstancia(materiaId, titulo, fallback) {
    var esquema = CAT_ESQUEMAS[materiaId];
    var inst = esquema && esquema.instancias && esquema.instancias.filter(function (i) { return i.titulo === titulo; })[0];
    return inst ? inst.puntaje_max : fallback;
  }
  function mockGenerarAgendaParaSemestre(semestreId) {
    TABLES.materias.filter(function (m) { return m.semestre_id === semestreId && m.catalogo_dictado_id; }).forEach(function (m) {
      var dictado = DICTADOS_INDEX[m.catalogo_dictado_id];
      var hora = dictado && dictado.turno === 'nocturno' ? '18:00' : '09:00';
      if (TABLES.agenda.some(function (a) { return a.catalogo_hito_id === 'parcial-' + m.id; })) return;
      // Sin el nombre de la materia en el título (feedback real + fix de
      // aplicar_agenda en la base): el chip de materia de cada fila ya lo
      // muestra, repetirlo acá era la info redundante del reporte.
      TABLES.agenda.push({ id: 'ag-cat-parcial-' + m.id, user_id: FAKE_USER.id, materia_id: m.id, kind: 'evaluacion', tipo: 'Parcial', titulo: 'Parcial', fecha: '2026-12-10', hora: hora, hecho: false, nota: null, nota_maxima: mockPuntajeInstancia(m.catalogo_materia_id, 'Parcial', m.esc && m.esc.total), notas: '', tag_id: null, catalogo_hito_id: 'parcial-' + m.id });
      TABLES.agenda.push({ id: 'ag-cat-entrega-' + m.id, user_id: FAKE_USER.id, materia_id: m.id, kind: 'evaluacion', tipo: 'Obligatorio', titulo: 'Obligatorio (Entrega final on line)', fecha: '2026-11-20', hora: hora, hecho: false, nota: null, nota_maxima: mockPuntajeInstancia(m.catalogo_materia_id, 'Obligatorio', m.esc && m.esc.total), notas: '', tag_id: null, catalogo_hito_id: 'entrega-' + m.id });
    });
  }

  function mockRpc(name, params) {
    params = params || {};
    var data;
    // Igual que la RPC real: sólo ORT tiene catálogo cargado — cualquier
    // otra universidad tiene que recibir una lista vacía (así el selector
    // de carrera del login/perfil cae al campo de texto libre, no una
    // lista fantasma con los datos de otra institución).
    if (name === 'cat_carreras_de') data = params.p_university_id === ORT_UNIVERSITY_ID ? CAT_CARRERAS : [];
    else if (name === 'cat_grupos') data = params.p_semestre === 4 ? CAT_GRUPOS_SEM4 : [];
    else if (name === 'cat_dictados') {
      var semestres = params.p_semestres || [];
      data = CAT_DICTADOS_SEM4.filter(function (d) { return semestres.indexOf(d.semestre_sugerido) >= 0; });
    } else if (name === 'cat_materias_sugeridas') data = CAT_MATERIAS_SUGERIDAS_POR_SEMESTRE[params.p_semestre] || [];
    else if (name === 'cat_electivas') data = CAT_ELECTIVAS.filter(function (e) { return !params.p_turno || e.turno === params.p_turno; });
    else if (name === 'cat_conflictos') data = mockConflictos(params.p_dictado_ids);
    else if (name === 'cat_esquema') {
      var esquema = CAT_ESQUEMAS[params.p_materia_id];
      if (!esquema) data = [];
      else if (esquema.instancias) {
        data = esquema.instancias.map(function (inst, i) {
          return {
            sistema: esquema.sistema, min_aprobar: esquema.min_aprobar, min_exonerar: esquema.min_exonerar,
            instancia_id: 'inst-' + params.p_materia_id + '-' + i, orden: i + 1, seccion: null,
            titulo: inst.titulo, puntaje_max: inst.puntaje_max, computa: true,
            fechas: inst.tieneFecha ? [{ etiqueta: 'Fecha', fecha: '2026-12-10', hora: '09:00:00', turno: null }] : []
          };
        });
      } else {
        data = [{
          sistema: esquema.sistema, min_aprobar: esquema.min_aprobar, min_exonerar: esquema.min_exonerar,
          instancia_id: 'inst-' + params.p_materia_id, orden: 1, seccion: null, titulo: 'Evaluación', puntaje_max: 100, computa: true,
          fechas: [{ etiqueta: 'Fecha', fecha: '2026-12-10', hora: '09:00:00', turno: null }]
        }];
      }
    } else if (name === 'aplicar_grupo') {
      var grupo = CAT_GRUPOS_SEM4.filter(function (g) { return g.id === params.p_grupo_id; })[0];
      if (!grupo) return Promise.resolve({ data: null, error: { message: 'El grupo no existe.' } });
      grupo.materiasDetalle.forEach(function (m) { mockUpsertMateriaDesdeDictado(params.p_semestre_id, DICTADOS_INDEX[m.dictado_id], { doc: m.doc }); });
      data = null;
    } else if (name === 'aplicar_dictados') {
      (params.p_dictado_ids || []).forEach(function (id) { mockUpsertMateriaDesdeDictado(params.p_semestre_id, DICTADOS_INDEX[id], {}); });
      data = null;
    } else if (name === 'aplicar_plan') {
      (params.p_materia_ids || []).forEach(function (id) { mockUpsertMateriaSinHorario(params.p_semestre_id, id); });
      data = null;
    } else if (name === 'aplicar_agenda') {
      mockGenerarAgendaParaSemestre(params.p_semestre_id);
      data = null;
    } else {
      return Promise.resolve({ data: null, error: { message: 'RPC no simulada en el mock: ' + name } });
    }
    return Promise.resolve({ data: data, error: null });
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
    rpc: mockRpc,
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
