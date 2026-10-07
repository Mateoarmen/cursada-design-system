# Cuadernos de apuntes — referencia de backend

Contrato compartido entre la web (`src/apuntes.js`) y la app iOS (Expo).
Migraciones: `supabase/migrations/20261006120000_apuntes_tablas.sql` y
`20261006120100_apuntes_storage.sql` (ya aplicadas en el proyecto
`kbihslsbzyhyiroyzxxq`).

## Constantes

| Qué | Valor | Dónde vive (fuente de verdad) |
|---|---|---|
| Cuota total por usuario | 500 MB (524 288 000 bytes) | `public.apuntes_cuota_bytes()`. El cliente la lee de `uso_almacenamiento()`, **nunca la hardcodea** |
| Tamaño máximo por archivo | 20 MB (20 971 520 bytes) | `storage.buckets.file_size_limit` del bucket `apuntes`. El cliente lo repite solo para avisar antes de subir |
| Tipos permitidos | ver tabla de MIME abajo | `storage.buckets.allowed_mime_types` |
| Autoguardado (web) | debounce de 1,5 s, reintento con backoff de 2 s a 30 s | `src/apuntes.js` (comportamiento del cliente, no del backend) |

MIME permitidos (con la extensión que usa el cliente cuando el SO no informa el tipo):

| Extensión | MIME |
|---|---|
| pdf | `application/pdf` |
| jpg / jpeg | `image/jpeg` |
| png | `image/png` |
| webp | `image/webp` |
| heic / heif | `image/heic` / `image/heif` (HEIF se suma porque iOS a veces etiqueta así las fotos) |
| docx | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| pptx | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| xlsx | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

## Esquema

```
auth.users ─┬─< materias ─< cuadernos ─< apuntes
            └──────────────────┴────────────┘   (user_id en las tres)
```

### `public.cuadernos`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid → auth.users, on delete cascade | default `auth.uid()` |
| materia_id | uuid → materias(id), on delete cascade | |
| titulo | text, 1–200 caracteres | default `'Apuntes'` |
| orden | int | default 0 |
| es_default | bool | índice único parcial `(materia_id) where es_default`: **un solo cuaderno por defecto por materia** |
| created_at / updated_at | timestamptz | `updated_at` lo mantiene un trigger |

El esquema permite varios cuadernos por materia; el MVP usa solo el de
defecto. **No lo insertes a mano:** usá `obtener_cuaderno_default()`.

### `public.apuntes`

| Columna | Tipo | `nota` | `archivo` |
|---|---|---|---|
| id | uuid PK | | |
| user_id | uuid → auth.users | ✔ | ✔ |
| cuaderno_id | uuid | ✔ | ✔ |
| tipo | `'nota' \| 'archivo'` | | |
| titulo | text ≤ 300 caracteres, default `''` | título de la nota (`''` = "sin título") | nombre visible del archivo, **sin extensión** |
| contenido_json | jsonb | **obligatorio** (documento Tiptap) | null |
| contenido_html | text | HTML sanitizado (ver abajo) | null |
| contenido_texto | text | texto plano, bloques separados por `\n` | null |
| storage_path | text, único | null | **obligatorio** |
| mime_type | text | null | **obligatorio** |
| tamano_bytes | bigint ≥ 0 | null | **obligatorio** |
| orden | int, nullable | orden manual (null = sin ordenar todavía) | ídem |
| created_at / updated_at | timestamptz | trigger | trigger |

Restricciones:
- `apuntes_coherencia_tipo`: exige o prohíbe columnas según `tipo`, como indica la tabla.
- `apuntes_storage_path_propio`: `storage_path` tiene que empezar con `user_id || '/'`.
- FK compuesta `(cuaderno_id, user_id) → cuadernos(id, user_id)`, on delete cascade. Garantiza en la base que el cuaderno sea del mismo usuario.
- Trigger `apuntes_cuota` (before insert / update de `tamano_bytes`): si la suma pasa la cuota, lanza `cuota_excedida` (SQLSTATE `P0001`). Es la red de seguridad del servidor; el cliente igual tiene que validar antes de subir.

Índices: `user_id` y `cuaderno_id` en las dos tablas, `materia_id` en `cuadernos`.

**Orden en la UI:**
- Por defecto, más reciente primero (`updated_at desc`).
- En modo manual: primero los `orden` null (por `updated_at desc`) y después `orden asc`.
- Al mover un elemento, el cliente renumera toda la lista desde 0.

## RPCs

| Función | Devuelve | Uso |
|---|---|---|
| `obtener_cuaderno_default(p_materia_id uuid)` | fila de `cuadernos` | Crea el cuaderno al vuelo la primera vez. Es idempotente y segura con llamadas concurrentes. Si la materia no es del usuario, falla por RLS |
| `uso_almacenamiento()` | `{"usado": bigint, "cuota": bigint}` | Uso del usuario actual en bytes (suma de `tamano_bytes`) |

Las dos son `security invoker` y solo las puede ejecutar el rol `authenticated`.

## RLS

- **`cuadernos`**: select, insert, update y delete con `user_id = auth.uid()`. En insert y update también se exige que `materia_id` sea una materia del usuario.
- **`apuntes`**: select, insert, update y delete con `user_id = auth.uid()`. La pertenencia del cuaderno la cubre la FK compuesta.
- `anon` no ve nada.

