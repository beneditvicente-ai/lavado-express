-- ========================================================================
-- ROW LEVEL SECURITY
--
-- Regla general: las transiciones de ESTADO de pedidos (confirmar pago,
-- en_camino, en_curso, completado, cancelaciones, asignacion de lavador
-- en el matching) NO tienen policy de UPDATE para authenticated. Eso es
-- intencional: esas escrituras deben hacerse desde el backend (Next.js
-- API routes / server actions) usando la service role key de Supabase,
-- que bypassea RLS, para poder validar reglas de negocio (ventana de
-- 24hs, no cobrar en falso en express, snapshot de comision, etc.) antes
-- de escribir. RLS aca gobierna lo que el usuario puede hacer directo
-- desde el cliente: leer lo suyo, mandar mensajes, editar su perfil/
-- direccion, crear el pedido inicial, calificar.
-- ========================================================================

-- ========== HELPER: chequeo de rol admin sin recursion ==========
-- security definer + dueño postgres => bypassea RLS al consultar usuarios,
-- evitando el loop infinito de "para leer usuarios necesito is_admin() que
-- necesita leer usuarios".
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from usuarios where id = auth.uid() and rol = 'admin'
  );
$$ language sql stable security definer set search_path = public;

-- ========== ALTA AUTOMATICA DE USUARIO AL REGISTRARSE (Supabase Auth) ==========
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.usuarios (id, nombre, apellido, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    'cliente'   -- rol por defecto; el admin promueve a lavador/admin despues
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function handle_new_user();

-- nadie (ni el propio usuario) puede auto-promoverse a lavador/admin
create or replace function prevent_cambio_rol() returns trigger as $$
begin
  if new.rol is distinct from old.rol and not is_admin() then
    raise exception 'Solo un admin puede cambiar el rol de un usuario';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_cambio_rol
before update on usuarios
for each row execute function prevent_cambio_rol();

-- ========== USUARIOS ==========
alter table usuarios enable row level security;

create policy "usuarios_select_propio_o_admin" on usuarios
  for select using (id = auth.uid() or is_admin());

create policy "usuarios_update_propio_o_admin" on usuarios
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- ========== DIRECCIONES ==========
alter table direcciones enable row level security;

create policy "direcciones_select_propia_o_admin" on direcciones
  for select using (usuario_id = auth.uid() or is_admin());

create policy "direcciones_insert_propia" on direcciones
  for insert with check (usuario_id = auth.uid());

create policy "direcciones_update_propia" on direcciones
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "direcciones_delete_propia" on direcciones
  for delete using (usuario_id = auth.uid());

-- ========== LAVADORES ==========
alter table lavadores enable row level security;

create policy "lavadores_select_activos_o_propio_o_admin" on lavadores
  for select using (activo = true or id = auth.uid() or is_admin());

-- alta de lavadores: la hace el admin (segun spec, es una funcion del panel admin)
create policy "lavadores_insert_admin" on lavadores
  for insert with check (is_admin());

-- el lavador puede editar su propio perfil (bio, precio historico via
-- lavador_servicios); columnas sensibles (activo, verificado,
-- rating_promedio, pedidos_completados_count) se escriben por convencion
-- solo desde backend con service role, no se fuerza a nivel de columna en RLS.
create policy "lavadores_update_propio_o_admin" on lavadores
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- ========== LAVADOR_ZONAS / DISPONIBILIDAD / ESTADO EXPRESS ==========
alter table lavador_zonas enable row level security;
alter table lavador_disponibilidad enable row level security;
alter table lavador_estado_express enable row level security;

create policy "lavador_zonas_select_publico" on lavador_zonas for select using (true);
create policy "lavador_zonas_write_propio_o_admin" on lavador_zonas
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

create policy "lavador_disponibilidad_select_publico" on lavador_disponibilidad for select using (true);
create policy "lavador_disponibilidad_write_propio_o_admin" on lavador_disponibilidad
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

create policy "lavador_estado_express_select_publico" on lavador_estado_express for select using (true);
create policy "lavador_estado_express_write_propio_o_admin" on lavador_estado_express
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

-- ========== CATALOGOS PUBLICOS: tipos_servicio, vehiculo_recargos, comision_tiers ==========
alter table tipos_servicio enable row level security;
alter table vehiculo_recargos enable row level security;
alter table comision_tiers enable row level security;
alter table configuracion_app enable row level security;

create policy "tipos_servicio_select_publico" on tipos_servicio for select using (true);
create policy "tipos_servicio_write_admin" on tipos_servicio for all using (is_admin()) with check (is_admin());

create policy "vehiculo_recargos_select_publico" on vehiculo_recargos for select using (true);
create policy "vehiculo_recargos_write_admin" on vehiculo_recargos for all using (is_admin()) with check (is_admin());

create policy "comision_tiers_select_publico" on comision_tiers for select using (true);
create policy "comision_tiers_write_admin" on comision_tiers for all using (is_admin()) with check (is_admin());

create policy "configuracion_app_select_publico" on configuracion_app for select using (true);
create policy "configuracion_app_write_admin" on configuracion_app for all using (is_admin()) with check (is_admin());

-- ========== LAVADOR_SERVICIOS (precio propio por tipo de servicio) ==========
alter table lavador_servicios enable row level security;

create policy "lavador_servicios_select_publico" on lavador_servicios for select using (true);
create policy "lavador_servicios_write_propio_o_admin" on lavador_servicios
  for all using (lavador_id = auth.uid() or is_admin())
  with check (lavador_id = auth.uid() or is_admin());

-- ========== PEDIDOS ==========
alter table pedidos enable row level security;

create policy "pedidos_select_propio_o_admin" on pedidos
  for select using (cliente_id = auth.uid() or lavador_id = auth.uid() or is_admin());

-- el cliente crea su propio pedido (arranca en 'buscando' o 'pendiente_pago');
-- toda transicion de estado posterior va por backend con service role.
create policy "pedidos_insert_propio_cliente" on pedidos
  for insert with check (cliente_id = auth.uid());

-- sin policy de UPDATE para authenticated: las transiciones de estado,
-- asignacion de lavador y cancelaciones se hacen solo con service role.

-- ========== PAGOS (solo lectura para las partes; escritura solo backend/webhook) ==========
alter table pagos enable row level security;

create policy "pagos_select_de_mi_pedido" on pagos
  for select using (
    is_admin() or exists (
      select 1 from pedidos p
      where p.id = pagos.pedido_id
        and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
    )
  );
-- sin policy de insert/update: los pagos se escriben desde el backend
-- (creacion de preferencia MP + webhook de confirmacion) con service role.

-- ========== CALIFICACIONES ==========
alter table calificaciones enable row level security;

-- publicas para mostrar reputacion del lavador (perfil, listado de matching)
create policy "calificaciones_select_publico" on calificaciones for select using (true);

-- el cliente califica su propio pedido, una vez completado
create policy "calificaciones_insert_propio_cliente" on calificaciones
  for insert with check (
    cliente_id = auth.uid()
    and exists (
      select 1 from pedidos p
      where p.id = calificaciones.pedido_id
        and p.cliente_id = auth.uid()
        and p.estado = 'completado'
    )
  );
-- las penalizaciones automaticas por cancelacion del lavador se insertan
-- via trigger disparado desde una UPDATE con service role, que bypassea RLS.

-- ========== PEDIDO_EVENTOS (auditoria) ==========
alter table pedido_eventos enable row level security;

create policy "pedido_eventos_select_de_mi_pedido" on pedido_eventos
  for select using (
    is_admin() or exists (
      select 1 from pedidos p
      where p.id = pedido_eventos.pedido_id
        and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
    )
  );
-- sin policy de insert: los eventos los escribe el backend (service role)
-- en cada transicion de estado, para que el historial sea confiable.

-- ========== MENSAJES (chat in-app) ==========
alter table mensajes enable row level security;

create policy "mensajes_select_de_mi_pedido" on mensajes
  for select using (
    is_admin() or exists (
      select 1 from pedidos p
      where p.id = mensajes.pedido_id
        and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
    )
  );

create policy "mensajes_insert_propio" on mensajes
  for insert with check (
    remitente_id = auth.uid()
    and exists (
      select 1 from pedidos p
      where p.id = mensajes.pedido_id
        and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
    )
  );
-- sin update/delete: el chat es inmutable y trazable para moderacion.

-- ========== FIDELIZACION (solo lectura para el cliente; escritura solo backend) ==========
alter table clientes_fidelizacion enable row level security;
alter table fidelizacion_movimientos enable row level security;

create policy "clientes_fidelizacion_select_propio_o_admin" on clientes_fidelizacion
  for select using (cliente_id = auth.uid() or is_admin());

create policy "fidelizacion_movimientos_select_propio_o_admin" on fidelizacion_movimientos
  for select using (cliente_id = auth.uid() or is_admin());
-- sin insert/update para authenticated: los movimientos los genera el
-- trigger procesar_pedido_completado(), disparado por una UPDATE con
-- service role.

-- ========== MENSAJES: reforzar deteccion de contacto tambien server-side ==========
comment on function contiene_datos_contacto(text) is 'Se ejecuta como trigger BEFORE INSERT en mensajes, corre siempre (tambien con service role), no depende de RLS.';
