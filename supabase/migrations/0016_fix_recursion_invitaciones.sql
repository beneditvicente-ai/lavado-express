-- ========================================================================
-- Fix: la policy de pedido_invitaciones miraba la tabla pedidos para saber
-- si el que pregunta es el cliente dueño, y la policy de pedidos (para
-- programado) mira pedido_invitaciones -- eso arma un loop infinito de RLS
-- (error 42P17 "infinite recursion detected"). Mismo problema que ya
-- resolvimos con is_admin(): una funcion security definer corta el loop
-- porque no vuelve a evaluar RLS de la tabla que consulta.
-- ========================================================================
create or replace function es_cliente_del_pedido(p_pedido_id uuid) returns boolean as $$
  select exists (
    select 1 from pedidos where id = p_pedido_id and cliente_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "pedido_invitaciones_select" on pedido_invitaciones;
create policy "pedido_invitaciones_select" on pedido_invitaciones
  for select using (
    lavador_id = auth.uid()
    or is_admin()
    or es_cliente_del_pedido(pedido_id)
  );

-- limpieza: borramos la funcion de diagnóstico temporal que usamos para
-- encontrar este bug
drop function if exists public.debug_policies();