## Storage

Bucket **`apuntes`**: privado, 20 MB por archivo, con los MIME de la tabla de arriba.

**Ruta de cada objeto:**

```
{user_id}/{materia_id}/{uuid}-{nombre_saneado}
```

`nombre_saneado`:
1. Se quitan los acentos (NFD).
2. Todo lo que no sea `[A-Za-z0-9._-]` pasa a `-`, y los `-` repetidos se colapsan.
3. Se recortan los `-` y `.` de los extremos.
4. Se trunca a 100 caracteres, conservando la extensión en minúscula.
5. Si queda vacío, se usa `archivo`.

Ejemplo: `Práctico 2 (final).PDF` queda como `…/3f2c…-Practico-2-final.pdf`.

La ruta no se usa para mostrar nada: el nombre visible es `apuntes.titulo`.

**Políticas sobre `storage.objects`** (select, insert, update y delete):

```sql
bucket_id = 'apuntes' and (storage.foldername(name))[1] = auth.uid()::text
```

**Lectura:** siempre con URLs firmadas (`createSignedUrl`). La web usa 600 s para ver y 60 s para descargar, con `{ download: titulo + extensión }`.

**Visualización en la web:**
- Imágenes: lightbox.
- PDF: `<iframe>`, más un link "Abrir en pestaña".
- DOCX, PPTX y XLSX: descarga.
- HEIC: solo Safari lo muestra; en los demás navegadores va como descarga. En iOS se puede mostrar nativo.

### Flujos que tiene que replicar iOS

**Subir un archivo**
1. Llamar a `uso_almacenamiento()` y validar tipo, tamaño (≤ 20 MB) y `usado + tamaño ≤ cuota`.
2. Subir a la ruta de arriba con `upsert: false`.
3. Insertar la fila en `apuntes` con `tipo = 'archivo'`.
4. **Si el insert falla, borrar el objeto recién subido.** Si el error es `cuota_excedida`, avisar que no alcanza el espacio.

**Eliminar un archivo:** primero `storage.remove([storage_path])` y después `delete` de la fila. Borrar un objeto que ya no existe no da error, así que reintentar es seguro.

**Eliminar una materia o un semestre, o "borrar todo":** las filas de `cuadernos` y `apuntes` se borran solas (on delete cascade desde `materias`), pero **los objetos de Storage no**. Antes de borrar la materia, el cliente lista `{user_id}/{materia_id}/` y borra todo lo que encuentre (la web lo hace en `borrarArchivosDeMaterias()`).

> ⚠️ `delete_my_account()` borra `auth.users` y no toca Storage. Si iOS ofrece borrar la cuenta, antes tiene que borrar la carpeta `{user_id}/` del bucket `apuntes`. La web hoy no tiene ese flujo.

## Formato del contenido de las notas

- **`contenido_json`**: el documento ProseMirror de Tiptap v3, tal cual lo devuelve `editor.getJSON()`: `{"type":"doc","content":[…]}`. Es la fuente de verdad para editar.

  Nodos: `paragraph`, `heading` (`attrs.level` 1–3), `bulletList`, `orderedList` (`attrs.start`), `listItem`, `taskList`, `taskItem` (`attrs.checked`), `blockquote`, `codeBlock`, `table`, `tableRow`, `tableHeader`, `tableCell`, `hardBreak`, `horizontalRule`.

  Marks: `bold`, `italic`, `underline`, `strike`, `code`, `link` (`attrs.href`).

  Una nota nueva arranca como `{"type":"doc","content":[{"type":"paragraph"}]}`.

- **`contenido_html`**: el HTML de Tiptap, pasado por DOMPurify **al guardar** (`src/apuntes-editor.entry.js`, función `sanitizar`). Es lo que la app iOS puede mostrar en solo lectura, por ejemplo en un WebView con CSS propio.
  - Tags permitidos: `p br h1 h2 h3 strong em u s code pre blockquote ul ol li a hr table colgroup col tbody tr th td label input span div`.
  - Atributos permitidos: `href target rel data-type data-checked type checked disabled start colspan rowspan colwidth`. **No hay `class`, `style` ni `id`.**
  - Links: solo `http:`, `https:` y `mailto:`. Siempre llevan `target="_blank" rel="noopener noreferrer nofollow"`.
  - Checklist:
    ```html
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="true|false">
        <label><input type="checkbox" checked disabled><span></span></label>
        <div><p>texto</p></div>
      </li>
    </ul>
    ```
  - Tablas: `<table><colgroup>…</colgroup><tbody><tr><th><p>…</p></th>…</tr>…</tbody></table>`. La primera fila es de encabezado con `<th>`.
  - Bloque de código: `<pre><code>…</code></pre>`, sin resaltado de sintaxis.

- **`contenido_texto`**: `editor.getText({ blockSeparator: '\n' })` con los saltos repetidos colapsados. Se guarda para una búsqueda futura y la web lo usa como vista previa en la lista.

Si iOS edita notas en el futuro, tiene que escribir **las tres columnas** juntas con el mismo criterio. Si solo escribe `contenido_json`, la web lo va a mostrar bien, pero el HTML y el texto quedan desactualizados.
