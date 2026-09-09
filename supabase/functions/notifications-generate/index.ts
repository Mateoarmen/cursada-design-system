// Cursada — Edge Function notifications-generate. Corre cada hora vía
// pg_cron (ver migración notificaciones_schema). Para cada usuario con
// preferencias activas, busca evaluaciones/tareas/eventos personales
// dentro de su ventana de anticipación e inserta filas en
// notification_queue (dedupe real vía insertar_notificacion(), ver esa
// RPC). Separada de notifications-send a propósito (Parte 5): así se puede
// reintentar el envío sin volver a generar.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { contenidoEntidad, deepLinkDigest, deepLinkEntidad, diaSemanaLocal, horaLocal } from '../_shared/notif-core.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Hora local fija para los resúmenes — corre a diario a las 20:00, semanal
// los domingos a las 20:00 (mismo horario, sólo cambia el día). El cron es
// hourly, así que comparar contra esta hora alcanza para que dispare una
// sola vez por día/semana sin necesitar un cron aparte.
const HORA_RESUMEN = 20;

function horasHasta(fecha: string, hora: string | null, now: Date): number | null {
  const horaStr = hora && hora.length >= 4 ? hora : '23:59';
  const target = new Date(fecha + 'T' + horaStr + ':00');
  if (isNaN(target.getTime())) return null;
  return (target.getTime() - now.getTime()) / 3600000;
}

async function insertar(row: {
  user_id: string; event_type: string; channel: string; entity_type: string; entity_id: string | null;
  title: string; body: string; deep_link: string; scheduled_for: string; status: string;
}) {
  const { data, error } = await supabase.rpc('insertar_notificacion', {
    p_user_id: row.user_id, p_event_type: row.event_type, p_channel: row.channel, p_entity_type: row.entity_type,
    p_entity_id: row.entity_id, p_title: row.title, p_body: row.body, p_deep_link: row.deep_link,
    p_scheduled_for: row.scheduled_for, p_status: row.status
  });
  if (error) { console.warn('insertar_notificacion error:', error.message); return null; }
  return data as string | null; // null = ya existía (ON CONFLICT DO NOTHING)
}

async function generarEntidadProxima(userId: string, eventType: 'evaluacion_proxima' | 'tarea_proxima' | 'evento_personal_proximo', prefsUsuario: any[], now: Date) {
  const entityKind = eventType === 'evaluacion_proxima' ? 'evaluacion' : eventType === 'tarea_proxima' ? 'tarea' : 'evento_personal';
  let items: { id: string; titulo: string; fecha: string; hora: string | null; materiaId: string | null }[] = [];
  if (entityKind === 'evento_personal') {
    const { data } = await supabase.from('personal').select('id,titulo,fecha,hora').eq('user_id', userId);
    items = (data || []).map((p: any) => ({ id: p.id, titulo: p.titulo, fecha: p.fecha, hora: p.hora, materiaId: null }));
  } else {
    const { data } = await supabase.from('agenda').select('id,titulo,fecha,hora,materia_id,hecho').eq('user_id', userId).eq('kind', entityKind).eq('hecho', false);
    items = (data || []).map((a: any) => ({ id: a.id, titulo: a.titulo, fecha: a.fecha, hora: a.hora, materiaId: a.materia_id }));
  }
  if (!items.length) return 0;

  // Nombres de materia resueltos una sola vez por usuario, no por ítem.
  const materiaIds = Array.from(new Set(items.map((i) => i.materiaId).filter(Boolean))) as string[];
  const nombresPorId: Record<string, string> = {};
  if (materiaIds.length) {
    const { data: materias } = await supabase.from('materias').select('id,nombre').in('id', materiaIds);
    (materias || []).forEach((m: any) => { nombresPorId[m.id] = m.nombre; });
  }

  let count = 0;
  for (const channel of ['inapp', 'push']) {
    const pref = prefsUsuario.find((p) => p.event_type === eventType && p.channel === channel && p.enabled);
    if (!pref) continue;
    // In-app no tiene "anticipación" configurable (Parte 1: lead_time_hours
    // queda null en esas filas) — se muestra todo lo pendiente sin ventana,
    // el usuario ya lo ve resuelto por fecha en Agenda; push sí respeta el
    // lead_time_hours configurado.
    const leadH = channel === 'push' ? (pref.lead_time_hours ?? 24) : 24 * 30;
    for (const item of items) {
      const aheadHoras = horasHasta(item.fecha, item.hora, now);
      if (aheadHoras == null || aheadHoras < 0 || aheadHoras > leadH) continue;
      const materiaNombre = item.materiaId ? nombresPorId[item.materiaId] ?? null : null;
      const { title, body } = contenidoEntidad({ entityType: entityKind as any, entityId: item.id, titulo: item.titulo, materiaNombre, fecha: item.fecha, hora: item.hora }, aheadHoras);
      const id = crypto.randomUUID();
      const inserted = await insertar({
        user_id: userId, event_type: eventType, channel, entity_type: entityKind, entity_id: item.id,
        title, body, deep_link: deepLinkEntidad(id, item.id), scheduled_for: now.toISOString(),
        status: channel === 'inapp' ? 'sent' : 'pending'
      });
      if (inserted) count++;
    }
  }
  return count;
}

