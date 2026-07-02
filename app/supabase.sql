-- ====================================================================
-- Math Crush — esquema de métricas de playtest para Supabase.
-- Pegar en Supabase → SQL Editor → New query → Run.
-- ====================================================================

-- Jugadores anónimos (UUID generado en el cliente + nick opcional)
create table if not exists players (
  id          uuid primary key,
  nick        text,
  created_at  timestamptz default now(),
  last_seen   timestamptz default now()
);

-- Log de eventos (una fila por acción). kind:
--   'start'    → empezó un nivel
--   'win'      → completó el nivel   (meta: { stars, timeLeft })
--   'lose'     → perdió el nivel     (meta: { reason, left, timeLeft })
--   'hint'     → pidió una pista
--   'continue' → usó "+1 minuto"
create table if not exists events (
  id          bigint generated always as identity primary key,
  player_id   uuid not null,
  nick        text,
  level_idx   int,
  kind        text,
  meta        jsonb,
  created_at  timestamptz default now()
);

create index if not exists events_level_kind_idx on events (level_idx, kind);
create index if not exists events_player_idx      on events (player_id);

-- ---- Seguridad: RLS. El cliente (anon key, pública) SOLO puede insertar. ----
alter table players enable row level security;
alter table events  enable row level security;

-- players: insertar y actualizar la propia fila (upsert de nick/last_seen)
create policy "anon insert players" on players for insert to anon with check (true);
create policy "anon update players" on players for update to anon using (true) with check (true);

-- events: solo insertar (nadie lee eventos con la anon key)
create policy "anon insert events"  on events  for insert to anon with check (true);

-- ====================================================================
-- Consultas útiles para balancear (correr en el SQL Editor con tu cuenta):
--
-- Resumen por nivel:
--   select level_idx,
--          count(*) filter (where kind='start')    as intentos,
--          count(*) filter (where kind='win')       as victorias,
--          count(*) filter (where kind='lose')      as derrotas,
--          count(*) filter (where kind='hint')       as pistas,
--          count(*) filter (where kind='continue')   as un_min
--   from events group by level_idx order by level_idx;
--
-- Pistas/continues promedio por intento de nivel:
--   select level_idx,
--          round(count(*) filter (where kind='hint')::numeric
--                / nullif(count(*) filter (where kind='start'),0), 2) as pistas_x_intento,
--          round(count(*) filter (where kind='continue')::numeric
--                / nullif(count(*) filter (where kind='start'),0), 2) as unmin_x_intento
--   from events group by level_idx order by level_idx;
-- ====================================================================
