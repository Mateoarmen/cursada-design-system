// Cursada — build/build-app.mjs
// Node 18+. Sin dependencias externas (usa fs/path nativos).
//
// Qué hace:
//   Concatena src/app.html (chrome + <template>) + src/styles.css +
//   src/supabase-client.js + src/seed.js + src/simulador.js + src/runtime.js
//   en un único out/Cursada.html, con el favicon de marca embebido.
//   src/simulador.js va ANTES que runtime.js (Fase 2): es la función pura
//   del simulador de notas, sin IIFE propio a propósito, para que quede
//   como función global del documento y runtime.js la llame por nombre —
//   así también se puede testear con `npm run test:sim` sin navegador.
//
// Nota de historial: el turno 3 (marca, Cursada Marca.dc.html) había hecho
// que este script descargara dos tipografías propias (Manrope + IBM Plex
// Mono) desde Google Fonts en build time. A pedido del usuario esa parte se
// revirtió: la tipografía volvió a ser una sola pila del sistema (turno 2,
// "Apple").
//
// Redisño Hallmark (ver design.md, proyecto completo): a pedido explícito
// del usuario esa reversión se deshace — la tipografía de sistema se sentía
// "genérica" y el pedido esta vez fue una pareja propia (Instrument Sans +
// JetBrains Mono) en las tres superficies del proyecto (landing, app,
// legal). A diferencia del turno 3, no se descarga nada en build time: se
// agrega un <link> a Google Fonts en el <head> (mismo patrón que
// build-landing.mjs/build-legal.mjs) — no hace falta bundlear ni tocar el
// pipeline de Node. Si la red no responde, la pila de fallback en
// styles.css cae a la fuente de sistema.
//
// Cambio de arquitectura (migración a Supabase): el entregable dejó de ser
// 100% offline. Necesita el SDK de supabase-js en el navegador, así que este
// script agrega un <script src> a un CDN (jsdelivr) antes de
// src/supabase-client.js. No hace falta bundlear ni agregar un paso de
// compilación nuevo.
//
// Teléfono con prefijo de país (bloque A): mismo patrón — se agrega el
// bundle standalone de libphonenumber-js (sin bundler, expone el global
// `window.libphonenumber`) por CDN, antes de runtime.js. Son las únicas dos
// llamadas de red que agrega el build en sí (además de las que la propia
// app hace en runtime contra Supabase).
//
// Uso: npm run build:app  (o: node build/build-app.mjs)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'out');

// Favicon: el isotipo de marca (anillo abierto sobre tile azul), como SVG
// embebido directo — no depende de ningún archivo de assets/.
// El anillo se dibuja con un <path> (arco explícito) en vez de
// stroke-dasharray sobre un <circle>: dasharray arranca el patrón a las 3
// en punto (0°) por espec de SVG, mientras que el ::after de la marca real
// (.sidenav-brand .mark, ver styles.css) usa border-top-color:transparent,
// que arranca el hueco arriba (12 en punto) antes de rotar 45°. La versión
// vieja combinaba ambos rotate(45) sin corregir ese desfasaje de 90°, así
// que el hueco quedaba mirando a la derecha (una "C" derecha) en vez de en
// diagonal como en el logo real — reportado por el usuario comparando el
// favicon de la pestaña contra el isotipo de la app. El path de acá arranca
// el hueco arriba (mismo punto de partida que el CSS) antes del mismo
// rotate(45 32 32), así los dos coinciden.
const FAVICON_B64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMkM3QkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBBNjNGMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTgiIGZpbGw9InVybCgjZykiLz4KICA8cGF0aCBkPSJNIDQxLjkgMjIuMSBBIDE0IDE0IDAgMSAxIDIyLjEgMjIuMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgdHJhbnNmb3JtPSJyb3RhdGUoNDUgMzIgMzIpIi8+Cjwvc3ZnPgo=';

async function main() {
  const [appHtml, stylesCss, supabaseClientJs, seedJs, simuladorJs, runtimeJs] = await Promise.all([
    readFile(path.join(SRC, 'app.html'), 'utf8'),
    readFile(path.join(SRC, 'styles.css'), 'utf8'),
    readFile(path.join(SRC, 'supabase-client.js'), 'utf8'),
    readFile(path.join(SRC, 'seed.js'), 'utf8'),
    readFile(path.join(SRC, 'simulador.js'), 'utf8'),
    readFile(path.join(SRC, 'runtime.js'), 'utf8')
  ]);

  const html = `<!DOCTYPE html>
<html lang="es-UY">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cursada</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${FAVICON_B64}">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" id="meta-theme-color" content="#EDEDF0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400..600&display=swap">
<style>
${stylesCss}
</style>
</head>
<body>
${appHtml}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/libphonenumber-js@1.11.9/bundle/libphonenumber-js.min.js"></script>
<script>
${supabaseClientJs}
</script>
<script>
${seedJs}
</script>
<script>
${simuladorJs}
</script>
<script>
${runtimeJs}
</script>
</body>
</html>
`;

  await mkdir(OUT, { recursive: true });
  const outPath = path.join(OUT, 'Cursada.html');
  await writeFile(outPath, html, 'utf8');
  const sizeMb = (Buffer.byteLength(html, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log('[build] listo → ' + path.relative(ROOT, outPath) + ' (' + sizeMb + ' MB)');
  if (Number(sizeMb) > 25) {
    console.warn('[build] AVISO: el archivo supera los 25 MB pedidos en el entregable.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
