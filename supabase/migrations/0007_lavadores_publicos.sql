-- ========================================================================
-- VISTA PUBLICA DE LAVADORES (para el matching que ve el cliente)
--
-- Distinto del caso de perfil_publico que arreglamos en 0006: ahi el
-- problema era exponer nombre de TODOS los usuarios sin relacion. Aca la
-- fuente (lavadores activo=true y verificado=true) YA es publica por su
-- propia policy de RLS -- es el catalogo de lavadores disponibles del
-- marketplace, lo mismo que Uber mostrando el nombre de pila de un
-- conductor antes de confirmar el viaje. Solo agregamos el nombre (nunca
-- apellido completo ni telefono) desde usuarios para poder mostrarlo.
-- ========================================================================

create view lavadores_publicos as
select
  l.id,
  u.nombre,
  l.bio,
  l.rating_promedio,
  l.cantidad_calificaciones,
  l.pedidos_completados_count
from lavadores l
join usuarios u on u.id = l.id
where l.activo = true and l.verificado = true;

grant select on lavadores_publicos to authenticated, anon;
