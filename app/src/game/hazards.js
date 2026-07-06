// ====================================================================
// HAZARDS / mecánicas de JEFE (estados de casillero y ataques). Separado del controller para que
// sea legible y escalable. Son métodos de INSTANCIA del Controller: se enchufan a su prototype con
// Object.assign (ver controller.js), así comparten `this` (board, hooks, level, flags).
//
// REGISTRO DE JEFES (BOSS_KINDS): cada jefe se identifica por su SIGNO (level.ops[0]) y define su
// comportamiento sin tocar el resto (Open/Closed). Un jefe puede tener:
//   startAttacks(ctrl) : qué loop de ataque arranca en el 1er movimiento (opcional; default = freeze)
//   phase(ctrl, frac)  : lógica POR MOVIMIENTO según el % de HP (expansión/encoge + disparo de fase 2)
//   onRetry(ctrl)      : qué repone el reintento (romper hielo / limpiar infestación / reponer signos)
//   stuckReason        : reason de derrota cuando el tablero queda sin jugadas ('frozen'|'erased'|…)
// Los jefes SIN entrada acá (× ÷) usan el ataque genérico: CONGELAR (freeze). Ver DISEÑO §18.
// ====================================================================
import { countTargetMoves, lineFormsTarget } from './logic.js'

const BOSS_FREEZE_MS = 10000 // cada cuánto ataca el jefe genérico (congela fichas)
const BOSS_FREEZE_N = 3       // cuántas fichas congela por ataque
const INFEST_MS = 15000      // cada cuánto sube el frente de la infestación de + (fila nueva)
const SCATTER_MS = 10000     // cada cuánto el Rey + (fase 1) esparce + aislados
const ERASE_MS = 9000        // cada cuánto el Rey − (fase 2) borra un signo −