async function generarResumen(userId: string, eventType: 'resumen_diario' | 'resumen_semanal', prefsUsuario: any[], now: Date) {
  const ventanaHoras = eventType === 'resumen_diario' ? 24 : 24 * 7;
  let count = 0;
  for (const channel of ['inapp', 'push']) {
    const pref = prefsUsuario.find((p) => p.event_type === eventType && p.channel === channel && p.enabled);
    if (!pref) continue;
    if (horaLocal(now, pref.timezone) !== HORA_RESUMEN) continue;
    if (eventType === 'resumen_semanal' && diaSemanaLocal(now, pref.timezone) !== 0) continue;
    // Dedupe de los resúmenes: entity_id queda NULL (no hay una entidad
    // real puntual) y el índice único de notification_queue no detecta
    // conflictos con NULL (comportamiento estándar de Postgres) — se
    // chequea acá a mano que no exista ya uno de hoy antes de insertar.
    const desde = new Date(now.getTime() - 3 * 3600000).toISOString(); // margen: el cron corre en punto, no siempre exacto
    const { data: yaExiste } = await supabase.from('notification_queue').select('id').eq('user_id', userId).eq('event_type', eventType).eq('channel', channel).gte('scheduled_for', desde).limit(1);
    if (yaExiste && yaExiste.length) continue;

    const { data: evals } = await supabase.from('agenda').select('id,titulo,fecha,hora').eq('user_id', userId).eq('hecho', false);
    const { data: personales } = await supabase.from('personal').select('id,titulo,fecha,hora').eq('user_id', userId);
    const limiteMs = now.getTime() + ventanaHoras * 3600000;
    const proximos = [...(evals || []), ...(personales || [])].filter((it: any) => {
      const t = new Date(it.fecha + 'T' + (it.hora || '23:59') + ':00').getTime();
      return t >= now.getTime() && t <= limiteMs;
    });
    if (!proximos.length) continue;
    const titulo = eventType === 'resumen_diario' ? 'Tenés ' + proximos.length + (proximos.length === 1 ? ' entrega mañana' : ' entregas mañana') : 'Tenés ' + proximos.length + (proximos.length === 1 ? ' entrega esta semana' : ' entregas esta semana');
    const id = crypto.randomUUID();
    const inserted = await insertar({
      user_id: userId, event_type: eventType, channel, entity_type: 'digest', entity_id: null,
      title: titulo, body: 'Revisá tu agenda para no perderte nada.', deep_link: deepLinkDigest(id),
      scheduled_for: now.toISOString(), status: channel === 'inapp' ? 'sent' : 'pending'
    });
    if (inserted) count++;
  }
  return count;
}

Deno.serve(async (_req) => {
  const now = new Date();
  const { data: prefs, error } = await supabase.from('notification_preferences').select('*').eq('enabled', true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const porUsuario = new Map<string, any[]>();
  for (const p of prefs || []) {
    if (!porUsuario.has(p.user_id)) porUsuario.set(p.user_id, []);
    porUsuario.get(p.user_id)!.push(p);
  }

  let insertadas = 0;
  for (const [userId, userPrefs] of porUsuario) {
    insertadas += await generarEntidadProxima(userId, 'evaluacion_proxima', userPrefs, now);
    insertadas += await generarEntidadProxima(userId, 'tarea_proxima', userPrefs, now);
    insertadas += await generarEntidadProxima(userId, 'evento_personal_proximo', userPrefs, now);
    insertadas += await generarResumen(userId, 'resumen_diario', userPrefs, now);
    insertadas += await generarResumen(userId, 'resumen_semanal', userPrefs, now);
  }

  return new Response(JSON.stringify({ ok: true, usuarios: porUsuario.size, insertadas }), { headers: { 'Content-Type': 'application/json' } });
});
