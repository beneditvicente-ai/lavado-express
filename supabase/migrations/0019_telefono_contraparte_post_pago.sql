-- ========================================================================
-- Hasta ahora el telefono de cliente/lavador era estrictamente privado
-- (ver comentario en 0008_zonas_fotos_companeros.sql). Ahora se pide
-- exponerlo, pero SOLO entre las dos partes de un pedido, y SOLO despues
-- de que el pago quedo confirmado -- para el boton "Chatear por
-- WhatsApp". Igual que get_perfil_publico_contraparte (0006), pero
-- ademas exige que el pedido ya haya pasado el pago.
-- ========================================================================
create or replace function get_telefono_contraparte(p_pedido_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_telefono text;
begin
  if not exists (
    select 1 from pedidos p
    where p.id = p_pedido_id
      and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
      and p.estado not in ('buscando', 'pendiente_pago', 'sin_disponibilidad',
                            'cancelado_sin_cargo', 'cancelado_con_cargo', 'cancelado_lavador')
  ) and not is_admin() then
    return null;
  end if;

  select u.telefono into v_telefono
  from usuarios u
  join pedidos p on (u.id = p.cliente_id or u.id = p.lavador_id)
  where p.id = p_pedido_id
    and u.id != auth.uid();

  return v_telefono;
end;
$$;

grant execute on function get_telefono_contraparte(uuid) to authenticated;
