// Cursada — build/build-legal.mjs
// Node 18+. Sin dependencias externas.
//
// Qué hace:
//   Envuelve src/legal.html (privacidad + términos, autocontenido, mismo
//   patrón que src/landing.html) con el doctype/head/favicon de marca y lo
//   escribe en out/legal.html. Página estática sin dependencias de Supabase
//   — igual que build-landing.mjs, no concatena nada más de src/.
//
// Uso: npm run build:legal  (o: node build/build-legal.mjs)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'out');

// Mismo isotipo que build-app.mjs/build-landing.mjs — un solo favicon de
// marca para toda la entrega. Ver el comentario en build-app.mjs: el hueco
// del anillo se corrigió a la diagonal real del isotipo.
const FAVICON_B64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMkM3QkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBBNjNGMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTgiIGZpbGw9InVybCgjZykiLz4KICA8cGF0aCBkPSJNIDQxLjkgMjIuMSBBIDE0IDE0IDAgMSAxIDIyLjEgMjIuMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgdHJhbnNmb3JtPSJyb3RhdGUoNDUgMzIgMzIpIi8+Cjwvc3ZnPgo=';

async function main() {
  const legalHtml = await readFile(path.join(SRC, 'legal.html'), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="es-UY">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cursada — Privacidad y términos</title>
<meta name="description" content="Qué datos guarda Cursada, dónde viven y cómo exportarlos o borrarlos — y las condiciones de uso de la app.">
<meta name="theme-color" id="meta-theme-color" content="#FFFFFF">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${FAVICON_B64}">
<!-- Ver build-landing.mjs: misma pareja tipográfica del redisño Hallmark. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400..600&display=swap">
</head>
<body>
${legalHtml}
</body>
</html>
`;

  await mkdir(OUT, { recursive: true });
  const outPath = path.join(OUT, 'legal.html');
  await writeFile(outPath, html, 'utf8');
  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log('[build] listo → ' + path.relative(ROOT, outPath) + ' (' + sizeKb + ' KB)');
}

main().catch(err => {
  console.error('[build] error:', err);
  process.exit(1);
});
