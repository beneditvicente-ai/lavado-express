-- ========================================================================
-- ALTA DE LAVADOR POR POSTULACION + APROBACION DEL ADMIN
-- Un cliente logueado se postula como lavador. Queda pendiente hasta que
-- el admin lo aprueba (o rechaza) desde el panel. El cambio de rol y la
-- creacion de la fila en `lavadores` pasan por una funcion unica y
-- transaccional, para que nunca quede un estado a medias.
-- ========================================================================

-- limpieza: precio_base en lavadores quedo obsoleto desde la migracion
-- 0003 (el precio real es por tipo de servicio, en lavador_servicios).
alter table lavadores drop column precio_base;

-- bootstrap: permitir cambiar el rol cuando NO hay sesion de usuario final
-- (SQL Editor del dashboard, migraciones, backend con service role). Con
-- sesion de usuario final (auth.uid() presente), sigue exigiendo is_admin().
-- Sin este ajuste, ni siquiera vos podrias auto-asignarte admin la primera vez.
create or replace function prevent_cambio_rol() returns trigger as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null and not is_admin() then
    raise exception 'Solo un admin puede cambiar el rol de un usuario';
  end if;
  return new;
end;
$$ language plpgsql;

-- un lavador solo es visible/reservable si esta activo Y aprobado
drop policy if exists "lavadores_select_activos_o_propio_o_admin" on lavadores;
create policy "lavadores_select_activos_o_propio_o_admin" on lavadores
  for select using ((activo = true and verificado = true) or id = auth.uid() or is_admin());

-- ========== SOLICITUDES ==========
create table solicitudes_lavador (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  bio text,
  zona text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo text,
  revisado_por uuid references usuarios(id),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

-- evita que alguien mande solicitudes en loop mientras tiene una pendiente
create unique index idx_solicitud_pendiente_unica on solicitudes_lavador(usuario_id)
  where estado = 'pendiente';

alter table solicitudes_lavador enable row level security;

create policy "solicitudes_select_propia_o_admin" on solicitudes_lavador
  for select using (usuario_id = auth.uid() or is_admin());

create policy "solicitudes_insert_propia" on solicitudes_lavador
  for insert with check (
    usuario_id = auth.uid()
    and exists (select 1 from usuarios where id = auth.uid() and rol = 'cliente')
  );
-- sin policy de update: aprobar/rechazar solo por las funciones de abajo.

-- ========== APROBAR / RECHAZAR (transaccional, solo admin) ==========
create or replace function aprobar_solicitud_lavador(p_solicitud_id uuid) returns void as $$
declare
  v_usuario_id uuid;
  v_bio text;
begin
  if not is_admin() then
    raise exception 'Solo un admin puede aprobar solicitudes';
  end if;

  select usuario_id, bio into v_usuario_id, v_bio
  from solicitudes_lavador
  where id = p_solicitud_id and estado = 'pendiente';

  if v_usuario_id is null then
    raise exception 'Solicitud no encontrada o ya resuelta';
  end if;

  update usuarios set rol = 'lavador' where id = v_usuario_id;

  insert into lavadores (id, bio, activo, verificado)
  values (v_usuario_id, v_bio, true, true)
  on conflict (id) do update
    set activo = true, verificado = true, bio = coalesce(excluded.bio, lavadores.bio);

  update solicitudes_lavador
  set estado = 'aprobada', revisado_por = auth.uid(), resuelto_en = now()
  where id = p_solicitud_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function rechazar_solicitud_lavador(p_solicitud_id uuid, p_motivo text) returns void as $$
begin
  if not is_admin() then
    raise exception 'Solo un admin puede rechazar solicitudes';
  end if;

  update solicitudes_lavador
  set estado = 'rechazada', motivo_rechazo = p_motivo, revisado_por = auth.uid(), resuelto_en = now()
  where id = p_solicitud_id and estado = 'pendiente';
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function aprobar_solicitud_lavador(uuid) to authenticated;
grant execute on function rechazar_solicitud_lavador(uuid, text) to authenticated;
