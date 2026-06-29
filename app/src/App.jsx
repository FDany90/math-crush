import React, { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Board, BOARD_PX } from './pixi/Board.js'
import { Controller } from './game/controller.js'

export default function App() {
  const mountRef = useRef(null)
  const ctrlRef = useRef(null)
  const initedRef = useRef(false)

  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [combo, setCombo] = useState(1)
  const [target, setTarget] = useState({ level: 1, target: 10, flash: false })
  const [limit, setLimit] = useState({ mode: 'time', timeLeft: 180, moves: 20, startTime: 180, startMoves: 20 })
  const [inventory, setInventory] = useState([])
  const [overlay, setOverlay] = useState({ show: false })
  const [mode, setMode] = useState('time')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    let app, ctrl
    let destroyed = false

    ;(async () => {
      app = new Application()
      await app.init({
        width: BOARD_PX, height: BOARD_PX, backgroundAlpha: 0,
        antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
      })
      if (destroyed) { app.destroy(true); return }
      mountRef.current.appendChild(app.canvas)

      const hooks = {
        setScore, setBest, setCombo,
        setTarget: (t) => { setTarget(t); },
        setLimit, setInventory, setOverlay,
        setSelected: () => {},
        setConfig: () => {},
        toast: (msg) => {
          setToast(msg)
          clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 1200)
        },
      }
      const board = new Board(app.stage, (r, c) => ctrl && ctrl.onTileTap(r, c))
      ctrl = new Controller(board, hooks)
      ctrlRef.current = ctrl
      ctrl.newGame('time')
    })()

    return () => { destroyed = true; if (app) app.destroy(true) }
  }, [])

  const doMode = (m) => { setMode(m); ctrlRef.current?.setMode(m) }

  const sec = Math.ceil(limit.timeLeft)
  const timeStr = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')
  const isTime = limit.mode === 'time'
  const limitVal = isTime ? timeStr : limit.moves
  const fillPct = isTime
    ? Math.max(0, Math.min(100, (limit.timeLeft / limit.startTime) * 100))
    : Math.max(0, Math.min(100, (limit.moves / limit.startMoves) * 100))
  const low = isTime ? limit.timeLeft <= 10 : limit.moves <= 5

  return (
    <div className="app">
      <header>
        <h1>Equa <span>Crush</span></h1>
        <div className="sub">Formá el objetivo o una ecuación · horizontal o vertical</div>
      </header>

      <div className="hud">
        <div className="stat"><div className="k">Puntos</div><div className="v">{score}</div></div>
        <div className="stat"><div className="k">{isTime ? 'Tiempo' : 'Movidas'}</div><div className="v">{limitVal}</div></div>
        <div className="stat"><div className="k">Combo</div><div className="v">x{combo}</div></div>
        <div className="stat"><div className="k">Mejor</div><div className="v">{best}</div></div>
      </div>

      <div className="modes">
        <button className={'mode-btn' + (mode === 'time' ? ' active' : '')} onClick={() => doMode('time')}>⏱ Tiempo 3min</button>
        <button className={'mode-btn' + (mode === 'moves' ? ' active' : '')} onClick={() => doMode('moves')}>🔢 Movidas 20</button>
      </div>

      <div className={'target' + (target.flash ? ' flash' : '')} key={target.level + '-' + target.target}>
        Nv.{target.level} · Hacé <b>{target.target}</b>
      </div>
      <div className="limitbar"><div className={'limitfill' + (low ? ' low' : '')} style={{ width: fillPct + '%' }} /></div>

      <div className="board-wrap" ref={mountRef} />

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
        <button onClick={() => ctrlRef.current?.shuffle()}>Mezclar</button>
        <button onClick={() => ctrlRef.current?.reset()}>Reiniciar</button>
      </div>

      <div className="hint-txt">
        Tocá una ficha y una adyacente para intercambiarlas. Hacé el <b>objetivo</b> (ej. {target.target})
        en una línea, o una ecuación con <b>=</b> para bonus. Si te quedás quieto, te muestra una pista.
      </div>

      {toast && <div className="toast">{toast}</div>}

      {overlay.show && (
        <div className="overlay">
          <div className="card">
            <div className="ot">{overlay.title}</div>
            <div className="ok">Puntos</div>
            <div className="os">{overlay.score}</div>
            <div className="osub">{overlay.sub}</div>
            <button onClick={() => ctrlRef.current?.reset()}>De nuevo</button>
          </div>
        </div>
      )}
    </div>
  )
}
