/*
 * Cursada — cálculo puro del simulador de escenario (Fase 2). Sin DOM, sin
 * Supabase, sin STATE — sólo números, para poder testearlo con
 * `npm run test:sim` (node --test) sin levantar un navegador. Se concatena
 * en el build (ver build/build-app.mjs y build/build-test.mjs) en un
 * <script> propio, ANTES que runtime.js: `calcularSimulacion` queda como
 * función global del documento, igual que cualquier otra declarada en un
 * <script> sin módulos — runtime.js la llama por nombre sin namespacing.
 *
 * Modelo (mismo para las 3 escalas de materia — nota/pct/puntos son sólo la
 * unidad con la que se muestra, la suma de puntos es igual): cada
 * evaluación (agenda.kind==='evaluacion') tiene su propia nota_maxima
 * (Fase 1); el simulador suma puntos, no promedia — "20/25 en una y 30/30
 * en otra" son 50 puntos, no un promedio de 25 y 30. `esc.total`/`esc.aprob`
 * (y `esc.exoneracion`, opcional) son umbrales de PUNTOS definidos en la
 * materia, nunca recalculados desde las evaluaciones.
 */
'use strict';

// esc: {total, aprob, exoneracion?}. evaluaciones: [{id, notaMaxima, nota}]
// (nota null = todavía sin calificar). valoresSimulados: {id: number} — el
// valor ACTUAL del slider de cada evaluación (quien llama decide el default
// de las que no tienen nota real; las que sí tienen arrancan en su nota,
// pero también se pueden simular — ver README, Fase 2).
function calcularSimulacion(esc, evaluaciones, valoresSimulados) {
  esc = esc || {};
  evaluaciones = evaluaciones || [];
  valoresSimulados = valoresSimulados || {};
  var total = Number(esc.total) || 0;
  var aprob = Number(esc.aprob) || 0;
  var exoneracion = esc.exoneracion != null ? Number(esc.exoneracion) : null;

  var puntosReales = 0;    // suma de nota real (ya calificadas) — fija, no la mueve el slider de otras filas
  var disponibles = 0;     // suma de nota_maxima de las SIN nota real — el techo de lo que todavía se puede ganar
  var sumaNotaMaxima = 0;  // suma de nota_maxima de TODAS — para el aviso de inconsistencia con esc.total
  var puntosProyectados = 0; // suma de lo que dice CADA slider ahora mismo (real si no se tocó, simulado si se tocó)

  evaluaciones.forEach(function (e) {
    var notaMaxima = Number(e.notaMaxima) || 0;
    sumaNotaMaxima += notaMaxima;
    var tieneNota = e.nota != null;
    // Clamp defensivo: el input ya bloquea nota > nota_maxima (Fase 1/2),
    // esto es sólo la red de seguridad para que un dato inconsistente no
    // rompa la cuenta.
    var notaReal = tieneNota ? Math.max(0, Math.min(Number(e.nota), notaMaxima)) : null;
    if (tieneNota) puntosReales += notaReal; else disponibles += notaMaxima;
    var simulado = valoresSimulados[e.id];
    var valorProyectado = simulado != null ? Number(simulado) : (tieneNota ? notaReal : 0);
    puntosProyectados += Math.max(0, Math.min(valorProyectado, notaMaxima));
  });

  // "Imposible"/"asegurado" son propiedades de lo YA REAL (ignoran dónde
  // están los sliders ahora mismo) — no deberían prenderse y apagarse sólo
  // porque alguien arrastró un slider para abajo. El slider (puntosProyectados)
  // es para explorar el rango entre esos dos extremos, no para decidirlos.
  var techoMaximoPosible = puntosReales + disponibles;
  var imposible = total > 0 && techoMaximoPosible < aprob;
  var asegurado = total > 0 && puntosReales >= aprob;
  var exonerado = exoneracion != null && total > 0 && puntosReales >= exoneracion;

  var evaluacionesSinNota = evaluaciones.filter(function (e) { return e.nota == null; });
  var promedioNecesario = null;
  if (evaluacionesSinNota.length && !imposible && !asegurado) {
    promedioNecesario = Math.max(0, aprob - puntosReales) / evaluacionesSinNota.length;
  }

  return {
    puntosReales: puntosReales,
    puntosProyectados: puntosProyectados,
    total: total,
    aprob: aprob,
    exoneracion: exoneracion,
    disponibles: disponibles,
    faltanAprobacion: total > 0 ? Math.max(0, aprob - puntosProyectados) : null,
    faltanExoneracion: (exoneracion != null && total > 0) ? Math.max(0, exoneracion - puntosProyectados) : null,
    imposible: imposible,
    asegurado: asegurado,
    exonerado: exonerado,
    promedioNecesario: promedioNecesario,
    escalaInconsistente: total > 0 && sumaNotaMaxima !== total
  };
}
