-- Cuadernos de apuntes (MVP) — tablas, RLS, cuota y RPCs.
-- Referencia para web e iOS: docs/apuntes-backend.md

-- ---------------------------------------------------------------------------
-- Constante de cuota: ÚNICO lugar donde vive el número (500 MB). El cliente
-- la lee vía uso_almacenamiento(), nunca la hardcodea.
-- ---------------------------------------------------------------------------
create or replace function public.apuntes_cuota_bytes()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 500::bigint * 1024 * 1024 $$;

create or replace function public.apuntes_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- cuadernos
-- ---------------------------------------------------------------------------
create table public.cuadernos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  materia_id  uuid not null references public.materias(id) on delete cascade,
  titulo      text not null default 'Apuntes' check (char_length(titulo) between 1 and 200),
  orden       integer not null default 0,
  es_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- destino del FK compuesto de apuntes (mismo dueño garantizado por la base)
  unique (id, user_id)
);

-- Un solo cuaderno por defecto por materia; el esquema permite más cuadernos.
create unique index cuadernos_default_por_materia on public.cuadernos (materia_id) where es_default;
create index cuadernos_user_id_idx on public.cuadernos (user_id);
create index cuadernos_materia_id_idx on public.cuadernos (materia_id);

create trigger cuadernos_updated_at
  before update on public.cuadernos
  for each row execute function public.apuntes_set_updated_at();

alter table public.cuadernos enable row level security;

create policy cuadernos_select_own on public.cuadernos
  for select to authenticated using (user_id = (select auth.uid()));
create policy cuadernos_insert_own on public.cuadernos
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.materias m where m.id = materia_id and m.user_id = (select auth.uid()))
  );
create policy cuadernos_update_own on public.cuadernos
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.materias m where m.id = materia_id and m.user_id = (select auth.uid()))
  );
create policy cuadernos_delete_own on public.cuadernos
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- apuntes
-- ---------------------------------------------------------------------------
create table public.apuntes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cuaderno_id      uuid not null,
  tipo             text not null check (tipo in ('nota', 'archivo')),
  titulo           text not null default '' check (char_length(titulo) <= 300),
  contenido_json   jsonb,
  contenido_html   text,
  contenido_texto  text,
  storage_path     text,
  mime_type        text,
  tamano_bytes     bigint check (tamano_bytes is null or tamano_bytes >= 0),
  orden            integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- FK compuesto: el cuaderno tiene que ser del mismo usuario que el apunte.
  foreign key (cuaderno_id, user_id) references public.cuadernos (id, user_id) on delete cascade,
  constraint apuntes_coherencia_tipo check (
    (tipo = 'nota'
      and contenido_json is not null
      and storage_path is null and mime_type is null and tamano_bytes is null)
    or
    (tipo = 'archivo'
      and storage_path is not null and mime_type is not null and tamano_bytes is not null
      and contenido_json is null and contenido_html is null)
  ),
  -- La ruta en Storage tiene que estar bajo la carpeta del propio usuario.
  constraint apuntes_storage_path_propio check (
    storage_path is null or storage_path like (user_id::text || '/%')
  )
);

create unique index apuntes_storage_path_uniq on public.apuntes (storage_path) where storage_path is not null;
create index apuntes_user_id_idx on public.apuntes (user_id);
create index apuntes_cuaderno_id_idx on public.apuntes (cuaderno_id);

create trigger apuntes_updated_at
  before update on public.apuntes
  for each row execute function public.apuntes_set_updated_at();

-- Cuota del lado del servidor (el cliente valida antes, esto es la red de
-- seguridad): rechaza registrar un archivo que haga pasar la cuota.
create or replace function public.apuntes_validar_cuota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  usado bigint;
begin
  if new.tipo <> 'archivo' or new.tamano_bytes is null then
    return new;
  end if;
  select coalesce(sum(a.tamano_bytes), 0) into usado
    from public.apuntes a
   where a.user_id = new.user_id and a.id <> new.id;
  if usado + new.tamano_bytes > public.apuntes_cuota_bytes() then
    raise exception 'cuota_excedida' using errcode = 'P0001',
      detail = format('usado=%s nuevo=%s cuota=%s', usado, new.tamano_bytes, public.apuntes_cuota_bytes());
  end if;
  return new;
end;
$$;
revoke execute on function public.apuntes_validar_cuota() from public, anon, authenticated;

create trigger apuntes_cuota
  before insert or update of tamano_bytes on public.apuntes
  for each row execute function public.apuntes_validar_cuota();

alter table public.apuntes enable row level security;

create policy apuntes_select_own on public.apuntes
  for select to authenticated using (user_id = (select auth.uid()));
create policy apuntes_insert_own on public.apuntes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy apuntes_update_own on public.apuntes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy apuntes_delete_own on public.apuntes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Uso de almacenamiento del usuario actual: { usado, cuota } en bytes.
create or replace function public.uso_almacenamiento()
returns json
language sql
stable
security invoker
set search_path = ''
as $$
  select json_build_object(
    'usado', coalesce((select sum(a.tamano_bytes) from public.apuntes a where a.user_id = auth.uid()), 0),
    'cuota', public.apuntes_cuota_bytes()
  )
$$;
revoke execute on function public.uso_almacenamiento() from public, anon;
grant execute on function public.uso_almacenamiento() to authenticated;

-- Devuelve (creándolo al vuelo si hace falta) el cuaderno por defecto de una
-- materia del usuario actual. Idempotente y seguro ante dos llamadas a la vez
-- gracias al índice único parcial cuadernos_default_por_materia.
create or replace function public.obtener_cuaderno_default(p_materia_id uuid)
returns public.cuadernos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.cuadernos;
begin
  select * into c from public.cuadernos
   where materia_id = p_materia_id and es_default and user_id = auth.uid();
  if found then
    return c;
  end if;
  insert into public.cuadernos (user_id, materia_id, titulo, es_default)
  values (auth.uid(), p_materia_id, 'Apuntes', true)
  on conflict (materia_id) where es_default do nothing;
  select * into c from public.cuadernos
   where materia_id = p_materia_id and es_default and user_id = auth.uid();
  return c;
end;
$$;
revoke execute on function public.obtener_cuaderno_default(uuid) from public, anon;
grant execute on function public.obtener_cuaderno_default(uuid) to authenticated;
