-- ========================================================================
-- FIX: la vista perfil_publico quedaba UNRESTRICTED (Supabase la deja
-- visible para cualquier usuario logueado, sin filtrar filas, porque las
-- vistas no soportan RLS). Exponia nombre + inicial de apellido + rol de
-- TODOS los usuarios, no solo de la contraparte de un pedido compartido.
--
-- La reemplazamos por una funcion que valida que quien pregunta comparte
-- ese pedido especifico (o es admin) antes de devolver el dato.
-- ========================================================================

drop view if exists perfil_publico;

create or replace function get_perfil_publico_contraparte(p_pedido_id uuid)
returns table (id uuid, nombre text, inicial_apellido text, rol user_role)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from pedidos p
    where p.id = p_pedido_id
      and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
  ) and not is_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select u.id, u.nombre,
         case when length(u.apellido) > 0 then left(u.apellido, 1) || '.' else '' end,
         u.rol
  from usuarios u
  join pedidos p on (u.id = p.cliente_id or u.id = p.lavador_id)
  where p.id = p_pedido_id
    and u.id != auth.uid();
end;
$$;

grant execute on function get_perfil_publico_contraparte(uuid) to authenticated;
