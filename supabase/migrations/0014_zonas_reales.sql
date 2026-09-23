-- Reemplaza el catalogo de zonas (que era generico de CABA) por las
-- zonas reales donde arranca el servicio. Limpia las referencias de
-- prueba existentes antes de borrar el catalogo viejo (son datos de
-- testing, no de produccion).
update pedidos set zona_id = null where zona_id is not null;
delete from lavador_zonas;
delete from zonas_disponibles;

insert into zonas_disponibles (nombre, orden) values
  ('Tigre', 1),
  ('General Pacheco', 2),
  ('Benavídez', 3),
  ('Don Torcuato', 4),
  ('Nordelta', 5),
  ('Rincón de Milberg', 6),
  ('El Talar', 7),
  ('Troncos del Talar', 8),
  ('Dique Luján', 9),
  ('San Isidro', 10),
  ('Martínez', 11),
  ('Acassuso', 12),
  ('Beccar', 13),
  ('Boulogne', 14);