// ---------- REGISTRO de jefes por signo ----------
export const BOSS_KINDS = {
  // EL REY + (Suma) — 2 fases: FASE 1 el tablero CRECE (5×5→expandTo) + esparce + aislados;
  // FASE 2 (desde infestAt) arranca la INFESTACIÓN de + que sube hasta tapar. NO usa freeze.
  '+': {
    startAttacks: (ctrl) => ctrl._startScatter(),   // fase 1: esparce + aislados cada 10s
    onRetry: (ctrl) => {
      ctrl._breakAllStates()                        // limpia TODA la infestación de +
      ctrl.hooks.toast?.('¡Limpiaste la invasión! Seguí sumando')
      if (ctrl.infest) ctrl._startInfest()
    },
    phase: (ctrl, frac) => {
      const b = ctrl.boss
      const infestAt = b.infestAt ?? 0
      // FASE 1 — EXPANSIÓN: agrega de a UNO (fila, luego columna, alternando) en cada umbral hasta
      // `expandTo`. De 5×5 a 7×7 = 4 pasos (+fila,+col,+fila,+col), repartidos en (infestAt, 1].
      if (b.expandTo) {
        const adds = Math.max(0, (b.expandTo - ctrl.level.size) * 2)
        for (let k = 1; k <= adds; k++) {
          const thr = 1 - (1 - infestAt) * (k / (adds + 1))
          if (frac <= thr && ctrl._grownCount < k) {
            ctrl._grownCount = k
            if (k % 2 === 1) ctrl.board.addRow(ctrl.gen.randTile)   // impar = fila abajo
            else ctrl.board.addCol(ctrl.gen.randTile)               // par = columna derecha
            ctrl.board.shake(8)
            ctrl.hooks.toast?.('🟩 ¡El tablero crece!')
            if (ctrl.fixedTargets != null) ctrl._healFixedBoard()  // re-saneo target-rich en el nuevo tamaño
            if (!ctrl._coachedExpand) {
              ctrl._coachedExpand = true
              ctrl._coach([{ text: '¡El Rey + agranda el tablero! 🟩 Va sumando filas y columnas para complicarla. Seguí bajándole la vida.' }])
            }
          }
        }
      }
      // FASE 2 — INFESTACIÓN: al cruzar infestAt (ej. 50% HP) empiezan a subir los +.
      if (b.infestAt != null && frac <= b.infestAt && !ctrl._infestStarted) {
        ctrl._infestStarted = true
        ctrl.infest = true
        ctrl._infestRise()      // la PRIMERA fila apenas llega al 50%
        ctrl._startInfest()     // y sigue subiendo una fila cada INFEST_MS
        if (!ctrl._coachedInfest) {
          ctrl._coachedInfest = true
          ctrl._coach([{ text: '¡El Rey + se cansó y quiere hacerte perder! Ahora sube FILAS enteras. ¡Apurate a derrotarlo antes de que tape el tablero!' }])
        }
      }
    },
  },

  // EL REY − (Resta) — el OPUESTO del Rey +: FASE 1 el tablero ENCOGE (size→shrinkTo, saca fila/columna
  // del borde); FASE 2 (desde eraseAt) empieza a BORRAR signos − (tachados permanentes). Si te deja
  // sin jugadas, perdés (reason 'erased') y el reintento repone los signos. Ver DISEÑO §18.1.
  '−': {
    stuckReason: 'erased',
    startAttacks: () => {},   // fase 1 (encoge) es por MOVIMIENTO (en phase); no hay loop al arrancar
    onRetry: (ctrl) => {
      ctrl._breakAllStates()                                    // los signos tachados vuelven a ser usables
      ctrl._noReplenish = false
      if (ctrl.fixedTargets != null) ctrl._healFixedBoard()     // repone una tanda sana de signos
      ctrl.hooks.toast?.('✏️ ¡Signos repuestos! Seguí atacando al Rey −')
      if (ctrl._erasing) { ctrl._noReplenish = true; ctrl._startErase() }   // y sigue borrando
    },
    phase: (ctrl, frac) => {
      const b = ctrl.boss
      const eraseAt = b.eraseAt ?? 0
      // FASE 1 — ENCOGER: saca de a UNO (fila abajo, luego columna derecha) en cada umbral, de `size`
      // a `shrinkTo`. De 7×7 a 5×5 = 4 pasos, repartidos en (eraseAt, 1]. El mantenimiento SIGUE ON
      // (tablero más chico pero jugable) hasta la fase 2.
      if (b.shrinkTo) {
        const steps = Math.max(0, (ctrl.level.size - b.shrinkTo) * 2)
        for (let k = 1; k <= steps; k++) {
          const thr = 1 - (1 - eraseAt) * (k / (steps + 1))
          if (frac <= thr && ctrl._shrunkCount < k) {
            ctrl._shrunkCount = k
            if (k % 2 === 1) ctrl.board.removeRow()   // impar = fila de abajo
            else ctrl.board.removeCol()               // par = columna derecha
            ctrl.board.shake(8)
            ctrl.hooks.toast?.('🧽 ¡El tablero se achica!')
            // NO re-sanear al achicar: sólo se sacan celdas del borde (no crea cuentas formadas), y
            // el próximo movimiento ya corre el mantenimiento normal → menos cambios de fichas de golpe.
            if (!ctrl._coachedShrink) {
              ctrl._coachedShrink = true
              ctrl._coach([{ text: '¡El Rey − achica el tablero! 🧽 Va quitando filas y columnas. ¡Seguí bajándole la vida!' }])
            }
          }
        }
      }
      // FASE 2 — BORRÓN: al cruzar eraseAt deja de reponer signos y arranca a tacharlos.
      if (b.eraseAt != null && frac <= b.eraseAt && !ctrl._eraseStarted) {
        ctrl._eraseStarted = true
        ctrl._erasing = true
        ctrl._noReplenish = true      // deja de reponer signos: ahora escasean de verdad
        ctrl._eraseSign()             // borra el primero al cruzar
        ctrl._startErase()            // y sigue cada ERASE_MS
        if (!ctrl._coachedErase) {
          ctrl._coachedErase = true
          ctrl._coach([{ text: '¡El Rey − se enoja y BORRA los signos −! 🧽 Quedan tachados y no se pueden usar. ¡Derrotalo antes de quedarte sin signos!' }])
        }
      }
    },
  },
}

