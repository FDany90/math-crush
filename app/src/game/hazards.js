// ====================================================================
// HAZARDS / mecánicas de JEFE (estados de casillero y ataques). Se separaron del
// controller para que sea legible y escalable: agregar un jefe/mecánica nueva vive acá.
// Son métodos de INSTANCIA del Controller: se enchufan a su prototype con Object.assign
// (ver controller.js), así comparten `this` (board, hooks, level, flags) sin prop-drilling.
//   Pendiente (al hacer el jefe −): evolucionar a un registro/estrategia de hazards. Ver DISEÑO §18.
// ====================================================================
import { countTargetMoves, lineFormsTarget } from './logic.js'

const BOSS_FREEZE_MS = 10000 // cada cuánto ataca el jefe (congela fichas)
const BOSS_FREEZE_N = 3       // cuántas fichas congela por ataque
const INFEST_MS = 15000      // cada cuánto sube el frente de la infestación de + (fila nueva)
const SCATTER_MS = 10000     // cada cuánto el jefe Suma (fase 1) esparce + aislados

export const hazardMethods = {
  // BATALLA DE JEFE: el valor formado le baja HP al jefe; se gana al dejarlo en 0. El
  // movimiento VISIBLE de la barra de HP lo dispara onCuenta al llegar las fichas (absorción).
  _addBoss(value) {
    this.bossHp = Math.max(0, this.bossHp - value)
    this.left = this.bossHp   // dispara la victoria por los checks existentes de left<=0
  },

  // JEFE SUMA de 2 fases (se llama en _afterMove, con el tablero ya asentado): según el % de HP,
  // FASE 1 hace crecer el tablero por umbrales (5×5→expandTo, repartidos entre 100% e infestAt) y
  // FASE 2 arranca la infestación al cruzar infestAt. Ver DISEÑO §18.6.2.
  _bossPhaseCheck() {
    const b = this.boss
    if (!b || this.ended) return
    const frac = this.bossHpMax ? this.bossHp / this.bossHpMax : 0
    const infestAt = b.infestAt ?? 0
    // FASE 1 — EXPANSIÓN: agrega de a UNO (fila, luego columna, alternando) en cada umbral de 10%
    // hasta `expandTo`. De 5×5 a 7×7 = 4 pasos (+fila,+col,+fila,+col), repartidos en (infestAt, 1].
    if (b.expandTo) {
      const adds = Math.max(0, (b.expandTo - this.level.size) * 2)   // filas + columnas a agregar
      for (let k = 1; k <= adds; k++) {
        const thr = 1 - (1 - infestAt) * (k / (adds + 1))
        if (frac <= thr && this._grownCount < k) {
          this._grownCount = k
          if (k % 2 === 1) this.board.addRow(this.gen.randTile)      // impar = fila abajo
          else this.board.addCol(this.gen.randTile)                  // par = columna derecha
          this.board.shake(8)
          this.hooks.toast?.('🟩 ¡El tablero crece!')
          if (this.fixedTargets != null) this._healFixedBoard()      // re-saneo target-rich en el nuevo tamaño
          if (!this._coachedExpand) {
            this._coachedExpand = true
            this._coach([{ text: '¡El Rey + agranda el tablero! 🟩 Va sumando filas y columnas para complicarla. Seguí bajándole la vida.' }])
          }
        }
      }
    }
    // FASE 2 — INFESTACIÓN: al cruzar infestAt (ej. 50% HP) empiezan a subir los +.
    if (b.infestAt != null && frac <= b.infestAt && !this._infestStarted) {
      this._infestStarted = true
      this.infest = true
      this._infestRise()      // la PRIMERA fila apenas llega al 50%
      this._startInfest()     // y sigue subiendo una fila cada INFEST_MS (15s)
      if (!this._coachedInfest) {
        this._coachedInfest = true
        this._coach([{ text: '¡El Rey + se cansó y quiere hacerte perder! Ahora sube FILAS enteras. ¡Apurate a derrotarlo antes de que tape el tablero!' }])
      }
    }
  },

  // ---------- ataques del jefe: CONGELAR (estados de casillero) ----------
  // Loop propio del jefe (no es el reloj del jugador): cada BOSS_FREEZE_MS intenta un ataque.
  _startBossAttacks() {
    if (!this.boss || this._bossAtkId) return
    this._bossAtkId = setTimeout(() => this._bossTick(), BOSS_FREEZE_MS)
  },
  _bossTick() {
    this._bossAtkId = null
    if (this.ended) return
    // no atacar si el tablero está ocupado (cascada) o hay un mensaje del coach: se reprograma
    if (this.started && !this.busy && !this.coachActive) this._bossAttack()
    this._bossAtkId = setTimeout(() => this._bossTick(), BOSS_FREEZE_MS)
  },
  // ATAQUE "congelar": congela hasta BOSS_FREEZE_N fichas libres AL AZAR. SIN guardrail: el
  // jefe PUEDE congelar todo. Si te deja sin ninguna jugada, perdés (→ "descongelar todo").
  _bossAttack() {
    const blocked = this.board.cellsWithState()
    const chars = this.board.gridChars()
    const isOp = ({ r, c }) => ['+', '−', '×', '÷'].includes(chars[r]?.[c])
    const cands = []
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) if (!blocked.has(r + ',' + c)) cands.push({ r, c })
    // barajar (Fisher-Yates; fuera de workflow, Math.random OK)
    for (let i = cands.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[cands[i], cands[j]] = [cands[j], cands[i]] }
    const toFreeze = cands.slice(0, BOSS_FREEZE_N)
    // SIEMPRE congelar al menos 1 OPERADOR (si hay libre): así el ataque estorba de verdad
    // (sin operadores no se pueden armar cuentas en esa zona), no sólo dígitos sueltos.
    if (toFreeze.length && !toFreeze.some(isOp)) {
      const op = cands.find(isOp)
      if (op) toFreeze[toFreeze.length - 1] = op
    }
    if (toFreeze.length) {
      this.board.applyState(toFreeze, 'frozen')
      this.board.shake(8)
      this.hooks.toast?.('❄️ ¡El jefe congeló ' + toFreeze.length + ' ficha' + (toFreeze.length > 1 ? 's' : '') + '!')
      // Primera congelada del juego: explicá el ataque (una sola vez).
      if (!this.ended && !this._alreadyCoached('math_coached_freeze')) {
        this._coach([{ text: 'El Rey ' + (this.level.ops?.[0] ?? '+') + ' CONGELA fichas ❄️. Las que tienen hielo no se pueden usar ni mover. Formá una cuenta al lado para romper el hielo 💥.' }])
      }
    }
    this._bossCheckStuck()   // ¿te dejó sin movimientos? → perdés
  },
  // si el jefe te dejó SIN ninguna jugada usable, perdés (reason 'frozen'); el reintento
  // ("descongelar todo") rompe el hielo y seguís.
  _bossCheckStuck() {
    if (!this.boss || this.ended || this.busy) return
    if (!countTargetMoves(this.board.gridCharsMasked(), this.targets, this.md, this.mo, 1)) {
      this._endLevel(false, 'frozen')
    }
  },
  // rompe TODOS los estados del tablero (para el reintento: "romper el hielo")
  _breakAllStates() {
    const cells = [...this.board.cellsWithState()].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c } })
    if (cells.length) this.board.clearState(cells)
  },
  // una cuenta descongela (rompe el estado de) las fichas ortogonalmente adyacentes a sus celdas
  _breakStatesNear(cells) {
    const blocked = this.board.cellsWithState()
    if (!blocked.size) return
    const toBreak = []
    for (const { r, c } of cells)
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (r + dr) + ',' + (c + dc)
        if (blocked.has(k)) { toBreak.push({ r: r + dr, c: c + dc }); blocked.delete(k) }
      }
    if (toBreak.length) this.board.clearState(toBreak)
  },

  // ---------- INFESTACIÓN de + (escenario/jefe Suma) ----------
  // Loop propio: cada INFEST_MS el frente de + sube UNA fila (una celda por columna). Los +
  // infestados se pueden usar a mano pero son INMUTABLES para el mantenimiento (tienen estado, y
  // _healFixedBoard ya excluye las celdas con estado al aplicar). Ver DISEÑO §18.6/§18.6.1.
  _startInfest() {
    if (!this.infest || this._infestId) return
    this._infestId = setTimeout(() => this._infestTick(), INFEST_MS)
  },
  _infestTick() {
    this._infestId = null
    if (this.ended) return
    if (this.started && !this.busy && !this.coachActive) this._infestRise()
    this._infestId = setTimeout(() => this._infestTick(), INFEST_MS)
  },
  // sube el frente: en cada columna infesta la celda LIBRE más abajo (llena de abajo hacia arriba;
  // salta las ya infestadas —incluidas las esparcidas de la fase 1—). No pisa fichas con otro estado.
  _infestRise() {
    const toInfest = []
    for (let c = 0; c < this.board.cols; c++) {
      for (let r = this.board.rows - 1; r >= 0; r--) {
        const t = this.board.tiles[r]?.[c]
        if (!t) continue
        if (t.state === 'infested') continue      // ya infestada: seguir subiendo
        if (t.state) break                          // otro estado (raro): no invadir esta columna
        toInfest.push({ r, c }); break              // primera libre desde abajo → infestar
      }
    }
    if (toInfest.length) { this.board.applyInfest(toInfest); this.board.shake(5) }
    this._infestCheckLoss()
  },

  // ---------- FASE 1 del jefe Suma: esparcir + AISLADOS ----------
  // Cada SCATTER_MS convierte 2 fichas al azar en un '+' (inmutable, con animación notoria). Elige
  // sólo posiciones donde poner el + NO forma una cuenta (para no regalar jugadas). Evita la fila 0
  // (que la reserve el frente de la fase 2). Se detiene al arrancar la fase 2.
  _startScatter() {
    if (this._scatterId) return
    this._scatterId = setTimeout(() => this._scatterTick(), SCATTER_MS)
  },
  _scatterTick() {
    this._scatterId = null
    if (this.ended || this._infestStarted) return   // fase 2: para el scatter (sube el frente)
    if (this.started && !this.busy && !this.coachActive) this._scatterPlus(2)
    this._scatterId = setTimeout(() => this._scatterTick(), SCATTER_MS)
  },
  _scatterPlus(n = 2) {
    const grid = this.board.gridChars()
    const cands = []
    for (let r = 1; r < this.board.rows; r++) for (let c = 0; c < this.board.cols; c++) {  // r>=1: no la fila 0
      const t = this.board.tiles[r]?.[c]
      if (!t || t.state || grid[r][c] === '+') continue
      const orig = grid[r][c]; grid[r][c] = '+'
      const forms = lineFormsTarget(grid, r, c, this.targets, this.md, this.mo)   // no formar cuenta al poner el +
      grid[r][c] = orig
      if (!forms) cands.push({ r, c })
    }
    for (let i = cands.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[cands[i], cands[j]] = [cands[j], cands[i]] }
    const pick = cands.slice(0, n)
    if (pick.length) {
      this.board.applyInfest(pick)
      if (!this._coachedScatter) {
        this._coachedScatter = true
        this._coach([{ text: 'El Rey + empieza a ensuciar el tablero con signos +. Se van acumulando… ¡usalos en tus sumas!' }])
      }
    }
  },
  // perdés cuando la fila de arriba (row 0) queda TODA infestada (la marea de + llegó al techo)
  _infestCheckLoss() {
    if (!this.infest || this.ended) return
    for (let c = 0; c < this.board.cols; c++) if (!this.board.isInfested(0, c)) return
    this._endLevel(false, 'flooded')
  },
}
