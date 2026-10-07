-- Cuadernos de apuntes (MVP) — bucket privado `apuntes` y sus políticas.
-- Rutas: {user_id}/{materia_id}/{uuid}-{nombre_original_saneado}
-- Referencia para web e iOS: docs/apuntes-backend.md

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'apuntes',
  'apuntes',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy apuntes_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'apuntes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy apuntes_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'apuntes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy apuntes_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'apuntes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'apuntes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy apuntes_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'apuntes' and (storage.foldername(name))[1] = (select auth.uid())::text);
