// Cursada — Edge Function notifications-send. Corre cada 15 minutos vía
// pg_cron. Toma las filas `pending` de notification_queue (channel push,
// scheduled_for <= now) y aplica, EN ESTE ORDEN, los filtros de supresión
// de _shared/notif-core.ts antes de mandar nada: quiet hours (reprograma,
// nunca descarta) → cap diario → agregación. Recién ahí firma con VAPID y
// manda el push.
//
// La supresión por actividad reciente (last_seen_at) se sacó a pedido
// explícito: aunque el usuario haya abierto la app hace poco, igual quiere
// el push.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';
import { CAP_DIARIO_PUSH, dentroDeQuietHours, horaLocal, proximaSalidaDeQuietHours } from '../_shared/notif-core.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@cursada.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

async function marcarSuprimidas(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('notification_queue').update({ status: 'suppressed' }).in('id', ids);
}

async function procesarUsuario(userId: string, notifs: any[], now: Date) {
  let enviadas = 0, suprimidas = 0, fallidas = 0, reprogramadas = 0;

  const { data: pref } = await supabase.from('notification_preferences').select('timezone,quiet_hours_start,quiet_hours_end').eq('user_id', userId).eq('channel', 'push').limit(1).maybeSingle();
  const tz = pref?.timezone || 'America/Montevideo';
  const qStart = pref?.quiet_hours_start || '23:00';
  const qEnd = pref?.quiet_hours_end || '07:00';

  // 1) Quiet hours — reprogramar, no descartar.
  if (dentroDeQuietHours(horaLocal(now, tz), qStart, qEnd)) {
    const nuevaHora = proximaSalidaDeQuietHours(now, tz, qEnd);
    const ids = notifs.map((n) => n.id);
    await supabase.from('notification_queue').update({ scheduled_for: nuevaHora.toISOString() }).in('id', ids);
    return { enviadas: 0, suprimidas: 0, fallidas: 0, reprogramadas: ids.length };
  }

  // 2) Cap diario — seguro contra bugs del cron, no regla de producto.
  const desdeHoyUTC = new Date(now); desdeHoyUTC.setUTCHours(0, 0, 0, 0);
  const { count: yaHoy } = await supabase.from('notification_queue').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('channel', 'push').eq('status', 'sent').gte('sent_at', desdeHoyUTC.toISOString());
  const cupo = Math.max(0, CAP_DIARIO_PUSH - (yaHoy || 0));
  if (cupo <= 0) {
    await marcarSuprimidas(notifs.map((n) => n.id));
    return { enviadas: 0, suprimidas: notifs.length, fallidas: 0, reprogramadas: 0 };
  }
  let aEnviar = notifs;
  let sobrantes: any[] = [];
  if (notifs.length > cupo) { sobrantes = notifs.slice(cupo); aEnviar = notifs.slice(0, cupo); }

  // 3) Agregación — 3+ en la misma tanda, un solo push agrupado.
  type Payload = { title: string; body: string; url: string; tag: string; ids: string[] };
  let payloads: Payload[];
  if (aEnviar.length >= 3) {
    payloads = [{
      title: 'Tenés ' + aEnviar.length + ' avisos nuevos',
      body: aEnviar.map((n) => n.title).slice(0, 3).join(' · '),
      url: '/Cursada#agenda', tag: 'cursada-agrupado', ids: aEnviar.map((n) => n.id)
    }];
  } else {
    payloads = aEnviar.map((n) => ({ title: n.title, body: n.body, url: '/Cursada' + (n.deep_link || ''), tag: 'cursada-' + (n.entity_id || n.id), ids: [n.id] }));
  }

  const { data: devices } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
  for (const payload of payloads) {
    let algunEnvioOk = false;
    for (const device of devices || []) {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify({ title: payload.title, body: payload.body, icon: '/icon-192.png', badge: '/badge.png', url: payload.url, tag: payload.tag })
        );
        algunEnvioOk = true;
        await supabase.from('push_subscriptions').update({ last_success_at: now.toISOString(), failure_count: 0 }).eq('id', device.id);
      } catch (e: any) {
        // 404/410: el endpoint ya no existe (desinstaló, revocó el permiso,
        // etc.) — borrar la fila. Si no, la tabla se llena de endpoints
        // zombis y el job se degrada solo (obligatorio, ver enunciado).
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().in('id', [device.id]);
        } else {
          const nuevoFail = (device.failure_count || 0) + 1;
          if (nuevoFail >= 5) await supabase.from('push_subscriptions').delete().in('id', [device.id]);
          else await supabase.from('push_subscriptions').update({ failure_count: nuevoFail }).eq('id', device.id);
        }
      }
    }
    if (algunEnvioOk) {
      await supabase.from('notification_queue').update({ status: 'sent', sent_at: now.toISOString() }).in('id', payload.ids);
      enviadas += payload.ids.length;
    } else {
      await supabase.from('notification_queue').update({ status: 'failed', error: 'Sin dispositivos activos o todos fallaron.' }).in('id', payload.ids);
      fallidas += payload.ids.length;
    }
  }
  if (sobrantes.length) { await marcarSuprimidas(sobrantes.map((n) => n.id)); suprimidas += sobrantes.length; }

  return { enviadas, suprimidas, fallidas, reprogramadas };
}

Deno.serve(async (_req) => {
  const now = new Date();
  const { data: pendientes, error } = await supabase
    .from('notification_queue').select('*')
    .eq('channel', 'push').eq('status', 'pending').lte('scheduled_for', now.toISOString());
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!pendientes || !pendientes.length) return new Response(JSON.stringify({ ok: true, procesadas: 0 }), { headers: { 'Content-Type': 'application/json' } });

  const porUsuario = new Map<string, any[]>();
  for (const n of pendientes) {
    if (!porUsuario.has(n.user_id)) porUsuario.set(n.user_id, []);
    porUsuario.get(n.user_id)!.push(n);
  }

  const totales = { enviadas: 0, suprimidas: 0, fallidas: 0, reprogramadas: 0 };
  for (const [userId, notifs] of porUsuario) {
    const r = await procesarUsuario(userId, notifs, now);
    totales.enviadas += r.enviadas; totales.suprimidas += r.suprimidas; totales.fallidas += r.fallidas; totales.reprogramadas += r.reprogramadas;
  }

  return new Response(JSON.stringify({ ok: true, ...totales }), { headers: { 'Content-Type': 'application/json' } });
});
