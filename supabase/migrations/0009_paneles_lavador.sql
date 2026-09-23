-- ========================================================================
-- BLOQUEOS PUNTUALES (el lavador marca que un dia/horario especifico NO
-- esta disponible, ademas de su disponibilidad semanal recurrente)
-- ========================================================================
create table lavador_bloqueos (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  motivo text,
  creado_en timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);

create index idx_lavador_bloqueos_lavador on lavador_bloqueos(lavador_id, fecha);

alter table lavador_bloqueos enable row level security;

create policy "lavador_bloqueos_select_publico" on lavador_bloqueos for select using (true);
create policy "lavador_bloqueos_write_propio_o_admin" on lavador_bloqueos
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

-- ========================================================================
-- EXPRESS "A LA UBER": el pedido nace SIN lavador asignado (estado
-- 'buscando'), visible para lavadores activos que cubren esa zona y
-- servicio. El lavador lo acepta primero; recien ahi se calcula el precio
-- (depende de que lavador lo tome) y el cliente confirma o busca otro.
-- Por eso el precio deja de ser obligatorio al crear el pedido.
-- ========================================================================
alter table pedidos alter column precio_base drop not null;
alter table pedidos alter column precio_total drop not null;

-- los lavadores activos pueden ver pedidos 'buscando' sin asignar que
-- coincidan con una zona y servicio que ellos cubren (para el panel
-- express con mapa). No ven el resto de los pedidos de otros.
create policy "pedidos_select_buscando_para_lavadores" on pedidos
  for select using (
    estado = 'buscando'
    and lavador_id is null
    and exists (
      select 1
      from lavadores l
      join lavador_zonas lz on lz.lavador_id = l.id
      join lavador_servicios ls on ls.lavador_id = l.id
      where l.id = auth.uid()
        and l.activo = true
        and lz.zona_id = pedidos.zona_id
        and ls.tipo_servicio_id = pedidos.tipo_servicio_id
        and ls.activo = true
    )
  );
