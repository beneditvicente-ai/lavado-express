-- Permite que cada parte "elimine" un pedido de SU propio historial sin
-- borrar el registro real (rompería calificaciones/pagos y el historial
-- de la otra parte). Cada quien tiene su propio flag.
alter table pedidos add column oculto_cliente boolean not null default false;
alter table pedidos add column oculto_lavador boolean not null default false;
