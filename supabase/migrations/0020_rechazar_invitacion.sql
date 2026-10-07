-- ========================================================================
-- Permite que un lavador invitado a un turno programado lo RECHACE
-- explicitamente (en vez de simplemente ignorarlo). Aplica una
-- penalizacion de rating LEVE -- el lavador ya habia declarado ese
-- horario como libre, asi que no es tan grave como cancelar un trabajo
-- ya tomado (que baja 1 estrella completa via
-- trg_penalizar_cancelacion_lavador). Se modela como una calificacion de
-- 4 estrellas: pesa poco sobre el promedio en vez de hundirlo.
-- ========================================================================
alter table pedido_invitaciones add column rechazada_en timestamptz;

-- una penalizacion "leve" no esta atada a UN pedido especifico: el pedido
-- sigue abierto para el resto de los invitados y mas adelante va a tener
-- su propia calificacion real (de quien efectivamente lo termine) --
-- por eso pedido_id pasa a ser opcional. Sigue siendo unique (permite
-- multiples NULL sin problema) asi que no rompe nada existente.
alter table calificaciones alter column pedido_id drop not null;

-- una vez rechazada, esa solicitud ya no se le vuelve a mostrar al
-- lavador que la rechazo (pero si al resto de los invitados)
drop policy if exists "pedidos_select_invitado_programado" on pedidos;
create policy "pedidos_select_invitado_programado" on pedidos
  for select using (
    estado = 'buscando'
    and lavador_id is null
    and tipo = 'programado'
    and exists (
      select 1 from pedido_invitaciones pi
      where pi.pedido_id = pedidos.id
        and pi.lavador_id = auth.uid()
        and pi.rechazada_en is null
    )
  );
