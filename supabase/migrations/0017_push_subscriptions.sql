-- ========================================================================
-- Suscripciones a notificaciones push (Web Push) para lavadores. Cuando
-- se crea un pedido, el servidor busca las suscripciones de los
-- lavadores cuya zona de cobertura coincide y les manda un push.
-- ========================================================================
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  lavador_id uuid not null references lavadores(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);

create index push_subscriptions_lavador_id_idx on push_subscriptions (lavador_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_propio" on push_subscriptions
  for all using (auth.uid() = lavador_id) with check (auth.uid() = lavador_id);
