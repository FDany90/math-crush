import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Board, MAX_PX } from './pixi/Board.js'
import { Controller } from './game/controller.js'
import { LEVELS } from './game/levels.js'

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

// garabatos repartidos a lo largo del mapa (fondo del camino)
function buildMapDoodles(n) {
  const rnd = (x) => Math.floor(Math.random() * x)
  const eq = () => { const a = 1 + rnd(9), b = 1 + rnd(9); return `${a} + ${b} = ${a + b}` }
  const out = []
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 'left' : 'right'
    out.push({
      t: i % 2 ? eq() : DOODLE_MARKS[rnd(DOODLE_MARKS.length)],
      top: (4 + (i * 92) / n + rnd(5)) + '%',
      [side]: (2 + rnd(9)) + '%',
      rot: (rnd(2) ? 1 : -1) * (4 + rnd(10)),
    })
  }
  return out
}

const PROGRESS_KEY = 'math_progress'
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { stars: {} } }
  catch { return { stars: {} } }
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
  const [tutorial, setTutorial] = useState(null)     // texto guía (solo niveles tutorial)
  const [inventory, setInventory] = useState([])
  const [result, setResult] = useState(null)          // {index,score,stars,win}
  const menuDoodles = useMemo(() => buildDoodles(), [screen])   // nuevos garabatos cada vez que se abre el menú
  const mapDoodles = useMemo(() => buildMapDoodles(10), [screen])

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
        setTime: setTimeLeft, setInventory, setTutorial,
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
        onLevelEnd: ({ index, completed, reason, stars, quota, left, timeLeft }) => {
          setResult({ index, completed, reason, stars, quota, left, timeLeft, win: completed })
          if (stars >= 1) {
            setProgress((p) => {
              const prev = p.stars[index] || 0
              if (stars <= prev) return p
              const next = { ...p, stars: { ...p.stars, [index]: stars } }
              localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
              return next
            })
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

  const isUnlocked = (i) => i === 0 || (progress.stars[i - 1] || 0) >= 1
  const playLevel = (i) => {
    if (!isUnlocked(i)) return
    setCurIdx(i); setResult(null); setScreen('game')
    ctrlRef.current?.startLevel(i)
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
        <div className="topbar">
          <button className="back" onClick={() => setScreen('map')}>← Mapa</button>
          <div className="lvl-name">Nivel {target.level} · {target.name}</div>
        </div>

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

        <div className="inventory">
          {inventory.map((b) => (
            <div key={b.id}
              className={'boost' + (b.n <= 0 ? ' empty' : '') + (b.active ? ' active' : '')}
              onClick={() => ctrlRef.current?.activateBooster(b.id)}>
              {b.label}<span className="badge">{b.n}</span>
            </div>
          ))}
        </div>

        <div className="controls">
          <button onClick={() => ctrlRef.current?.hint()}>💡 Pista</button>
          <button onClick={() => ctrlRef.current?.shuffle()}>Mezclar</button>
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
        <div className="screen map" ref={(el) => { if (el) el.scrollTop = el.scrollHeight }}>
          <div className="map-head">
            <button className="back" onClick={() => setScreen('menu')}>← Menú</button>
            <h2>Mapa de niveles</h2>
          </div>
          <div className="map-path" style={{ height: mapGeo.H + 'px' }}>
            <svg className="map-road" viewBox={`0 0 ${MAP_W} ${mapGeo.H}`} preserveAspectRatio="none"
              style={{ height: mapGeo.H + 'px' }}>
              <path className="road-base" d={mapGeo.d} vectorEffect="non-scaling-stroke" />
              <path className="road-dash" d={mapGeo.d} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="map-doodles" aria-hidden="true">
              {mapDoodles.map((d, i) => (
                <span key={i} className="doodle"
                  style={{ top: d.top, left: d.left, right: d.right, transform: `rotate(${d.rot}deg)` }}>
                  {d.t}
                </span>
              ))}
            </div>
            {LEVELS.map((lv, i) => {
              const unlocked = isUnlocked(i)
              const stars = progress.stars[i] || 0
              const p = mapGeo.pts[i]
              return (
                <button key={i}
                  className={'node' + (unlocked ? '' : ' locked') + (i === currentLevel ? ' current' : '')}
                  style={{ top: p.y + 'px', left: (p.x / MAP_W * 100) + '%' }}
                  onClick={() => playLevel(i)}>
                  {i === currentLevel && <span className="node-here">¡Acá!</span>}
                  {unlocked && <span className="node-name">{lv.name}</span>}
                  <span className="node-num">{unlocked ? i + 1 : '🔒'}</span>
                  {unlocked && <Stars n={stars} size={10} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ---------- resultado de nivel ---------- */}
      {result && (
        <div className="overlay">
          <div className="card">
            <div className="ot">{result.win ? '¡Nivel superado!' : (result.reason === 'moves' ? '¡Te quedaste sin intentos!' : '¡Se acabó el tiempo!')}</div>
            <Stars n={result.stars} size={34} />
            <div className="ok">{result.win ? '⏱ Tiempo restante' : 'Cuentas que faltaron'}</div>
            <div className="os">{result.win ? fmtTime(result.timeLeft) : result.left}</div>
            <div className="card-btns">
              <button onClick={() => { setResult(null); setScreen('map') }}>Mapa</button>
              {result.win && result.index + 1 < LEVELS.length
                ? <button className="primary" onClick={() => playLevel(result.index + 1)}>Siguiente</button>
                : <button className="primary" onClick={() => playLevel(result.index)}>Reintentar</button>}
            </div>
          </div>
        </div>
      )}


      {/* capa de tokens que vuelan al objetivo (efecto collect) */}
      <div className="fly-overlay" ref={overlayRef} />
    </div>
  )
}
