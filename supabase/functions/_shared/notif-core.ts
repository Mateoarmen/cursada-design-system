// Cursada — módulo compartido entre notifications-generate y
// notifications-send. Parte 6 del pedido: el armado de contenido (título/
// body/deep_link) y la lógica de supresión (quiet hours, actividad, cap
// diario, agregación) viven acá, separados del transporte — agregar email o
// WhatsApp más adelante es un transporte nuevo que llama a las mismas
// funciones, no un refactor de esto.

export const CAP_DIARIO_PUSH = 2; // Parte 5: seguro contra bugs del cron, no una regla de producto — constante fácil de encontrar/cambiar.
export const SUPRESION_ACTIVIDAD_HORAS = 2; // "abrió la app en las últimas N horas"

export interface EntidadNotificable {
  entityType: 'evaluacion' | 'tarea' | 'evento_personal';
  entityId: string;
  titulo: string;
  materiaNombre: string | null;
  fecha: string; // YYYY-MM-DD
  hora: string | null; // HH:MM o null
}

function formatearCuando(fecha: string, hora: string | null, aheadHoras: number): string {
  const horaTxt = hora ? ' a las ' + hora : '';
  if (aheadHoras <= 0) return 'Es hoy' + horaTxt + '.';
  if (aheadHoras <= 30) return 'Es mañana' + horaTxt + '.';
  const dias = Math.round(aheadHoras / 24);
  return 'Vence en ' + dias + (dias === 1 ? ' día.' : ' días.');
}

// Título/body de una notificación puntual (evaluación, tarea o evento
// personal) — mismo armado para el canal in-app y push, sólo cambia cómo
// se entrega (ver notifications-send).
export function contenidoEntidad(e: EntidadNotificable, aheadHoras: number): { title: string; body: string } {
  const sujeto = e.materiaNombre ? e.titulo + ' — ' + e.materiaNombre : e.titulo;
  return { title: sujeto, body: formatearCuando(e.fecha, e.hora, aheadHoras) };
}

// deep_link con el mismo formato que handleRoute() en runtime.js consume
// (?nid=<fila de notification_queue>&hl=<id a resaltar en Agenda>) — así el
// cliente reusa el mecanismo de "Ver en agenda" (Bloque 6) sin un segundo
// camino de navegación. Los eventos personales también resuelven en Agenda
// (mismo listado, ver buildAgendaRowsList en runtime.js).
export function deepLinkEntidad(queueId: string, entityId: string): string {
  return '#agenda?nid=' + queueId + '&hl=' + entityId;
}
export function deepLinkDigest(queueId: string): string {
  return '#agenda?nid=' + queueId;
}

// Hora local (0-23) y día de semana (0=domingo) de un usuario según su
// timezone guardada — Uruguay no tiene horario de verano hoy, así que no
// hace falta lidiar con transiciones DST acá.
export function horaLocal(nowUtc: Date, timezone: string): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(nowUtc);
  return Number(s === '24' ? '0' : s);
}
export function diaSemanaLocal(nowUtc: Date, timezone: string): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(nowUtc);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(s);
}
export function fechaLocalISO(nowUtc: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowUtc);
}

// Quiet hours: rango que puede cruzar medianoche (23:00 a 07:00) — la hora
// actual está "adentro" si, recorriendo desde start, se llega a la hora
// actual antes que a end.
export function dentroDeQuietHours(horaActual: number, start: string, end: string): boolean {
  const h0 = Number((start || '23:00').slice(0, 2));
  const h1 = Number((end || '07:00').slice(0, 2));
  if (h0 === h1) return false; // rango de 24h configurado igual a igual: no se interpreta como "todo el día"
  if (h0 < h1) return horaActual >= h0 && horaActual < h1;
  return horaActual >= h0 || horaActual < h1; // cruza medianoche
}
// Próxima hora (en punto, UTC) en que termina el quiet hours vigente — para
// REPROGRAMAR (nunca descartar) una notificación que cayó en ese rango.
export function proximaSalidaDeQuietHours(nowUtc: Date, timezone: string, end: string): Date {
  const h1 = Number((end || '07:00').slice(0, 2));
  const horaActual = horaLocal(nowUtc, timezone);
  var horasHastaSalida = h1 - horaActual;
  if (horasHastaSalida <= 0) horasHastaSalida += 24;
  return new Date(nowUtc.getTime() + horasHastaSalida * 3600000);
}
