/*
 * Cursada — cliente de Supabase. Inicializa el SDK (cargado antes que este
 * archivo, vía CDN, en build/build-app.mjs) y lo expone en
 * `window.CURSADA_SUPABASE` para que lo use src/runtime.js. Nada más vive
 * acá — así las credenciales no quedan repetidas en varios lugares.
 *
 * SUPABASE_ANON_KEY es pública por diseño (vive en el código del cliente);
 * la seguridad real la da Row Level Security en las tablas, no el secreto de
 * esta clave.
 */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://kbihslsbzyhyiroyzxxq.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWhzbHNienloeWlyb3l6eHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDMzOTksImV4cCI6MjEwMzY3OTM5OX0.pDCnRaahs6xyJuZrIunc1FBpXHDsrfaw_RoaiBMoj3M';

  window.CURSADA_SUPABASE = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
