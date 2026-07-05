import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Board, MAX_PX } from './pixi/Board.js'
import { Controller, getHintPool, setHintPool, HINTS_MAX } from './game/controller.js'
import { LEVELS } from './game/levels.js'
import { initMetrics, getNick, setNick, trackEvent } from './metrics.js'

// color de tiza del token según el tipo de ficha (coincide con Board.js)
const OPS = ['+', '−', '×', '÷']
function tokenColor(ch) {
  if (ch === '=') return '#e0a30f'
  if (OPS.includes(ch)) return '#db2777'
  return '#2563eb'
}

function fmtTime(s) {
  const t = Math.ceil(s || 0)
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')
}

// garabatos de tiza al azar para el fondo del menú (cuentas + símbolos, en los bordes)
const DOODLE_MARKS = ['★', '♡', '∑', '√', '?', 'π', '∞']
function buildDoodles() {
  const rnd = (n) => Math.floor(Math.random() * n)
  const a = 1 + rnd(8), b = 1 + rnd(8)
  const c = 4 + rnd(5), d = 1 + rnd(c - 1)
  const e = 2 + rnd(6), f = 2 + rnd(6)
  const items = [
    `${a} + ${b} = ${a + b}`,
    `${c} − ${d} = ${c - d}`,
    `${e} × ${f}`,
    '♥',                                          // corazón de tiza (siempre presente)
    DOODLE_MARKS[rnd(DOODLE_MARKS.length)],
  ]
  const spots = [
    { top: '9%', left: '5%' },
    { top: '15%', right: '6%' },
    { bottom: '11%', right: '8%' },
    { bottom: '9%', left: '7%' },
    { top: '7%', right: '27%' },
  ]
  return items.map((t, i) => ({ t, ...spots[i % spots.length], rot: (rnd(2) ? 1 : -1) * (4 + rnd(11)) }))
}

// confeti para la pantalla de "Nivel superado"
function buildConfetti(n = 20) {
  const rnd = (x) => Math.floor(Math.random() * x)
  const colors = ['#ffd23f', '#4f8cff', '#ec4899', '#f4f1e8', '#f59e0b', '#7fdfff']
  return Array.from({ length: n }, () => ({
    left: rnd(100) + '%',
    delay: (rnd(70) / 100) + 's',
    dur: (1.1 + rnd(90) / 100) + 's',
    color: colors[rnd(colors.length)],
    rot: rnd(360),
    size: (7 + rnd(8)),
  }))
}

// ---------- MUNDOS por operación (bloques de 10 niveles) ----------
// Cada mundo = un sector del mapa con su símbolo, nombre y color de tiza (más sobrio).
const WORLDS = [
  { at: 0,  name: 'SUMA',           sym: '+', color: '#8ecae6' },
  { at: 10, name: 'RESTA',          sym: '−', color: '#e6a0b0' },
  { at: 20, name: 'MULTIPLICAR',    sym: '×', color: '#e7c86a' },
  { at: 30, name: 'DIVISIÓN',       sym: '÷', color: '#b0a0d8' },
]
const worldOf = (i) => WORLDS[Math.min(WORLDS.length - 1, Math.floor(i / 10))]
const zoneColor = (i) => worldOf(i).color
const CHALK_COLORS = ['#7fdfff', '#ff79b8', '#ffd23f', '#b98cff', '#7bed9f', '#f4f1e8']
const DOODLE_TYPES = ['star', 'house', 'tree', 'planet', 'book', 'spark', 'heart', 'triangle', 'bulb']

// garabatos SVG repartidos a los costados del camino (flotan suave)
function buildMapDoodles(n) {
  const rnd = (x) => Math.floor(Math.random() * x)
  const out = []
  for (let i = 0; i < n * 1.4; i++) {
    const side = i % 2 ? 'left' : 'right'
    out.push({
      type: DOODLE_TYPES[rnd(DOODLE_TYPES.length)],
      color: CHALK_COLORS[rnd(CHALK_COLORS.length)],
      top: (2 + (i * 96) / (n * 1.4) + rnd(4)) + '%',
      side,
      off: (1 + rnd(9)),
      size: 28 + rnd(30),
      rot: (rnd(2) ? 1 : -1) * rnd(18),
      dur: (3 + rnd(4)),
      delay: rnd(30) / 10,
    })
  }
  return out
}

// dibujitos de tiza (SVG con trazo, se ven "dibujados a mano" con el filtro chalkRough)
function ChalkDoodle({ type, color, size }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const svg = (kids) => (
    <svg viewBox="0 0 32 32" width={size} height={size} style={{ filter: 'url(#chalkRough)', overflow: 'visible' }}>{kids}</svg>
  )
  switch (type) {
    case 'star':     return svg(<path {...p} d="M16 3l3.6 7.4 8 1.1-5.9 5.5 1.5 8L16 28.6 8.8 32.5l1.5-8L4.4 11.5l8-1.1z" />)
    case 'house':    return svg(<><path {...p} d="M5 16L16 6l11 10" /><path {...p} d="M8 15v11h16V15" /><path {...p} d="M14 26v-6h4v6" /></>)
    case 'tree':     return svg(<><path {...p} d="M16 4l7 11H9z" /><path {...p} d="M16 11l6 9H10z" /><path {...p} d="M16 20v7" /></>)
    case 'planet':   return svg(<><circle {...p} cx="16" cy="15" r="8" /><ellipse {...p} cx="16" cy="16" rx="15" ry="4.5" transform="rotate(-20 16 16)" /></>)
    case 'book':     return svg(<><path {...p} d="M6 8c4-2 8-2 10 0 2-2 6-2 10 0v16c-4-2-8-2-10 0-2-2-6-2-10 0z" /><path {...p} d="M16 8v16" /></>)
    case 'spark':    return svg(<><path {...p} d="M16 4v24M4 16h24" /><path {...p} d="M8 8l16 16M24 8L8 24" opacity=".7" /></>)
    case 'heart':    return svg(<path {...p} d="M16 27C6 20 4 13 8 9c3-3 6-1 8 2 2-3 5-5 8-2 4 4 2 11-8 18z" />)
    case 'triangle': return svg(<path {...p} d="M16 5l12 22H4z" />)
    case 'bulb':     return svg(<><path {...p} d="M16 4a8 8 0 0 1 5 14c-1 1-1 2-1 3h-8c0-1 0-2-1-3a8 8 0 0 1 5-14z" /><path {...p} d="M12 25h8M13 28h6" /></>)
    default:         return svg(<circle {...p} cx="16" cy="16" r="10" />)
  }
}

