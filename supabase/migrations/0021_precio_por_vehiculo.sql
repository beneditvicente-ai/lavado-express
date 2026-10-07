-- ========================================================================
-- Simplificacion del servicio: ya no hay niveles (Basico/Encerado/
-- Premium), solo el lavado normal. En su lugar, el precio pasa a variar
-- por TIPO DE VEHICULO, y cada lavador fija su propio precio para
-- auto/suv/pickup (antes era un recargo global igual para todos).
--
-- Se desactivan Encerado/Premium en vez de borrarlos: pedidos historicos
-- ya completados siguen referenciandolos via tipo_servicio_id, y
-- borrarlos rompería esa integridad. "activo = false" ya alcanza para
-- que dejen de ofrecerse (el cliente y el panel de precios del lavador
-- ya filtran por tipos_servicio.activo = true).
-- ========================================================================
update tipos_servicio set activo = false where nombre in ('Encerado', 'Premium');

create table lavador_precios_vehiculo (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  tipo_vehiculo tipo_vehiculo not null,
  precio numeric(10,2) not null check (precio > 0),
  unique (lavador_id, tipo_vehiculo)
);

create index idx_lavador_precios_vehiculo_lavador on lavador_precios_vehiculo(lavador_id);

alter table lavador_precios_vehiculo enable row level security;

create policy "lavador_precios_vehiculo_select_publico" on lavador_precios_vehiculo for select using (true);
create policy "lavador_precios_vehiculo_write_propio_o_admin" on lavador_precios_vehiculo
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

-- migramos lo que cada lavador ya tenia cargado: su precio de Basico pasa
-- a ser el precio de "auto", y suv/pickup arrancan aplicando el recargo
-- global que regia hasta ahora (para que nadie arranque en $0) -- despues
-- cada lavador los puede ajustar libremente desde su panel.
insert into lavador_precios_vehiculo (lavador_id, tipo_vehiculo, precio)
select
  ls.lavador_id,
  vr.tipo_vehiculo,
  round(ls.precio * (1 + vr.recargo_pct / 100), 2)
from lavador_servicios ls
join tipos_servicio ts on ts.id = ls.tipo_servicio_id
cross join vehiculo_recargos vr
where ts.nombre = 'Basico' and ls.activo = true
on conflict (lavador_id, tipo_vehiculo) do nothing;
