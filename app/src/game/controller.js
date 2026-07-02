// ====================================================================
// Controlador: juega UN nivel (escenario). Objetivo inteligente (siempre
// resoluble en un movimiento), límite de movidas, fin con estrellas.
// ====================================================================
import {
  newGrid, tidyBoard, ensureMinOperators, findEquationCells, findTargetCellsMulti,
  findMatchesMulti, findHintFallback, pickTargets, adjacent,
} from './logic.js'
import { getLevel, makeGen, randTarget, starsFor, symbolAllowed } from './levels.js'

const BOOSTER_DEFS = [
  { id: '+',  label: '+',  kind: 'place', ch: '+',  base: 3 },
  { id: '-',  label: '−',  kind: 'place', ch: '−',  base: 3 },
  { id: 'x',  label: '×',  kind: 'place', ch: '×',  base: 2 },
  { id: 'd',  label: '÷',  kind: 'place', ch: '÷',  base: 2 },
  { id: 'eq', label: '=',  kind: 'place', ch: '=',  base: 2 },
  { id: 'tp', label: '⇄',  kind: 'teleport',        base: 3 },
  { id: 'rr', label: '🎯', kind: 'reroll',          base: 2 },
]

const START_TIME = 120   // 2 minutos base; cada cuenta suma tiempo
const TIME_PER_CUENTA = 5 // segundos que otorga cada cuenta formada
const MAX_TRIES = 10     // intentos: cada movimiento que NO forma cuenta resta 1
const MAX_HINTS = 3      // pistas manuales permitidas por partida
const MAX_CONTINUES = 2  // veces que se puede "seguir con +1 min" al perder
const CONTINUE_TIME = 60 // segundos que da cada "+1 min"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class Controller {
  constructor(board, hooks) {
    this.board = board
    this.hooks = hooks
    this.cfg = { pctOps: 24, pctEq: 14, minEq: 5 }
    this.boosters = BOOSTER_DEFS.map((b) => ({ ...b, n: b.base }))
    this.activeBooster = null
    this.selected = null
    this.ended = true
    this.busy = false
  }

  // ---------- arranque de nivel ----------
  startLevel(index) {
    this.levelIndex = index
    this.level = getLevel(index)
    this.gen = makeGen(this.level, this.cfg)
    this.md = this.level.maxDigits
    this.ended = false
    this.busy = false
    this.started = false
    this.left = this.level.quota ?? 6      // cuentas que faltan completar
    this.tries = this.level.tries ?? MAX_TRIES   // intentos restantes
    this.hintsLeft = this.level.hints ?? MAX_HINTS  // pistas manuales que quedan
    this.continues = 0                     // veces que ya usó "+1 min"
    this.coachedFirstCuenta = false        // ya se mostró el coach de "cuentas restantes" (nivel 2)
    this.coachedTutorialFirst = false      // ya se mostró el 2do paso del tutorial (nivel 1)
    this.coachActive = false               // hay un mensaje del coach en pantalla (pausa pistas/manito)
    this.moves = 0                         // movimientos hechos (para límite de pistas)
    this.autoHintCount = 0                 // pistas automáticas ya mostradas
    this.combo = 0
    this.timeLeft = START_TIME
    this.deadline = 0
    this.timerOn = false
    if (this.timerId) clearTimeout(this.timerId)
    this._clearAutoHint()
    this.selected = null
    this.activeBooster = null
    this.targets = []
    this.tutorial = !!this.level.tutorial
    for (const b of this.boosters) b.n = b.base
    this._rebuild()
    this._pickTargets()
    this._pushHud()
    this._pushInventory()
    this.hooks.setOverlay({ show: false })
    // Tutorial (nivel 1): un mensaje flotante corto para arrancar; el resto se
    // va indicando MIENTRAS jugás (después del primer acierto), no todo junto.
    // Como el reloj arranca recién en el primer movimiento, no consume tiempo.
    if (this.tutorial) {
      this._coach([{ text: 'Arrastrá una ficha hacia su vecina para formar el número de arriba.', highlight: 'target' }])
    }
    this._startAutoHint()
  }

  // ---------- temporizador ----------
  _ensureStarted() {
    if (this.started || this.ended) return
    this.started = true
    this.board.hideHandGuide()              // el jugador ya tomó el control: fuera la manito
    this.deadline = Date.now() + START_TIME * 1000
    this.timerOn = true
    this._tick()
  }

  // pausa el reloj (para los mensajes del coach: "sin contar el tiempo")
  pause() {
    if (!this.started || this.ended || !this.timerOn) return
    this.timeLeft = Math.max(0, (this.deadline - Date.now()) / 1000)
    this.timerOn = false
    if (this.timerId) clearTimeout(this.timerId)
  }
  // reanuda el reloj (si corresponde; antes del primer movimiento no hace nada)
  resume() {
    if (!this.started || this.ended || this.timerOn) return
    this.deadline = Date.now() + this.timeLeft * 1000
    this.timerOn = true
    this._tick()
  }
  // muestra un mensaje flotante (coach): pausa el reloj y bloquea pistas/manito
  // automáticas mientras está en pantalla (para que no se solapen).
  _coach(steps) {
    this.pause()
    this.coachActive = true
    this._clearAutoHint()
    this.hooks.coach?.(steps)
  }
  // el jugador cerró el último mensaje del coach: reanuda reloj y pistas automáticas
  coachDismissed() {
    this.coachActive = false
    this.resume()
    this._startAutoHint()
  }
  _tick() {
    if (!this.timerOn) return
    const ms = this.deadline - Date.now()
    this.timeLeft = Math.max(0, ms / 1000)
    this.hooks.setTime(this.timeLeft)
    if (ms <= 0) { this.timerOn = false; this._endLevel(false, 'time'); return }
    this.timerId = setTimeout(() => this._tick(), 200)
  }

  _rebuild() {
    const n = this.level.size
    this.board.build(newGrid(this.gen, n, n, this.md))
  }

  // ---------- objetivos inteligentes (hasta 3) ----------
  // consumed = valores que se cumplieron este movimiento (se descartan y reemplazan).
  // Los demás se conservan si siguen siendo alcanzables; si no, se reemplazan.
  _pickTargets(consumed = new Set()) {
    this._replenishOperators()
    const n = this.level.nTargets ?? 3
    const keep = this.targets.filter((t) => !consumed.has(t))
    let targets = pickTargets(this.board.gridChars(), this.level, keep, n)
    let tries = 0
    while (targets.length === 0 && tries < 14) {
      this._rebuild()
      targets = pickTargets(this.board.gridChars(), this.level, [], n)
      tries++
    }
    this.targets = targets
    this._pushTargets(consumed.size > 0)
  }

  // ---------- pistas automáticas (solo niveles 1 y 2, a los 5 s de inactividad) ----------
  // config de pistas automáticas por nivel:
  //  niveles 1-3 → solo en los primeros 3 movimientos (nivel 1 instantánea, 2-3 a los 5 s)
  //  niveles 4-5 → a los 10 s, máximo 2 pistas
  //  nivel 6+    → sin pistas automáticas
  _autoHintConfig() {
    const i = this.levelIndex
    if (i <= 2) return { delay: this.tutorial ? 0 : 5000, maxMoves: 3, maxHints: Infinity }
    if (i <= 4) return { delay: 10000, maxMoves: Infinity, maxHints: 2 }
    return null
  }
  _startAutoHint() {
    this._clearAutoHint()
    if (this.ended || this.coachActive) return
    const cfg = this._autoHintConfig()
    if (!cfg || this.moves >= cfg.maxMoves || this.autoHintCount >= cfg.maxHints) return
    this.autoHintId = setTimeout(() => this._showAutoHint(), cfg.delay)
  }
  _clearAutoHint() {
    if (this.autoHintId) { clearTimeout(this.autoHintId); this.autoHintId = null }
  }
  _showAutoHint() {
    this.autoHintId = null
    if (this.busy || this.ended) { this._startAutoHint(); return }
    this.autoHintCount++
    if (this.tutorial) {
      const h = findHintFallback(this.board.gridChars(), this.targets, this.md)
      if (h) this.board.showHandGuide(h.a, h.b)      // nivel 1: manito guía sobre la jugada
    } else {
      this.hint(false)                               // pista automática: NO gasta el cupo manual
      this._startAutoHint()                          // repetir (frenado por maxMoves/maxHints)
    }
  }
  // el jugador interactuó: sacar la guía y reiniciar el contador de la pista
  _playerActed() {
    this.board.hideHandGuide()
    this._clearAutoHint()
  }

  // ---------- interacción ----------
  async onTileTap(r, c) {
    if (this.busy || this.ended) return
    this._playerActed()
    this._ensureStarted()
    if (this.activeBooster) return this._useBooster(r, c)

    if (!this.selected) { this.selected = { r, c }; this.board.select(this.selected); return }
    if (this.selected.r === r && this.selected.c === c) { this.selected = null; this.board.select(null); return }
    if (!adjacent(this.selected, { r, c })) { this.selected = { r, c }; this.board.select(this.selected); return }

    const a = this.selected; this.selected = null; this.board.select(null)
    await this._commitSwap(a, { r, c })
  }

  // arrastre: intercambia dos vecinas (a -> b)
  async onDragSwap(a, b) {
    if (this.busy || this.ended) return
    this._playerActed()
    this._ensureStarted()
    if (this.activeBooster) return this.onTileTap(a.r, a.c)   // en modo power-up, vale como tap
    this.selected = null; this.board.select(null)
    await this._commitSwap(a, b)
  }

  async _commitSwap(a, b) {
    this.moves++                           // cuenta el movimiento (para el límite de pistas)
    this.busy = true; this.board.locked = true
    await this.board.swap(a, b)
    // si no forma cuenta, vuelve para atrás y cuesta un intento (anti prueba-y-error)
    if (!findMatchesMulti(this.board.gridChars(), this.targets, this.md).size) {
      await this.board.swap(b, a)
      this.busy = false; this.board.locked = false
      this._failMove()
      return
    }
    await sleep(60)
    const consumed = await this._resolve()
    // dejar que termine la animación de recolección (fichas volando + chip inflándose)
    // antes de recambiar los objetivos, así no se pisa con el cambio de chips
    if (!this.ended && consumed.size > 0) await sleep(360)
    this.busy = false; this.board.locked = false
    this._afterMove(consumed)
  }

  _afterMove(consumed) {
    if (this.ended) return
    this._pickTargets(consumed)
    // Tutorial (nivel 1): 2do paso, recién DESPUÉS del primer acierto (no todo junto al arrancar).
    if (this.tutorial && consumed.size > 0 && !this.coachedTutorialFirst) {
      this.coachedTutorialFirst = true
      this._coach([{ text: '¡Así se hace! Repetí hasta completar todas las cuentas.', highlight: 'tally' }])
      return   // coachDismissed() retoma la manito automática al cerrar el mensaje
    }
    // Nivel 2: al resolver la PRIMERA cuenta, frenar el reloj y señalar cuántas faltan.
    if (this.levelIndex === 1 && consumed.size > 0 && !this.coachedFirstCuenta && this.left > 0) {
      this.coachedFirstCuenta = true
      this._coach([{ text: '¡Bien! Te quedan ' + this.left + ' cuentas por hacer. Completá todas antes de que se acabe el tiempo.', highlight: 'tally' }])
      return
    }
    this._startAutoHint()
  }

  async _useBooster(r, c) {
    const b = this.activeBooster
    if (b.kind === 'place') {
      this.board.setCharAt(r, c, b.ch); this._consume(b)
      this.busy = true; this.board.locked = true
      const consumed = await this._resolveIfAny()
      this.busy = false; this.board.locked = false
      if (!this.ended) this._pickTargets(consumed)
      return
    }
    if (b.kind === 'teleport') {
      if (!this.selected) { this.selected = { r, c }; this.board.select(this.selected); return }
      if (this.selected.r === r && this.selected.c === c) { this.selected = null; this.board.select(null); return }
      const a = this.selected; this.selected = null; this.board.select(null); this._consume(b)
      this.busy = true; this.board.locked = true
      await this.board.swap(a, { r, c })
      const consumed = await this._resolveIfAny()
      this.busy = false; this.board.locked = false
      if (!this.ended) this._pickTargets(consumed)
    }
  }

  async _resolveIfAny() {
    if (findMatchesMulti(this.board.gridChars(), this.targets, this.md).size) { await sleep(60); return await this._resolve() }
    return new Set()
  }

  // ---------- cascada ----------
  async _resolve() {
    let combo = 0
    const consumed = new Set()
    while (!this.ended) {
      const grid = this.board.gridChars()
      const eq = findEquationCells(grid, this.md)
      const tg = findTargetCellsMulti(grid, this.targets, this.md)
      const all = new Set([...eq, ...tg.cells])
      if (all.size === 0) break

      combo++; this.combo = combo
      const cuentas = tg.hit.size + (eq.size > 0 ? 1 : 0)   // cuentas formadas en este paso
      const deliberate = combo === 1                        // combo 1 = jugada del jugador; 2+ = cascada "por azar"
      tg.hit.forEach((v) => consumed.add(v))
      if (tg.hit.size) this.hooks.targetHit?.([...tg.hit])   // avisar qué objetivo se logró
      const bonus = TIME_PER_CUENTA * cuentas               // toda cuenta suma tiempo
      if (cuentas > 0) {
        if (deliberate) this._decCuentas(cuentas)           // solo la jugada del jugador cuenta al objetivo
        else this.hooks.toast?.('¡Combo por azar! +' + bonus + 's ⏱')
        this._addTime(bonus)
      }

      const cells = [...all].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c } })
      const ctr = this.board.cellsCenter(cells)

      await this.board.highlight(cells)   // resaltar la combinación antes de explotar
      this.board.shake(all.size > 6 ? 14 : 8)
      this.board.popup(ctr.x, ctr.y, '+' + bonus + 's' + (combo > 1 ? '  ¡combo x' + combo + '!' : ''))
      // solo la cuenta del jugador vuela al chip del objetivo (las de azar dan tiempo, no objetivo)
      if (deliberate) this.hooks.onCuenta?.({
        cells: cells.map(({ r, c }) => ({ r, c, ch: grid[r]?.[c] })),
        rows: this.board.rows, cols: this.board.cols, value: [...tg.hit][0],
      })
      await this.board.clear(cells)
      await this.board.collapse(this.gen.randTile)
      this._applyTidy()
      if (this.left <= 0) break          // ¡completó las cuentas del nivel!
    }
    this.combo = 0
    if (combo >= 3 && !this.ended) this._earnBooster()
    if (this.left <= 0 && !this.ended) this._endLevel(true)
    return consumed
  }

  // descuenta cuentas de la meta del nivel y avisa a la UI (con animación)
  _decCuentas(n) {
    this.left = Math.max(0, this.left - n)
    this.hooks.setCuentas?.({ left: this.left, quota: this.level.quota ?? 6, dec: true })
  }

  // suma segundos al reloj (extiende el deadline) con animación "+N"
  _addTime(sec) {
    if (!this.started || this.ended || sec <= 0) return
    this.deadline += sec * 1000
    this.timeLeft = Math.max(0, (this.deadline - Date.now()) / 1000)
    this.hooks.setTime(this.timeLeft)
    this.hooks.addTime?.(sec)
  }

  // movimiento que no formó cuenta: resta un intento; si se acaban, se pierde
  _failMove() {
    this.tries = Math.max(0, this.tries - 1)
    this.hooks.setTries?.({ left: this.tries, dec: true })
    if (this.tries <= 0) { this._endLevel(false, 'moves'); return }
    // avisar SOLO la primera vez en todo el juego (nunca más, en ningún nivel)
    try {
      if (!localStorage.getItem('math_coached_wrongmove')) {
        localStorage.setItem('math_coached_wrongmove', '1')
        this._coach([{ text: 'Eso no forma una cuenta. Te quedan ' + this.tries + ' movimientos: pensá bien antes de mover.' }])
      }
    } catch { /* sin localStorage: no avisar */ }
  }

  _applyTidy() {
    const grid = this.board.gridChars()
    const changed = tidyBoard(grid, this.gen)
    if (changed.length) this.board.applyChars(changed, grid)
  }

  // repone operadores si el tablero quedó con pocos (piso ~1.2 por fila)
  _replenishOperators() {
    const grid = this.board.gridChars()
    const min = Math.ceil(this.level.size * 1.2)
    const changed = ensureMinOperators(grid, this.gen, min)
    if (changed.length) this.board.applyChars(changed, grid)
  }

  // ---------- power-ups ----------
  _allowed(b) { return b.kind !== 'place' || symbolAllowed(this.level, b.ch) }

  activateBooster(id) {
    if (this.busy || this.ended) return
    const b = this.boosters.find((x) => x.id === id)
    if (!b || b.n <= 0 || !this._allowed(b)) return
    if (b.kind === 'reroll') {
      b.n--; this._pickTargets(new Set(this.targets)); this._pushInventory()
      this.hooks.toast('¡Nuevos objetivos!')
      return
    }
    this.activeBooster = this.activeBooster?.id === id ? null : b
    this.selected = null; this.board.select(null); this._pushInventory()
    if (this.activeBooster) {
      this.hooks.toast(b.kind === 'place' ? 'Tocá una ficha para poner  ' + b.label : 'Tocá dos fichas para intercambiar')
    }
  }
  _consume(b) { b.n--; if (b === this.activeBooster) this.activeBooster = null; this._pushInventory() }
  _earnBooster() {
    const pool = this.boosters.filter((b) => b.kind !== 'reroll' && this._allowed(b))
    if (!pool.length) return
    const b = pool[Math.floor(Math.random() * pool.length)]
    b.n++; this._pushInventory(); this.hooks.toast('¡Bonus combo! +1  ' + b.label)
  }

  // ---------- fin de nivel ----------
  // completed = true si llegó a 0 cuentas; reason: 'completed' | 'time' | 'moves'.
  _endLevel(completed = false, reason = completed ? 'completed' : 'time') {
    if (this.ended) return
    this.ended = true; this.timerOn = false; this.activeBooster = null; this.selected = null; this.board.select(null)
    this.board.hideHandGuide()
    this._clearAutoHint()
    if (this.timerId) clearTimeout(this.timerId)
    const stars = starsFor(this.level, { completed, timeLeft: this.timeLeft, totalTime: START_TIME })
    this._pushInventory()
    this.hooks.onLevelEnd({
      index: this.levelIndex, completed, reason, stars,
      quota: this.level.quota ?? 6, left: this.left,
      timeLeft: Math.max(0, this.timeLeft),
      continuesLeft: MAX_CONTINUES - this.continues,   // cuántos "+1 min" quedan
    })
  }

  // "+1 min": el jugador perdió pero elige seguir. Reponemos tiempo (y intentos
  // si se habían agotado) y reanudamos el mismo nivel. Máximo MAX_CONTINUES veces.
  resumeWithBonus() {
    if (!this.ended || this.continues >= MAX_CONTINUES) return
    this.continues++
    this.hooks.onAddMinute?.(this.levelIndex)          // métrica
    this.ended = false
    this.busy = false
    this.board.locked = false
    if (this.tries <= 0) this.tries = this.level.tries ?? MAX_TRIES   // reponer intentos
    this.hooks.setTries?.({ left: this.tries, dec: false })
    this.started = true
    this.timerOn = true
    this.timeLeft = Math.max(0, this.timeLeft) + CONTINUE_TIME
    this.deadline = Date.now() + this.timeLeft * 1000
    this.hooks.setTime(this.timeLeft)
    this.hooks.addTime?.(CONTINUE_TIME)
    this.hooks.setOverlay({ show: false })             // cierra el pop-up de resultado
    this._tick()
    this._startAutoHint()
  }

  // ---------- pista ----------
  // manual = true → la pide el jugador con el botón (gasta 1 del cupo de 3).
  // manual = false → pista automática (no gasta cupo).
  hint(manual = true) {
    if (this.busy || this.ended) return
    if (manual && this.hintsLeft <= 0) return       // sin pistas disponibles
    const grid = this.board.gridChars()
    const h = findHintFallback(grid, this.targets, this.md)
    if (!h) return                                  // sin jugadas (no gasta pista)
    // simular el swap para saber qué celdas forman la cuenta (en el tablero YA intercambiado)
    const g = grid.map((row) => row.slice())
    const tmp = g[h.a.r][h.a.c]; g[h.a.r][h.a.c] = g[h.b.r][h.b.c]; g[h.b.r][h.b.c] = tmp
    // remapear esas posiciones a las fichas ACTUALES: el destino del swap se traduce
    // a la ficha que hay que mover (su origen), para resaltar las piezas reales.
    const toCurrent = ({ r, c }) => {
      if (r === h.a.r && c === h.a.c) return { r: h.b.r, c: h.b.c }
      if (r === h.b.r && c === h.b.c) return { r: h.a.r, c: h.a.c }
      return { r, c }
    }
    const line = [...findMatchesMulti(g, this.targets, this.md)].map((k) => {
      const [r, c] = k.split(',').map(Number); return toCurrent({ r, c })
    })
    this.board.hint(h.a, h.b, line)
    if (manual) {
      this.hintsLeft = Math.max(0, this.hintsLeft - 1)
      this.hooks.setHints?.(this.hintsLeft)
      this.hooks.onHintUsed?.(this.levelIndex)      // métrica
    }
  }

  // ---------- botones ----------
  shuffle() {
    if (this.busy || this.ended) return
    this._rebuild(); this._pickTargets(new Set(this.targets))
  }
  setConfig(patch) {
    Object.assign(this.cfg, patch)
    this.gen = makeGen(this.level, this.cfg)
    if (!this.busy && !this.ended) { this._rebuild(); this._pickTargets(new Set(this.targets)) }
    this.hooks.setConfig({ ...this.cfg })
  }

  // ---------- push de estado a la UI ----------
  _pushTargets(flash) {
    this.hooks.setTarget({
      level: this.level.num, name: this.level.name,
      list: [...this.targets], flash: !!flash,
    })
  }
  _pushHud() {
    this.hooks.setTime(this.timeLeft)
    this.hooks.setCuentas?.({ left: this.left, quota: this.level.quota ?? 6, dec: false })
    this.hooks.setTries?.({ left: this.tries, dec: false })
    this.hooks.setHints?.(this.hintsLeft)
  }
  _pushInventory() {
    this.hooks.setInventory(
      this.boosters.filter((b) => this._allowed(b))
        .map((b) => ({ id: b.id, label: b.label, n: b.n, active: this.activeBooster?.id === b.id }))
    )
  }
}
