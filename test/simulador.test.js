// Cursada — tests del simulador de notas (Fase 2), sin navegador.
// src/simulador.js es un script plano (sin módulos, se concatena tal cual
// en el build) — se carga acá con vm.runInContext en vez de import/require
// para no tener que agregarle module.exports (rompería la concatenación
// del build, que lo trata como un <script> más).
// Uso: npm run test:sim (o: node --test test/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(path.join(ROOT, 'src', 'simulador.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'simulador.js' });
const calcularSimulacion = sandbox.calcularSimulacion;

function ev(id, notaMaxima, nota) { return { id: id, notaMaxima: notaMaxima, nota: nota == null ? null : nota }; }

test('caso de uso: 20/25 y 30/30, ¿cuánto falta para aprobar?', () => {
  const esc = { total: 100, aprob: 60 };
  const evaluaciones = [ev('a', 25, 20), ev('b', 30, 30), ev('c', 45, null)];
  const r = calcularSimulacion(esc, evaluaciones, {});
  assert.equal(r.puntosReales, 50);
  assert.equal(r.disponibles, 45); // la que falta calificar, a su máximo
  assert.equal(r.faltanAprobacion, 10); // 60 - 50, con el slider de "c" en su default (0, sin tocar)
  assert.equal(r.imposible, false);
  assert.equal(r.asegurado, false);
});

test('materia sin evaluaciones cargadas', () => {
  const r = calcularSimulacion({ total: 100, aprob: 60 }, [], {});
  assert.equal(r.puntosReales, 0);
  assert.equal(r.disponibles, 0);
  assert.equal(r.promedioNecesario, null); // no hay evaluaciones sobre las que sugerir nada
});

test('suma de nota_maxima distinta del total de la materia — avisa, no rompe', () => {
  const evaluaciones = [ev('a', 50, null), ev('b', 30, null)]; // 80, materia total 100
  const r = calcularSimulacion({ total: 100, aprob: 60 }, evaluaciones, {});
  assert.equal(r.escalaInconsistente, true);
  assert.equal(r.disponibles, 80);
});

test('nota obtenida mayor a la máxima — se acota, no infla el puntaje', () => {
  const evaluaciones = [ev('a', 20, 45)]; // dato inconsistente a propósito (el input ya lo bloquea en la UI)
  const r = calcularSimulacion({ total: 20, aprob: 12 }, evaluaciones, {});
  assert.equal(r.puntosReales, 20);
  assert.equal(r.asegurado, true);
});

test('objetivo matemáticamente imposible', () => {
  const evaluaciones = [ev('a', 30, 10), ev('b', 20, null)]; // techo real = 10 + 20 = 30
  const r = calcularSimulacion({ total: 100, aprob: 60 }, evaluaciones, {});
  assert.equal(r.imposible, true);
  assert.equal(r.promedioNecesario, null); // ya imposible, no tiene sentido sugerir un promedio
});

test('objetivo ya asegurado con lo real, sin depender de lo que falta', () => {
  const evaluaciones = [ev('a', 50, 50), ev('b', 30, 15), ev('c', 20, null)];
  const r = calcularSimulacion({ total: 100, aprob: 60 }, evaluaciones, {});
  assert.equal(r.puntosReales, 65);
  assert.equal(r.asegurado, true);
  assert.equal(r.faltanAprobacion, 0);
});

test('exoneración: opcional, y se puede alcanzar aparte de la aprobación', () => {
  const evaluaciones = [ev('a', 50, 45), ev('b', 50, null)];
  const r = calcularSimulacion({ total: 100, aprob: 60, exoneracion: 90 }, evaluaciones, {});
  assert.equal(r.faltanExoneracion, 45); // 90 - 45, con "b" todavía en su default (0)
  const materiaSinExoneracion = calcularSimulacion({ total: 100, aprob: 60 }, evaluaciones, {});
  assert.equal(materiaSinExoneracion.faltanExoneracion, null);
});

test('promedio necesario en las evaluaciones restantes', () => {
  const evaluaciones = [ev('a', 30, 20), ev('b', 30, null), ev('c', 40, null)];
  const r = calcularSimulacion({ total: 100, aprob: 60 }, evaluaciones, {});
  // faltan 40 puntos (60-20) repartidos entre 2 evaluaciones sin nota → 20 c/u
  assert.equal(r.promedioNecesario, 20);
});

test('división por cero: escala de la materia en 0 no rompe', () => {
  const r = calcularSimulacion({ total: 0, aprob: 0 }, [ev('a', 10, null)], {});
  assert.equal(r.imposible, false);
  assert.equal(r.faltanAprobacion, null);
  assert.equal(r.faltanExoneracion, null);
});

test('el slider proyecta el escenario simulado sin tocar lo real', () => {
  const evaluaciones = [ev('a', 25, 20), ev('b', 30, 30), ev('c', 45, null)];
  const r = calcularSimulacion({ total: 100, aprob: 60 }, evaluaciones, { c: 40 });
  assert.equal(r.puntosReales, 50); // no cambia
  assert.equal(r.puntosProyectados, 90); // 20 + 30 + 40
  assert.equal(r.faltanAprobacion, 0);
});

test('decimales: la suma no arrastra error de punto flotante perceptible', () => {
  const evaluaciones = [ev('a', 12, 10.5), ev('b', 12, null)];
  const r = calcularSimulacion({ total: 24, aprob: 12 }, evaluaciones, { b: 6.2 });
  assert.ok(Math.abs(r.puntosProyectados - 16.7) < 1e-9);
});
