// ====================================================================
// Controlador: orquesta el flujo del juego. No sabe de React ni de Pixi;
// usa el Board (view) y "hooks" para empujar estado a la UI.
// ====================================================================
import {
  makeRandTile, randomTarget, newGrid, tidyBoard,
  findEquationCells, findTargetCells, findHintFallback, adjacent,
} from './logic.js'

const START_TIME = 180;   // 3 minutos
const START_MOVES = 20;

const BOOSTER_DEFS = [
  { id: '+',  label: '+',  kind: 'place', ch: '+',  base: 3 },
  { id: '-',  label: '−',  kind: 'place', ch: '−',  base: 3 },
  { id: 'x',  label: '×',  kind: 'place', ch: '×',  base: 2 },
  { id: 'd',  label: '÷',  kind: 'place', ch: '÷',  base: 2 },
  { id: 'eq', label: '=',  kind: 'place', ch: '=',  base: 2 },
  { id: 'tp', label: '⇄',  kind: 'teleport',        base: 3 },
  { id: 'rr', label: '🎯', kind: 'reroll',          base: 2 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Controller {
  constructor(board, hooks) {
    this.board = board;
    this.hooks = hooks;
    this.cfg = { pctOps: 18, pctEq: 20, minEq: 6 };
    this.randTile = makeRandTile(this.cfg);
    this.boosters = BOOSTER_DEFS.map((b) => ({ ...b, n: b.base }));
    this.activeBooster = null;
    this.selected = null;
    this.lastAct = Date.now();
    setInterval(() => this._idleHint(), 1500);
  }

  // ---------- ciclo de partida ----------
  newGame(mode) {
    this.mode = mode;
    this.ended = false;
    this.started = false;
    this.busy = false;
    this.level = 1;
    this.score = 0;
    this.combo = 0;
    this.moves = START_MOVES;
    this.timeLeft = START_TIME;
    this.deadline = 0;
    this.timerOn = false;
    if (this.timerId) clearTimeout(this.timerId);
    this.selected = null;
    this.activeBooster = null;
    for (const b of this.boosters) b.n = b.base;
    this.target = randomTarget(this.level);
    this.best = Number(localStorage.getItem('equa_best_' + mode) || 0);

    const grid = newGrid(this.cfg, this.target, this.randTile);
    this.board.build(grid);

    this._pushAll();
    this.hooks.setOverlay({ show: false });
  }

  // ---------- temporizador ----------
  _tick() {
    if (!this.timerOn) return;
    const ms = this.deadline - Date.now();
    this.timeLeft = Math.max(0, ms / 1000);
    this._pushLimit();
    if (ms <= 0) { this.timerOn = false; this._gameOver(); return; }
    this.timerId = setTimeout(() => this._tick(), 100);
  }
  _ensureStarted() {
    if (this.started || this.ended) return;
    this.started = true;
    if (this.mode === 'time') { this.deadline = Date.now() + START_TIME * 1000; this.timerOn = true; this._tick(); }
  }
  _addTime(s) { this.deadline += s * 1000; }

  // ---------- interacción ----------
  async onTileTap(r, c) {
    if (this.busy || this.ended) return;
    this.lastAct = Date.now();
    this._ensureStarted();

    if (this.activeBooster) return this._useBooster(r, c);

    if (!this.selected) { this.selected = { r, c }; this._showSelection(); return; }
    if (this.selected.r === r && this.selected.c === c) { this.selected = null; this._showSelection(); return; }
    if (!adjacent(this.selected, { r, c })) { this.selected = { r, c }; this._showSelection(); return; }

    const a = this.selected; this.selected = null; this._showSelection();
    this.busy = true; this.board.locked = true;
    await this.board.swap(a, { r, c });   // swap libre, no se revierte
    if (this.mode === 'moves') { this.moves--; this._pushLimit(); }
    await this._resolveIfAny();
    this.busy = false; this.board.locked = false;
    this._endIfNoLimit();
  }

  async _useBooster(r, c) {
    const b = this.activeBooster;
    if (b.kind === 'place') {
      this.board.setCharAt(r, c, b.ch);
      this._consume(b);
      this.busy = true; this.board.locked = true;
      await this._resolveIfAny();
      this.busy = false; this.board.locked = false;
      this._endIfNoLimit();
      return;
    }
    if (b.kind === 'teleport') {
      if (!this.selected) { this.selected = { r, c }; this._showSelection(); return; }
      if (this.selected.r === r && this.selected.c === c) { this.selected = null; this._showSelection(); return; }
      const a = this.selected; this.selected = null;
      this._consume(b); this._showSelection();
      this.busy = true; this.board.locked = true;
      await this.board.swap(a, { r, c });
      await this._resolveIfAny();
      this.busy = false; this.board.locked = false;
      this._endIfNoLimit();
    }
  }

  async _resolveIfAny() {
    const grid = this.board.gridChars();
    const has = findEquationCells(grid).size + findTargetCells(grid, this.target).size;
    if (has) { await sleep(80); await this._resolve(); }
  }

  // ---------- cascada / matches ----------
  async _resolve() {
    let combo = 0;
    while (!this.ended) {
      const grid = this.board.gridChars();
      const eq = findEquationCells(grid);
      const tg = findTargetCells(grid, this.target);
      const all = new Set([...eq, ...tg]);
      if (all.size === 0) break;

      combo++;
      this.combo = combo; this.hooks.setCombo(combo);
      let gained = all.size * 10 * combo;
      if (eq.size > 0) gained += 60 * combo;
      this.score += gained; this.hooks.setScore(this.score);

      const cells = [...all].map((k) => { const [r, c] = k.split(',').map(Number); return { r, c }; });
      const ctr = this.board.cellsCenter(cells);
      this.board.shake(all.size > 6 ? 14 : 8);
      this.board.popup(ctr.x, ctr.y, '+' + gained + (combo > 1 ? '  x' + combo : ''));

      await this.board.clear(cells);
      await this.board.collapse(this.randTile);
      this._applyTidy();
      if (tg.size > 0) this._objectiveReached();
    }
    this.combo = 0; this.hooks.setCombo(1);
    if (combo >= 3 && !this.ended) this._earnBooster();
    this._endIfNoLimit();
  }

  _applyTidy() {
    const grid = this.board.gridChars();
    const changed = tidyBoard(grid, this.cfg);
    if (changed.length) this.board.applyChars(changed, grid);
  }

  _objectiveReached() {
    this.level++;
    if (this.mode === 'time') this._addTime(3);
    else this.moves += 2;
    this.target = randomTarget(this.level);
    this._pushTarget(true);
    this._pushLimit();
  }

  // ---------- power-ups ----------
  activateBooster(id) {
    if (this.busy || this.ended) return;
    const b = this.boosters.find((x) => x.id === id);
    if (!b || b.n <= 0) return;
    this._ensureStarted();
    if (b.kind === 'reroll') {
      b.n--; this.target = randomTarget(this.level); this._pushTarget(true);
      this._pushInventory(); this.hooks.toast('Nuevo objetivo: ' + this.target);
      return;
    }
    this.activeBooster = this.activeBooster?.id === id ? null : b;
    this.selected = null; this._showSelection(); this._pushInventory();
    if (this.activeBooster) {
      this.hooks.toast(b.kind === 'place' ? 'Tocá una ficha para poner  ' + b.label : 'Tocá dos fichas para intercambiar');
    }
  }
  _consume(b) { b.n--; if (b === this.activeBooster) this.activeBooster = null; this._pushInventory(); }
  _earnBooster() {
    const pool = this.boosters.filter((b) => b.kind !== 'reroll');
    const b = pool[Math.floor(Math.random() * pool.length)];
    b.n++; this._pushInventory(); this.hooks.toast('¡Bonus combo! +1  ' + b.label);
  }

  // ---------- fin ----------
  _endIfNoLimit() {
    if (this.mode === 'moves' && this.moves <= 0 && !this.ended) this._gameOver();
  }
  _gameOver() {
    if (this.ended) return;
    this.ended = true; this.timerOn = false; this.activeBooster = null; this.selected = null;
    if (this.timerId) clearTimeout(this.timerId);
    if (this.score > this.best) { this.best = this.score; localStorage.setItem('equa_best_' + this.mode, this.best); }
    this._pushInventory(); this._showSelection();
    this.hooks.setBest(this.best);
    this.hooks.setOverlay({
      show: true,
      title: this.mode === 'time' ? '¡Tiempo!' : '¡Sin movidas!',
      score: this.score,
      sub: 'Nivel alcanzado ' + this.level + ' · Récord ' + this.best,
    });
  }

  // ---------- pista por inactividad ----------
  _idleHint() {
    if (this.busy || this.ended || !this.started || this.selected || this.activeBooster) return;
    if (Date.now() - this.lastAct < 4000) return;
    const grid = this.board.gridChars();
    const h = findHintFallback(grid, this.target);
    if (h) this.board.hint(h.a, h.b);
    this.lastAct = Date.now();
  }

  // ---------- buttons ----------
  shuffle() {
    if (this.busy || this.ended) return;
    const grid = newGrid(this.cfg, this.target, this.randTile);
    this.board.build(grid);
  }
  reset() { if (!this.busy) this.newGame(this.mode); }
  setMode(m) { this.newGame(m); }
  setConfig(patch) {
    Object.assign(this.cfg, patch);
    this.randTile = makeRandTile(this.cfg);
    this.shuffle();
    this.hooks.setConfig({ ...this.cfg });
  }

  // ---------- push de estado a la UI ----------
  _showSelection() { this.board.select(this.selected); }
  _pushTarget(flash) { this.hooks.setTarget({ level: this.level, target: this.target, flash: !!flash }); }
  _pushLimit() {
    this.hooks.setLimit({
      mode: this.mode,
      timeLeft: this.timeLeft,
      moves: this.moves,
      startTime: START_TIME, startMoves: START_MOVES,
    });
  }
  _pushInventory() { this.hooks.setInventory(this.boosters.map((b) => ({ id: b.id, label: b.label, n: b.n, active: this.activeBooster?.id === b.id }))); }
  _pushAll() {
    this.hooks.setScore(this.score);
    this.hooks.setBest(this.best);
    this.hooks.setCombo(1);
    this._pushTarget(false);
    this._pushLimit();
    this._pushInventory();
    this.hooks.setConfig({ ...this.cfg });
  }
}
