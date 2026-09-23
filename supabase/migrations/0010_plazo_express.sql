-- ========================================================================
-- PLAZO MAXIMO PARA EXPRESS: cuando el lavador acepta, se compromete a
-- terminarlo dentro de N horas. Se calcula y se guarda en el momento de
-- aceptar (no antes, porque hasta ahi no hay lavador asignado).
-- ========================================================================

insert into configuracion_app (clave, valor, descripcion) values
  ('plazo_express_horas', 2, 'Horas que tiene el lavador para completar un express desde que lo acepta')
on conflict (clave) do nothing;

alter table pedidos add column fecha_limite_express timestamptz;
