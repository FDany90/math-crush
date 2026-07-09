// ====================================================================
// Controlador: juega UN nivel (escenario). Objetivo inteligente (siempre
// resoluble en un movimiento), límite de movidas, fin con estrellas.
// ====================================================================
import {
  newGrid, tidyBoard, ensureMinOperators, findEquationCells, findTargetCellsMulti,
  findMatchesMulti, findHintFallback, adjacent, destrandOperators,
  findTargetSegments, findComboMove,
} from './logic.js'
import { getLevel, makeGen, randTarget, starsFor, symbolAllowed } from './levels.js'
import { hazardMethods } from './hazards.js'   // métodos de jefe/hazards (mixin sobre el prototype)
import { maintenanceMethods } from './boardMaintenance.js'   // _healFixedBoard/_pickTargets (mixin)

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
const MAX_TRIES = 5      // intentos (vidas): cada movimiento que NO forma cuenta resta 1
const MAX_HINTS_POOL = 10 // tope del pool GLOBAL de pistas (se acumulan entre niveles)
const START_HINTS = 5     // pistas con las que arranca un jugador nuevo
const HINTS_KEY = 'math_hints'
const MAX_CONTINUES = 2  // veces que se puede "seguir con +1 min" al perder
const CONTINUE_TIME = 60 // segundos que da cada "+1 min"
const GOAL_NORMAL = 100  // meta de la barra en niveles normales: sumando el VALOR formado
                         // (contás de N en N) hasta 100. SIN reloj (se pierde sólo por intentos).
                         // Los JEFES usan su propio HP (no esto). Tuneable por nivel con `goal`.
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
    this.timed = this.level.timed ?? false // reloj: por defecto SIN tiempo (se gana llenando la barra)
    this.startTime = this.level.time ?? START_TIME  // segundos de reloj (override por nivel con `time`)
    this.switched = false                  // twist targetTo: ¿ya cambió el objetivo?
    // MODO ACUMULATIVO: en vez de quota, formás cualquiera de los objetivos y su VALOR
    // suma/resta a un total; ganás al alcanzar la meta. { start, goal }.
    this.accum = this.level.accum || null
    this.accumTotal = this.accum ? this.accum.start : 0
    this.accumDir = this.accum ? (this.accum.goal >= this.accum.start ? 1 : -1) : 0
    // BATALLA DE JEFE (hitos, versión base): el objetivo es un JEFE con HP que arranca lleno
    // y baja por el VALOR formado (daño = valor). Se gana al dejarlo en 0. `boss: { hp }`.
    this.boss = this.level.boss || null
    this.bossHpMax = this.boss ? this.boss.hp : 0
    this.bossHp = this.bossHpMax
    // INFESTACIÓN de + (escenario/jefe Suma): los + suben desde abajo hasta tapar el tablero.
    // Reutilizable en cualquier nivel con `infest: true`. Ver DISEÑO §18.6.
    this.infest = !!this.level.infest
    // REY + de 2 fases: contadores de expansión + arranque de la infestación (fase 2).
    this._grownCount = 0                   // cuántas veces creció el tablero (fase 1)
    this._infestStarted = false            // ya arrancó la infestación (fase 2)
    // REY − de 2 fases: encoge (fase 1) + borrón de signos (fase 2).
    this._shrunkCount = 0                  // cuántas veces se achicó el tablero (fase 1)
    this._eraseStarted = false             // ya arrancó el borrón (fase 2)
    this._erasing = false                  // loop de borrado activo
    this._noReplenish = false              // deja de reponer signos (fase 2 del Rey −)
    // cinemáticas de cambio de fase del jefe (una vez POR PARTIDA). Los ataques individuales
    // ya no tienen coach: el telegrafiado (embestida + proyectiles) los explica visualmente.
    this._coachedInfest = false            // cinemática de furia al arrancar la fase 2 (Rey +)
    this._coachedErase = false             // cinemática de furia al arrancar el borrón (Rey −, fase 2)
    this.ended = false
    this.busy = false
    this.started = false
    // telegrafiado de ataques del jefe: invalidar cualquier animación pendiente de la partida anterior
    this._telegraphing = false
    this._teleSeq = (this._teleSeq || 0) + 1
    this._eraseCount = 0                   // rotación del borrón del Rey − (2 números : 1 signo)
    // BARRA de objetivo: en modo normal hay UNA sola barra que suma el VALOR del resultado
    // formado (contás "de N en N", ej sumar 5 → 5,10,15…) hasta GOAL_NORMAL (1000). Cualquier
    // objetivo (en el doble) cuenta al mismo total. Override por nivel con `goal`.
    // El acumulativo/jefe (hitos 10/20/30/40) tienen su propia barra.
    this.goalNeed = (this.accum || this.boss) ? 0 : (this.level.goal ?? GOAL_NORMAL)
    this.goalDone = 0
    this.left = this.boss ? this.bossHp                       // jefe: HP restante
      : this.accum ? (this.level.quota ?? 6)
      : this.goalNeed                                         // barra normal: lo que falta

    this.tries = this.level.tries ?? MAX_TRIES   // intentos restantes
    this.hintsLeft = getHintPool()         // pistas del POOL GLOBAL (persiste entre niveles)
    this.continues = 0                     // veces que ya usó "+1 min"
    this.coachedFirstCuenta = false        // ya se mostró el coach de "cuentas restantes" (nivel 2)
    this.coachedTutorialFirst = false      // ya se mostró el 2do paso del tutorial (nivel 1)
    this.coachActive = false               // hay un mensaje del coach en pantalla (pausa pistas/manito)
    this._pendingComboGuide = false        // hay que telegrafiar una jugada de 2 operadores (tutorial súper)
    this._coachedFreeze = false            // ya se explicó el ataque CONGELAR del jefe (una vez POR PARTIDA)
    this.moves = 0                         // movimientos hechos (para límite de pistas)
    this.autoHintCount = 0                 // pistas automáticas ya mostradas
    this.combo = 0
    this.timeLeft = this.startTime
    this.deadline = 0
    this.timerOn = false
    if (this.timerId) clearTimeout(this.timerId)
    if (this._bossAtkId) { clearTimeout(this._bossAtkId); this._bossAtkId = null }   // ataques del jefe
    if (this._infestId) { clearTimeout(this._infestId); this._infestId = null }      // frente de infestación
    if (this._scatterId) { clearTimeout(this._scatterId); this._scatterId = null }   // + aislados (Rey +)
    if (this._eraseId) { clearTimeout(this._eraseId); this._eraseId = null }         // borrón de − (Rey −)
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
      this._coach([{ text: 'Mové las fichas para formar el número de arriba.', highlight: 'target' }])
    } else if (this.boss) {
      // JEFE: SOLO la presentación estilo videojuego (cinemática ~3s). Sin coach explicativo —
      // el jefe se entiende visualmente: HP baja al absorber fichas, ataques telegrafiados con
      // embestida + proyectiles, y el signo del HUD está vivo (idle/furia).
      this._coach([{ cine: 'intro', sign: this.level.ops?.[0] ?? '+' }])
    } else if (this.level.superTile && this._coachOnce('math_coached_super')) {
      // TUTORIAL de SÚPER FICHA: UNA sola vez en todo el juego (playtest 2026-07-09: se repetía
      // en el nivel siguiente y sobraba texto). Mensaje mínimo + manito guía sobre una jugada
      // de 2 operadores YA preparada al cerrarlo; la súper ficha se aprende usándola.
      this._pendingComboGuide = true
      this._coach([{ text: 'Podés formar cuentas con 2 operadores.', highlight: 'target' }])
    } else if (this.level.orderCoach) {
      // SOLO en el 1er nivel de una operación NO conmutativa (resta/división): el ORDEN importa.
      // En el resto NO se muestra (ya se entiende por las flechas, que sí van en todos). Se aclara
      // la DIRECCIÓN —no el tamaño—: más adelante habrá negativos donde el grande NO va primero.
      this._coach([{ text: 'Ojo: acá el ORDEN importa. La cuenta se arma en el sentido de las flechas: → de izquierda a derecha, ↓ de arriba a abajo.' }])
    }
    // ELEGÍ TU OBJETIVO (twist `choose`): antes de jugar, el picker (overlay en App) deja
    // elegir los números a formar. coachActive bloquea pistas/manito mientras está abierto.
    if (this.level.choose) {
      this.coachActive = true
      this._clearAutoHint()
      this.hooks.chooseTarget?.({ pool: this.level.choose.pool, max: this.level.choose.max ?? 2 })
    }
    this._startAutoHint()
  }

  // ¿primera vez que se muestra este coach? (marca localStorage y devuelve true solo la 1ra vez)
  _coachOnce(key) {
    try {
      if (localStorage.getItem(key)) return false
      localStorage.setItem(key, '1')
      return true
    } catch { return true }
  }

  // ELEGÍ TU OBJETIVO: el jugador confirmó en el picker. Rearma el nivel alrededor de lo
  // elegido: objetivos fijos, generador sesgado, meta escalada (goalFactor × promedio elegido
  // ≈ mismas cuentas elijas números chicos o grandes) y tablero nuevo target-rich.
  applyChosenTargets(nums) {
    this.coachActive = false
    if (this.ended || !this.level.choose || !nums?.length) { this._startAutoHint(); return }
    const chosen = [...new Set(nums.map(Number))].slice(0, this.level.choose.max ?? 2)
    this.level = { ...this.level, target: chosen }
    this.fixedTargets = [...chosen]
    this.gen = makeGen(this.level, this.cfg)
    const f = this.level.choose.goalFactor
    if (f) {
      this.goalNeed = Math.round((f * chosen.reduce((a, b) => a + b, 0)) / chosen.length)
      this.left = Math.max(0, this.goalNeed - this.goalDone)
    }
    this._rebuild()
    this._pickTargets()
    this._pushHud()
    this._startAutoHint()
  }

  // ---------- temporizador ----------
  _ensureStarted() {
    if (this.started || this.ended) return
    this.started = true
    this.board.hideHandGuide()              // el jugador ya tomó el control: fuera la manito
    // Cada jefe arranca su ataque (registro BOSS_KINDS): + esparce, − no arranca loop (encoge por
    // movimiento), × ÷ congelan. Ver hazards.js.
    if (this.boss) this._bossStartAttacks()
    if (this.infest) this._startInfest()    // arranca a subir el frente de + (escenario Suma standalone)
    if (this.relax || !this.timed) return   // sin reloj (por defecto): se gana llenando la barra
    this.deadline = Date.now() + this.startTime * 1000
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
    if (this.relax || !this.timed) return   // niveles sin reloj: reanudar NO debe arrancar timer
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
    // tras cerrar el coach del tutorial de súper ficha: dejar la manito sobre una jugada de 2 operadores
    if (this._pendingComboGuide) this._showComboGuide()
  }
  // manito guía sobre una jugada de 2 OPERADORES ya preparada (tutorial de súper ficha)
  _showComboGuide() {
    if (this.ended) return
    const h = findComboMove(this.board.gridCharsMasked(), this.targets, this.md)
    if (h) this.board.showHandGuide(h.a, h.b)
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

  // ---- Mantenimiento del tablero target-rich (_healFixedBoard) y elección de objetivos
  //      (_pickTargets) → viven en game/boardMaintenance.js (mixin, ver Object.assign al final). ----

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
      const h = findHintFallback(this.board.gridCharsMasked(), this.targets, this.md, this.mo)
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
    this._pendingComboGuide = false   // ya interactuó: no volver a telegrafiar la jugada de 2 operadores
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
    // si no forma cuenta, vuelve para atrás y cuesta un intento (anti prueba-y-error).
    // gridCharsMasked ignora fichas con estado bloqueante (hielo, etc.): no cuentan en cuentas.
    if (!findMatchesMulti(this.board.gridCharsMasked(), this.targets, this.md, this.mo).size) {
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
    this._bossCheckStuck()          // ¿el hielo dejó el tablero sin jugadas? → perdés
    if (this.boss) this._bossPhaseCheck()   // jefe Suma: expansión (fase 1) / infestación (fase 2)
    // Fichas especiales (súper/bomba): SIN coach al crearlas — se aprenden solas (decisión
    // 2026-07-06: el look especial + el efecto al usarlas enseñan mejor que un cartel).
    if (consumed.size > 0 && this._maybeSwitchTarget()) return   // el objetivo cambió: coach + pausa
    // Tutorial (nivel 1): 2do paso, recién DESPUÉS del primer acierto (no todo junto al arrancar).
    if (this.tutorial && consumed.size > 0 && !this.coachedTutorialFirst) {
      this.coachedTutorialFirst = true
      this._coach([{ text: '¡Así se hace! Llená la barra formando el resultado una y otra vez.', highlight: 'glass' }])
      return   // coachDismissed() retoma la manito automática al cerrar el mensaje
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
      const grid = this.board.gridChars()               // chars reales (para volar fichas)
      const mgrid = this.board.gridCharsMasked()         // enmascarada: fichas con estado = pared
      const eq = findEquationCells(mgrid, this.md)
      const tg = findTargetCellsMulti(mgrid, this.targets, this.md, this.mo)
      const all = new Set([...eq, ...tg.cells])
      if (all.size === 0) break

      // ---- SÚPER FICHA (mecánica tipo Candy Crush; ver _resolve más abajo makeSuper) ----
      let superSpawn = []
      let crossSum = 0
      let detonated = false
      if (this.level.superTile) {
        // DETONAR: si una súper ficha participa de esta cuenta, explota en CRUZ (fila + columna).
        const crossKeys = new Set()   // celdas NUEVAS que rompe la cruz (no las de la cuenta)
        for (const key of [...all]) {
          const [r, c] = key.split(',').map(Number)
          if (this.board.isSuper(r, c)) {
            detonated = true
            this.board.superCross(r, c)
            for (let cc = 0; cc < this.board.cols; cc++) { const k = r + ',' + cc; if (!all.has(k)) crossKeys.add(k); all.add(k) }
            for (let rr = 0; rr < this.board.rows; rr++) { const k = rr + ',' + c; if (!all.has(k)) crossKeys.add(k); all.add(k) }
          }
        }
        if (detonated) this.board.shake(11)   // sacudida de la explosión en cruz
        // BONUS: la cruz SUMA el valor de TODOS los números que rompe (fila + columna enteras).
        for (const key of crossKeys) {
          const [r, c] = key.split(',').map(Number)
          const ch = grid[r]?.[c]
          if (ch && ch >= '0' && ch <= '9') crossSum += Number(ch)   // sólo números (no operadores)
        }
        if (crossSum > 0) this.hooks.toast?.('💥 ¡Cruz! +' + crossSum + ' puntos')
        // GENERAR: una cuenta con 2 operadores deja una súper ficha '+' (se conserva 1 operador).
        for (const seg of findTargetSegments(mgrid, this.targets, this.md, this.mo)) {
          if (seg.ops < 2) continue
          const opCell = seg.cells.find(({ r, c }) => ['+', '−', '×', '÷'].includes(grid[r]?.[c]) && !this.board.isSuper(r, c))
          if (opCell) superSpawn.push(opCell)
        }
        for (const { r, c } of superSpawn) all.delete(r + ',' + c)   // no limpiar: se vuelve súper
      }

      // ---- FICHA BOMBA 💣 ----
      // DETONAR: si una bomba participa de esta cuenta, EXPLOTA el 3×3 alrededor con violencia
      // (flash + onda + metralla: las piezas salen despedidas — ver Board.clear con `blasts`)
      // y suma a los puntos el valor de los números que rompe.
      let bombSum = 0
      const bombCenters = []
      for (const key of [...all]) {
        const [r, c] = key.split(',').map(Number)
        if (!this.board.isBomb(r, c)) continue
        bombCenters.push({ r, c })
        this.board.bombBlast(r, c)
        for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) {
          if (rr < 0 || cc < 0 || rr >= this.board.rows || cc >= this.board.cols) continue
          const k = rr + ',' + cc
          if (all.has(k)) continue
          all.add(k)
          const ch = grid[rr]?.[cc]
          if (ch && ch >= '0' && ch <= '9') bombSum += Number(ch)   // sólo números (no operadores)
        }
      }
      if (bombCenters.length) this.board.shake(17)                  // temblor FUERTE de explosión
      if (bombSum > 0) this.hooks.toast?.('💣 ¡BOOM! +' + bombSum + ' puntos')
      // GENERAR: DOS cuentas CONECTADAS (fila + columna) en el mismo paso → ficha bomba con el
      // OPERADOR del nivel. "Conectadas" = comparten una celda (cruz/T/L por la punta) O están
      // PEGADAS ortogonalmente (L sin celda compartida — bug de playtest: no se generaba).
      // También en CASCADAS/combos.
      let bombSpawn = null
      {
        const segs = findTargetSegments(mgrid, this.targets, this.md, this.mo)
        const isRow = (s) => s.cells.length >= 2 && s.cells[0].r === s.cells[1].r
        outer: for (const a of segs) for (const b of segs) {
          if (a === b || isRow(a) === isRow(b)) continue          // una fila + una columna
          const setA = new Set(a.cells.map(({ r, c }) => r + ',' + c))
          const shared = b.cells.find(({ r, c }) => setA.has(r + ',' + c))
          if (shared) { bombSpawn = shared; break outer }
          // L "pegada": ninguna celda compartida, pero una ficha de A toca una de B
          for (const pa of a.cells) for (const pb of b.cells) {
            if (Math.abs(pa.r - pb.r) + Math.abs(pa.c - pb.c) === 1) { bombSpawn = pa; break outer }
          }
        }
        if (bombSpawn) {
          const k = bombSpawn.r + ',' + bombSpawn.c
          // no convertir si esa celda ya es especial o va a ser súper
          if (this.board.isSuper(bombSpawn.r, bombSpawn.c) || this.board.isBomb(bombSpawn.r, bombSpawn.c) ||
            superSpawn.some(({ r, c }) => r + ',' + c === k)) bombSpawn = null
          else all.delete(k)                                       // no limpiar: se vuelve bomba
        }
      }

      combo++; this.combo = combo
      // cuentas por SEGMENTO (no por valor distinto): formar el objetivo 2 veces en un
      // movimiento cuenta 2.
      const cuentas = tg.segs + (eq.size > 0 ? 1 : 0)
      const deliberate = combo === 1                        // combo 1 = jugada del jugador; 2+ = cascada por piezas nuevas
      tg.hit.forEach((v) => consumed.add(v))
      if (tg.hit.size) this.hooks.targetHit?.([...tg.hit])   // avisar qué objetivo se logró
      // TODA cuenta suma al PROGRESO (la barra sube por el VALOR formado), sea jugada del
      // jugador o combo. Ya NO se suma tiempo por cuenta (el reloj sólo cuenta hacia atrás).
      // En "Fiebre de combos" (comboFever) el combo suma DOBLE valor.
      // barra = valor de la cuenta (+ x2 en comboFever) + BONUS de la cruz (súper ficha).
      const barAdd = ((!deliberate && this.level.comboFever) ? tg.sum * 2 : tg.sum) + crossSum + bombSum
      const dec = (!deliberate && this.level.comboFever) ? cuentas * 2 : cuentas
      if (cuentas > 0) {
        // Se actualiza el total INTERNO (para la victoria); el llenado VISIBLE de la barra
        // se sincroniza con la absorción de las fichas (ver onCuenta → bar, más abajo).
        if (this.boss) this._addBoss(barAdd)        // jefe: el VALOR formado le baja HP
        else if (this.accum) this._addAccum(tg.sum) // acumulativo: suma/resta el VALOR formado
        else this._addGoal(barAdd)                  // barra normal: suma el VALOR formado
        if (!deliberate) this.hooks.toast?.(this.level.comboFever
          ? '¡Combo DOBLE! +' + dec + ' cuentas 🔥'
          : '¡Combo! +' + cuentas + ' cuenta' + (cuentas > 1 ? 's' : '') + ' 🔥')
      }

      const cells = [...all].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c } })
      // banda "alrededor de la jugada": columnas de la cuenta del jugador ± 1 (para sembrar ahí)
      if (deliberate) playedCols = new Set(cells.flatMap(({ c }) => [c - 1, c, c + 1]))
      const ctr = this.board.cellsCenter(cells)

      await this.board.highlight(cells, detonated)   // resaltar antes de explotar (épico si detonó súper)
      this.board.popup(ctr.x, ctr.y, combo > 1 ? '¡combo x' + combo + '! +' + barAdd : '+' + barAdd)
      // TODA cuenta vuela a la barra; el LLENADO (números + barra) se aplica al llegar las
      // fichas (absorción), pasando el nuevo estado en `bar` para que la UI lo sincronice.
      if (cuentas > 0) this.hooks.onCuenta?.({
        cells: cells.map(({ r, c }) => ({ r, c, ch: grid[r]?.[c] })),
        rows: this.board.rows, cols: this.board.cols, value: [...tg.hit][0],
        bar: this.boss
          ? { boss: { hp: this.bossHp, max: this.bossHpMax } }
          : this.accum
            ? { accum: { total: this.accumTotal, start: this.accum.start, goal: this.accum.goal } }
            : { goal: { need: this.goalNeed, done: this.goalDone } },
      })
      // ROMPER estados por CONTACTO: una cuenta descongela las fichas adyacentes (antes de
      // colapsar, con las posiciones aún válidas). Así se destraba el tablero jugando cerca.
      if (this.boss) this._breakStatesNear(cells)   // jugar cerca rompe el hielo del jefe (la infestación NO se rompe)
      await this.board.clear(cells, bombCenters)   // con bombas: las piezas del 3×3 salen DESPEDIDAS
      // GENERAR súper ficha: convertir el operador conservado ANTES del colapso (aún en su celda);
      // la ficha ya súper cae con el colapso conservando su estado.
      // Fichas especiales SIN coach ni explicación: el look (aura + latido) y probarlas enseñan solos.
      if (superSpawn.length) {
        for (const { r, c } of superSpawn) this.board.makeSuper(r, c)
        this.hooks.toast?.('✨ ¡Súper ficha!')
      }
      if (bombSpawn) {
        this.board.makeBomb(bombSpawn.r, bombSpawn.c, this.level.ops?.[0] ?? '+')   // bomba del operador del nivel (resta → '−')
        this.hooks.toast?.('💣 ¡Ficha bomba!')
      }
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

  // BARRA de objetivo: suma el VALOR formado al progreso (cap a goalNeed). `v` ya trae el
  // x2 de comboFever. `left` = lo que falta. El llenado VISIBLE lo dispara onCuenta al
  // llegar las fichas (para que coincida con la absorción), no acá.
  _addGoal(v) {
    this.goalDone = Math.min(this.goalNeed, this.goalDone + v)
    this.left = Math.max(0, this.goalNeed - this.goalDone)
  }

  // ---- Métodos de JEFE / HAZARDS (freeze, infestación, scatter, fases) → viven en
  //      game/hazards.js y se enchufan al prototype con Object.assign al final del archivo. ----

  // MODO ACUMULATIVO: suma (o resta) el valor formado al total; gana al alcanzar la meta.
  // El movimiento VISIBLE de la barra lo dispara onCuenta al llegar las fichas (absorción).
  _addAccum(value) {
    this.accumTotal += this.accumDir * value
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
        this._coach([{ text: '¡Ups! Ese movimiento no formó una cuenta. Cada error gasta una barra. Te quedan ' + this.tries + ' — ¡pensá bien antes de mover!', highlight: 'lives' }])
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
    const min = Math.ceil(this.board.cols * 1.2)
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
    if (this._bossAtkId) { clearTimeout(this._bossAtkId); this._bossAtkId = null }
    if (this._infestId) { clearTimeout(this._infestId); this._infestId = null }
    if (this._scatterId) { clearTimeout(this._scatterId); this._scatterId = null }
    if (this._eraseId) { clearTimeout(this._eraseId); this._eraseId = null }
    // Sin reloj (por defecto o relax): las estrellas premian la PRECISIÓN (movimientos
    // fallados = intentos gastados). 3★ sin fallar, 2★ hasta 3, 1★ completar. Con reloj:
    // por velocidad (timeLeft).
    const maxTries = this.level.tries ?? MAX_TRIES
    const stars = (!this.timed || this.relax)
      ? (completed ? (this.tries >= maxTries ? 3 : this.tries >= maxTries - 3 ? 2 : 1) : 0)
      : starsFor(this.level, { completed, timeLeft: this.timeLeft, totalTime: this.startTime })
    this._pushInventory()
    this.hooks.onLevelEnd({
      index: this.levelIndex, completed, reason, stars,
      quota: this.level.quota ?? 6, left: this.left,
      timeLeft: Math.max(0, this.timeLeft),
      continuesLeft: MAX_CONTINUES - this.continues,   // cuántos reintentos quedan
      boss: !!this.boss, timed: this.timed,            // para el texto del reintento (romper hielo / +1 min)
    })
  }

  // ABANDONAR el nivel (salir al mapa sin ganar ni perder): frena TODO (reloj, ataques del
  // jefe, pistas, manito) sin disparar onLevelEnd. Si no, el loop del jefe sigue y termina
  // mostrando la derrota por "congelado" en el mapa.
  abandon() {
    this.ended = true
    this.timerOn = false
    this.busy = false
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null }
    if (this._bossAtkId) { clearTimeout(this._bossAtkId); this._bossAtkId = null }
    if (this._infestId) { clearTimeout(this._infestId); this._infestId = null }
    if (this._scatterId) { clearTimeout(this._scatterId); this._scatterId = null }
    if (this._eraseId) { clearTimeout(this._eraseId); this._eraseId = null }
    this._clearAutoHint()
    this.board.hideHandGuide()
    this.board.locked = false
    this.selected = null; this.board.select(null); this.activeBooster = null
  }

  // REINTENTO: el jugador perdió pero elige seguir. Repone intentos y reanuda el nivel.
  // En el JEFE, el reintento ROMPE TODO EL HIELO (no da tiempo). En niveles con reloj, suma
  // tiempo (legacy). En niveles sin reloj, sólo repone intentos. Máximo MAX_CONTINUES veces.
  resumeWithBonus() {
    if (!this.ended) return                            // el gate ahora es el CORAZÓN (en App)
    this.continues++
    this.hooks.onAddMinute?.(this.levelIndex)          // métrica
    this.ended = false
    this.busy = false
    this.board.locked = false
    if (this.tries <= 0) this.tries = this.level.tries ?? MAX_TRIES   // reponer intentos
    this.hooks.setTries?.({ left: this.tries, dec: false })
    this.started = true
    this.hooks.setOverlay({ show: false })             // cierra el pop-up de resultado
    if (this.boss) {
      this._bossRetry()                                // cada jefe repone lo suyo (hielo / infestación / signos)
    } else if (this.infest) {                          // escenario infest standalone (sin jefe)
      this._breakAllStates()
      this.hooks.toast?.('¡Limpiaste la invasión! Seguí sumando')
      this._startInfest()
    }
    if (this.timed && !this.relax) {                   // sólo niveles con reloj: sumar tiempo
      this.timerOn = true
      this.timeLeft = Math.max(0, this.timeLeft) + CONTINUE_TIME
      this.deadline = Date.now() + this.timeLeft * 1000
      this.hooks.setTime(this.timeLeft)
      this.hooks.addTime?.(CONTINUE_TIME)
      this._tick()
    }
    this._startAutoHint()
  }

  // ---------- pista ----------
  // manual = true → la pide el jugador con el botón (gasta 1 del cupo de 3).
  // manual = false → pista automática (no gasta cupo).
  hint(manual = true) {
    if (this.busy || this.ended) return
    if (manual && this.hintsLeft <= 0) return       // sin pistas disponibles
    const grid = this.board.gridCharsMasked()       // no sugerir fichas con estado (hielo, etc.)
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
    this.hooks.setMode?.({ relax: this.relax, accum: !!this.accum, boss: !!this.boss, timed: this.timed })
    this.hooks.setAccum?.(this.accum ? { total: this.accumTotal, start: this.accum.start, goal: this.accum.goal } : null)
    this.hooks.setBoss?.(this.boss ? { hp: this.bossHp, max: this.bossHpMax, sign: this.level.ops?.[0] ?? '+' } : null)
    this.hooks.setTime(this.timeLeft)
    this.hooks.setGoal?.({ need: this.goalNeed, done: this.goalDone })
    this.hooks.setTries?.({ left: this.tries, max: this.level.tries ?? MAX_TRIES, dec: false })
    this.hooks.setHints?.(this.hintsLeft)
  }
  _pushInventory() {
    this.hooks.setInventory(
      this.boosters.filter((b) => this._allowed(b))
        .map((b) => ({ id: b.id, label: b.label, n: b.n, active: this.activeBooster?.id === b.id }))
    )
  }
}

// Enchufa los métodos de jefe/hazards (freeze, infestación, scatter, fases) al prototype del
// Controller: viven en game/hazards.js pero corren como métodos de instancia (mismo `this`).
Object.assign(Controller.prototype, hazardMethods, maintenanceMethods)
