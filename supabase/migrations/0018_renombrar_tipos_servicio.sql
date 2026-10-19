-- ========================================================================
-- Renombra el catalogo de tipos_servicio para que el cliente elija entre
-- 3 opciones independientes (ya no una escalera de niveles):
--   Basico   -> Lavado exterior
--   Encerado -> Lavado interior y exterior
--   Premium  -> Encerado
-- ========================================================================
update tipos_servicio
  set nombre = 'Lavado exterior',
      descripcion = 'Carrocería, vidrios, llantas y aspirado rápido del interior.'
  where nombre = 'Basico';

update tipos_servicio
  set nombre = 'Lavado interior y exterior',
      descripcion = 'Todo el lavado exterior + aspirado profundo y limpieza de tapizados con paño húmedo.'
  where nombre = 'Encerado';

update tipos_servicio
  set nombre = 'Encerado',
      descripcion = 'Todo el lavado interior y exterior + encerado/sellador de pintura y abrillantado de plásticos.'
  where nombre = 'Premium';
