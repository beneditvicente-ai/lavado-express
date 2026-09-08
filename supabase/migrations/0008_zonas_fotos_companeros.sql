-- ========================================================================
-- ZONAS FIJAS (arregla el bug real que vimos: "Palermo" vs "CABA" nunca
-- matcheaban porque eran texto libre). Ahora es un catalogo cerrado, el
-- lavador tilda las que cubre y el cliente elige una del mismo catalogo.
-- ========================================================================

create table zonas_disponibles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null
);

insert into zonas_disponibles (nombre, orden) values
  ('CABA', 1),
  ('Palermo', 2),
  ('Belgrano', 3),
  ('Recoleta', 4),
  ('Caballito', 5),
  ('Villa Urquiza', 6),
  ('Almagro', 7),
  ('Núñez', 8),
  ('Zona Norte GBA', 9),
  ('Zona Oeste GBA', 10),
  ('Zona Sur GBA', 11);

alter table zonas_disponibles enable row level security;
create policy "zonas_disponibles_select_publico" on zonas_disponibles for select using (true);
create policy "zonas_disponibles_write_admin" on zonas_disponibles for all using (is_admin()) with check (is_admin());

-- lavador_zonas pasa de texto libre a referenciar el catalogo fijo.
-- Se borran las filas de prueba existentes (texto libre tipo "CABA") porque
-- no hay forma de mapearlas automaticamente al catalogo nuevo.
delete from lavador_zonas;
alter table lavador_zonas drop column zona;
alter table lavador_zonas add column zona_id uuid not null references zonas_disponibles(id);
alter table lavador_zonas add constraint lavador_zonas_unica unique (lavador_id, zona_id);

-- el pedido tambien guarda la zona elegida (antes solo quedaba mezclada
-- adentro del texto de direccion)
alter table pedidos add column zona_id uuid references zonas_disponibles(id);

-- ========================================================================
-- COMPAÑEROS DE EQUIPO (nombres, visibles publicamente en el perfil)
-- ========================================================================
create table lavador_companeros (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  nombre text not null
);

alter table lavador_companeros enable row level security;
create policy "lavador_companeros_select_publico" on lavador_companeros for select using (true);
create policy "lavador_companeros_write_propio_o_admin" on lavador_companeros
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

-- ========================================================================
-- FOTOS (perfil, equipo, trabajo realizado) -- visibles publicamente,
-- el archivo en si vive en Supabase Storage (bucket lavador-fotos)
-- ========================================================================
create type tipo_foto_lavador as enum ('perfil', 'equipo', 'trabajo');

create table lavador_fotos (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  tipo tipo_foto_lavador not null,
  storage_path text not null,
  creado_en timestamptz not null default now()
);

alter table lavador_fotos enable row level security;
create policy "lavador_fotos_select_publico" on lavador_fotos for select using (true);
create policy "lavador_fotos_write_propio_o_admin" on lavador_fotos
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

insert into storage.buckets (id, name, public)
values ('lavador-fotos', 'lavador-fotos', true)
on conflict (id) do nothing;

-- las fotos son publicas para leer (se muestran al buscar lavador);
-- solo el propio lavador puede subir/borrar dentro de su propia carpeta
-- (las rutas se guardan como "<lavador_id>/archivo.jpg")
create policy "lavador_fotos_storage_select_publico" on storage.objects
  for select using (bucket_id = 'lavador-fotos');

create policy "lavador_fotos_storage_insert_propio" on storage.objects
  for insert with check (
    bucket_id = 'lavador-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lavador_fotos_storage_delete_propio" on storage.objects
  for delete using (
    bucket_id = 'lavador-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nota: el telefono del lavador NO se agrega a ninguna vista/tabla publica
-- a proposito -- ya existe en usuarios.telefono (RLS: solo el propio
-- usuario o el admin lo pueden leer). El formulario de postulacion ahora
-- lo pide y lo guarda ahi, pero nunca se expone en lavadores_publicos ni
-- en ninguna consulta que pueda ver un cliente.
