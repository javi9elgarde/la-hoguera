-- La Hoguera · esquema de la entrega 1
-- Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.

create extension if not exists pgcrypto;

-- ───────────── Tablas ─────────────

create table if not exists hogares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Nuestro hogar',
  codigo text not null unique,
  creado_en timestamptz not null default now()
);

create table if not exists miembros (
  id uuid primary key references auth.users (id) on delete cascade,
  hogar_id uuid not null references hogares (id) on delete cascade,
  nombre text not null,
  color text not null default '#e8833a',
  creado_en timestamptz not null default now()
);

create table if not exists items_compra (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  producto text not null,
  cantidad text,
  pasillo text not null default 'otros',
  comprado boolean not null default false,
  anadido_por uuid references miembros (id) on delete set null,
  creado_en timestamptz not null default now()
);

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  titulo text not null,
  estancia text,
  prioridad text not null default 'normal' check (prioridad in ('normal', 'urgente')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'hecha')),
  creado_por uuid references miembros (id) on delete set null,
  hecha_en timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  importe numeric(10, 2) not null check (importe > 0),
  categoria text not null default 'otros',
  concepto text,
  fecha date not null default current_date,
  pagado_por uuid references miembros (id) on delete set null,
  origen_tipo text,
  origen_id uuid,
  creado_en timestamptz not null default now()
);

-- Bandeja: frases del personaje que aún no tienen sección propia
create table if not exists entradas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  texto text not null,
  seccion_sugerida text,
  autor_id uuid references miembros (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index if not exists items_compra_hogar on items_compra (hogar_id);
create index if not exists tareas_hogar on tareas (hogar_id);
create index if not exists gastos_hogar_fecha on gastos (hogar_id, fecha);
create index if not exists entradas_hogar on entradas (hogar_id);

-- ───────────── Funciones ─────────────

-- Hogar del usuario conectado (security definer para no chocar con RLS)
create or replace function mi_hogar() returns uuid
language sql stable security definer set search_path = public as $$
  select hogar_id from miembros where id = auth.uid()
$$;

create or replace function crear_hogar(p_nombre_hogar text, p_mi_nombre text)
returns hogares
language plpgsql security definer set search_path = public as $$
declare
  h hogares;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if exists (select 1 from miembros where id = auth.uid()) then
    raise exception 'Ya perteneces a un hogar';
  end if;
  insert into hogares (nombre, codigo)
  values (coalesce(nullif(trim(p_nombre_hogar), ''), 'Nuestro hogar'),
          upper(substr(md5(gen_random_uuid()::text), 1, 6)))
  returning * into h;
  insert into miembros (id, hogar_id, nombre) values (auth.uid(), h.id, trim(p_mi_nombre));
  return h;
end $$;

create or replace function unirse_hogar(p_codigo text, p_mi_nombre text)
returns hogares
language plpgsql security definer set search_path = public as $$
declare
  h hogares;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if exists (select 1 from miembros where id = auth.uid()) then
    raise exception 'Ya perteneces a un hogar';
  end if;
  select * into h from hogares where codigo = upper(trim(p_codigo));
  if h.id is null then raise exception 'Código no válido'; end if;
  if (select count(*) from miembros where hogar_id = h.id) >= 2 then
    raise exception 'Este hogar ya tiene dos miembros';
  end if;
  insert into miembros (id, hogar_id, nombre, color)
  values (auth.uid(), h.id, trim(p_mi_nombre), '#4a90c2');
  return h;
end $$;

revoke execute on function crear_hogar(text, text) from anon;
revoke execute on function unirse_hogar(text, text) from anon;

-- ───────────── Seguridad por filas ─────────────

alter table hogares enable row level security;
alter table miembros enable row level security;
alter table items_compra enable row level security;
alter table tareas enable row level security;
alter table gastos enable row level security;
alter table entradas enable row level security;

drop policy if exists "ver mi hogar" on hogares;
create policy "ver mi hogar" on hogares for select to authenticated using (id = mi_hogar());
drop policy if exists "renombrar mi hogar" on hogares;
create policy "renombrar mi hogar" on hogares for update to authenticated using (id = mi_hogar());

drop policy if exists "ver miembros de mi hogar" on miembros;
create policy "ver miembros de mi hogar" on miembros for select to authenticated using (hogar_id = mi_hogar());
drop policy if exists "editar mi perfil" on miembros;
create policy "editar mi perfil" on miembros for update to authenticated
  using (id = auth.uid()) with check (hogar_id = mi_hogar());

do $$
declare t text;
begin
  foreach t in array array['items_compra', 'tareas', 'gastos', 'entradas'] loop
    execute format('drop policy if exists "solo mi hogar" on %I', t);
    execute format(
      'create policy "solo mi hogar" on %I for all to authenticated
         using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar())', t);
  end loop;
end $$;

-- ───────────── Tiempo real ─────────────

do $$
declare t text;
begin
  foreach t in array array['items_compra', 'tareas', 'gastos', 'entradas', 'miembros'] loop
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ═════════════ Entrega 2 ═════════════

-- Compras generales (lámpara, HDMI…), aparte de la lista del súper
create table if not exists cosas_compra (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  titulo text not null,
  enlace text,
  precio_estimado numeric(10, 2),
  nota text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'comprado')),
  anadido_por uuid references miembros (id) on delete set null,
  comprado_en timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists recetas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  titulo text not null,
  raciones int,
  minutos int,
  ingredientes jsonb not null default '[]', -- [{ "producto": "Arroz", "cantidad": "300 g" }]
  pasos text,
  enlace text,
  creado_por uuid references miembros (id) on delete set null,
  creado_en timestamptz not null default now()
);

