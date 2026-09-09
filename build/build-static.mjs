// Cursada — build/build-static.mjs
// Node 18+. Sin dependencias externas.
//
// Qué hace:
//   Copia a out/ los archivos que tienen que servirse sueltos desde la raíz
//   del sitio (no concatenados en Cursada.html): sw.js (scope de Service
//   Worker sobre toda la app), manifest.json y los íconos de la PWA. out/ ya
//   se sirve como directorio estático completo (ver build-landing.mjs), así
//   que estos archivos quedan disponibles en /sw.js, /manifest.json, etc.
//   sin configuración adicional del lado del hosting.
//
// Uso: npm run build:static  (o: node build/build-static.mjs)

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'out');

const FILES = ['sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'badge.png'];

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const name of FILES) {
    await copyFile(path.join(ROOT, name), path.join(OUT, name));
  }
  console.log('[build] listo → ' + FILES.map((f) => 'out/' + f).join(', '));
}

main().catch((err) => {
  console.error('[build] error:', err);
  process.exit(1);
});
