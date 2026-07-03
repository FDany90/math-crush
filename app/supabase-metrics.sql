-- ====================================================================
-- Habilitar LECTURA (para la página /metricas) sobre players/events.
-- Correr en Supabase → SQL Editor → Run.
--
-- ⚠️ OJO PRIVACIDAD: esto deja los datos LEGIBLES por cualquiera que tenga la
-- anon key (que es pública) o la URL /metricas. Los datos son anónimos (UUID +
-- nick opcional + eventos de juego, sin PII), así que para un playtest está OK.
-- Si querés cerrarlo más adelante: borrá estas policies y leé las métricas con
-- una Edge Function + service key, o desde el dashboard de Supabase.
-- ====================================================================

create policy "anon read events"  on events  for select to anon using (true);
create policy "anon read players" on players for select to anon using (true);

-- Para REVERTIR (volver a solo-inserción):
--   drop policy "anon read events"  on events;
--   drop policy "anon read players" on players;