-- Menú semanal: un hueco por día y comida
create table if not exists menu (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  fecha date not null,
  comida text not null check (comida in ('comida', 'cena')),
  receta_id uuid references recetas (id) on delete set null,
  texto text,
  creado_en timestamptz not null default now(),
  unique (hogar_id, fecha, comida)
);

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  tipo text not null default 'plan' check (tipo in ('plan', 'cumpleanos', 'cita', 'otro')),
  titulo text not null,
  fecha date not null,
  hora time,
  lugar text,
  nota text,
  anual boolean not null default false, -- los cumpleaños se repiten cada año
  creado_por uuid references miembros (id) on delete set null,
  creado_en timestamptz not null default now()
);

create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  autor_id uuid references miembros (id) on delete set null,
  texto text not null,
  color text not null default '#fff3b0',
  fijada boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table items_compra add column if not exists receta_id uuid references recetas (id) on delete set null;

create index if not exists cosas_compra_hogar on cosas_compra (hogar_id);
create index if not exists recetas_hogar on recetas (hogar_id);
create index if not exists menu_hogar_fecha on menu (hogar_id, fecha);
create index if not exists eventos_hogar_fecha on eventos (hogar_id, fecha);
create index if not exists notas_hogar on notas (hogar_id);

do $$
declare t text;
begin
  foreach t in array array['cosas_compra', 'recetas', 'menu', 'eventos', 'notas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo mi hogar" on %I', t);
    execute format(
      'create policy "solo mi hogar" on %I for all to authenticated
         using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar())', t);
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ═════════════ Avatares dibujados ═════════════
alter table miembros add column if not exists avatar text;

-- ═════════════ Casa: recursos e ideas ═════════════

-- Medidas de muebles, fotos de etiquetas, cosas a tener en cuenta
create table if not exists recursos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  titulo text not null,
  texto text,
  estancia text,
  imagen text, -- ruta en el almacén "recursos": <hogar_id>/<archivo>.jpg
  creado_por uuid references miembros (id) on delete set null,
  creado_en timestamptz not null default now()
);

-- Futuras reformas y mejoras
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares (id) on delete cascade,
  titulo text not null,
  descripcion text,
  estancia text,
  presupuesto numeric(10, 2),
  estado text not null default 'idea' check (estado in ('idea', 'hecha')),
  creado_por uuid references miembros (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index if not exists recursos_hogar on recursos (hogar_id);
create index if not exists ideas_hogar on ideas (hogar_id);

do $$
declare t text;
begin
  foreach t in array array['recursos', 'ideas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo mi hogar" on %I', t);
    execute format(
      'create policy "solo mi hogar" on %I for all to authenticated
         using (hogar_id = mi_hogar()) with check (hogar_id = mi_hogar())', t);
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables
                       where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- Almacén privado de fotos: cada hogar solo ve su carpeta
insert into storage.buckets (id, name, public) values ('recursos', 'recursos', false)
on conflict (id) do nothing;

drop policy if exists "fotos de mi hogar" on storage.objects;
create policy "fotos de mi hogar" on storage.objects for all to authenticated
  using (bucket_id = 'recursos' and (storage.foldername(name))[1] = mi_hogar()::text)
  with check (bucket_id = 'recursos' and (storage.foldername(name))[1] = mi_hogar()::text);

-- Que la API vea al momento las columnas nuevas
notify pgrst, 'reload schema';
