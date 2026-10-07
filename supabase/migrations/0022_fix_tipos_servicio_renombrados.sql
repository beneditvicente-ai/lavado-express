-- ========================================================================
-- Fix: en algun momento se renombraron las 3 filas de tipos_servicio
-- (Basico -> "Lavado exterior", Encerado -> "Lavado interior y exterior",
-- Premium -> "Encerado"). La migracion 0018 filtraba por NOMBRE
-- ('Basico'/'Encerado'/'Premium'), asi que no encontro coincidencias
-- correctas: desactivo la fila equivocada y el insert de precios no migro
-- nada (matcheaba 'Basico', que ya no existia con ese nombre).
--
-- Esta vez se apunta por ID (estable, no cambia si renombran el texto).
-- ========================================================================

-- deja activo solo el primer nivel (orden 1); el resto queda desactivado
update tipos_servicio set activo = false
where id <> '5e51d2a0-98af-4f66-97d3-2bbf32db11ec';

-- backfill correcto: el precio que cada lavador tenia cargado para el
-- servicio de orden 1 pasa a ser su precio de "auto"; suv/pickup arrancan
-- aplicando el recargo global que regia antes
insert into lavador_precios_vehiculo (lavador_id, tipo_vehiculo, precio)
select
  ls.lavador_id,
  vr.tipo_vehiculo,
  round(ls.precio * (1 + vr.recargo_pct / 100), 2)
from lavador_servicios ls
cross join vehiculo_recargos vr
where ls.tipo_servicio_id = '5e51d2a0-98af-4f66-97d3-2bbf32db11ec'
  and ls.activo = true
on conflict (lavador_id, tipo_vehiculo) do nothing;
