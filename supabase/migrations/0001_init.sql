-- ========== ENUMS ==========
create type user_role as enum ('cliente', 'lavador', 'admin');

create type order_type as enum ('programado', 'express');

create type order_status as enum (
  'buscando',              -- solo express: buscando lavador
  'pendiente_pago',        -- lavador asignado, esperando pago
  'confirmado',            -- pago capturado, turno en firme
  'en_camino',
  'en_curso',
  'completado',
  'calificado',
  'sin_disponibilidad',    -- express: nadie disponible, nunca se cobró
  'cancelado_sin_cargo',   -- cliente cancela con >24hs de anticipación
  'cancelado_con_cargo',   -- cliente cancela con <24hs de anticipación (penalidad)
  'cancelado_lavador'      -- el lavador cancela: sin cargo al cliente, penaliza rating del lavador
);

create type payment_status as enum (
  'pendiente', 'autorizado', 'capturado', 'fallido', 'reembolsado'
);

create type cancelado_por as enum ('cliente', 'lavador', 'sistema');

-- ========== CONFIGURACION (parametros de negocio ajustables) ==========
create table configuracion_app (
  clave text primary key,
  valor numeric not null,
  descripcion text
);

insert into configuracion_app (clave, valor, descripcion) values
  ('recargo_express_pct', 25, 'Recargo % sobre precio base para pedidos express (queda integro para el lavador)'),
  ('penalidad_cancelacion_tardia_pct', 50, 'Penalidad % si el cliente cancela con menos de 24hs de anticipacion'),
  ('comision_plataforma_pct', 25, 'Comision fija de la plataforma sobre precio_total, aplica a TODOS los pedidos (programado y express)');

-- ========== USUARIOS ==========
-- extiende auth.users de Supabase 1:1
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  rol user_role not null default 'cliente',
  nombre text not null,
  telefono text,
  creado_en timestamptz not null default now()
);

-- ========== DIRECCIONES ==========
create table direcciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  alias text,                     -- "casa", "trabajo"
  calle text not null,
  numero text,
  ciudad text not null,
  lat double precision not null,
  lng double precision not null,
  creado_en timestamptz not null default now()
);

-- ========== LAVADORES ==========
create table lavadores (
  id uuid primary key references usuarios(id) on delete cascade,
  bio text,
  precio_base numeric(10,2) not null check (precio_base > 0),
  rating_promedio numeric(3,2) not null default 0,
  cantidad_calificaciones int not null default 0,
  activo boolean not null default true,     -- alta/baja del admin
  verificado boolean not null default false,
  creado_en timestamptz not null default now()
);

-- cobertura por zona (MVP: texto/barrio; migrar a PostGIS + radio geografico despues si hace falta)
create table lavador_zonas (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  zona text not null              -- ej: "Palermo", "CP 1414"
);

-- disponibilidad recurrente, para matching de "programado"
create table lavador_disponibilidad (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0=domingo
  hora_inicio time not null,
  hora_fin time not null,
  check (hora_fin > hora_inicio)
);

-- estado en vivo, para matching de "express" (como el "online" de un driver)
create table lavador_estado_express (
  lavador_id uuid primary key references lavadores(id) on delete cascade,
  disponible_ahora boolean not null default false,
  lat double precision,
  lng double precision,
  actualizado_en timestamptz not null default now()
);

-- ========== PEDIDOS ==========
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios(id),
  lavador_id uuid references lavadores(id),   -- null hasta que hay match
  tipo order_type not null,
  estado order_status not null default 'buscando',

  direccion_id uuid references direcciones(id),
  -- snapshot por si la direccion se edita/borra despues
  direccion_texto text not null,
  lat double precision not null,
  lng double precision not null,

  fecha_hora_turno timestamptz,   -- null en express hasta confirmarse; obligatorio en programado

  precio_base numeric(10,2) not null,
  recargo_pct numeric(5,2) not null default 0,   -- snapshot: 0 en programado, 25 en express
  precio_total numeric(10,2) not null,           -- precio_base * (1 + recargo_pct/100)

  -- split plataforma / lavador, snapshot al momento del pedido
  comision_pct numeric(5,2) not null default 0,      -- snapshot de configuracion_app.comision_plataforma_pct
  monto_comision numeric(10,2) not null default 0,   -- precio_total * comision_pct / 100 (se lo queda la plataforma)
  monto_lavador numeric(10,2) not null default 0,    -- precio_total - monto_comision (se lo queda el lavador)

  cancelado_en timestamptz,
  cancelado_por cancelado_por,
  motivo_cancelacion text,
  penalidad_aplicada numeric(10,2) default 0,

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_pedidos_cliente on pedidos(cliente_id);
create index idx_pedidos_lavador on pedidos(lavador_id);
create index idx_pedidos_estado on pedidos(estado);

-- ========== PAGOS (preparado para Mercado Pago) ==========
create table pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  proveedor text not null default 'mercadopago',
  estado payment_status not null default 'pendiente',
  monto numeric(10,2) not null,
  external_id text,          -- id de preferencia/pago de MP
  payload jsonb,             -- respuesta cruda del webhook, para debug/auditoria
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_pagos_pedido on pagos(pedido_id);

-- ========== CALIFICACIONES ==========
create table calificaciones (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references pedidos(id) on delete cascade,
  cliente_id uuid not null references usuarios(id),
  lavador_id uuid not null references lavadores(id),
  puntaje int not null check (puntaje between 1 and 5),
  comentario text,
  es_penalizacion boolean not null default false,  -- true = generada por cancelacion del lavador, no es reseña real
  creado_en timestamptz not null default now()
);

create index idx_calificaciones_lavador on calificaciones(lavador_id);

-- recalcula el rating del lavador automaticamente (incluye penalizaciones por cancelacion)
create or replace function actualizar_rating_lavador() returns trigger as $$
begin
  update lavadores
  set
    rating_promedio = (
      select avg(puntaje)::numeric(3,2) from calificaciones where lavador_id = new.lavador_id
    ),
    cantidad_calificaciones = (
      select count(*) from calificaciones where lavador_id = new.lavador_id
    )
  where id = new.lavador_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_actualizar_rating
after insert on calificaciones
for each row execute function actualizar_rating_lavador();

-- ========== PENALIZACION AUTOMATICA POR CANCELACION DEL LAVADOR ==========
-- cuando un pedido pasa a 'cancelado_lavador', se inserta una calificacion de 1 estrella
-- marcada como penalizacion, lo que dispara el trigger de arriba y baja el rating_promedio.
create or replace function penalizar_cancelacion_lavador() returns trigger as $$
begin
  if new.estado = 'cancelado_lavador' and old.estado is distinct from 'cancelado_lavador' then
    insert into calificaciones (pedido_id, cliente_id, lavador_id, puntaje, comentario, es_penalizacion)
    values (new.id, new.cliente_id, new.lavador_id, 1, 'Cancelacion automatica: el lavador canceló el turno', true)
    on conflict (pedido_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_penalizar_cancelacion_lavador
after update on pedidos
for each row execute function penalizar_cancelacion_lavador();

-- ========== HISTORIAL DE ESTADOS (auditoria, util para admin/metricas) ==========
create table pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  estado_anterior order_status,
  estado_nuevo order_status not null,
  actor text,   -- 'cliente' | 'lavador' | 'sistema' | 'admin'
  creado_en timestamptz not null default now()
);

create index idx_pedido_eventos_pedido on pedido_eventos(pedido_id);
