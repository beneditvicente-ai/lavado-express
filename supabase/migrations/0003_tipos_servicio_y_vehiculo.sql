-- ========================================================================
-- TIPO DE VEHICULO Y TIPO DE SERVICIO
-- El cliente elige ambos ANTES de ver la lista de lavadores. El precio
-- final combina: precio propio del lavador por tipo de servicio,
-- + recargo fijo por tipo de vehiculo (igual para todos los lavadores).
-- ========================================================================

create type tipo_vehiculo as enum ('auto', 'suv', 'pickup');

-- catalogo de servicios (editable por admin, no hardcodeado en la app)
create table tipos_servicio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  orden int not null,
  activo boolean not null default true
);

insert into tipos_servicio (nombre, descripcion, orden) values
  ('Basico',   'Lavado exterior con shampoo, secado, limpieza de llantas y aspirado rapido del interior.', 1),
  ('Encerado', 'Todo lo del Basico + encerado/sellador de pintura, limpieza de tapizados con paño humedo y abrillantado de plasticos.', 2),
  ('Premium',  'Todo lo del Encerado + aspirado profundo, tratamiento de tapizados/cuero, perfumado y detailing.', 3);

-- recargo por tamaño de vehiculo, fijo, no depende del lavador
create table vehiculo_recargos (
  tipo_vehiculo tipo_vehiculo primary key,
  recargo_pct numeric(5,2) not null default 0,
  descripcion text
);

insert into vehiculo_recargos (tipo_vehiculo, recargo_pct, descripcion) values
  ('auto',   0,  'Sedan / hatchback / auto estandar'),
  ('suv',    15, 'SUV / crossover'),
  ('pickup', 20, 'Pick up / camioneta');

-- precio propio del lavador, por tipo de servicio (no por vehiculo)
create table lavador_servicios (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  tipo_servicio_id uuid not null references tipos_servicio(id) on delete cascade,
  precio numeric(10,2) not null check (precio > 0),
  activo boolean not null default true,
  unique (lavador_id, tipo_servicio_id)
);

create index idx_lavador_servicios_lavador on lavador_servicios(lavador_id);
create index idx_lavador_servicios_tipo on lavador_servicios(tipo_servicio_id);

-- el cliente elige vehiculo + servicio antes de ver lavadores
alter table pedidos add column tipo_vehiculo tipo_vehiculo not null;
alter table pedidos add column tipo_servicio_id uuid not null references tipos_servicio(id);

create index idx_pedidos_tipo_servicio on pedidos(tipo_servicio_id);

-- helper: precio_base de un pedido = precio del lavador para ese servicio
-- x (1 + recargo del vehiculo). Usar al crear el pedido, antes de aplicar
-- recargo_pct express y descuento_fidelizacion_pct.
create or replace function calcular_precio_base(
  p_lavador_id uuid,
  p_tipo_servicio_id uuid,
  p_tipo_vehiculo tipo_vehiculo
) returns numeric as $$
declare
  v_precio numeric;
  v_recargo numeric;
begin
  select precio into v_precio
  from lavador_servicios
  where lavador_id = p_lavador_id
    and tipo_servicio_id = p_tipo_servicio_id
    and activo = true;

  if v_precio is null then
    raise exception 'El lavador % no tiene precio activo para ese tipo de servicio', p_lavador_id;
  end if;

  select recargo_pct into v_recargo
  from vehiculo_recargos
  where tipo_vehiculo = p_tipo_vehiculo;

  return round(v_precio * (1 + coalesce(v_recargo, 0) / 100), 2);
end;
$$ language plpgsql stable;

-- Nota de matching: al buscar lavadores disponibles (programado o express),
-- filtrar solo los que tengan una fila activa en lavador_servicios para el
-- tipo_servicio_id elegido por el cliente, ademas de zona/disponibilidad.
