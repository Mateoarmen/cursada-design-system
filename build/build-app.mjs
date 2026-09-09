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
// "Apple"), así que no hace falta descargar ni embeber nada — el resto de
// la marca (colores, isotipo, favicon) se mantiene igual.
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
const FAVICON_B64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMkM3QkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBBNjNGMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTgiIGZpbGw9InVybCgjZykiLz4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1kYXNoYXJyYXk9IjY2IDIyIiB0cmFuc2Zvcm09InJvdGF0ZSg0NSAzMiAzMikiLz4KPC9zdmc+Cg==';

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
<meta name="theme-color" content="#0A63F0">
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
