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

const START_TIME = 120   // 2 minutos por nivel
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
    this.score = 0
    this.combo = 0
    this.timeLeft = START_TIME
    this.deadline = 0
    this.timerOn = false
    if (this.timerId) clearTimeout(this.timerId)
    this.selected = null
    this.activeBooster = null
    this.targets = []
    for (const b of this.boosters) b.n = b.base
    this._rebuild()
    this._pickTargets()
    this._pushHud()
    this._pushInventory()
    this.hooks.setOverlay({ show: false })
  }

  // ---------- temporizador ----------
  _ensureStarted() {
    if (this.started || this.ended) return
    this.started = true
    this.deadline = Date.now() + START_TIME * 1000
    this.timerOn = true
    this._tick()
  }
  _tick() {
    if (!this.timerOn) return
    const ms = this.deadline - Date.now()
    this.timeLeft = Math.max(0, ms / 1000)
    this.hooks.setTime(this.timeLeft)
    if (ms <= 0) { this.timerOn = false; this._endLevel(); return }
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
    const keep = this.targets.filter((t) => !consumed.has(t))
    let targets = pickTargets(this.board.gridChars(), this.level, keep)
    let tries = 0
    while (targets.length === 0 && tries < 14) {
      this._rebuild()
      targets = pickTargets(this.board.gridChars(), this.level, [])
      tries++
    }
    this.targets = targets
    this._pushTargets(consumed.size > 0)
  }

  // ---------- interacción ----------
  async onTileTap(r, c) {
    if (this.busy || this.ended) return
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
    this._ensureStarted()
    if (this.activeBooster) return this.onTileTap(a.r, a.c)   // en modo power-up, vale como tap
    this.selected = null; this.board.select(null)
    await this._commitSwap(a, b)
  }

  async _commitSwap(a, b) {
    this.busy = true; this.board.locked = true
    await this.board.swap(a, b)
    // estilo Candy Crush: si no forma cuenta, vuelve para atrás (gratis)
    if (!findMatchesMulti(this.board.gridChars(), this.targets, this.md).size) {
      await this.board.swap(b, a)
      this.busy = false; this.board.locked = false
      this.hooks.toast('No forma cuenta ✗')
      return
    }
    await sleep(60)
    const consumed = await this._resolve()
    this.busy = false; this.board.locked = false
    this._afterMove(consumed)
  }

  _afterMove(consumed) {
    if (this.ended) return
    this._pickTargets(consumed)
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
      let gained = all.size * 10 * combo
      if (eq.size > 0) gained += 60 * combo
      this.score += gained; this._pushHud()
      tg.hit.forEach((v) => consumed.add(v))
      if (tg.hit.size) this.hooks.targetHit?.([...tg.hit])   // avisar qué objetivo se logró

      const cells = [...all].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c } })
      const ctr = this.board.cellsCenter(cells)

      await this.board.highlight(cells)   // resaltar la combinación antes de explotar
      this.board.shake(all.size > 6 ? 14 : 8)
      this.board.popup(ctr.x, ctr.y, '+' + gained + (combo > 1 ? '  x' + combo : ''))
      await this.board.clear(cells)
      await this.board.collapse(this.gen.randTile)
      this._applyTidy()
    }
    this.combo = 0
    if (combo >= 3 && !this.ended) this._earnBooster()
    return consumed
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
  _endLevel() {
    if (this.ended) return
    this.ended = true; this.timerOn = false; this.activeBooster = null; this.selected = null; this.board.select(null)
    if (this.timerId) clearTimeout(this.timerId)
    const stars = starsFor(this.level, this.score)
    this._pushInventory()
    this.hooks.onLevelEnd({ index: this.levelIndex, score: this.score, stars, goal: this.level.goal })
  }

  // ---------- pista (a pedido del jugador) ----------
  hint() {
    if (this.busy || this.ended) return
    const h = findHintFallback(this.board.gridChars(), this.targets, this.md)
    if (h) this.board.hint(h.a, h.b)
    else this.hooks.toast('Sin jugadas — probá Mezclar')
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
      list: [...this.targets], goal: this.level.goal, flash: !!flash,
    })
  }
  _pushHud() { this.hooks.setScore(this.score); this.hooks.setTime(this.timeLeft) }
  _pushInventory() {
    this.hooks.setInventory(
      this.boosters.filter((b) => this._allowed(b))
        .map((b) => ({ id: b.id, label: b.label, n: b.n, active: this.activeBooster?.id === b.id }))
    )
  }
}
