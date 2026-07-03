// ====================================================================
// Métricas de playtest → Supabase (con fallback a localStorage).
//
// Identifica al jugador con un UUID anónimo persistente (localStorage) +
// un nick opcional. Registra un evento por cada acción relevante para
// balancear niveles: 'hint' (pista pedida), 'continue' (+1 min), 'start'
// (empezó nivel), 'win' / 'lose' (fin de nivel).
//
// Si no hay credenciales de Supabase (VITE_SUPABASE_URL / _ANON_KEY),
// guarda SOLO en localStorage (sirve para probar en tu propio celu).
// ====================================================================
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = URL && KEY ? createClient(URL, KEY) : null

const ID_KEY = 'math_player_id'
const NICK_KEY = 'math_player_nick'
const LOCAL_KEY = 'math_metrics'      // agregado local (fallback + ver rápido)

function uuid() {
  try { return crypto.randomUUID() }
  catch { return 'anon-' + Math.random().toString(16).slice(2, 10) }
}

export function getPlayerId() {
  let id = localStorage.getItem(ID_KEY)
  if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id) }
  return id
}

export function getNick() { return localStorage.getItem(NICK_KEY) || '' }

export function setNick(nick) {
  const n = (nick || '').trim().slice(0, 24)
  localStorage.setItem(NICK_KEY, n)
  upsertPlayer()                      // refleja el nick en la BD
  return n
}

export function hasSupabase() { return !!supabase }
export function getSupabase() { return supabase }   // para la página /metricas

// Crea/actualiza la fila del jugador. NO usamos upsert: con RLS, INSERT..ON CONFLICT
// falla (choca con las policies). Hacemos update (si existe) + insert (si es la 1a vez;
// si ya existe, el insert devuelve error de clave duplicada y se ignora). Silencioso.
async function upsertPlayer() {
  if (!supabase) return
  const id = getPlayerId()
  const row = { id, nick: getNick() || null, last_seen: new Date().toISOString() }
  try {
    await supabase.from('players').update({ nick: row.nick, last_seen: row.last_seen }).eq('id', id)
    await supabase.from('players').insert(row)   // error de PK duplicada = fila ya existía: OK
  } catch { /* sin conexión: se ignora */ }
}

// llamar una vez al arrancar la app
export function initMetrics() {
  getPlayerId()
  upsertPlayer()
}

// contador local por nivel (fallback y para ver rápido en consola)
function bumpLocal(kind, levelIdx) {
  try {
    const m = JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}
    m[kind] = m[kind] || {}
    m[kind][levelIdx] = (m[kind][levelIdx] || 0) + 1
    localStorage.setItem(LOCAL_KEY, JSON.stringify(m))
  } catch { /* storage lleno */ }
}

// registrar un evento (fire-and-forget: no bloquea el juego)
export function trackEvent(kind, levelIdx, meta = {}) {
  bumpLocal(kind, levelIdx)
  console.log('[metrics]', kind, '· nivel', levelIdx + 1, meta)
  if (!supabase) return
  supabase
    .from('events')
    .insert({ player_id: getPlayerId(), nick: getNick() || null, level_idx: levelIdx, kind, meta })
    .then(({ error }) => { if (error) console.warn('[metrics] insert error:', error.message) })
}
