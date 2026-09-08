-- ========================================================================
-- PROTECCION CONTRA DESINTERMEDIACION
-- Chat in-app trazable, pago exclusivamente in-app, fidelizacion ligada a
-- pagos in-app, comision escalonada por antiguedad/rating, y matching que
-- prioriza volumen dentro de la plataforma.
-- ========================================================================

-- ========== USUARIOS: separar apellido para poder mostrar solo inicial ==========
alter table usuarios add column apellido text not null default '';

-- vista publica: lo unico que puede verse de la contraparte en cualquier
-- pantalla del flujo. Nunca exponer telefono ni apellido completo desde el
-- backend, ni siquiera por bug de frontend: si la app solo consulta esta
-- vista, el dato sensible ni siquiera viaja.
create view perfil_publico as
select
  id,
  nombre,
  case when length(apellido) > 0 then left(apellido, 1) || '.' else '' end as inicial_apellido,
  rol
from usuarios;

-- ========== CHAT IN-APP ==========
create table mensajes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  remitente_id uuid not null references usuarios(id),
  contenido text not null,
  contiene_dato_contacto boolean not null default false,  -- flag automatico para moderacion
  creado_en timestamptz not null default now()
);

create index idx_mensajes_pedido on mensajes(pedido_id, creado_en);
create index idx_mensajes_flaggeados on mensajes(contiene_dato_contacto) where contiene_dato_contacto = true;

-- deteccion basica de intento de compartir contacto (telefono, email, redes).
-- No bloquea el mensaje (evita falsos positivos que rompan la conversacion),
-- solo lo flaggea para que el admin lo pueda auditar/actuar.
create or replace function contiene_datos_contacto(texto text) returns boolean as $$
begin
  return
    texto ~ '(\+?\d[\s.-]?){7,}'                              -- secuencia de 7+ digitos (telefono)
    or texto ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'        -- email
    or texto ~* '(whatsapp|wsp|telegram|instagram|@[a-z0-9_.]{3,})';  -- redes / handles
end;
$$ language plpgsql immutable;

create or replace function flag_mensaje_contacto() returns trigger as $$
begin
  new.contiene_dato_contacto := contiene_datos_contacto(new.contenido);
  return new;
end;
$$ language plpgsql;

create trigger trg_flag_mensaje_contacto
before insert on mensajes
for each row execute function flag_mensaje_contacto();

-- ========== PAGO: reforzar que NO existe la nocion de "efectivo" en el modelo ==========
-- (payment_status ya excluye efectivo por diseño; se deja documentado aca)
comment on type payment_status is 'Solo pagos in-app via proveedor (Mercado Pago). No existe estado ni metodo para efectivo: si se necesita, es una decision de producto explicita, no un default.';

-- ========== FIDELIZACION (solo por pagos in-app, siempre es el caso) ==========
create type fidelizacion_tipo as enum ('acumulacion', 'canje');

insert into configuracion_app (clave, valor, descripcion) values
  ('fidelizacion_umbral_lavados', 5, 'Cantidad de lavados pagos in-app para desbloquear descuento en el siguiente'),
  ('fidelizacion_descuento_pct', 50, 'Descuento % aplicado al lavado que desbloquea la fidelizacion');

create table clientes_fidelizacion (
  cliente_id uuid primary key references usuarios(id) on delete cascade,
  lavados_acumulados int not null default 0,       -- contador desde el ultimo canje, resetea al canjear
  lavados_totales_historico int not null default 0, -- nunca resetea, para metricas de admin
  descuento_disponible boolean not null default false,
  actualizado_en timestamptz not null default now()
);

-- ledger inmutable: cada acumulacion o canje queda registrado y trazable
create table fidelizacion_movimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios(id),
  pedido_id uuid references pedidos(id),
  tipo fidelizacion_tipo not null,
  creado_en timestamptz not null default now()
);

create index idx_fidelizacion_cliente on fidelizacion_movimientos(cliente_id);

-- ========== COMISION ESCALONADA (antiguedad + rating del lavador) ==========
-- tabla editable por admin: se recorren las filas de mayor a menor beneficio
-- y se aplica la primera que el lavador cumple. "Nuevo" (25%) es el piso,
-- igual al default que ya usa configuracion_app.comision_plataforma_pct.
create table comision_tiers (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  antiguedad_min_dias int not null default 0,
  rating_min numeric(3,2) not null default 0,
  comision_pct numeric(5,2) not null,
  orden int not null   -- se evalua de menor a mayor orden; el primero que matchea gana
);

insert into comision_tiers (nombre, antiguedad_min_dias, rating_min, comision_pct, orden) values
  ('Oro',    365, 4.8, 15, 1),
  ('Plata',  180, 4.5, 18, 2),
  ('Bronce',  90, 4.0, 22, 3),
  ('Nuevo',    0, 0.0, 25, 4);

create or replace function calcular_comision_lavador(p_lavador_id uuid) returns numeric as $$
declare
  v_comision numeric;
begin
  select ct.comision_pct into v_comision
  from lavadores l
  join comision_tiers ct
    on (now() - l.creado_en) >= (ct.antiguedad_min_dias || ' days')::interval
   and l.rating_promedio >= ct.rating_min
  where l.id = p_lavador_id
  order by ct.orden asc
  limit 1;

  return coalesce(v_comision, 25);  -- fallback: piso 25% si no matchea ningun tier
end;
$$ language plpgsql stable;

-- ========== VOLUMEN: contador de pedidos completados, para priorizar en matching ==========
alter table lavadores add column pedidos_completados_count int not null default 0;

-- ========== EFECTOS AL COMPLETAR UN PEDIDO (volumen + fidelizacion) ==========
create or replace function procesar_pedido_completado() returns trigger as $$
declare
  v_umbral int;
  v_descuento_pct numeric;
begin
  if new.estado = 'completado' and old.estado is distinct from 'completado' then

    -- volumen del lavador, para ranking de matching
    update lavadores
    set pedidos_completados_count = pedidos_completados_count + 1
    where id = new.lavador_id;

    -- fidelizacion del cliente (el pago siempre fue in-app, no hay otro camino)
    insert into clientes_fidelizacion (cliente_id, lavados_acumulados, lavados_totales_historico)
    values (new.cliente_id, 1, 1)
    on conflict (cliente_id) do update
      set lavados_acumulados = clientes_fidelizacion.lavados_acumulados + 1,
          lavados_totales_historico = clientes_fidelizacion.lavados_totales_historico + 1,
          actualizado_en = now();

    insert into fidelizacion_movimientos (cliente_id, pedido_id, tipo)
    values (new.cliente_id, new.id, 'acumulacion');

    select valor into v_umbral from configuracion_app where clave = 'fidelizacion_umbral_lavados';

    update clientes_fidelizacion
    set descuento_disponible = true
    where cliente_id = new.cliente_id
      and lavados_acumulados >= v_umbral;

  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_procesar_pedido_completado
after update on pedidos
for each row execute function procesar_pedido_completado();

-- Nota de aplicacion: al crear un pedido nuevo, si clientes_fidelizacion.descuento_disponible
-- es true, la app debe aplicar fidelizacion_descuento_pct sobre precio_total, guardarlo en
-- pedidos.descuento_fidelizacion_pct/monto_descuento, insertar un movimiento 'canje', y
-- resetear lavados_acumulados a 0 y descuento_disponible a false.

alter table pedidos add column descuento_fidelizacion_pct numeric(5,2) not null default 0;
alter table pedidos add column monto_descuento numeric(10,2) not null default 0;
