// ====================================================================
// Persistencia en localStorage: progreso (estrellas) y corazones (vidas).
// Extraído de App.jsx. El reset por versión corre al importar este módulo.
// ====================================================================

const PROGRESS_KEY = 'math_progress'
// Reset global de progreso: subí PROGRESS_VERSION cada vez que reestructures los
// niveles. Al cargar, si la versión guardada no coincide, se borra el progreso una
// sola vez → TODOS los que ya jugaron empiezan de cero en su próxima visita (no hay
// que tocar nada en su dispositivo). Ver DISEÑO_PROGRESION.md.
const PROGRESS_VERSION = '8'
const PROGRESS_VERSION_KEY = 'math_progress_version'
try {
  if (localStorage.getItem(PROGRESS_VERSION_KEY) !== PROGRESS_VERSION) {
    localStorage.removeItem(PROGRESS_KEY)
    localStorage.setItem(PROGRESS_VERSION_KEY, PROGRESS_VERSION)
  }
} catch { /* sin localStorage: no hay progreso que resetear */ }
export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { stars: {} } }
  catch { return { stars: {} } }
}
export function saveProgress(p) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)) } catch { /* noop */ } }

// ---------- CORAZONES ❤️ (vidas globales: reintentar un nivel perdido cuesta 1) ----------
// v1: máx 5, regen +1 cada 25 min (generoso, no coercitivo — ver estrategia de retención).
// Persisten { n, t } donde t = base del reloj de regen. Al cargar se calcula cuántos se
// regeneraron desde t. Refill futuro: regalo diario + rewarded ad (opt-in).
export const HEARTS_MAX = 5
export const HEARTS_REGEN_MS = 25 * 60 * 1000
const HEARTS_KEY = 'math_hearts'
export function loadHearts() {
  let n = HEARTS_MAX, t = Date.now()
  try {
    const raw = JSON.parse(localStorage.getItem(HEARTS_KEY) || 'null')
    if (raw && typeof raw.n === 'number' && typeof raw.t === 'number') { n = raw.n; t = raw.t }
  } catch { /* sin localStorage */ }
  if (n >= HEARTS_MAX) return { n: HEARTS_MAX, t: Date.now() }        // lleno: reloj en cero
  const gained = Math.floor((Date.now() - t) / HEARTS_REGEN_MS)      // regen acumulada
  if (gained > 0) { n = Math.min(HEARTS_MAX, n + gained); t = n >= HEARTS_MAX ? Date.now() : t + gained * HEARTS_REGEN_MS }
  return { n, t }
}
export function saveHearts(h) { try { localStorage.setItem(HEARTS_KEY, JSON.stringify(h)) } catch { /* noop */ } }
// segundos hasta el próximo corazón (0 si está lleno)
export function heartsNextInSec(h) {
  if (h.n >= HEARTS_MAX) return 0
  return Math.max(0, Math.ceil((h.t + HEARTS_REGEN_MS - Date.now()) / 1000))
}
