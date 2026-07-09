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
const ATTACK_MS = 760         // duración del TELEGRAFIADO (embestida + proyectiles) antes de aplicar el ataque
const INFEST_MS = 15000      // cada cuánto sube el frente de la infestación de + (fila nueva)
const SCATTER_MS = 10000     // cada cuánto el Rey + (fase 1) esparce + aislados
const ERASE_MS = 9000        // cada cuánto el Rey − (fase 2) borra una ficha (patrón 2 números por 1 signo). Se probó 4.5s y era demasiado rápido/difícil (playtest 2026-07-06) → vuelve a 9s.

// ---------- REGISTRO de jefes por signo ----------
export const BOSS_KINDS = {
  // EL REY + (Suma) — 2 fases: FASE 1 el tablero CRECE (5×5→expandTo) + esparce + aislados;
  // FASE 2 (desde infestAt) arranca la INFESTACIÓN de + que sube hasta tapar. NO usa freeze.
  '+': {
    startAttacks: (ctrl) => ctrl._startScatter(),   // fase 1: esparce + aislados cada 10s
    onRetry: (ctrl) => {
      // REINTENTO = tablero NUEVO: la invasión entera EXPLOTA y caen fichas frescas. (Antes solo
      // se limpiaba el estado y las fichas quedaban idénticas hasta el próximo movimiento — se
      // sentía roto, bug de playtest.)
      ctrl._breakAllStates()
      ctrl.board.locked = true
      ctrl.board.explodeAll().then(() => {
        ctrl.board.locked = false
        if (ctrl.ended) return
        ctrl._rebuild()                             // tablero nuevo, saneado y con jugadas garantizadas
        ctrl.hooks.toast?.('🧹 ¡Limpiaste la invasión! Tablero nuevo')
        if (ctrl.infest) ctrl._startInfest()
      })
    },
    phase: (ctrl, frac) => {
      const b = ctrl.boss
      const infestAt = b.infestAt ?? 0
      // FASE 1 — EXPANSIÓN: agrega de a UNO (fila, luego columna, alternando) en cada umbral hasta
      // `expandTo`. TELEGRAFIADA: el jefe embiste + el marco destella, y recién ahí crece el tablero
      // (las fichas nuevas entran en OLA escalonada, ver Board._popIn) → menos brusco y con autor claro.
      if (b.expandTo && !ctrl._telegraphing) {
        const adds = Math.max(0, (b.expandTo - ctrl.level.size) * 2)
        const steps = []
        for (let k = 1; k <= adds; k++) {
          const thr = 1 - (1 - infestAt) * (k / (adds + 1))
          if (frac <= thr && ctrl._grownCount < k) { ctrl._grownCount = k; steps.push(k) }
        }
        if (steps.length) {
          ctrl._bossTelegraph([], 'grow', () => {
            for (const k of steps) {
              if (k % 2 === 1) ctrl.board.addRow(ctrl.gen.randTile)   // impar = fila abajo
              else ctrl.board.addCol(ctrl.gen.randTile)               // par = columna derecha
            }
            ctrl.board.shake(8)
            ctrl.hooks.toast?.('🟩 ¡El Rey + agranda el tablero!')
            if (ctrl.fixedTargets != null) ctrl._healFixedBoard()  // re-saneo target-rich en el nuevo tamaño
            // sin coach: el telegrafiado (embestida + destello del marco) + la ola de fichas lo cuentan solos
          })
        }
      }
      // FASE 2 — INFESTACIÓN: al cruzar infestAt (ej. 50% HP) empiezan a subir los +.
      // Entra SOLO con la CINEMÁTICA de furia (sin texto: la primera fila sube apenas se cierra
      // y los proyectiles del telegrafiado muestran qué hace el jefe).
      if (b.infestAt != null && frac <= b.infestAt && !ctrl._infestStarted) {
        ctrl._infestStarted = true
        ctrl.infest = true
        if (!ctrl._coachedInfest) {
          ctrl._coachedInfest = true
          ctrl._coach([{ cine: 'phase', sign: '+' }])
        }
        ctrl._startInfest(1500)   // primera fila APENAS se cierre la cinemática (el tick reintenta cada 1s si sigue abierta); luego cada INFEST_MS
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
      if (b.shrinkTo && !ctrl._telegraphing) {
        const total = Math.max(0, (ctrl.level.size - b.shrinkTo) * 2)
        const steps = []
        for (let k = 1; k <= total; k++) {
          const thr = 1 - (1 - eraseAt) * (k / (total + 1))
          if (frac <= thr && ctrl._shrunkCount < k) { ctrl._shrunkCount = k; steps.push(k) }
        }
        if (steps.length) {
          // TELEGRAFIADO (igual que el crecer del Rey +): embestida + destello del marco → achica.
          ctrl._bossTelegraph([], 'shrink', () => {
            for (const k of steps) {
              if (k % 2 === 1) ctrl.board.removeRow()   // impar = fila de abajo
              else ctrl.board.removeCol()               // par = columna derecha
            }
            ctrl.board.shake(8)
            ctrl.hooks.toast?.('🧽 ¡El Rey − achica el tablero!')
            // NO re-sanear al achicar: sólo se sacan celdas del borde (no crea cuentas formadas), y
            // el próximo movimiento ya corre el mantenimiento normal → menos cambios de fichas de golpe.
            // Sin coach: el telegrafiado + el borrón del borde lo cuentan solos.
          })
        }
      }
      // FASE 2 — BORRÓN: al cruzar eraseAt deja de reponer signos y arranca a tacharlos.
      // Entra con CINEMÁTICA de cambio de fase (el jefe se enfurece) + coach.
      if (b.eraseAt != null && frac <= b.eraseAt && !ctrl._eraseStarted) {
        ctrl._eraseStarted = true
        ctrl._erasing = true
        ctrl._noReplenish = true      // deja de reponer signos: ahora escasean de verdad
        if (!ctrl._coachedErase) {
          ctrl._coachedErase = true
          ctrl._coach([{ cine: 'phase', sign: '−' }])   // solo la cinemática de furia; el borrador barriendo se explica solo
        }
        ctrl._eraseSign()             // borra el primero al cruzar
        ctrl._startErase()            // y sigue cada ERASE_MS
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

  // TELEGRAFIADO del ataque: primero la ANIMACIÓN (hook bossAttack: el signo embiste y
  // dispara proyectiles a las celdas) con el tablero BLOQUEADO, y recién después se aplica
  // el efecto. Así el jugador VE que el cambio lo causa el jefe, sin depender del coach.
  // `_teleSeq` (bumpeado en start()) invalida el apply si el nivel se reinició en el medio.
  _bossTelegraph(cells, kind, apply) {
    this._telegraphing = true
    this.board.locked = true
    const seq = this._teleSeq
    this.hooks.bossAttack?.({ cells, rows: this.board.rows, cols: this.board.cols, kind, sign: this.level?.ops?.[0] ?? '+' })
    setTimeout(() => {
      if (seq !== this._teleSeq) return          // el nivel se reinició: descartar (start() resetea flags)
      this._telegraphing = false
      if (!this.busy) this.board.locked = false  // no pisar el lock de una cascada en curso
      if (!this.ended) apply()
    }, ATTACK_MS)
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
    // no atacar si el tablero está ocupado (cascada), hay coach o hay OTRO ataque telegrafiándose
    if (this.started && !this.busy && !this.coachActive && !this._telegraphing) this._bossAttack()
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

  // ---------- ataque del Rey − (fase 2): BORRAR fichas ----------
  // Loop propio: cada ERASE_MS borra UNA ficha (permanente), TELEGRAFIADO como todo ataque
  // (embestida + proyectil − del signo a la celda). Patrón "2 números por 1 signo −"
  // (rotación num→num→signo): los signos escasean 3× más lento → el jugador tiene tiempo.
  _startErase() {
    if (!this._erasing || this._eraseId) return
    this._eraseId = setTimeout(() => this._eraseTick(), ERASE_MS)
  },
  _eraseTick() {
    this._eraseId = null
    if (this.ended) return
    // bloqueado (coach/cascada/otro ataque animándose): reintentar pronto, sin perder el turno
    if (this._telegraphing || !this.started || this.busy || this.coachActive) {
      this._eraseId = setTimeout(() => this._eraseTick(), 900)
      return
    }
    this._eraseSign()
    this._eraseId = setTimeout(() => this._eraseTick(), ERASE_MS)
  },
  _eraseSign() {
    const chars = this.board.gridChars()
    const blocked = this.board.cellsWithState()
    const free = (r, c) => !blocked.has(r + ',' + c) && !this.board.isSuper(r, c) && !this.board.isBomb(r, c)
    const signs = [], digits = []
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) {
        const ch = chars[r]?.[c]
        if (!free(r, c)) continue
        if (ch === '−') signs.push({ r, c })
        else if (ch >= '0' && ch <= '9') digits.push({ r, c })
      }
    // rotación 2 números : 1 signo (cada 3er ataque va al signo); si no hay del tipo, cae al otro
    this._eraseCount = (this._eraseCount ?? 0) + 1
    const wantSign = this._eraseCount % 3 === 0
    const pool = wantSign ? (signs.length ? signs : digits) : (digits.length ? digits : signs)
    if (pool.length) {
      const pick = pool[(Math.random() * pool.length) | 0]
      // TELEGRAFIADO: el signo embiste y un proyectil − vuela hasta la ficha; recién ahí la borra
      this._bossTelegraph([pick], 'erase', () => {
        this.board.applyErase([pick])   // mancha + animación de borrador
        this._bossCheckStuck()          // sin jugadas usables → perdés
      })
      return
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
        const st = this.board.tiles[rr]?.[cc]?.state
        // SOLO se rompe por contacto el HIELO. 'erased' es permanente y 'infested' (los + del
        // jefe) NO se rompe: si se rompiera, quedaban como + comunes y el saneo los convertía
        // en números (bug visto en playtest: "los + del jefe desaparecen tras una suma cerca").
        if (blocked.has(k) && st !== 'erased' && st !== 'infested') { toBreak.push({ r: rr, c: cc }); blocked.delete(k) }
      }
    if (toBreak.length) this.board.clearState(toBreak)
  },

  // ---------- INFESTACIÓN de + (Rey + fase 2 / escenario Suma) ----------
  // Loop propio: cada INFEST_MS el frente de + sube UNA fila (una celda por columna). Los +
  // infestados se usan a mano pero son INMUTABLES para el mantenimiento. Ver DISEÑO §18.6.
  _startInfest(first = INFEST_MS) {   // `first` corto = primera fila apenas termina la cinemática de fase
    if (!this.infest || this._infestId) return
    this._infestId = setTimeout(() => this._infestTick(), first)
  },
  _infestTick() {
    this._infestId = null
    if (this.ended) return
    // Si la subida está BLOQUEADA (coach/cinemática en pantalla, cascada, otro ataque animándose),
    // NO perder el turno: reintentar en ~1 s hasta poder subir. Antes se saltaba y esperaba otros
    // 15 s enteros → la primera fila llegaba desconectada de la cinemática de fase.
    if (this._telegraphing || !this.started || this.busy || this.coachActive) {
      this._infestId = setTimeout(() => this._infestTick(), 1000)
      return
    }
    this._infestRise()
    this._infestId = setTimeout(() => this._infestTick(), INFEST_MS)
  },
  // sube el frente: en cada columna infesta la celda LIBRE más abajo (llena de abajo hacia arriba;
  // salta las ya infestadas). No pisa fichas con otro estado.
  _infestRise() {
    if (this._telegraphing) return                  // ya hay un ataque animándose (el tick reintenta)
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
    if (toInfest.length) {
      // TELEGRAFIADO: embestida + una FILA de proyectiles + que vuelan a las celdas del frente
      this._bossTelegraph(toInfest, 'infest', () => {
        this.board.applyInfest(toInfest)
        this.board.shake(5)
        this._infestCheckLoss()
      })
    } else this._infestCheckLoss()
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
    if (this.started && !this.busy && !this.coachActive && !this._telegraphing) this._scatterPlus(2)
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
      // TELEGRAFIADO: el jefe embiste y los + VUELAN del signo a las celdas; el tablero queda
      // bloqueado durante la animación, así las posiciones elegidas siguen siendo válidas.
      // sin coach: la embestida + los proyectiles que aterrizan como '+' se explican solos
      this._bossTelegraph(pick, 'scatter', () => this.board.applyInfest(pick))
    }
  },
  // perdés cuando la fila de arriba (row 0) queda TODA infestada (la marea de + llegó al techo)
  _infestCheckLoss() {
    if (!this.infest || this.ended) return
    for (let c = 0; c < this.board.cols; c++) if (!this.board.isInfested(0, c)) return
    this._endLevel(false, 'flooded')
  },
}
