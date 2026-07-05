// ====================================================================
// MANTENIMIENTO del tablero de objetivo fijo (target-rich): repone operadores, rompe cuentas ya
// formadas, garantiza el mínimo de jugadas (total y por objetivo), asegura una jugada de 2
// operadores para la súper ficha y siembra cuentas fáciles cerca de la jugada. Se separó del
// controller por tamaño/cohesión. Métodos de INSTANCIA (mixin sobre el prototype, mismo `this`).
// ====================================================================
import {
  ensureMinOperators, breakFormedTargets, plantTargetMove, countTargetMoves,
  addTargetMovesSubtle, destrandOperators, seedTargetMovesNear, findHintFallback,
  countComboMoves, plantComboMove, pickTargets,
} from './logic.js'

const NEAR_MOVES = 3   // cuentas fáciles que se siembran (visibles) alrededor de donde jugás

export const maintenanceMethods = {
  // Mantenimiento del tablero de objetivo fijo (todo sobre una grilla en memoria). Aplica los
  // cambios SIN animación (el controller lo llama durante el temblor de aterrizaje, para
  // esconderlos ahí). nearCols (opcional): columnas donde el jugador acaba de jugar → se SIEMBRAN
  // cuentas fáciles ahí (mín. NEAR_MOVES) con un pop VISIBLE; el resto va escondido en el temblor.
  _healFixedBoard(nearCols = null) {
    this.targets = [...this.fixedTargets]
    const grid = this.board.gridChars()
    const changed = []
    // 1) operadores: sacar los varados + reponer hasta el piso con buena distribución
    const min = Math.ceil(this.board.cols * 1.2)
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
    const MIN_MOVES = this.level.minMoves ?? (this.board.cols <= 5 ? 3 : this.board.cols - 1)
    const eachMin = this.level.minMovesEach ?? 2
    // Garantía POR OBJETIVO: cada objetivo tiene al menos `eachMin` jugadas propias, así el
    // más fácil no acapara el tablero. Aplica al doble y al acumulativo (set chico 5,6,8,10).
    const perTarget = this.targets.length > 1
    for (let pass = 0; pass < 4; pass++) {
      let ok = true
      if (perTarget) {
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
    for (const t of (perTarget ? this.targets : [])) {
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
    // SÚPER FICHA: garantizar al menos 1 jugada de 2 OPERADORES disponible, así el jugador
    // SIEMPRE puede generar una súper ficha (arma la cuenta 2+1+3 en vez de 2+4). Sólo suma.
    if (this.level.superTile && this.mo >= 2) {
      let g = 0
      while (!countComboMoves(grid, this.targets, this.md, 1) && g++ < 3) {
        changed.push(...plantComboMove(grid, this.gen, this.targets[0], this.level.digits))
        changed.push(...breakFormedTargets(grid, this.gen, this.targets, this.md, this.mo))
      }
    }
    // SIEMBRA local: cuentas fáciles alrededor de donde jugó el jugador (se muestran con pop).
    const seeded = nearCols
      ? seedTargetMovesNear(grid, this.gen, this.targets, [...nearCols], this.md, this.mo, NEAR_MOVES)
      : []
    const seededKeys = new Set(seeded.map(([r, c]) => r + ',' + c))
    // NUNCA modificar fichas con estado (hielo/infestación) NI súper fichas: el mantenimiento las
    // saltea (si no, setChar borraría su look y se cambiaría una ficha especial del jugador).
    const stateKeys = this.board.cellsWithState()
    const protectedK = new Set([...stateKeys, ...this.board.superCells()])
    // mantenimiento de fondo: escondido en el temblor (sin animación), excluyendo lo sembrado
    const bg = [...new Map(changed.map(([r, c]) => [r + ',' + c, [r, c]])).values()]
      .filter(([r, c]) => !seededKeys.has(r + ',' + c) && !protectedK.has(r + ',' + c))
    if (bg.length) this.board.applyCharsPlain(bg, grid)
    const seededFree = seeded.filter(([r, c]) => !protectedK.has(r + ',' + c))
    if (seededFree.length) this.board.applyChars(seededFree, grid)   // pop VISIBLE de la siembra
  },

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
  },
}