// Mascota: búho-profe de tiza (cuerpo cyan, cachetes rosa, birrete dorado, saluda)
function Mascota() {
  const p = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg className="mascota-svg" viewBox="0 0 120 130" width="96" style={{ filter: 'url(#chalkRough)', overflow: 'visible' }}>
      {/* cuerpo */}
      <path {...p} stroke="#7fdfff" strokeWidth="3" d="M60 40c-20 0-30 16-30 38 0 24 14 40 30 40s30-16 30-40c0-22-10-38-30-38z" fill="#7fdfff22" />
      {/* orejas/plumas */}
      <path {...p} stroke="#7fdfff" strokeWidth="3" d="M38 48c-6-6-8-14-6-18 5 1 11 6 13 13M82 48c6-6 8-14 6-18-5 1-11 6-13 13" />
      {/* ojos */}
      <circle {...p} stroke="#f4f1e8" strokeWidth="3" cx="49" cy="66" r="11" fill="#1f2a26" />
      <circle {...p} stroke="#f4f1e8" strokeWidth="3" cx="71" cy="66" r="11" fill="#1f2a26" />
      <circle cx="52" cy="64" r="3.4" fill="#f4f1e8" />
      <circle cx="74" cy="64" r="3.4" fill="#f4f1e8" />
      {/* pico */}
      <path {...p} stroke="#ffd23f" strokeWidth="3" d="M60 74l-5 7h10z" fill="#ffd23f55" />
      {/* cachetes */}
      <circle cx="38" cy="78" r="5" fill="#ff79b855" />
      <circle cx="82" cy="78" r="5" fill="#ff79b855" />
      {/* pancita (líneas) */}
      <path {...p} stroke="#7fdfff" strokeWidth="2" d="M50 92c6 4 14 4 20 0M52 100c5 3 11 3 16 0" opacity=".8" />
      {/* patitas */}
      <path {...p} stroke="#ffd23f" strokeWidth="3" d="M52 118v6m-3-3h6M68 118v6m-3-3h6" />
      {/* brazo que saluda */}
      <path className="mascota-arm" {...p} stroke="#7fdfff" strokeWidth="3" d="M88 84c8-2 14-8 16-16" />
      {/* birrete (profe de mates) */}
      <g stroke="#ffd23f" strokeWidth="3" fill="none" strokeLinejoin="round">
        <path d="M60 20L40 28l20 8 20-8z" fill="#ffd23f33" />
        <path {...p} d="M50 33v8c0 3 20 3 20 0v-8" />
        <path {...p} d="M80 28v10" />
        <circle cx="80" cy="40" r="2.5" fill="#ffd23f" />
      </g>
    </svg>
  )
}

const PROGRESS_KEY = 'math_progress'
// Reset global de progreso: subí PROGRESS_VERSION cada vez que reestructures los
// niveles. Al cargar, si la versión guardada no coincide, se borra el progreso una
// sola vez → TODOS los que ya jugaron empiezan de cero en su próxima visita (no hay
// que tocar nada en su dispositivo). Ver DISEÑO_PROGRESION.md.
const PROGRESS_VERSION = '6'
const PROGRESS_VERSION_KEY = 'math_progress_version'
try {
  if (localStorage.getItem(PROGRESS_VERSION_KEY) !== PROGRESS_VERSION) {
    localStorage.removeItem(PROGRESS_KEY)
    localStorage.setItem(PROGRESS_VERSION_KEY, PROGRESS_VERSION)
  }
} catch { /* sin localStorage: no hay progreso que resetear */ }
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { stars: {} } }
  catch { return { stars: {} } }
}

// ---------- CORAZONES ❤️ (vidas globales: reintentar un nivel perdido cuesta 1) ----------
// v1: máx 5, regen +1 cada 25 min (generoso, no coercitivo — ver estrategia de retención).
// Persisten { n, t } donde t = base del reloj de regen. Al cargar se calcula cuántos se
// regeneraron desde t. Refill futuro: regalo diario + rewarded ad (opt-in).
const HEARTS_MAX = 5
const HEARTS_REGEN_MS = 25 * 60 * 1000
const HEARTS_KEY = 'math_hearts'
function loadHearts() {
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
function saveHearts(h) { try { localStorage.setItem(HEARTS_KEY, JSON.stringify(h)) } catch { /* noop */ } }
// segundos hasta el próximo corazón (0 si está lleno)
function heartsNextInSec(h) {
  if (h.n >= HEARTS_MAX) return 0
  return Math.max(0, Math.ceil((h.t + HEARTS_REGEN_MS - Date.now()) / 1000))
}
function fmtMMSS(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') }

// Descripción corta del nivel para el pop-up de inicio (estilo Candy Crush)
function levelBrief(lv) {
  if (lv.tutorial) return 'Arrastrá fichas y formá el número de arriba 👆'
  if (lv.boss) return 'Formá los resultados para atacar al jefe. ¡Bajale todo el HP! 👹'
  if (lv.accum) return 'Formá los resultados y llená la barra hasta la meta'
  return Array.isArray(lv.target)
    ? 'Formá cualquiera de los resultados y llená la barra'
    : 'Formá el resultado una y otra vez para llenar la barra'
}

// ---------- geometría del mapa (camino serpenteante) ----------
const MAP_W = 300        // ancho en unidades del viewBox
const MAP_SPACING = 120  // separación vertical entre niveles (px)
function mapGeometry(n) {
  const H = n * MAP_SPACING
  const pts = []
  for (let i = 0; i < n; i++) {
    const y = H - MAP_SPACING / 2 - i * MAP_SPACING   // nivel 1 abajo, sube
    const x = MAP_W / 2 + 80 * Math.sin(i * 0.8)       // serpentea
    pts.push({ x, y })
  }
  // límites entre mundos (cada bloque de 10 niveles): ahí el camino se CORTA
  const bset = new Set(WORLDS.map((w) => w.at).filter((a) => a > 0 && a < n))
  let d = pts.length ? `M ${pts[0].x} ${pts[0].y}` : ''
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i], my = (p.y + c.y) / 2
    if (bset.has(i)) { d += ` M ${c.x} ${c.y}`; continue }  // salta el tramo → hueco de mundo
    d += ` C ${p.x} ${my}, ${c.x} ${my}, ${c.x} ${c.y}`     // curva suave
  }
  // un puente cruza cada hueco (del color del mundo previo al del siguiente)
  const bridges = [...bset].map((b) => {
    const a = pts[b - 1], c = pts[b]
    return { key: b, x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, from: zoneColor(b - 1), to: zoneColor(b) }
  })
  return { pts, H, d, bridges }
}

