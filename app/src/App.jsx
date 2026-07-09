import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Board, MAX_PX } from './pixi/Board.js'
import { buildTileTextures } from './pixi/tileTextures.js'
import { Controller, getHintPool, setHintPool, HINTS_MAX } from './game/controller.js'
import { LEVELS } from './game/levels.js'
import { initMetrics, getNick, setNick, trackEvent } from './metrics.js'
import { WORLDS, zoneColor, isWip, worldOf, MAP_EQS, buildMapDoodles, ChalkDoodle, Mascota, MAP_W, mapGeometry, MapBridge, Stars } from './mapView.jsx'
import { tokenColor, fmtMMSS, buildDoodles, buildConfetti } from './uiHelpers.js'
import { loadProgress, saveProgress, loadHearts, saveHearts, HEARTS_MAX, heartsNextInSec } from './storage.js'
import { CoachBubble, WinScreen, StartPopup, ResultCard, SettingsPopup, DailyPopup, NickPopup, WipPopup } from './Popups.jsx'

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

  // TELEGRAFIADO del ataque del jefe: el signo del HUD hace un wind-up y "embiste", y
  // dispara PROYECTILES '+' que vuelan del signo a las celdas que va a infestar. Así se VE
  // que lo que pasa en el tablero lo causa el jefe (sin depender de mensajes del coach).
  // kind: 'scatter' | 'infest' (con celdas) | 'grow' (sin celdas: embestida + destello del marco).
  const bossAttackFx = useCallback(({ cells, rows, cols, kind }) => {
    const sign = document.querySelector('.boss-sign')
    // 1) wind-up + embestida del signo (crece, tiembla y golpea hacia abajo/el tablero)
    if (sign) sign.animate([
      { transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' },
      { transform: 'scale(1.45) rotate(-9deg)', filter: 'brightness(1.55) drop-shadow(0 0 14px #ff6b6b)', offset: 0.3 },
      { transform: 'scale(1.5) rotate(7deg)', filter: 'brightness(1.55) drop-shadow(0 0 16px #ff6b6b)', offset: 0.48 },
      { transform: 'scale(0.9) translateY(12px)', filter: 'brightness(1.25)', offset: 0.7 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ], { duration: 740, easing: 'ease-in-out' })
    if (kind === 'grow' || kind === 'shrink') {
      // aviso de CAMBIO DE TAMAÑO del tablero: el marco destella en el color del jefe
      mountRef.current?.animate([
        { boxShadow: '0 0 0 0 rgba(255,107,107,0)' },
        { boxShadow: '0 0 36px 10px rgba(255,107,107,.8)', offset: 0.5 },
        { boxShadow: '0 0 0 0 rgba(255,107,107,0)' },
      ], { duration: 950, easing: 'ease-in-out' })
    }
    // 2) proyectiles '+' del signo a cada celda afectada (aterrizan cuando se aplica el estado)
    const overlay = overlayRef.current
    const canvas = mountRef.current?.querySelector('canvas')
    if (!overlay || !canvas || !cells?.length) return
    const cr = canvas.getBoundingClientRect()
    const sr = sign?.getBoundingClientRect()
    const sx = sr ? sr.left + sr.width / 2 : cr.left + cr.width / 2
    const sy = sr ? sr.top + sr.height / 2 : cr.top - 30
    cells.forEach(({ r, c }, i) => {
      const tx = cr.left + ((c + 0.5) / cols) * cr.width
      const ty = cr.top + ((r + 0.5) / rows) * cr.height
      const el = document.createElement('div')
      el.className = 'boss-shot'
      el.textContent = '+'
      el.style.left = sx + 'px'; el.style.top = sy + 'px'
      overlay.appendChild(el)
      el.animate([
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1, offset: 0.28 },
        { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(1)`, opacity: 1 },
      ], { duration: 420, delay: 260 + i * 24, easing: 'cubic-bezier(.5,0,.65,1)', fill: 'forwards' })
        .onfinish = () => el.remove()
    })
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
  const [wipOpen, setWipOpen] = useState(null)                    // pop-up "en desarrollo" (mundo bloqueado del playtest)
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

      // Pre-renderizar las texturas de ficha UNA vez (perf): a partir de acá crear una
      // ficha sólo apunta un Sprite a la textura cacheada (ver pixi/tileTextures.js).
      buildTileTextures(app.renderer)

      const hooks = {
        setTime: setTimeLeft, setInventory, setHints,
        setMode: (m) => setMode(m),
        setAccum: (a) => setAccum(a),
        setBoss: (b) => setBoss(b),
        bossAttack: bossAttackFx,
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
              saveProgress(next)
              return next
            })
          }
          if (completed) {
            // ganó: pantalla de victoria con estrellas (~3,4 s) y luego auto-avanza
            // al mapa + pop-up de inicio del siguiente nivel (estilo Candy Crush).
            setResult(null)
            // si era JEFE: la pantalla de victoria muestra el desenlace (signo derrotado que cae)
            setWinScreen({ index, stars, bossSign: boss ? (LEVELS[index]?.ops?.[0] ?? '+') : null })
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
        (w, h) => {   // ancho/alto por separado (tablero puede crecer no-cuadrado); el contenedor
          const hh = h ?? w                        // ajusta su aspect-ratio para no distorsionar el canvas
          app.renderer.resize(w, hh)
          if (mountRef.current) mountRef.current.style.aspectRatio = w / hh
        },
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

  // Mundos EN DESARROLLO (Mult/Div): bloqueados aunque tengas estrellas, hasta terminar el playtest
  // de Suma+Resta. El dev triple-clic (abajo) sigue sirviendo para probarlos a mano.
  const isUnlocked = (i) => i === 0 || devUnlocked.has(i) || (!isWip(i) && (progress.stars[i - 1] || 0) >= 1)
  // tocar un nodo del mapa abre el pop-up de inicio del nivel (estilo Candy Crush)
  const openStart = (i) => { clearTimeout(startPopupTimer.current); if (isUnlocked(i)) setStartPopup(i) }
  // MODO TEST (secreto, solo para desarrollo): TRIPLE clic en un nivel BLOQUEADO lo abre igual.
  // No persiste (se pierde al recargar) → ningún jugador real lo activa sin querer.
  const handleNode = (i) => {
    if (isUnlocked(i)) { openStart(i); return }
    // mundo en desarrollo: cartel "próximamente" y listo (para testearlo, quitar el flag `wip`
    // en mapView.jsx). El dev triple-clic sigue disponible para los bloqueados NORMALES.
    if (isWip(i)) { setWipOpen(worldOf(i).name); return }
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
    setHintPoolState(setHintPool(getHintPool() + DAILY_HINTS))   // repone pistas (tope HINTS_MAX)
    addHearts(HEARTS_MAX)                                        // repone las vidas al máximo (tope HEARTS_MAX)
    setDailyOpen(false)                                          // cerrar el pop-up al reclamar
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
              {/* el glifo '−' de la fuente tiza queda muy bajo → barra dibujada y centrada */}
              <div className={'boss-sign' + (boss.hp <= 0 ? ' defeated' : '')}>
                {boss.sign === '−' ? <span className="minus-bar" /> : boss.sign}
              </div>
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
              En suma y multiplicación da igual el orden (conmutativas) → no se muestran.
              Van en los CUATRO lados: filas → arriba y abajo, columnas ↓ izquierda y derecha. */}
          {dirMatters && (<>
            <div className="arrow-h top start" /><div className="arrow-h top mid" /><div className="arrow-h top end" />
            <div className="arrow-h bottom start" /><div className="arrow-h bottom mid" /><div className="arrow-h bottom end" />
            <div className="arrow-v left start" /><div className="arrow-v left mid" /><div className="arrow-v left end" />
            <div className="arrow-v right start" /><div className="arrow-v right mid" /><div className="arrow-v right end" />
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
              {/* trazo a mano para el cartel de mundo: ondas más grandes y visibles (borde + texto) */}
              <filter id="chalkSector" x="-15%" y="-15%" width="130%" height="130%">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="3.6" />
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
            {/* cuentas de tiza blanca por fase (suma/resta/mult/div): decorativas, opuestas al nodo */}
            {MAP_EQS.map((d, k) => {
              const p = mapGeo.pts[d.at]
              if (!p) return null
              const onLeft = p.x / MAP_W < 0.5
              // del lado opuesto al nodo, pero más ADENTRO (no pegadas al borde) y escalonadas
              const style = { top: p.y + 'px', [onLeft ? 'right' : 'left']: (19 + (k % 2) * 8) + '%', ['--rot']: ((k % 2 ? 1 : -1) * (3 + k)) + 'deg' }
              return <span key={'sum' + k} className="map-sum" style={style} aria-hidden="true">{d.text}</span>
            })}
            {/* SEPARADOR de fase: una línea de tiza imperfecta cruza el mapa en cada límite de
                mundo (además del puente), para marcar el cambio de fase. */}
            {mapGeo.bridges.map((b) => (
              <svg key={'sep' + b.key} className="phase-sep" style={{ top: b.y + 'px' }}
                viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 8 9 C 55 4, 95 12, 140 7 S 235 11, 292 8" />
              </svg>
            ))}
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
              if (!p) return null
              // Si el nodo del mundo es el nivel ACTUAL (nodo grande + "¡Acá!" + mascota), el
              // cartel arriba choca → lo mandamos al COSTADO (lado opuesto a la mascota). Para
              // los demás mundos (nodo lejano) va arriba del nodo, en el hueco del camino.
              const atCurrent = w.at === currentLevel
              // la mascota va a la RIGHT si el nodo está a la izquierda (x<0.5) y viceversa;
              // el cartel va al lado CONTRARIO a la mascota para no taparla.
              const side = p.x / MAP_W < 0.5 ? 'left' : 'right'
              const style = atCurrent
                ? { top: p.y + 'px', [side]: '4%', transform: 'translateY(-50%)', '--sc': w.color }
                : { top: (p.y - 96) + 'px', '--sc': w.color }
              return (
                <div key={w.at} className={'sector' + (atCurrent ? ' sector-side' : '') + (w.wip ? ' sector-wip' : '')} style={style}>
                  <span className="sector-sym">{w.sym}</span>
                  <span className="sector-name">{w.name}</span>
                  {w.wip && <span className="sector-soon">🚧 Próximamente</span>}
                </div>
              )
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
              const isBoss = !!lv.boss
              const isTimed = !!lv.timed && !isBoss
              const wip = isWip(i)
              return (
                <button key={i}
                  className={'node' + (unlocked ? '' : ' locked') + (wip ? ' wip' : '') + (i === currentLevel ? ' current' : '') + (done ? ' done' : '') + (isBoss ? ' boss-node' : '') + (isTimed ? ' timed-node' : '')}
                  style={{ top: p.y + 'px', left: (p.x / MAP_W * 100) + '%', '--nc': zoneColor(i) }}
                  onClick={() => handleNode(i)}>
                  {i === currentLevel && <span className="node-here">¡Acá!</span>}
                  {/* sin nombre de nivel en el mapa (2026-07-06): evita traducirlos; name = id interno */}
                  {isBoss && <span className="node-crown" aria-hidden="true">👹</span>}
                  {isTimed && <span className="node-clock" aria-hidden="true">⏱</span>}
                  {/* el número SIEMPRE se ve (aunque esté bloqueado); el candado va como chapita */}
                  <span className="node-num">{i + 1}</span>
                  {/* mundo en desarrollo → chapita 🚧; bloqueado normal → 🔒 */}
                  {!unlocked && <span className="node-lock" aria-hidden="true">{wip ? '🚧' : '🔒'}</span>}
                  {unlocked && <Stars n={stars} size={11} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <WinScreen win={winScreen} confetti={confetti} onAdvance={advanceFromWin} />

      <StartPopup index={startPopup} onClose={() => setStartPopup(null)} onPlay={playLevel} />

      <ResultCard result={result} hearts={hearts}
        onRetry={() => { spendHeart(); ctrlRef.current?.resumeWithBonus() }}
        onExit={() => { setResult(null); setScreen('map') }} />

      {settingsOpen && (
        <SettingsPopup levelNum={target.level} onClose={() => setSettingsOpen(false)}
          onLeave={() => { ctrlRef.current?.abandon(); setSettingsOpen(false); setCoach(null); setResult(null); setScreen('map') }} />
      )}

      {dailyOpen && (
        <DailyPopup hintPool={hintPool} claimed={dailyClaimed()} dailyHints={DAILY_HINTS}
          onClose={() => setDailyOpen(false)} onClaim={claimDaily} />
      )}

      {nickOpen && (
        <NickPopup value={nickInput} onChange={setNickInput}
          onSave={() => { setNick(nickInput); localStorage.setItem('math_nick_asked', '1'); setNickOpen(false) }}
          onSkip={() => { localStorage.setItem('math_nick_asked', '1'); setNickOpen(false) }} />
      )}

      {wipOpen && <WipPopup worldName={wipOpen} onClose={() => setWipOpen(null)} />}

      <CoachBubble coach={coach} onDismiss={dismissCoach} />

      {/* capa de tokens que vuelan al objetivo (efecto collect) */}
      <div className="fly-overlay" ref={overlayRef} />
    </div>
  )
}
