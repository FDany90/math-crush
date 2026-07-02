import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Board, MAX_PX } from './pixi/Board.js'
import { Controller } from './game/controller.js'
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

// ---------- paleta y decoración de tiza del mapa ----------
// color de tiza por "zona" (tamaño de tablero) → da variedad y sensación de avance
const ZONE_COLORS = { 4: '#7fdfff', 5: '#ff79b8', 6: '#ffd23f', 7: '#b98cff', 8: '#7bed9f' }
const zoneColor = (size) => ZONE_COLORS[size] || '#7fdfff'
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
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { stars: {} } }
  catch { return { stars: {} } }
}

// Descripción corta del nivel para el pop-up de inicio (estilo Candy Crush)
function levelBrief(lv) {
  if (lv.tutorial) return 'Arrastrá fichas y formá el número de arriba 👆'
  return `Completá ${lv.quota ?? 6} cuentas antes de que se acabe el tiempo`
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
  let d = pts.length ? `M ${pts[0].x} ${pts[0].y}` : ''
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i], my = (p.y + c.y) / 2
    d += ` C ${p.x} ${my}, ${c.x} ${my}, ${c.x} ${c.y}`   // curva suave
  }
  return { pts, H, d }
}

// Cuentas restantes como marcas de tiza (tally), agrupadas de a 5 (4 + diagonal).
// Las completadas se "borran" (se atenúan con transición).
function Tally({ quota, left }) {
  const done = Math.max(0, quota - left)
  const groups = []
  for (let i = 0; i < quota; i += 5) groups.push(Math.min(5, quota - i))
  let idx = 0
  return (
    <div className="tally" role="img" aria-label={`${left} cuentas restantes`}>
      {groups.map((n, gi) => (
        <span className="tally-group" key={gi}>
          {Array.from({ length: n }).map((_, k) => {
            const isDone = idx++ < done
            return <i key={k} className={'mark' + (k === 4 ? ' diag' : '') + (isDone ? ' done' : '')} />
          })}
        </span>
      ))}
    </div>
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
  const lastListRef = useRef('')
  const mapScrollRef = useRef(null)

  // Efecto "collect": las fichas consumidas vuelan al chip del objetivo y, al llegar,
  // el chip se infla (los absorbe). Tokens en DOM porque el chip vive fuera del canvas.
  const flyTokens = useCallback((cells, rows, cols, value) => {
    const canvas = mountRef.current?.querySelector('canvas')
    const overlay = overlayRef.current
    if (!canvas || !overlay || !cells?.length) return
    const cr = canvas.getBoundingClientRect()
    const chipSel = value != null ? `.tchip[data-val="${value}"]` : null
    const chip = (chipSel && document.querySelector(chipSel)) || document.querySelector('.tchip')
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
        // el chip se infla al recibir la ficha (grow sincronizado con la absorción)
        if (chip) { chip.classList.remove('absorb'); void chip.offsetWidth; chip.classList.add('absorb') }
      }
    }
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
  const [target, setTarget] = useState({ level: 1, name: '', list: [10], flash: false })
  const [achieved, setAchieved] = useState([])
  const [cuentas, setCuentas] = useState({ left: 0, quota: 0 })   // cuentas que faltan
  const [cuentasPop, setCuentasPop] = useState(0)                 // contador para reanimar el decremento
  const [tries, setTries] = useState(0)                           // intentos restantes
  const [triesPop, setTriesPop] = useState(0)
  const [hints, setHints] = useState(0)                           // pistas manuales que quedan
  const [startPopup, setStartPopup] = useState(null)              // índice del nivel a arrancar (pop-up)
  const [winScreen, setWinScreen] = useState(null)                // {index, stars} pantalla de victoria
  const winTimer = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)         // pop-up de ajustes en el juego
  const [nickOpen, setNickOpen] = useState(false)                 // pop-up "Ingresá tu Nick" (nivel 3)
  const [nickInput, setNickInput] = useState('')
  const [tutorial, setTutorial] = useState(null)     // texto guía (solo niveles tutorial)
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
        setTime: setTimeLeft, setInventory, setTutorial, setHints,
        onHintUsed: (index) => trackEvent('hint', index),
        onAddMinute: (index) => trackEvent('continue', index),
        setCuentas: ({ left, quota, dec }) => {
          setCuentas({ left, quota })
          if (dec) setCuentasPop((p) => p + 1)
        },
        setTries: ({ left, dec }) => {
          setTries(left)
          if (dec) setTriesPop((p) => p + 1)
        },
        setTarget: (t) => {
          // animar el cambio: los chips actuales salen (achican) y entran los nuevos
          const key = (t.list || []).join('-')
          const el = document.querySelector('.obj-top')
          if (lastListRef.current && lastListRef.current !== key && el) {
            lastListRef.current = key
            el.classList.add('leaving')
            setTimeout(() => { setTarget(t); setAchieved([]) }, 150)
            return
          }
          lastListRef.current = key
          setTarget(t); setAchieved([])
        },
        targetHit: (vals) => setAchieved(vals),
        onCuenta: ({ cells, rows, cols, value }) => flyTokens(cells, rows, cols, value),
        addTime: (sec) => showTimeBonus(sec),
        setConfig: () => {},
        setOverlay: (o) => { if (!o.show) setResult(null) },
        onLevelEnd: ({ index, completed, reason, stars, quota, left, timeLeft, continuesLeft }) => {
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
            setResult({ index, completed, reason, stars, quota, left, timeLeft, win: false, continuesLeft })
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
  // scrollear al fondo (nivel 1) SOLO al entrar al mapa; no en cada render
  // (antes el ref inline lo reseteaba al abrir el pop-up de "Jugar")
  useEffect(() => {
    if (screen === 'map' && mapScrollRef.current) {
      mapScrollRef.current.scrollTop = mapScrollRef.current.scrollHeight
    }
  }, [screen])

  const isUnlocked = (i) => i === 0 || (progress.stars[i - 1] || 0) >= 1
  // tocar un nodo del mapa abre el pop-up de inicio del nivel (estilo Candy Crush)
  const openStart = (i) => { if (isUnlocked(i)) setStartPopup(i) }
  // fin de la pantalla de victoria: al mapa + pop-up de inicio del siguiente nivel
  const advanceFromWin = useCallback((index) => {
    clearTimeout(winTimer.current)
    setWinScreen(null)
    setScreen('map')
    if (index + 1 < LEVELS.length) setStartPopup(index + 1)
  }, [])
  const playLevel = (i) => {
    if (!isUnlocked(i)) return
    setStartPopup(null); setCurIdx(i); setResult(null); setScreen('game')
    ctrlRef.current?.startLevel(i)
    trackEvent('start', i)
    // Pedir el nick al empezar el nivel 3 (índice 2), solo si no lo puso aún.
    if (i === 2 && !getNick() && !localStorage.getItem('math_nick_asked')) {
      setNickInput(''); setNickOpen(true)
    }
  }

  const mapGeo = mapGeometry(LEVELS.length)
  // nivel actual = primero desbloqueado sin completar (o el último desbloqueado)
  const currentLevel = (() => {
    let last = 0
    for (let i = 0; i < LEVELS.length; i++) {
      if (!isUnlocked(i)) continue
      last = i
      if (!(progress.stars[i] >= 1)) return i
    }
    return last
  })()
  const tsec = Math.ceil(timeLeft)
  const timeStr = Math.floor(tsec / 60) + ':' + String(tsec % 60).padStart(2, '0')

  return (
    <div className="app">
      {/* ---------- pantalla de juego (siempre montada para conservar el canvas Pixi) ---------- */}
      <div className="game" style={{ display: screen === 'game' ? 'flex' : 'none' }}>
        {/* Fila superior: intentos · tiempo · tally (cuentas restantes) */}
        <div className="top-row">
          <div className="tries-big">
            <span key={triesPop} className={'tries-num' + (triesPop > 0 ? ' pop' : '') + (tries <= 3 ? ' low' : '')}>{tries}</span>
            <span className="tries-ico">✋</span>
          </div>
          <div className={'time-big' + (tsec <= 15 ? ' low' : '')}>{timeStr}</div>
          <Tally quota={cuentas.quota} left={cuentas.left} />
        </div>

        {/* Objetivo: qué formar (ancho completo, entran los de 2 dígitos) */}
        <div className="obj-card">
          <div className="obj-top" key={(target.list || []).join('-')}>
            <span className="obj-label">Formá</span>
            {(target.list || []).map((t, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="tor">o</span>}
                <span data-val={t} className={'tchip' + (achieved.includes(t) ? ' achieved' : '')}>{t}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {tutorial && <div className="tutorial-banner">{tutorial}</div>}

        <div className="board-area">
          <div className="arrow-h start" /><div className="arrow-h mid" /><div className="arrow-h end" />
          <div className="arrow-v start" /><div className="arrow-v mid" /><div className="arrow-v end" />
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
                  style={{ top: p.y + 'px', left: (p.x / MAP_W * 100) + '%', '--nc': zoneColor(lv.size) }}
                  onClick={() => openStart(i)}>
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
            <div className="ot">{result.reason === 'moves' ? '¡Te quedaste sin intentos!' : '¡Se acabó el tiempo!'}</div>
            <div className="ok">Cuentas que faltaron</div>
            <div className="os">{result.left}</div>
            {result.continuesLeft > 0 && (
              <button className="continue-btn" onClick={() => ctrlRef.current?.resumeWithBonus()}>
                +1 minuto
              </button>
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
            <button className="leave-btn" onClick={() => { setSettingsOpen(false); setResult(null); setScreen('map') }}>Abandonar nivel</button>
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

      {/* capa de tokens que vuelan al objetivo (efecto collect) */}
      <div className="fly-overlay" ref={overlayRef} />
    </div>
  )
}
