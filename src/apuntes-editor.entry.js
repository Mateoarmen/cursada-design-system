/*
 * Cursada — bundle del editor de apuntes (Tiptap + DOMPurify).
 *
 * Lo empaqueta build/build-app.mjs con esbuild a out/apuntes-editor.js (IIFE,
 * sin CDN) y src/apuntes.js lo carga recién la primera vez que se abre una
 * nota — así Inicio/Materias no pagan el peso del editor.
 *
 * Expone `window.CursadaEditor`:
 *   create(el, { content, placeholder, onUpdate }) → instancia de Editor (Tiptap)
 *   serializar(editor) → { contenido_json, contenido_html, contenido_texto }
 *   sanitizar(html)    → HTML limpio con la allowlist de abajo
 *
 * La allowlist de sanitizar() ES el contrato de `apuntes.contenido_html` que
 * consume la app iOS — si se agrega una extensión nueva, actualizar también
 * docs/apuntes-backend.md.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li', 'a', 'hr',
  'table', 'colgroup', 'col', 'tbody', 'tr', 'th', 'td',
  'label', 'input', 'span', 'div'
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'data-type', 'data-checked', 'type', 'checked', 'disabled', 'start', 'colspan', 'rowspan', 'colwidth'];

let hooksInstalados = false;
function instalarHooks() {
  if (hooksInstalados) return;
  hooksInstalados = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (!/^(https?:|mailto:)/i.test(href)) node.removeAttribute('href');
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    if (node.tagName === 'INPUT') {
      // Sólo checkboxes de checklist, y nunca interactivos en la vista de lectura.
      if (node.getAttribute('type') !== 'checkbox') { node.remove(); return; }
      node.setAttribute('disabled', '');
    }
  });
}

export function sanitizar(html) {
  instalarHooks();
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Sólo data-type/data-checked (listados arriba). No se usa
    // ALLOWED_URI_REGEXP: DOMPurify lo aplica a TODOS los atributos (no sólo
    // href) y descartaba colspan/start/data-*; los href se filtran en el hook.
    ALLOW_DATA_ATTR: false
  });
}

export function create(el, opts = {}) {
  return new Editor({
    element: el,
    content: opts.content || '',
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' }
        }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: opts.placeholder || 'Empezá a escribir…' })
    ],
    editorProps: {
      attributes: { class: 'apunte-prose', spellcheck: 'true', 'aria-label': 'Contenido de la nota', role: 'textbox', 'aria-multiline': 'true' }
    },
    onUpdate: () => { if (opts.onUpdate) opts.onUpdate(); }
  });
}

export function serializar(editor) {
  return {
    contenido_json: editor.getJSON(),
    contenido_html: sanitizar(editor.getHTML()),
    contenido_texto: editor.getText({ blockSeparator: '\n' }).replace(/\n{2,}/g, '\n').trim()
  };
}
