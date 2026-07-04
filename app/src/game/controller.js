// ====================================================================
// Controlador: juega UN nivel (escenario). Objetivo inteligente (siempre
// resoluble en un movimiento), límite de movidas, fin con estrellas.
// ====================================================================
import {
  newGrid, tidyBoard, ensureMinOperators, findEquationCells, findTargetCellsMulti,
  findMatchesMulti, findHintFallback, pickTargets, adjacent, breakFormedTargets, plantTargetMove,
  countTargetMoves, addTargetMovesSubtle, destrandOperators, seedTargetMovesNear,
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
const MAX_HINTS_POOL = 10 // tope del pool GLOBAL de pistas (se acumulan entre niveles)
const START_HINTS = 5     // pistas con las que arranca un jugador nuevo
const HINTS_KEY = 'math_hints'
const MAX_CONTINUES = 2  // veces que se puede "seguir con +1 min" al perder
const CONTINUE_TIME = 60 // segundos que da cada "+1 min"
const NEAR_MOVES = 3     // cuentas fáciles que se siembran (visibles) alrededor de donde jugás
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- Pool GLOBAL de pistas (persiste entre niveles; tope MAX_HINTS_POOL) ----
export const HINTS_MAX = MAX_HINTS_POOL
export function getHintPool() {
  try { const v = parseInt(localStorage.getItem(HINTS_KEY), 10); return Number.isFinite(v) ? Math.max(0, Math.min(MAX_HINTS_POOL, v)) : START_HINTS }
  catch { return START_HINTS }
}
export function setHintPool(n) {
  n = Math.max(0, Math.min(MAX_HINTS_POOL, n))
  try { localStorage.setItem(HINTS_KEY, String(n)) } catch { /* sin localStorage */ }
  return n
}

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
    this.mo = this.level.maxOps ?? 1       // operadores por cuenta (1 = num op num; 2+ para niveles avanzados)
    // objetivo fijo (nueva mecánica); null = objetivos rotativos. Se normaliza a array
    // para soportar el twist "doble objetivo" (target: [5, 10]).
    this.fixedTargets = this.level.target == null ? null
      : (Array.isArray(this.level.target) ? [...this.level.target] : [this.level.target])
    this.relax = !!this.level.relax        // twist: sin reloj (se gana por quota, estrellas por precisión)
    this.switched = false                  // twist targetTo: ¿ya cambió el objetivo?
    // MODO ACUMULATIVO: en vez de quota, formás cualquiera de los objetivos y su VALOR
    // suma/resta a un total; ganás al alcanzar la meta. { start, goal }.
    this.accum = this.level.accum || null
    this.accumTotal = this.accum ? this.accum.start : 0
    this.accumDir = this.accum ? (this.accum.goal >= this.accum.start ? 1 : -1) : 0
    this.ended = false
    this.busy = false
    this.started = false
    this.left = this.level.quota ?? 6      // cuentas que faltan completar
    this.tries = this.level.tries ?? MAX_TRIES   // intentos restantes
    this.hintsLeft = getHintPool()         // pistas del POOL GLOBAL (persiste entre niveles)
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
    } else if (this.level.ops.some((o) => o === '−' || o === '÷') && !this._alreadyCoached('math_coached_dir')) {
      // Primera vez en un nivel de resta/división: el ORDEN importa (no da igual como en la
      // suma). Aclaramos la DIRECCIÓN —no el tamaño—, porque más adelante habrá resultados
      // negativos donde el número grande NO va primero. Solo cuenta el sentido de las flechas.
      this._coach([{ text: 'Ojo: acá el ORDEN importa. La cuenta se arma en el sentido de las flechas: → de izquierda a derecha, ↓ de arriba a abajo.' }])
    }
    this._startAutoHint()
  }

  // ---------- temporizador ----------
  _ensureStarted() {
    if (this.started || this.ended) return
    this.started = true
    this.board.hideHandGuide()              // el jugador ya tomó el control: fuera la manito
    if (this.relax) return                  // modo relax: sin reloj (se gana solo por quota)
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
  // ¿ya se mostró este coach de UNA sola vez (en todo el juego)? Si no, lo marca y devuelve false.
  _alreadyCoached(key) {
    try {
      if (localStorage.getItem(key)) return true
      localStorage.setItem(key, '1')
      return false
    } catch { return true }   // sin localStorage: no molestar
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
    // objetivo fijo: el tablero se genera sesgado y puede traer objetivos YA formados;
    // los rompemos para que arranque "resuelto" (sin matches).
    if (this.fixedTargets != null) this._healFixedBoard()
  }

  // ---------- objetivos inteligentes (hasta 3) ----------
  // consumed = valores que se cumplieron este movimiento (se descartan y reemplazan).
  // Los demás se conservan si siguen siendo alcanzables; si no, se reemplazan.
  // Mantenimiento del tablero de objetivo fijo (todo sobre una grilla en memoria):
  // saca operadores varados, repone con buena distribución, rompe cuentas YA formadas y
  // asegura el mínimo de jugadas al objetivo. Aplica los cambios SIN animación (el
  // controller lo llama durante el temblor de aterrizaje, para esconderlos ahí).
  // nearCols (opcional): columnas donde el jugador acaba de jugar. Si se pasan, se SIEMBRAN
  // cuentas fáciles ahí (mín. NEAR_MOVES) y esas fichas se muestran con un pop VISIBLE; el
  // resto del mantenimiento (operadores, romper formadas, piso global) va escondido en el temblor.
  _healFixedBoard(nearCols = null) {
    this.targets = [...this.fixedTargets]
    const grid = this.board.gridChars()
    const changed = []
    // 1) operadores: sacar los varados + reponer hasta el piso con buena distribución
    const min = Math.ceil(this.level.size * 1.2)
    changed.push(...destrandOperators(grid, this.gen))
    changed.push(...ensureMinOperators(grid, this.gen, min))
    // 2) romper cuentas YA formadas (el paso 1 pudo dejar un '+' entre dos dígitos que
    //    suman el objetivo). El tablero se entrega resuelto: sólo jugadas a un movimiento.
    changed.push(...breakFormedTargets(grid, this.gen, this.targets, this.md, this.mo))
    // 3) asegurar el mínimo de jugadas (sutil, de abajo hacia arriba). Dos garantías:
    //    - TOTAL: al menos MIN_MOVES jugadas a cualquier objetivo (escala con el tablero:
    //      5×5→3, 6×6→5, 7×7→6, 8×8→7).
    //    - POR OBJETIVO (solo doble): cada objetivo tiene sus propias jugadas, así el más
    //      fácil (ej. 10) no se come el tablero dejando al otro (ej. 5) casi sin salida.
    //    Se itera porque reforzar uno puede reducir levemente al otro; `avoid`=TODOS los
    //    objetivos evita que al reforzar uno quede formado otro.
    const MIN_MOVES = this.level.minMoves ?? (this.level.size <= 5 ? 3 : this.level.size - 1)
    const eachMin = this.level.minMovesEach ?? 2
    for (let pass = 0; pass < 4; pass++) {
      let ok = true
      if (this.targets.length > 1) {
        for (const t of this.targets) {
          if (countTargetMoves(grid, [t], this.md, this.mo, eachMin) < eachMin) {
            changed.push(...addTargetMovesSubtle(grid, this.gen, [t], this.md, this.mo, eachMin, this.targets))
            ok = false
          }
        }
      }
      if (countTargetMoves(grid, this.targets, this.md, this.mo, MIN_MOVES) < MIN_MOVES) {
        changed.push(...addTargetMovesSubtle(grid, this.gen, this.targets, this.md, this.mo, MIN_MOVES))
        ok = false
      }
      if (ok) break
    }
    // Último recurso: si algún objetivo sigue por debajo del mínimo (el refuerzo sutil solo
    // cambia dígitos y a veces no alcanza porque los operadores quedaron lejos), PLANTAR
    // jugadas para ESE objetivo (planta también el operador). En doble se planta por objetivo.
    for (const t of this.targets) {
      const onlyT = this.targets.length > 1 ? t : null
      let g = 0
      while (countTargetMoves(grid, [t], this.md, this.mo, eachMin) < eachMin && g++ < 4) {
        const pc = plantTargetMove(grid, this.gen, onlyT)
        if (!pc.length) break
        changed.push(...pc)
        // el plantado pudo formar un objetivo en la línea perpendicular: romperlo
        changed.push(...breakFormedTargets(grid, this.gen, this.targets, this.md, this.mo))
      }
    }
    // por si el tablero quedó SIN ninguna jugada global (rarísimo)
    if (!findHintFallback(grid, this.targets, this.md, this.mo)) {
      changed.push(...plantTargetMove(grid, this.gen))
    }
    // SIEMBRA local: cuentas fáciles alrededor de donde jugó el jugador (se muestran con pop).
    const seeded = nearCols
      ? seedTargetMovesNear(grid, this.gen, this.targets, [...nearCols], this.md, this.mo, NEAR_MOVES)
      : []
    const seededKeys = new Set(seeded.map(([r, c]) => r + ',' + c))
    // mantenimiento de fondo: escondido en el temblor (sin animación), excluyendo lo sembrado
    const bg = [...new Map(changed.map(([r, c]) => [r + ',' + c, [r, c]])).values()]
      .filter(([r, c]) => !seededKeys.has(r + ',' + c))
    if (bg.length) this.board.applyCharsPlain(bg, grid)
    if (seeded.length) this.board.applyChars(seeded, grid)   // pop VISIBLE de la siembra
  }

  _pickTargets(consumed = new Set()) {
    // Objetivo fijo: no rota. El mantenimiento del tablero se hace en el ATERRIZAJE
    // (ver _resolve / _healFixedBoard); acá sólo fijamos y mostramos el objetivo.
    if (this.fixedTargets != null) {
      this.targets = [...this.fixedTargets]
      this._pushTargets(false)
      return
    }
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
      const h = findHintFallback(this.board.gridChars(), this.targets, this.md, this.mo)
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
    if (!findMatchesMulti(this.board.gridChars(), this.targets, this.md, this.mo).size) {
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

  // twist "objetivo que cambia": al llegar a media quota, el objetivo fijo pasa a targetTo.
  // Regenera el bag (nuevos dígitos calientes), reacomoda el tablero y avisa por coach.
  _maybeSwitchTarget() {
    if (this.level.targetTo == null || this.switched || this.ended) return false
    const half = Math.ceil((this.level.quota ?? 6) / 2)
    if (this.left > half) return false
    this.switched = true
    this.fixedTargets = [this.level.targetTo]
    this.gen = makeGen({ ...this.level, target: this.level.targetTo }, this.cfg)
    this._healFixedBoard()      // fija this.targets al nuevo objetivo y reacomoda el tablero
    this._pushTargets(true)     // re-render de los chips (con flash)
    this._coach([{ text: '¡El objetivo cambió! Ahora formá ' + this.level.targetTo + '.', highlight: 'target' }])
    return true
  }

  _afterMove(consumed) {
    if (this.ended) return
    // El temblor ya ocurrió al EXPLOTAR la cuenta (en _resolve). Acá el mantenimiento
    // cambia las fichas necesarias de forma sutil (sin un segundo temblor), como parte
    // del mismo momento en que el tablero se asienta.
    this._pickTargets(consumed)
    if (consumed.size > 0 && this._maybeSwitchTarget()) return   // el objetivo cambió: coach + pausa
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
    if (findMatchesMulti(this.board.gridChars(), this.targets, this.md, this.mo).size) { await sleep(60); return await this._resolve() }
    return new Set()
  }

  // ---------- cascada ----------
  async _resolve() {
    let combo = 0
    let playedCols = null                 // columnas donde el jugador hizo su jugada (para sembrar cerca)
    const consumed = new Set()
    while (!this.ended) {
      const grid = this.board.gridChars()
      const eq = findEquationCells(grid, this.md)
      const tg = findTargetCellsMulti(grid, this.targets, this.md, this.mo)
      const all = new Set([...eq, ...tg.cells])
      if (all.size === 0) break

      combo++; this.combo = combo
      // cuentas por SEGMENTO (no por valor distinto): formar el objetivo 2 veces en un
      // movimiento cuenta 2.
      const cuentas = tg.segs + (eq.size > 0 ? 1 : 0)
      const deliberate = combo === 1                        // combo 1 = jugada del jugador; 2+ = cascada por piezas nuevas
      tg.hit.forEach((v) => consumed.add(v))
      if (tg.hit.size) this.hooks.targetHit?.([...tg.hit])   // avisar qué objetivo se logró
      // TODA cuenta suma al PROGRESO (descuenta del objetivo), sea jugada del jugador o
      // combo por piezas nuevas. Los combos YA NO dan tiempo: solo la jugada del jugador
      // extiende el reloj. Los combos "pagan" en progreso hacia pasar el nivel, no en tiempo.
      // En el nivel "Fiebre de combos" (comboFever) los combos cuentan DOBLE al objetivo.
      const bonus = deliberate ? TIME_PER_CUENTA * cuentas : 0
      const dec = (!deliberate && this.level.comboFever) ? cuentas * 2 : cuentas
      if (cuentas > 0) {
        if (this.accum) this._addAccum(tg.sum)      // acumulativo: suma/resta el VALOR formado
        else this._decCuentas(dec)                  // normal: descuenta cuentas de la quota
        if (deliberate) this._addTime(bonus)
        else this.hooks.toast?.(this.level.comboFever
          ? '¡Combo DOBLE! +' + dec + ' cuentas 🔥'
          : '¡Combo! +' + cuentas + ' cuenta' + (cuentas > 1 ? 's' : '') + ' 🔥')
      }

      const cells = [...all].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c } })
      // banda "alrededor de la jugada": columnas de la cuenta del jugador ± 1 (para sembrar ahí)
      if (deliberate) playedCols = new Set(cells.flatMap(({ c }) => [c - 1, c, c + 1]))
      const ctr = this.board.cellsCenter(cells)

      await this.board.highlight(cells)   // resaltar la combinación antes de explotar
      this.board.popup(ctr.x, ctr.y, combo > 1
        ? '¡combo x' + combo + '!  +' + dec
        : '+' + bonus + 's')
      // TODA cuenta vuela al chip del objetivo (jugada del jugador o combo)
      if (cuentas > 0) this.hooks.onCuenta?.({
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
    // ATERRIZAJE: recién ahora, con todas las piezas ya en su nueva posición, tiembla
    // (la sacudida del aterrizaje) y, DENTRO de ese temblor, el mantenimiento cambia
    // las fichas necesarias sin ninguna animación (queda escondido en la sacudida).
    if (!this.ended && consumed.size > 0) {
      this.board.shake(12)
      if (this.fixedTargets != null) this._healFixedBoard(playedCols)
    }
    return consumed
  }

  // descuenta cuentas de la meta del nivel y avisa a la UI (con animación)
  _decCuentas(n) {
    this.left = Math.max(0, this.left - n)
    this.hooks.setCuentas?.({ left: this.left, quota: this.level.quota ?? 6, dec: true })
  }

  // MODO ACUMULATIVO: suma (o resta) el valor formado al total; gana al alcanzar la meta.
  _addAccum(value) {
    this.accumTotal += this.accumDir * value
    this.hooks.setAccum?.({ total: this.accumTotal, start: this.accum.start, goal: this.accum.goal })
    const reached = this.accumDir > 0 ? this.accumTotal >= this.accum.goal : this.accumTotal <= this.accum.goal
    if (reached) this.left = 0   // dispara la victoria por los checks existentes de left<=0
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
    // 1) sacar operadores varados (esquinas / sin uso posible) → dígitos
    const strand = destrandOperators(grid, this.gen)
    // 2) reponer hasta el piso, con buena distribución (sin amontonar)
    const min = Math.ceil(this.level.size * 1.2)
    const add = ensureMinOperators(grid, this.gen, min)
    const changed = [...strand, ...add]
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
    // Modo relax: no hay reloj, así que las estrellas premian la PRECISIÓN (cuántos
    // movimientos fallados = intentos gastados). 3★ sin fallar, 2★ hasta 3, 1★ completar.
    const maxTries = this.level.tries ?? MAX_TRIES
    const stars = this.relax
      ? (completed ? (this.tries >= maxTries ? 3 : this.tries >= maxTries - 3 ? 2 : 1) : 0)
      : starsFor(this.level, { completed, timeLeft: this.timeLeft, totalTime: START_TIME })
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
    const h = findHintFallback(grid, this.targets, this.md, this.mo)
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
    const line = [...findMatchesMulti(g, this.targets, this.md, this.mo)].map((k) => {
      const [r, c] = k.split(',').map(Number); return toCurrent({ r, c })
    })
    this.board.hint(h.a, h.b, line)
    if (manual) {
      this.hintsLeft = setHintPool(this.hintsLeft - 1)   // descuenta del POOL GLOBAL (persiste)
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
    this.hooks.setMode?.({ relax: this.relax, accum: !!this.accum })
    this.hooks.setAccum?.(this.accum ? { total: this.accumTotal, start: this.accum.start, goal: this.accum.goal } : null)
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