export const hazardMethods = {
  // BATALLA DE JEFE: el valor formado le baja HP al jefe; se gana al dejarlo en 0. El movimiento
  // VISIBLE de la barra de HP lo dispara onCuenta al llegar las fichas (absorción).
  _addBoss(value) {
    this.bossHp = Math.max(0, this.bossHp - value)
    this.left = this.bossHp   // dispara la victoria por los checks existentes de left<=0
  },

  // ---------- despacho por tipo de jefe (registro BOSS_KINDS) ----------
  _bossKind() { return this.boss ? (BOSS_KINDS[this.level?.ops?.[0]] || null) : null },
  // arranca los ataques en el 1er movimiento (según el jefe; default = freeze genérico)
  _bossStartAttacks() {
    const k = this._bossKind()
    if (k?.startAttacks) k.startAttacks(this)
    else this._startBossAttacks()   // × ÷ (sin entrada propia): congelar
  },
  // lógica por movimiento (fases de expansión/encoge + disparo de la fase 2). Se llama en _afterMove.
  _bossPhaseCheck() {
    const k = this._bossKind()
    if (!k?.phase || this.ended) return
    k.phase(this, this.bossHpMax ? this.bossHp / this.bossHpMax : 0)
  },
  // reintento del jefe: cada uno repone lo suyo; los genéricos rompen el hielo y siguen congelando.
  _bossRetry() {
    const k = this._bossKind()
    if (k?.onRetry) { k.onRetry(this); return }
    this._breakAllStates()
    this.hooks.toast?.('¡Hielo roto! Seguí atacando al jefe ❄️💥')
    this._startBossAttacks()
  },

  // ---------- ataque genérico (× ÷): CONGELAR ----------
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
  // ATAQUE "congelar": congela hasta BOSS_FREEZE_N fichas libres AL AZAR. SIN guardrail: el jefe
  // PUEDE congelar todo. Si te deja sin ninguna jugada, perdés (→ "descongelar todo").
  _bossAttack() {
    const blocked = this.board.cellsWithState()
    const chars = this.board.gridChars()
    const isOp = ({ r, c }) => ['+', '−', '×', '÷'].includes(chars[r]?.[c])
    const cands = []
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) if (!blocked.has(r + ',' + c)) cands.push({ r, c })
    for (let i = cands.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[cands[i], cands[j]] = [cands[j], cands[i]] }
    const toFreeze = cands.slice(0, BOSS_FREEZE_N)
    // SIEMPRE congelar al menos 1 OPERADOR (si hay libre): así el ataque estorba de verdad.
    if (toFreeze.length && !toFreeze.some(isOp)) {
      const op = cands.find(isOp)
      if (op) toFreeze[toFreeze.length - 1] = op
    }
    if (toFreeze.length) {
      this.board.applyState(toFreeze, 'frozen')
      this.board.shake(8)
      this.hooks.toast?.('❄️ ¡El jefe congeló ' + toFreeze.length + ' ficha' + (toFreeze.length > 1 ? 's' : '') + '!')
      if (!this.ended && !this._coachedFreeze) {
        this._coachedFreeze = true
        this._coach([{ text: 'El Rey ' + (this.level.ops?.[0] ?? '+') + ' CONGELA fichas ❄️. Las que tienen hielo no se pueden usar ni mover. Formá una cuenta al lado para romper el hielo 💥.' }])
      }
    }
    this._bossCheckStuck()   // ¿te dejó sin movimientos? → perdés
  },

  // ---------- ataque del Rey − (fase 2): BORRAR signos − ----------
  // Loop propio: cada ERASE_MS tacha un signo − usable (permanente). El reintento los repone.
  _startErase() {
    if (!this._erasing || this._eraseId) return
    this._eraseId = setTimeout(() => this._eraseTick(), ERASE_MS)
  },
  _eraseTick() {
    this._eraseId = null
    if (this.ended) return
    if (this.started && !this.busy && !this.coachActive) this._eraseSign()
    this._eraseId = setTimeout(() => this._eraseTick(), ERASE_MS)
  },
  _eraseSign() {
    const chars = this.board.gridChars()
    const blocked = this.board.cellsWithState()
    const signs = []
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++)
        if (chars[r]?.[c] === '−' && !blocked.has(r + ',' + c)) signs.push({ r, c })
    if (signs.length) {
      const pick = signs[(Math.random() * signs.length) | 0]
      this.board.applyErase([pick])   // mancha + animación de borrador
      this.hooks.toast?.('🧽 ¡El Rey borró un signo −!')
    }
    this._bossCheckStuck()   // sin jugadas usables → perdés
  },

  // si el jefe te dejó SIN ninguna jugada usable, perdés. La reason depende del jefe (hielo/borrón).
  _bossCheckStuck() {
    if (!this.boss || this.ended || this.busy) return
    if (!countTargetMoves(this.board.gridCharsMasked(), this.targets, this.md, this.mo, 1)) {
      this._endLevel(false, this._bossKind()?.stuckReason || 'frozen')
    }
  },
  // rompe TODOS los estados del tablero (reintento: romper el hielo / restaurar signos borrados)
  _breakAllStates() {
    const cells = [...this.board.cellsWithState()].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c } })
    if (cells.length) this.board.clearState(cells)
  },
  // una cuenta descongela (rompe el estado de) las fichas ortogonalmente adyacentes a sus celdas.
  // El BORRÓN ('erased') es PERMANENTE: no se rompe por contacto (sólo el reintento lo limpia).
  _breakStatesNear(cells) {
    const blocked = this.board.cellsWithState()
    if (!blocked.size) return
    const toBreak = []
    for (const { r, c } of cells)
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc, k = rr + ',' + cc
        if (blocked.has(k) && this.board.tiles[rr]?.[cc]?.state !== 'erased') { toBreak.push({ r: rr, c: cc }); blocked.delete(k) }
      }
    if (toBreak.length) this.board.clearState(toBreak)
  },

  // ---------- INFESTACIÓN de + (Rey + fase 2 / escenario Suma) ----------
  // Loop propio: cada INFEST_MS el frente de + sube UNA fila (una celda por columna). Los +
  // infestados se usan a mano pero son INMUTABLES para el mantenimiento. Ver DISEÑO §18.6.
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
  // salta las ya infestadas). No pisa fichas con otro estado.
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

  // ---------- FASE 1 del Rey +: esparcir + AISLADOS ----------
  // Cada SCATTER_MS convierte 2 fichas al azar en un '+' (inmutable, con animación notoria). Elige
  // sólo posiciones donde poner el + NO forma una cuenta. Evita la fila 0. Se detiene en la fase 2.
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
