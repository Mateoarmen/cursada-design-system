// Cursada — build/build-test.mjs
// Node 18+. Sin dependencias externas.
//
// Qué hace:
//   Variante de build-app.mjs para probar la UI autenticada sin depender de
//   Supabase real ni de confirmación de email: concatena src/app.html +
//   src/styles.css + src/seed.js + src/runtime.js, pero en vez del SDK real
//   + supabase-client.js usa test-harness/mock-supabase-client.js (mismo
//   `window.CURSADA_SUPABASE`, en memoria, con datos de ejemplo — 2
//   semestres, materias en varias escalas de nota, evaluaciones pendientes
//   y con nota, personal). No es parte del entregable — genera
//   out/Cursada.test.html, un archivo aparte del out/Cursada.html real
//   (gitignorado, ver .gitignore).
//
// Uso: npm run build:test  (o: node build/build-test.mjs)
// Extra: abrí con ?nosession=1 en la URL para arrancar deslogueado (probar
// la pantalla de auth) en vez del auto-login que usa el resto del harness.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'out');

async function main() {
  const [appHtml, stylesCss, mockJs, seedJs, simuladorJs, runtimeJs] = await Promise.all([
    readFile(path.join(SRC, 'app.html'), 'utf8'),
    readFile(path.join(SRC, 'styles.css'), 'utf8'),
    readFile(path.join(ROOT, 'test-harness', 'mock-supabase-client.js'), 'utf8'),
    readFile(path.join(SRC, 'seed.js'), 'utf8'),
    readFile(path.join(SRC, 'simulador.js'), 'utf8'),
    readFile(path.join(SRC, 'runtime.js'), 'utf8')
  ]);

  const html = `<!DOCTYPE html>
<html lang="es-UY">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cursada (test)</title>
<style>
${stylesCss}
</style>
</head>
<body>
${appHtml}
<script src="https://cdn.jsdelivr.net/npm/libphonenumber-js@1.11.9/bundle/libphonenumber-js.min.js"></script>
<script>
${mockJs}
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
  const outPath = path.join(OUT, 'Cursada.test.html');
  await writeFile(outPath, html, 'utf8');
  console.log('[build-test] listo → ' + path.relative(ROOT, outPath));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
