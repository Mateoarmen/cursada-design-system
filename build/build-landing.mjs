// Cursada — build/build-landing.mjs
// Node 18+. Sin dependencias externas (usa fs/path nativos).
//
// Qué hace:
//   Envuelve src/landing.html (chrome + <style> + <script>, ya autocontenido)
//   con el doctype/head/favicon de marca y lo escribe en out/index.html —
//   index.html, no landing.html, a propósito: es la pantalla de entrada de
//   toda la plataforma (lo que sirve cualquier hosting estático por defecto
//   en la raíz del dominio), la app autenticada (out/Cursada.html) es un
//   paso posterior, no la puerta de entrada. Sus botones "Crear mi
//   cuenta"/"Iniciar sesión" apuntan a Cursada.html con una ruta relativa,
//   así que los dos archivos tienen que servirse desde el mismo directorio.
//   A diferencia de build-app.mjs, no concatena varios archivos: la landing
//   es una única página estática sin dependencias de Supabase ni de otros
//   módulos de src/, así que no hace falta más que este envoltorio.
//
// Uso: npm run build:landing  (o: node build/build-landing.mjs)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'out');

// Mismo isotipo que build-app.mjs — un solo favicon de marca para toda la
// entrega (la app y la landing). Ver el comentario de ese archivo: el
// hueco del anillo se corrigió de "mirando a la derecha" a la diagonal
// real del isotipo (.sidenav-brand .mark en styles.css).
const FAVICON_B64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMkM3QkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBBNjNGMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTgiIGZpbGw9InVybCgjZykiLz4KICA8cGF0aCBkPSJNIDQxLjkgMjIuMSBBIDE0IDE0IDAgMSAxIDIyLjEgMjIuMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgdHJhbnNmb3JtPSJyb3RhdGUoNDUgMzIgMzIpIi8+Cjwvc3ZnPgo=';

async function main() {
  const landingHtml = await readFile(path.join(SRC, 'landing.html'), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="es-UY">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cursada — Tu semestre, bajo control</title>
<meta name="description" content="Materias, notas, parciales y entregas en un solo lugar. Cursada te dice cuánto te falta para aprobar.">
<meta property="og:type" content="website">
<meta property="og:title" content="Cursada — Tu semestre, bajo control">
<meta property="og:description" content="Materias, notas, parciales y entregas en un solo lugar. Cursada te dice cuánto te falta para aprobar.">
<!-- Ruta relativa a propósito: og:image debería ser absoluta, pero el
     proyecto todavía no tiene dominio propio (ver README, "Qué falta para
     producción real") — cuando lo tenga, cambiar esto a la URL completa. -->
<meta property="og:image" content="og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Cursada — Tu semestre, bajo control">
<meta name="twitter:description" content="Materias, notas, parciales y entregas en un solo lugar. Cursada te dice cuánto te falta para aprobar.">
<meta name="twitter:image" content="og-image.png">
<meta name="theme-color" id="meta-theme-color" content="#FFFFFF">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${FAVICON_B64}">
<!-- Redisño Hallmark (ver design.md): pareja tipográfica propia (Instrument
     Sans + JetBrains Mono) en vez de la pila de sistema — a pedido
     explícito del usuario, revierte la decisión anterior de build-app.mjs
     (ver ese archivo) de no depender de fuentes externas. preconnect
     reduce la latencia de la primera carga; la pila de fallback en
     styles.css/landing.html cae a system-ui si la red no responde. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400..600&display=swap">
</head>
<body>
${landingHtml}
</body>
</html>
`;

  await mkdir(OUT, { recursive: true });
  const outPath = path.join(OUT, 'index.html');
  await writeFile(outPath, html, 'utf8');
  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log('[build] listo → ' + path.relative(ROOT, outPath) + ' (' + sizeKb + ' KB)');
}

main().catch(err => {
  console.error('[build] error:', err);
  process.exit(1);
});
