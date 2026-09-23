-- ========================================================================
-- FOTOS DEL RESULTADO: el lavador las sube al marcar el pedido como
-- terminado. Usa el mismo bucket 'lavador-fotos' (la politica de storage
-- ya permite escribir bajo la carpeta del propio lavador_id).
-- ========================================================================
create table pedido_fotos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  storage_path text not null,
  creado_en timestamptz not null default now()
);

create index idx_pedido_fotos_pedido on pedido_fotos(pedido_id);

alter table pedido_fotos enable row level security;

create policy "pedido_fotos_select_de_mi_pedido" on pedido_fotos
  for select using (
    is_admin() or exists (
      select 1 from pedidos p
      where p.id = pedido_fotos.pedido_id
        and (p.cliente_id = auth.uid() or p.lavador_id = auth.uid())
    )
  );

create policy "pedido_fotos_insert_lavador_propio" on pedido_fotos
  for insert with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_fotos.pedido_id
        and p.lavador_id = auth.uid()
    )
  );