// Puente de tiza que cruza el hueco entre dos mundos (rieles arqueados + tablones).
function MapBridge({ from, to }) {
  const planks = [18, 32, 46, 60, 74, 88, 102]
  return (
    <svg className="bridge-svg" viewBox="0 0 120 62" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${from}-${to}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {(() => {
        const g = `url(#bg-${from}-${to})`
        const P = { fill: 'none', stroke: g, strokeWidth: 3.4, strokeLinecap: 'round' }
        return (<>
          <path {...P} d="M10 22 Q60 10 110 22" />
          <path {...P} d="M10 44 Q60 56 110 44" />
          <line {...P} x1="10" y1="16" x2="10" y2="50" />
          <line {...P} x1="110" y1="16" x2="110" y2="50" />
          {planks.map((x) => {
            const t = (x - 10) / 100, sag = Math.sin(t * Math.PI)
            return <line key={x} {...P} strokeWidth="2.6" x1={x} y1={22 - sag * 12} x2={x} y2={44 + sag * 12} />
          })}
        </>)
      })()}
    </svg>
  )
}

function Stars({ n, size = 16 }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'st on' : 'st'}>★</span>)}
    </span>
  )
}

export default function App() {
  const mountRef = useRef(null)
  const ctrlRef = useRef(null)
  const initedRef = useRef(false)
  const overlayRef = useRef(null)
  const mapScrollRef = useRef(null)

  // Efecto "collect": las fichas consumidas vuelan al chip del objetivo y, al llegar,
  // el chip se infla (los absorbe). Tokens en DOM porque el chip vive fuera del canvas.
  const flyTokens = useCallback((cells, rows, cols, value, bar) => {
    // El LLENADO de la barra (números + progreso) se aplica cuando las fichas LLEGAN
    // (absorción), no antes, para que coincidan. `bar` = nuevo estado de la barra.
    const applyBar = bar ? () => { if (bar.goal) setGoal(bar.goal); if (bar.accum) setAccum(bar.accum); if (bar.boss) setBoss((b) => b && { ...b, ...bar.boss }) } : null
    const canvas = mountRef.current?.querySelector('canvas')
    const overlay = overlayRef.current
    if (!canvas || !overlay || !cells?.length) { applyBar?.(); return }
    const cr = canvas.getBoundingClientRect()
    // en batalla de jefe las fichas van al signo (el jefe recibe el golpe); si no, al chip objetivo
    const bossSign = document.querySelector('.boss-sign')
    const chipSel = value != null ? `[data-val="${value}"]` : null
    const chip = bossSign || (chipSel && document.querySelector(chipSel)) || document.querySelector('.tchip')
    const chipRect = chip?.getBoundingClientRect()
    const tx = chipRect ? chipRect.left + chipRect.width / 2 : cr.left + cr.width / 2
    const ty = chipRect ? chipRect.top + chipRect.height / 2 : cr.top
    for (const { r, c, ch } of cells) {
      const sx = cr.left + ((c + 0.5) / cols) * cr.width
      const sy = cr.top + ((r + 0.5) / rows) * cr.height
      const el = document.createElement('div')
      el.className = 'fly-token'
      el.style.left = sx + 'px'; el.style.top = sy + 'px'
      el.style.background = tokenColor(ch)
      overlay.appendChild(el)
      const dx = tx - sx, dy = ty - sy
      const anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.15}px), calc(-50% + ${dy * 0.15}px)) scale(1.15)`, opacity: 1, offset: 0.25 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0.6 },
      ], { duration: 340 + Math.random() * 120, easing: 'cubic-bezier(.55,0,.3,1)', fill: 'forwards' })
      anim.onfinish = () => {
        el.remove()
        // El chip PULSA (escala + brillo/glow dorado) al recibir cada ficha: como llegan
        // varias en fila, da un titileo intermitente que dura solo mientras absorbe.
        // Se anima por WAAPI (no por clase CSS): tocar la propiedad `animation` del chip
        // haría que React, al re-renderizar y limpiar la clase, reinicie chipIn.
        if (chip) chip.animate([
          { transform: 'scale(1)', filter: 'brightness(1) drop-shadow(0 0 0 #ffe07a00)' },
          { transform: 'scale(1.34)', filter: 'brightness(1.6) drop-shadow(0 0 16px #ffe07a)', offset: 0.4 },
          { transform: 'scale(1)', filter: 'brightness(1) drop-shadow(0 0 0 #ffe07a00)' },
        ], { duration: 380, easing: 'ease-out' })
      }
    }
    // las fichas tardan ~340ms en llegar: llenar la barra justo cuando aterrizan (absorción)
    if (applyBar) setTimeout(applyBar, 320)
  }, [])

  // "+Ns" flotando sobre el reloj cuando una cuenta suma tiempo
  const showTimeBonus = useCallback((sec) => {
    const overlay = overlayRef.current
    const timeEl = document.querySelector('.time-big')
    if (!overlay || !timeEl) return
    const r = timeEl.getBoundingClientRect()
    const el = document.createElement('div')
    el.className = 'time-bonus'
    el.textContent = '+' + sec
    el.style.left = r.right + 8 + Math.random() * 26 + 'px'      // pequeño offset: combos muestran varios +N
    el.style.top = r.top + r.height / 2 - Math.random() * 14 + 'px'
    overlay.appendChild(el)
    el.animate([
      { transform: 'translate(-50%,-40%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-220%) scale(1)', opacity: 0 },
    ], { duration: 950, easing: 'ease-out', fill: 'forwards' }).onfinish = () => el.remove()
    timeEl.classList.remove('bump'); void timeEl.offsetWidth; timeEl.classList.add('bump')
  }, [])

  const [screen, setScreen] = useState('menu')        // menu | map | game
  const [progress, setProgress] = useState(loadProgress())
  const [curIdx, setCurIdx] = useState(0)

  const [timeLeft, setTimeLeft] = useState(120)
  const [mode, setMode] = useState({ relax: false })   // modo de juego (relax = sin reloj)
  const [accum, setAccum] = useState(null)             // modo acumulativo: { total, start, goal } | null
  const [boss, setBoss] = useState(null)               // batalla de jefe: { hp, max, sign } | null
  const [target, setTarget] = useState({ level: 1, name: '', list: [10], flash: false })
  const [goal, setGoal] = useState({ need: 0, done: 0 })   // barra de objetivo: progreso/total
  const [tries, setTries] = useState(0)                           // intentos (vidas = tizas) restantes
  const [triesMax, setTriesMax] = useState(5)                     // total de vidas (tizas de la barra)
  const [triesPop, setTriesPop] = useState(0)
  const [hints, setHints] = useState(0)                           // pistas manuales que quedan
  const [startPopup, setStartPopup] = useState(null)              // índice del nivel a arrancar (pop-up)
  const [winScreen, setWinScreen] = useState(null)                // {index, stars} pantalla de victoria
  const [devUnlocked, setDevUnlocked] = useState(() => new Set()) // MODO TEST (secreto): niveles abiertos a mano
  const [dailyOpen, setDailyOpen] = useState(false)               // pop-up del regalo diario
  const [hintPool, setHintPoolState] = useState(() => getHintPool()) // pistas globales (para mostrar en el reward)
  const [hearts, setHearts] = useState(loadHearts)                // corazones (vidas globales) { n, t }
  const [nowTick, setNowTick] = useState(0)                       // fuerza refresco del contador de regen
  const winTimer = useRef(null)
  const startPopupTimer = useRef(null)
  const devTap = useRef({ i: -1, n: 0, t: null })                 // contador de toques para el desbloqueo de test
  const [settingsOpen, setSettingsOpen] = useState(false)         // pop-up de ajustes en el juego
  const [nickOpen, setNickOpen] = useState(false)                 // pop-up "Ingresá tu Nick" (nivel 3)
  const [nickInput, setNickInput] = useState('')
  const [coach, setCoach] = useState(null)           // mensajes flotantes (tutorial/avisos); array de pasos
  const [inventory, setInventory] = useState([])
  const [result, setResult] = useState(null)          // {index,score,stars,win}
  const menuDoodles = useMemo(() => buildDoodles(), [screen])   // nuevos garabatos cada vez que se abre el menú
  const mapDoodles = useMemo(() => buildMapDoodles(LEVELS.length), [screen])
  const confetti = useMemo(() => (winScreen ? buildConfetti(22) : []), [winScreen])

  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    let app, ctrl, destroyed = false

    ;(async () => {
      app = new Application()
      await app.init({
        width: MAX_PX, height: MAX_PX, backgroundAlpha: 0,
        antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
      })
      if (destroyed) { app.destroy(true); return }
      mountRef.current.appendChild(app.canvas)

      // Pixi mide la fuente al crear el texto: precargar tiza/display antes de dibujar fichas
      try {
        await Promise.all([
          document.fonts.load('400 42px "Tiza"'),
          document.fonts.load('400 38px "Patrick Hand"'),
          document.fonts.load('700 28px Fredoka'),
        ])
      } catch { /* sin conexión: cae a la fuente fallback */ }

      const hooks = {
        setTime: setTimeLeft, setInventory, setHints,
        setMode: (m) => setMode(m),
        setAccum: (a) => setAccum(a),
        setBoss: (b) => setBoss(b),
        coach: (steps) => setCoach(steps),
        onHintUsed: (index) => trackEvent('hint', index),
        onAddMinute: (index) => trackEvent('continue', index),
        setGoal: (g) => setGoal(g),
        setTries: ({ left, max, dec }) => {
          setTries(left)
          if (max != null) setTriesMax(max)
          if (dec) setTriesPop((p) => p + 1)
        },
        setTarget: (t) => {
          // Cada chip se keyea por su VALOR (ver render): si el objetivo no cambia,
          // React conserva el mismo nodo y NO reanima; si cambia (ej. switch 10→6),
          // monta un nodo nuevo y ahí sí corre chipIn. Sin hacks manuales de animación.
          setTarget(t)
        },
        onCuenta: ({ cells, rows, cols, value, bar }) => flyTokens(cells, rows, cols, value, bar),
        addTime: (sec) => showTimeBonus(sec),
        setConfig: () => {},
        setOverlay: (o) => { if (!o.show) setResult(null) },
        onLevelEnd: ({ index, completed, reason, stars, quota, left, timeLeft, continuesLeft, boss, timed }) => {
          trackEvent(completed ? 'win' : 'lose', index, { stars, reason, left, timeLeft: Math.round(timeLeft) })
          if (stars >= 1) {
            setProgress((p) => {
              const prev = p.stars[index] || 0
              if (stars <= prev) return p
              const next = { ...p, stars: { ...p.stars, [index]: stars } }
              localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
              return next
            })
          }
          if (completed) {
            // ganó: pantalla de victoria con estrellas (~3,4 s) y luego auto-avanza
            // al mapa + pop-up de inicio del siguiente nivel (estilo Candy Crush).
            setResult(null)
            setWinScreen({ index, stars })
            clearTimeout(winTimer.current)
            winTimer.current = setTimeout(() => advanceFromWin(index), 3400)
          } else {
            // perdió: tarjeta con opción de "+1 min" (limitada).
            setResult({ index, completed, reason, stars, quota, left, timeLeft, win: false, continuesLeft, boss, timed })
          }
        },
        // Notificación de arriba desactivada: molestaba y desacomodaba el layout en mobile.
        toast: () => {},
      }
      const board = new Board(
        app.stage,
        (r, c) => ctrl && ctrl.onTileTap(r, c),
        (sizePx) => app.renderer.resize(sizePx, sizePx),
        (a, b) => ctrl && ctrl.onDragSwap(a, b),
      )
      ctrl = new Controller(board, hooks)
      ctrlRef.current = ctrl
    })()

    return () => { destroyed = true; if (app) app.destroy(true) }
  }, [])

  useEffect(() => { initMetrics() }, [])                          // ID anónimo + upsert jugador
  // CORAZONES: persistir la regen al montar y refrescar cada 20s (regen + contador)
  useEffect(() => {
    saveHearts(hearts)
    const id = setInterval(() => { const nh = loadHearts(); saveHearts(nh); setHearts(nh); setNowTick((x) => x + 1) }, 20000)
    return () => clearInterval(id)
  }, [])
  const spendHeart = () => setHearts((h) => { const nh = { n: Math.max(0, h.n - 1), t: h.n >= HEARTS_MAX ? Date.now() : h.t }; saveHearts(nh); return nh })
  const addHearts = (k = 1) => setHearts((h) => { const n = Math.min(HEARTS_MAX, h.n + k); const nh = { n, t: n >= HEARTS_MAX ? Date.now() : h.t }; saveHearts(nh); return nh })
  // contador de regen: refresco por segundo SOLO en el mapa (para el "próximo en MM:SS")
  useEffect(() => {
    if (screen !== 'map') return
    const id = setInterval(() => setNowTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [screen])
  // Al gastar un intento (triesPop sube): flash ROJO + shake de TODA la barra de tizas, para
  // marcar el error. La tiza consumida además se desvanece por su transición CSS (la barra baja).
  useEffect(() => {
    if (triesPop <= 0) return
    const el = document.querySelector('.lives')
    if (!el) return
    el.animate([
      { filter: 'none', transform: 'translateX(0) scale(1)' },
      { filter: 'sepia(1) saturate(6) hue-rotate(-25deg) brightness(1.12)', transform: 'translateX(-5px) scale(1.04)', offset: 0.15 },
      { filter: 'sepia(1) saturate(6) hue-rotate(-25deg)', transform: 'translateX(5px)', offset: 0.42 },
      { filter: 'sepia(1) saturate(5) hue-rotate(-25deg)', transform: 'translateX(-3px)', offset: 0.7 },
      { filter: 'none', transform: 'translateX(0) scale(1)' },
    ], { duration: 500, easing: 'ease-out' })
  }, [triesPop])
  // scrollear al fondo (nivel 1) SOLO al entrar al mapa; no en cada render
  // (antes el ref inline lo reseteaba al abrir el pop-up de "Jugar")
  useEffect(() => {
    if (screen === 'map') {
      setHintPoolState(getHintPool())   // refrescar el contador de pistas del mapa
      if (mapScrollRef.current) mapScrollRef.current.scrollTop = mapScrollRef.current.scrollHeight
    }
  }, [screen])

  const isUnlocked = (i) => i === 0 || devUnlocked.has(i) || (progress.stars[i - 1] || 0) >= 1
  // tocar un nodo del mapa abre el pop-up de inicio del nivel (estilo Candy Crush)
  const openStart = (i) => { clearTimeout(startPopupTimer.current); if (isUnlocked(i)) setStartPopup(i) }
  // MODO TEST (secreto, solo para desarrollo): TRIPLE clic en un nivel BLOQUEADO lo abre igual.
  // No persiste (se pierde al recargar) → ningún jugador real lo activa sin querer.
  const handleNode = (i) => {
    if (isUnlocked(i)) { openStart(i); return }
    const d = devTap.current
    if (d.i !== i) { d.i = i; d.n = 0 }
    d.n += 1
    clearTimeout(d.t)
    if (d.n >= 3) {
      d.n = 0; d.i = -1
      setDevUnlocked((s) => new Set(s).add(i))
      setStartPopup(i)
    } else {
      d.t = setTimeout(() => { d.n = 0; d.i = -1 }, 700)
    }
  }
  // ---- REWARD DIARIO: da pistas 1 vez por día. Celebratorio, NO coercitivo (sin castigo
  // por faltar). Ver DISEÑO §7.6 / PLAN_SESION_AUTONOMA D4. ----
  const DAILY_HINTS = 5
  const DAILY_UNLIMITED = true   // TEST: reclamar SIEMPRE (sin límite 1/día). Poner false para producción.
  const dayKey = () => { try { return 'math_daily_' + new Date().toISOString().slice(0, 10) } catch { return 'math_daily_x' } }
  const dailyClaimed = () => { if (DAILY_UNLIMITED) return false; try { return !!localStorage.getItem(dayKey()) } catch { return false } }
  const claimDaily = () => {
    if (dailyClaimed()) return
    if (!DAILY_UNLIMITED) { try { localStorage.setItem(dayKey(), '1') } catch { /* sin localStorage */ } }
    setHintPoolState(setHintPool(getHintPool() + DAILY_HINTS))   // repone (tope HINTS_MAX)
  }
  // fin de la pantalla de victoria: al mapa (se deja ver un momento) y RECIÉN
  // después el pop-up de inicio del siguiente nivel — no aparecen pegados.
  const advanceFromWin = useCallback((index) => {
    clearTimeout(winTimer.current)
    setWinScreen(null)
    setScreen('map')
    clearTimeout(startPopupTimer.current)
    if (index + 1 < LEVELS.length) {
      startPopupTimer.current = setTimeout(() => setStartPopup(index + 1), 1600)
    }
  }, [])
  // cerrar el mensaje flotante: avanza al siguiente paso o, si era el último, reanuda el juego
  const dismissCoach = () => {
    if (!coach) return
    if (coach.length > 1) setCoach(coach.slice(1))
    else { setCoach(null); ctrlRef.current?.coachDismissed() }
  }
  const playLevel = (i) => {
    if (!isUnlocked(i)) return
    clearTimeout(startPopupTimer.current)
    setStartPopup(null); setCoach(null); setCurIdx(i); setResult(null); setScreen('game')
    ctrlRef.current?.startLevel(i)
    trackEvent('start', i)
    // Pedir el nick al empezar el nivel 3 (índice 2), solo si no lo puso aún.
    if (i === 2 && !getNick() && !localStorage.getItem('math_nick_asked')) {
      setNickInput(''); setNickOpen(true)
    }
  }

  const mapGeo = useMemo(() => mapGeometry(LEVELS.length), [])   // geometría fija; no recalcular por tick
  // nivel actual = primero desbloqueado sin completar (o el último desbloqueado)
  const currentLevel = useMemo(() => {
    let last = 0
    for (let i = 0; i < LEVELS.length; i++) {
      if (!isUnlocked(i)) continue
      last = i
      if (!(progress.stars[i] >= 1)) return i
    }
    return last
  }, [progress, devUnlocked])
  const tsec = Math.ceil(timeLeft)
  const timeStr = Math.floor(tsec / 60) + ':' + String(tsec % 60).padStart(2, '0')
  // ¿el orden importa en este nivel? (resta/división NO son conmutativas → mostrar flechas)
  const dirMatters = (LEVELS[curIdx]?.ops || []).some((o) => o === '−' || o === '÷')

  return (
    <div className="app">
      {/* ---------- pantalla de juego (siempre montada para conservar el canvas Pixi) ---------- */}
      <div className="game" style={{ display: screen === 'game' ? 'flex' : 'none' }}>
        {/* Reloj: sólo si el nivel tiene tiempo (hoy ninguno). Los intentos van en la barra de
            tizas sobre el tablero (ver abajo). */}
        {mode.timed && (
          <div className="top-row">
            <div className={'time-big' + (tsec <= 15 ? ' low' : '')}>{timeStr}</div>
          </div>
        )}

        {/* Objetivo. Boss: signo + HP. Acumulativo: barra hacia la meta. Normal: chip + barra.
            El resaltado del coach va en el chip ('target') o la barra ('glass'), no en toda la tarjeta. */}
        <div className="obj-card">
          {boss ? (
            /* BATALLA DE JEFE (base): el signo grande + barra de HP que baja. Formá cualquiera
               de los resultados para golpearlo; a 0 HP se derrota. */
            <div className="boss">
              <div className={'boss-sign' + (boss.hp <= 0 ? ' defeated' : '')}>{boss.sign}</div>
              <div className="boss-side">
                <div className="boss-hpbar">
                  <div className="boss-hpfill" style={{ width: (boss.max ? Math.max(0, Math.min(100, (100 * boss.hp) / boss.max)) : 0) + '%' }} />
                  <span className="boss-hpnum">{boss.hp} / {boss.max}</span>
                </div>
                <div className="boss-atk">
                  <span className="obj-label sm">Atacá con</span>
                  {(target.list || []).map((t, i) => (
                    <React.Fragment key={t}>
                      {i > 0 && <span className="tor">·</span>}
                      <span className="tchip mini">{t}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : accum ? (
            <div className="accum">
              {/* qué cuentas valen (set fijo) → se muestran para que la regla sea clara */}
              <div className="obj-top accum-targets">
                {(target.list || []).map((t, i) => (
                  <React.Fragment key={t}>
                    {i > 0 && <span className="tor">o</span>}
                    <span data-val={t} className="tchip">{t}</span>
                  </React.Fragment>
                ))}
              </div>
              <span className="accum-hint">
                {accum.goal >= accum.start ? 'suman al total' : 'restan del total'} → {accum.goal >= accum.start ? 'llegá a' : 'bajá a'} {accum.goal}
              </span>
              <div className="accum-bar">
                <div className="accum-fill" style={{ width: Math.max(0, Math.min(100, ((accum.total - accum.start) / (accum.goal - accum.start || 1)) * 100)) + '%' }} />
                <span className="accum-num">{accum.total}</span>
              </div>
            </div>
          ) : (
            /* BARRA de objetivo (igual que el acumulativo): "Formá 4 (o 8)" + una sola barra
               que se llena de verde. Cualquier objetivo cuenta al mismo progreso (ej 13/50). */
            <div className="goalbars">
              {/* 1ra instrucción del tutorial resalta SOLO el chip del número (coach 'target');
                  la 2da resalta SOLO la barra (coach 'glass'). */}
              <div className={'obj-top accum-targets' + (coach?.[0]?.highlight === 'target' ? ' coach-hl' : '')}>
                {(target.list || []).map((t, i) => (
                  <React.Fragment key={t}>
                    {i > 0 && <span className="tor">o</span>}
                    <span data-val={t} className="tchip">{t}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className={'accum-bar' + (coach?.[0]?.highlight === 'glass' ? ' coach-hl' : '')}>
                <div className="accum-fill" style={{ width: (goal.need ? Math.min(100, Math.round((100 * goal.done) / goal.need)) : 0) + '%' }} />
                <span className="accum-num">{goal.done}/{goal.need}</span>
              </div>
            </div>
          )}
        </div>

        {/* Vidas = 5 TIZAS acostadas sobre el pizarrón (barra). Cada intento fallido gasta una. */}
        <div className={'lives' + (coach?.[0]?.highlight === 'lives' ? ' coach-hl' : '')} aria-label={`${tries} de ${triesMax} intentos`}>
          {Array.from({ length: triesMax }).map((_, i) => (
            <span className={'chalk' + (i < tries ? '' : ' used') + (i < tries && tries <= 2 ? ' danger' : '')} key={i} />
          ))}
        </div>

        <div className="board-area">
          {/* Flechas de dirección SOLO en operaciones donde el orden importa (resta/división).
              En suma y multiplicación da igual el orden (conmutativas) → no se muestran. */}
          {dirMatters && (<>
            <div className="arrow-h start" /><div className="arrow-h mid" /><div className="arrow-h end" />
            <div className="arrow-v start" /><div className="arrow-v mid" /><div className="arrow-v end" />
          </>)}
          <div className="board-wrap" ref={mountRef} />
        </div>

        <div className="controls">
          <button className="hint-btn" disabled={hints <= 0}
            onClick={() => ctrlRef.current?.hint()}>
            💡 Pista <span className="hint-n">{hints}</span>
          </button>
          <button className="gear-btn" aria-label="Ajustes" onClick={() => setSettingsOpen(true)}>⚙</button>
        </div>
      </div>

      {/* ---------- menú ---------- */}
      {screen === 'menu' && (
        <div className="screen menu">
          <div className="menu-doodles" aria-hidden="true">
            {menuDoodles.map((d, i) => (
              <span key={i} className="doodle"
                style={{ top: d.top, bottom: d.bottom, left: d.left, right: d.right, transform: `rotate(${d.rot}deg)` }}>
                {d.t}
              </span>
            ))}
          </div>
          <h1>Math <span>Crush</span></h1>
          <p className="tagline">Formá el resultado · armá cuentas · subí de nivel</p>
          <button className="big-btn" onClick={() => setScreen('map')}>Jugar</button>
        </div>
      )}

      {/* ---------- mapa de niveles ---------- */}
      {screen === 'map' && (
        <div className="screen map" ref={mapScrollRef}>
          {/* barra de opciones del mapa (fija): pistas + regalo diario */}
          <div className="map-top">
            <span className="map-hearts" title="Corazones (vidas)">
              ❤️ {hearts.n}
              {hearts.n < HEARTS_MAX && <span className="hearts-timer">{fmtMMSS(heartsNextInSec(hearts))}</span>}
            </span>
            <span className="map-hints">💡 {hintPool}</span>
            <button className="daily-btn" onClick={() => setDailyOpen(true)} aria-label="Regalo del día">
              🎁{!dailyClaimed() && <span className="daily-dot" />}
            </button>
          </div>
          {/* filtro "tiza" (trazo dibujado a mano) para doodles y mascota */}
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <defs>
              <filter id="chalkRough" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" />
              </filter>
            </defs>
          </svg>
          <div className="map-path" style={{ height: mapGeo.H + 'px' }}>
            <div className="map-bg" aria-hidden="true"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
            <svg className="map-road" viewBox={`0 0 ${MAP_W} ${mapGeo.H}`} preserveAspectRatio="none"
              style={{ height: mapGeo.H + 'px' }}>
              <path className="road-under" d={mapGeo.d} vectorEffect="non-scaling-stroke" />
              <path className="road-base" d={mapGeo.d} vectorEffect="non-scaling-stroke" />
              <path className="road-dash" d={mapGeo.d} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="map-doodles" aria-hidden="true">
              {mapDoodles.map((d, i) => (
                <span key={i} className="doodle-svg"
                  style={{ top: d.top, [d.side]: d.off + '%', ['--rot']: d.rot + 'deg',
                    animationDuration: d.dur + 's', animationDelay: d.delay + 's' }}>
                  <ChalkDoodle type={d.type} color={d.color} size={d.size} />
                </span>
              ))}
            </div>
            {/* puentes: cruzan el hueco del camino al cambiar de mundo (cada 10 niveles) */}
            {mapGeo.bridges.map((b) => (
              <div key={b.key} className="map-bridge"
                style={{ top: b.y + 'px', left: (b.x / MAP_W * 100) + '%' }} aria-hidden="true">
                <MapBridge from={b.from} to={b.to} />
              </div>
            ))}
            {/* carteles de SECTOR (un mundo cada 10 niveles): símbolo grande + nombre */}
            {WORLDS.map((w) => {
              const p = mapGeo.pts[w.at]
              return p ? (
                <div key={w.at} className="sector" style={{ top: (p.y - 52) + 'px', '--sc': w.color }}>
                  <span className="sector-sym">{w.sym}</span>
                  <span className="sector-name">{w.name}</span>
                </div>
              ) : null
            })}
            {/* mascota de tiza junto al nivel actual */}
            {mapGeo.pts[currentLevel] && (() => {
              const cp = mapGeo.pts[currentLevel]
              const right = cp.x / MAP_W < 0.5
              return (
                <div className={'map-mascot' + (right ? ' right' : ' left')}
                  style={{ top: cp.y + 'px' }} aria-hidden="true">
                  <div className="mascot-bubble">¡Vamos!</div>
                  <Mascota />
                </div>
              )
            })()}
            {LEVELS.map((lv, i) => {
              const unlocked = isUnlocked(i)
              const stars = progress.stars[i] || 0
              const p = mapGeo.pts[i]
              const done = stars >= 1 && i !== currentLevel
              return (
                <button key={i}
                  className={'node' + (unlocked ? '' : ' locked') + (i === currentLevel ? ' current' : '') + (done ? ' done' : '')}
                  style={{ top: p.y + 'px', left: (p.x / MAP_W * 100) + '%', '--nc': zoneColor(i) }}
                  onClick={() => handleNode(i)}>
                  {i === currentLevel && <span className="node-here">¡Acá!</span>}
                  {unlocked && i === currentLevel && <span className="node-name">{lv.name}</span>}
                  <span className="node-num">{unlocked ? i + 1 : '🔒'}</span>
                  {unlocked && <Stars n={stars} size={11} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ---------- pantalla de victoria (auto-avanza a los ~3,4 s) ---------- */}
      {winScreen && (
        <div className="win-cele" onClick={() => advanceFromWin(winScreen.index)}>
          <div className="confetti" aria-hidden="true">
            {confetti.map((c, i) => (
              <span key={i} style={{
                left: c.left, width: c.size + 'px', height: c.size * 1.6 + 'px',
                background: c.color, animationDelay: c.delay, animationDuration: c.dur,
                transform: `rotate(${c.rot}deg)`,
              }} />
            ))}
          </div>
          <div className="win-inner">
            <div className="win-title">¡Nivel superado!</div>
            <div className="win-sub">¡Buen trabajo! Seguí así 🎉</div>
            <div className="win-stars"><Stars n={winScreen.stars} size={58} /></div>
            <div className="win-hint">tocá para seguir</div>
          </div>
        </div>
      )}

      {/* ---------- pop-up de inicio de nivel (estilo Candy Crush) ---------- */}
      {startPopup != null && (
        <div className="overlay" onClick={() => setStartPopup(null)}>
          <div className="card start" onClick={(e) => e.stopPropagation()}>
            <button className="card-x" aria-label="Cerrar" onClick={() => setStartPopup(null)}>✕</button>
            <div className="start-lvl">Nivel {startPopup + 1}</div>
            <div className="start-name">{LEVELS[startPopup].name}</div>
            <div className="start-desc">{levelBrief(LEVELS[startPopup])}</div>
            <button className="start-play" onClick={() => playLevel(startPopup)}>¡Jugar!</button>
          </div>
        </div>
      )}

      {/* ---------- resultado de nivel (solo cuando se pierde) ---------- */}
      {result && !result.win && (
        <div className="overlay">
          <div className="card">
            <div className="ot">{
              result.reason === 'frozen' ? '🧊 ¡El jefe te congeló el tablero!'
                : result.reason === 'time' ? '¡Se acabó el tiempo!'
                  : '¡Te quedaste sin intentos!'}</div>
            <div className="ok">{result.boss ? 'HP restante del jefe' : 'Cuentas que faltaron'}</div>
            <div className="os">{result.left}</div>
            {/* Reintentar cuesta 1 CORAZÓN. Sin corazones: se recargan solos (o futuro: ad). */}
            {hearts.n > 0 ? (
              <button className="continue-btn" onClick={() => { spendHeart(); ctrlRef.current?.resumeWithBonus() }}>
                {result.boss ? '🧊 Descongelar todo' : 'Reintentar'} <span className="cost">❤️ 1</span>
              </button>
            ) : (
              <div className="no-hearts">💔 Sin corazones. Se recargan solos — próximo en {fmtMMSS(heartsNextInSec(hearts))}.</div>
            )}
            <div className="card-btns">
              <button onClick={() => { setResult(null); setScreen('map') }}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- pop-up de ajustes (dentro del juego) ---------- */}
      {settingsOpen && (
        <div className="overlay" onClick={() => setSettingsOpen(false)}>
          <div className="card settings" onClick={(e) => e.stopPropagation()}>
            <button className="card-x" aria-label="Cerrar" onClick={() => setSettingsOpen(false)}>✕</button>
            <div className="start-lvl">Ajustes</div>
            <div className="start-name">Nivel {target.level}</div>
            <button className="start-play" onClick={() => setSettingsOpen(false)}>Seguir jugando</button>
            <button className="leave-btn" onClick={() => { setSettingsOpen(false); setCoach(null); setResult(null); setScreen('map') }}>Abandonar nivel</button>
          </div>
        </div>
      )}

      {/* ---------- pop-up REGALO DIARIO ---------- */}
      {dailyOpen && (
        <div className="overlay" onClick={() => setDailyOpen(false)}>
          <div className="card daily-card" onClick={(e) => e.stopPropagation()}>
            <button className="card-x" aria-label="Cerrar" onClick={() => setDailyOpen(false)}>✕</button>
            <div className="daily-emoji">🎁</div>
            <div className="start-lvl">Regalo del día</div>
            <div className="daily-hints">Tenés <b>{hintPool}</b> / {HINTS_MAX} pistas 💡</div>
            {dailyClaimed()
              ? <div className="daily-done">¡Ya lo reclamaste hoy! Volvé mañana 😊</div>
              : <button className="start-play" onClick={claimDaily}>Reclamar +{DAILY_HINTS} pistas 💡</button>}
          </div>
        </div>
      )}

      {/* ---------- pop-up "Ingresá tu Nick" (aparece al empezar el nivel 3) ---------- */}
      {nickOpen && (
        <div className="overlay">
          <div className="card nick">
            <div className="start-name">Ingresá tu Nick</div>
            <div className="start-desc">Para las pruebas del juego. Es opcional, podés saltearlo.</div>
            <input className="nick-input" type="text" maxLength={24} autoFocus
              placeholder="Tu apodo" value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nickInput.trim()) { setNick(nickInput); localStorage.setItem('math_nick_asked', '1'); setNickOpen(false) } }} />
            <button className="start-play" disabled={!nickInput.trim()}
              onClick={() => { setNick(nickInput); localStorage.setItem('math_nick_asked', '1'); setNickOpen(false) }}>
              Guardar
            </button>
            <button className="leave-btn" onClick={() => { localStorage.setItem('math_nick_asked', '1'); setNickOpen(false) }}>Saltear</button>
          </div>
        </div>
      )}

      {/* ---------- mensaje flotante del coach (tutorial / avisos; pausa el reloj) ---------- */}
      {coach && coach[0] && (
        <div className="coach" onClick={dismissCoach}>
          <div className={'coach-bubble' + (coach[0].highlight ? ' point-' + coach[0].highlight : '')}>
            <div className="coach-text">{coach[0].text}</div>
            <div className="coach-hint">{coach.length > 1 ? 'tocá para seguir →' : 'tocá para continuar'}</div>
          </div>
        </div>
      )}

      {/* capa de tokens que vuelan al objetivo (efecto collect) */}
      <div className="fly-overlay" ref={overlayRef} />
    </div>
  )
}
