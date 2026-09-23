-- ========================================================================
-- Para programado, el cliente ELIGE a qué lavadores les pide el turno
-- (de la lista de disponibles en ese horario), no se manda a toda la
-- zona a ciegas como en express. Un lavador solo ve la solicitud si esta
-- invitado.
-- ========================================================================
create table pedido_invitaciones (
  pedido_id uuid not null references pedidos(id) on delete cascade,
  lavador_id uuid not null references lavadores(id) on delete cascade,
  primary key (pedido_id, lavador_id)
);

alter table pedido_invitaciones enable row level security;

create policy "pedido_invitaciones_select" on pedido_invitaciones
  for select using (
    lavador_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from pedidos p
      where p.id = pedido_invitaciones.pedido_id and p.cliente_id = auth.uid()
    )
  );
-- sin insert/update/delete para authenticated: se crean solo desde el
-- backend (service role) al crear la solicitud programada.

-- la policy vieja de "buscando" quedaba abierta a toda la zona para
-- cualquier tipo; ahora eso solo aplica a express
drop policy if exists "pedidos_select_buscando_para_lavadores" on pedidos;
create policy "pedidos_select_buscando_para_lavadores" on pedidos
  for select using (
    estado = 'buscando'
    and lavador_id is null
    and tipo = 'express'
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

-- programado: solo lo ve el lavador invitado
create policy "pedidos_select_invitado_programado" on pedidos
  for select using (
    estado = 'buscando'
    and lavador_id is null
    and tipo = 'programado'
    and exists (
      select 1 from pedido_invitaciones pi
      where pi.pedido_id = pedidos.id and pi.lavador_id = auth.uid()
    )
  );
