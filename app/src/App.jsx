import React, { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Board, MAX_PX } from './pixi/Board.js'
import { Controller } from './game/controller.js'
import { LEVELS } from './game/levels.js'

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

  const [screen, setScreen] = useState('menu')        // menu | map | game
  const [progress, setProgress] = useState(loadProgress())
  const [curIdx, setCurIdx] = useState(0)

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120)
  const [target, setTarget] = useState({ level: 1, name: '', list: [10], goal: 100, flash: false })
  const [achieved, setAchieved] = useState([])
  const [inventory, setInventory] = useState([])
  const [result, setResult] = useState(null)          // {index,score,stars,win}
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

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

      const hooks = {
        setScore, setTime: setTimeLeft, setInventory,
        setTarget: (t) => { setTarget(t); setAchieved([]) },
        targetHit: (vals) => setAchieved(vals),
        setConfig: () => {},
        setOverlay: (o) => { if (!o.show) setResult(null) },
        onLevelEnd: ({ index, score, stars }) => {
          setResult({ index, score, stars, win: stars >= 1 })
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
        toast: (msg) => {
          setToast(msg)
          clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 1200)
        },
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
  const goalPct = Math.min(100, (score / (target.goal * 3)) * 100)
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

        <div className="hud">
          <div className="stat"><div className="k">Puntos</div><div className="v">{score}</div></div>
          <div className="stat"><div className="k">Tiempo</div><div className={'v' + (tsec <= 15 ? ' low' : '')}>{timeStr}</div></div>
          <div className="stat"><div className="k">Meta</div><div className="v">{target.goal}</div></div>
        </div>

        <div className="targets" key={(target.list || []).join('-')}>
          <span className="tlabel">Hacé</span>
          {(target.list || []).map((t, i) => (
            <span key={i} className={'tchip' + (target.flash ? ' flash' : '') + (achieved.includes(t) ? ' achieved' : '')}>{t}</span>
          ))}
        </div>
        <div className="goalbar">
          <div className="goalfill" style={{ width: goalPct + '%' }} />
          <span className="gstar" style={{ left: '33.3%' }}>★</span>
          <span className="gstar" style={{ left: '66.6%' }}>★</span>
          <span className="gstar" style={{ left: '99%' }}>★</span>
        </div>

        <div className="board-area">
          <div className="arrow-h" />
          <div className="arrow-v" />
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
          <h1>Math <span>Crush</span></h1>
          <p className="tagline">Formá el resultado · armá cuentas · subí de nivel</p>
          <button className="big-btn" onClick={() => setScreen('map')}>Jugar ▶</button>
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
            <div className="ot">{result.win ? '¡Nivel superado!' : '¡Se acabó el tiempo!'}</div>
            <Stars n={result.stars} size={34} />
            <div className="ok">Puntos</div>
            <div className="os">{result.score}</div>
            <div className="card-btns">
              <button onClick={() => setScreen('map')}>Mapa</button>
              {result.win && result.index + 1 < LEVELS.length
                ? <button className="primary" onClick={() => playLevel(result.index + 1)}>Siguiente ▶</button>
                : <button className="primary" onClick={() => playLevel(result.index)}>Reintentar</button>}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
