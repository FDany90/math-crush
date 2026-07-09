// ====================================================================
// Tablero PixiJS (WebGL) con animaciones. Es el "view": mantiene los
// sprites sincronizados con la grilla y anima cada paso.
// El tamaño del tablero es variable (cambia por nivel) -> hace resize.
// ====================================================================
import { Container, Graphics, Text, Sprite, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { kindOf } from '../game/logic.js'
import { CELL_STATES } from './cellStates.js'   // registro de estados de casillero (frozen, infested, …)
import { getTileTexture } from './tileTextures.js'   // texturas de ficha pre-renderizadas (perf)

export const TILE = 64;
export const MAX_PX = TILE * 8;  // tamaño máximo (8x8) para inicializar el canvas

// Tiza de 2 colores: números en cyan, operadores en rosa, = en amarillo.
// Devuelve el color de tiza (un único color por ficha; se dibuja como trazo + glow).
const CHALK_NUM = 0x2563eb;   // azul vivo y oscuro (buen contraste con el número blanco)
const CHALK_OP  = 0xdb2777;   // rosa/bordó fuerte
const CHALK_EQ  = 0xe0a30f;   // oro
function colorFor(ch) {
  const k = kindOf(ch);
  if (k === 'num') return CHALK_NUM;
  if (k === 'eq') return CHALK_EQ;
  return CHALK_OP;
}

function tween(target, props, dur = 0.2, ease = 'power2.out') {
  return new Promise((res) => gsap.to(target, { ...props, duration: dur, ease, onComplete: res }));
}

class Tile extends Container {
  constructor(ch) { super(); this.r = 0; this.c = 0; this.state = null; this._overlay = null; this.super = false; this._superTl = null; this.setChar(ch); }
  // matar el latido de la súper (al re-dibujar la ficha o al destruirla) para no dejar
  // tweens corriendo sobre gráficos ya borrados.
  _killSuperPulse() { if (this._superTl) { this._superTl.kill(); this._superTl = null; } }
  destroy(opts) { this._killSuperPulse(); super.destroy(opts); }
  // SÚPER FICHA (mecánica tipo Candy Crush): un operador "cargado". Se ve especial (dorado + ✨
  // + aura). setChar re-dibuja la ficha, así que esto se re-aplica después de cada setChar.
  _applySuper() {
    const s = TILE - 8, rad = 13;
    const aura = new Graphics();
    aura.roundRect(-s / 2, -s / 2, s, s, rad).fill({ color: 0xffd23f, alpha: 0.18 });
    aura.roundRect(-s / 2 - 3, -s / 2 - 3, s + 6, s + 6, rad + 3).stroke({ color: 0xffe07a, width: 3, alpha: 0.95 });
    aura.roundRect(-s / 2 - 1, -s / 2 - 1, s + 2, s + 2, rad + 1).stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
    this.addChild(aura);
    const sparks = [];
    for (const [sx, sy] of [[s / 2 - 7, -s / 2 + 7], [-s / 2 + 7, s / 2 - 8]]) {
      const spark = new Text({ text: '✨', style: { fontFamily: 'sans-serif', fontSize: 15 } });
      spark.anchor.set(0.5); spark.x = sx; spark.y = sy; this.addChild(spark); sparks.push(spark);
    }
    // LATIDO/CARGA permanente: la súper "respira" todo el tiempo (glow y escala sutil de la
    // aura + destello de los ✨). Se ve SIEMPRE que está cargada. _killSuperPulse lo corta.
    this._killSuperPulse();
    this._superTl = gsap.timeline({ repeat: -1, yoyo: true });
    this._superTl.to(aura.scale, { x: 1.08, y: 1.08, duration: 0.68, ease: 'sine.inOut' }, 0)
      .to(aura, { alpha: 0.5, duration: 0.68, ease: 'sine.inOut' }, 0);
    for (const sp of sparks) this._superTl.to(sp.scale, { x: 1.35, y: 1.35, duration: 0.68, ease: 'sine.inOut' }, 0);
  }
  setSuper(v) { this.super = !!v; this.setChar(this.ch); }
  // aplica el overlay visual del estado actual (si tiene). setChar borra los hijos, así que
  // esto se vuelve a llamar tras cada setChar para conservar el efecto.
  _applyOverlay() {
    const def = CELL_STATES[this.state];
    if (!def) return;
    this._overlay = def.overlay(TILE - 8, 13);
    this.addChild(this._overlay);
  }
  setState(key) {
    this.state = key || null;
    if (this._overlay) { this._overlay.destroy(); this._overlay = null; }
    if (this.state) this._applyOverlay();
  }
  get blocksUse() { return !!(this.state && CELL_STATES[this.state].blocksUse); }
  get blocksDrag() { return !!(this.state && CELL_STATES[this.state].blocksDrag); }
  // El arte de la ficha (fondo + garabato + contorno + número) está PRE-RENDERIZADO a
  // una textura compartida por carácter (ver tileTextures.js). Acá sólo apuntamos un
  // Sprite a esa textura -> crear/recambiar una ficha cuesta ~0 (antes redibujaba ~70
  // trazos + un Text por ficha, y en cascadas grandes tironeaba).
  setChar(ch) {
    this.ch = ch;
    this._killSuperPulse();     // corta el latido viejo antes de recambiar (se recrea en _applySuper)
    if (this._sprite) {
      // conservar el sprite base; quitar sólo decoraciones previas (aura súper / overlay)
      for (const child of [...this.children]) if (child !== this._sprite) child.destroy();
    } else {
      this.removeChildren();
      this._sprite = new Sprite();
      this._sprite.anchor.set(0.5);
      this.addChild(this._sprite);
    }
    const tex = getTileTexture(ch, this.super);   // súper = número dorado (variante propia)
    if (tex) this._sprite.texture = tex;
    // re-pintar decoraciones sobre el sprite (súper ficha y/o estado como el hielo)
    if (this.super) this._applySuper();
    this._overlay = null;
    if (this.state) this._applyOverlay();
  }
}

export class Board {
  constructor(stage, onTap, onResize, onDrag) {
    this.root = new Container();
    stage.addChild(this.root);
    this.layer = new Container();
    this.fx = new Container();
    this.root.addChild(this.layer);
    this.root.addChild(this.fx);
    this.onTap = onTap;
    this.onResize = onResize;
    this.onDrag = onDrag;
    this.tiles = [];
    this.rows = 8; this.cols = 8;
    this.locked = false;
    this.selTile = null; this.selOutline = null;
    this.drag = null;
    this._guideHand = null; this._guideTl = null; this._guideA = null;

    // el stage recibe los eventos de movimiento/soltar para el drag
    stage.eventMode = 'static';
    stage.hitArea = new Rectangle(0, 0, MAX_PX, MAX_PX);
    stage.on('globalpointermove', (e) => this._onDragMove(e));
    stage.on('pointerup', () => this._endDrag());
    stage.on('pointerupoutside', () => this._endDrag());
  }

  _startDrag(r, c, e) {
    if (this.locked) return;
    if (this.tiles[r]?.[c]?.blocksDrag) { this._shakeTile(r, c); return; }   // estado que bloquea (hielo, etc.)
    this.drag = { r, c, x: e.global.x, y: e.global.y, done: false };
  }
  _shakeTile(r, c) {
    const t = this.tiles[r]?.[c];
    if (!t) return;
    gsap.fromTo(t, { x: this.px(c) - 4 }, { x: this.px(c), duration: 0.25, ease: 'elastic.out(1.5,0.3)' });
  }
  _onDragMove(e) {
    const d = this.drag;
    if (!d || d.done) return;
    const dx = e.global.x - d.x, dy = e.global.y - d.y;
    const TH = TILE * 0.35;
    if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
    let nr = d.r, nc = d.c;
    if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1;
    else nr += dy > 0 ? 1 : -1;
    d.done = true;
    const from = { r: d.r, c: d.c };
    this.drag = null;
    if (nr < 0 || nc < 0 || nr >= this.rows || nc >= this.cols) return;
    if (this.tiles[nr]?.[nc]?.blocksDrag) { this._shakeTile(nr, nc); return; }   // destino bloqueado (hielo, etc.)
    this.onDrag(from, { r: nr, c: nc });
  }
  _endDrag() {
    const d = this.drag;
    this.drag = null;
    if (d && !d.done) this.onTap(d.r, d.c);   // sin arrastre -> fue un tap
  }

  px(c) { return c * TILE + TILE / 2; }
  py(r) { return r * TILE + TILE / 2; }
  _place(t, r, c) { this.tiles[r][c] = t; t.r = r; t.c = c; }

  _newTile(r, c, ch) {
    const t = new Tile(ch);
    t.x = this.px(c); t.y = this.py(r);
    t.eventMode = 'static'; t.cursor = 'pointer';
    t.on('pointerdown', (e) => this._startDrag(t.r, t.c, e));
    this.layer.addChild(t);
    this._place(t, r, c);
    return t;
  }

  build(grid) {
    this.hideHandGuide();
    this.rows = grid.length; this.cols = grid[0].length;
    this._resizeCanvas();  // canvas del tamaño del nivel (ancho×alto; cuadrado si rows==cols)
    this.layer.removeChildren();
    this.fx.removeChildren();
    this.selTile = null; this.selOutline = null;
    this.tiles = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) this._newTile(r, c, grid[r][c]);
    // pequeña entrada animada
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const t = this.tiles[r][c];
        gsap.fromTo(t.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.3, delay: (r + c) * 0.012, ease: 'back.out(2)' });
      }
  }

  gridChars() { return this.tiles.map((row) => row.map((t) => (t ? t.ch : null))); }

  // CRECER en vivo de a UNO (para la fase 1 del jefe Suma), conservando las fichas existentes. El
  // tablero puede quedar NO cuadrado entre pasos (el canvas ajusta ancho/alto). refill() = char nuevo.
  _resizeCanvas() { if (this.onResize) this.onResize(this.cols * TILE, this.rows * TILE); }
  // entrada en OLA (escalonada): las fichas nuevas aparecen una tras otra, no todas de golpe —
  // hace el crecimiento del tablero (jefe +) más sutil y legible.
  _popIn(tiles) { tiles.forEach((t, i) => { t.scale.set(0, 0); gsap.to(t.scale, { x: 1, y: 1, duration: 0.36, delay: i * 0.05, ease: 'back.out(2)' }); }); }
  addRow(refill) {              // fila nueva ABAJO
    const r = this.rows; this.rows = r + 1; this.tiles.push([]);
    const fresh = []; for (let c = 0; c < this.cols; c++) fresh.push(this._newTile(r, c, refill()));
    this._resizeCanvas(); this._popIn(fresh);
  }
  addCol(refill) {              // columna nueva DERECHA
    const c = this.cols; this.cols = c + 1;
    const fresh = []; for (let r = 0; r < this.rows; r++) fresh.push(this._newTile(r, c, refill()));
    this._resizeCanvas(); this._popIn(fresh);
  }

  // ENCOGER en vivo de a UNO (fase 1 del jefe Resta): inverso de addRow/addCol. La fila/columna del
  // borde se BORRA con efecto de "borrón" (las fichas se disuelven) y recién ahí ajusta el canvas
  // (así el borrón se ve antes de que achique el tablero). No deja huecos (sólo saca bordes).
  removeRow() {                 // saca la fila de ABAJO
    if (this.rows <= 1) return;
    const r = this.rows - 1;
    const gone = (this.tiles[r] || []).filter(Boolean);
    this.tiles.pop(); this.rows = r;
    this._eraseCells(gone);
  }
  removeCol() {                 // saca la columna de la DERECHA
    if (this.cols <= 1) return;
    const c = this.cols - 1;
    const gone = [];
    for (let r = 0; r < this.rows; r++) { const t = this.tiles[r]?.[c]; if (t) gone.push(t); this.tiles[r]?.pop(); }
    this.cols = c;
    this._eraseCells(gone);
  }
  _eraseCells(tiles) {
    if (!tiles.length) { this._resizeCanvas(); return; }
    let done = 0;
    for (const t of tiles) {
      this.burst(t.x, t.y, 0xf4f1e8);
      gsap.to(t.scale, { x: 0, y: 0, duration: 0.32, ease: 'back.in(2)',
        onComplete: () => { if (!t.destroyed) t.destroy(); if (++done >= tiles.length) this._resizeCanvas(); } });
    }
    this.shake(6);
  }

  // ---------- estados de casillero (efectos del tablero, genérico) ----------
  // Grilla para DETECCIÓN de cuentas/pistas: las fichas con un estado que bloquea el uso se ven
  // como pared ('#'), así no se pueden usar ni sugerir en pistas. `extra` = celdas a tratar como
  // bloqueadas hipotéticamente (para que el jefe pruebe si un ataque dejaría al menos una jugada).
  gridCharsMasked(extra) {
    return this.tiles.map((row, r) => row.map((t, c) =>
      (t ? ((t.blocksUse || extra?.has(r + ',' + c)) ? '#' : t.ch) : null)));
  }
  // celdas con un estado dado (o con CUALQUIER estado si key es null)
  cellsWithState(key = null) {
    const s = new Set();
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const t = this.tiles[r]?.[c];
        if (t?.state && (key == null || t.state === key)) s.add(r + ',' + c);
      }
    return s;
  }
  applyState(cells, key) {
    for (const { r, c } of cells) {
      const t = this.tiles[r]?.[c];
      if (t && !t.state) { t.setState(key); gsap.fromTo(t.scale, { x: 1.25, y: 1.25 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' }); }
    }
  }
  // INFESTAR: convierte la ficha en un '+' contagiado (char '+' + estado 'infested').
  applyInfest(cells) {
    for (const { r, c } of cells) {
      const t = this.tiles[r]?.[c];
      if (!t || t.state) continue;               // no pisar fichas con otro estado
      t.setChar('+');
      t.setState('infested');
      // aparición NOTORIA: pop grande + destello (se ve el intercambio de ficha por un +)
      gsap.fromTo(t.scale, { x: 1.45, y: 1.45 }, { x: 1, y: 1, duration: 0.42, ease: 'back.out(2.4)' });
      this.burst(t.x, t.y, 0xffffff);
    }
  }
  isInfested(r, c) { return this.tiles[r]?.[c]?.state === 'infested'; }

  // BORRAR (Rey −): pone el estado 'erased' (la mancha) y anima un BORRADOR DE PIZARRÓN barriendo
  // la ficha de izquierda a derecha, con polvo de tiza. La mancha aparece detrás del barrido.
  applyErase(cells) {
    for (const { r, c } of cells) {
      const t = this.tiles[r]?.[c];
      if (!t || t.state) continue;
      t.setState('erased');
      t.scale.set(1);
      const x = this.px(c), y = this.py(r), s = TILE;
      // La mancha se revela AL COMPÁS del barrido: misma ventana (~0.55s) → borrador y borrado a la vez.
      if (t._overlay) gsap.fromTo(t._overlay, { alpha: 0 }, { alpha: 1, duration: 0.55, delay: 0.05, ease: 'power1.in' });
      // borrador: bloque de fieltro gris con lomo de madera
      const er = new Graphics();
      er.roundRect(-s * 0.3, -s * 0.02, s * 0.6, s * 0.34, 5).fill({ color: 0x5b5148 });
      er.roundRect(-s * 0.3, -s * 0.16, s * 0.6, s * 0.18, 5).fill({ color: 0xcbb289 });
      er.y = y;
      this.fx.addChild(er);
      this.burst(x, y, 0xf4f1e8);
      // barrido visible pero al mismo ritmo que el borrado (~0.6s)
      gsap.fromTo(er, { x: x - s * 0.62, alpha: 0 }, {
        x: x + s * 0.62, alpha: 1, duration: 0.6, ease: 'power1.inOut',
        onUpdate: () => { if ((er.x - x) > s * 0.42) er.alpha = Math.max(0, er.alpha - 0.12); },  // se desvanece al salir
        onComplete: () => { if (!er.destroyed) er.destroy(); },
      });
    }
    this.shake(6);
  }

  clearState(cells) {
    for (const { r, c } of cells) {
      const t = this.tiles[r]?.[c];
      if (t?.state) {
        const fx = CELL_STATES[t.state]?.breakFx ?? 0xffffff;
        t.setState(null); this.burst(t.x, t.y, fx);
        gsap.fromTo(t.scale, { x: 0.7, y: 0.7 }, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2.5)' });
      }
    }
  }

  // ---------- súper fichas (mecánica tipo Candy Crush) ----------
  makeSuper(r, c) {
    const t = this.tiles[r]?.[c];
    if (!t || t.super) return;
    t.setSuper(true);
    gsap.fromTo(t.scale, { x: 1.35, y: 1.35 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2.2)' });
    this.burst(t.x, t.y, 0xffe07a);
  }
  isSuper(r, c) { return !!this.tiles[r]?.[c]?.super; }
  // resalta (anillo pulsante) todas las súper fichas — para el coach "¡súper ficha creada!"
  markSupers() {
    for (const key of this.superCells()) {
      const [r, c] = key.split(',').map(Number);
      const t = this.tiles[r]?.[c];
      if (!t) continue;
      const ring = this._ring(t, 0xffe07a, TILE - 2);
      gsap.fromTo(ring, { alpha: 0 }, { alpha: 1, duration: 0.32, yoyo: true, repeat: 7, ease: 'sine.inOut', onComplete: () => { if (!ring.destroyed) ring.destroy(); } });
      gsap.fromTo(t.scale, { x: 1, y: 1 }, { x: 1.12, y: 1.12, duration: 0.32, yoyo: true, repeat: 7, ease: 'sine.inOut' });
    }
  }
  superCells() {
    const s = new Set();
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) if (this.tiles[r]?.[c]?.super) s.add(r + ',' + c);
    return s;
  }
  // destello en CRUZ (fila + columna) al detonar una súper ficha: haces dorados que se
  // ensanchan + onda expansiva + burst dorado en el centro. Épico pero sin exagerar.
  superCross(r, c) {
    const w = this.cols * TILE, h = this.rows * TILE;
    const row = new Graphics();
    row.roundRect(-w / 2, -TILE * 0.38, w, TILE * 0.76, 10).fill({ color: 0xffe98f, alpha: 0.6 });
    row.x = w / 2; row.y = this.py(r);
    const col = new Graphics();
    col.roundRect(-TILE * 0.38, -h / 2, TILE * 0.76, h, 10).fill({ color: 0xffe98f, alpha: 0.6 });
    col.x = this.px(c); col.y = h / 2;
    this.fx.addChild(row); this.fx.addChild(col);
    // los haces "nacen" finitos y se ensanchan de golpe, después se apagan
    gsap.fromTo(row.scale, { y: 0.4 }, { y: 1, duration: 0.16, ease: 'power2.out' });
    gsap.fromTo(col.scale, { x: 0.4 }, { x: 1, duration: 0.16, ease: 'power2.out' });
    for (const g of [row, col]) gsap.to(g, { alpha: 0, duration: 0.55, ease: 'power2.out', onComplete: () => { if (!g.destroyed) g.destroy(); } });
    // onda expansiva (anillo) desde el centro
    const wave = new Graphics();
    wave.circle(0, 0, TILE * 0.5).stroke({ color: 0xffffff, width: 5, alpha: 0.9 });
    wave.x = this.px(c); wave.y = this.py(r);
    this.fx.addChild(wave);
    gsap.fromTo(wave.scale, { x: 0.35, y: 0.35 }, { x: 3.2, y: 3.2, duration: 0.5, ease: 'power2.out' });
    gsap.to(wave, { alpha: 0, duration: 0.5, ease: 'power2.out', onComplete: () => { if (!wave.destroyed) wave.destroy(); } });
    this.burst(this.px(c), this.py(r), 0xffe07a);   // chispas doradas en el centro
  }

  select(cell) {
    if (this.selTile && !this.selTile.destroyed) {
      gsap.to(this.selTile.scale, { x: 1, y: 1, duration: 0.12 });
      if (this.selOutline && !this.selOutline.destroyed) this.selOutline.destroy();
    }
    this.selTile = null; this.selOutline = null;
    if (!cell) return;
    const t = this.tiles[cell.r][cell.c];
    if (!t) return;
    this.selTile = t;
    const s = TILE - 8;
    const o = new Graphics();
    o.roundRect(-s / 2, -s / 2, s, s, 13).stroke({ color: 0xffffff, width: 4, alignment: 0.5 });
    t.addChild(o);
    this.selOutline = o;
    gsap.to(t.scale, { x: 0.86, y: 0.86, duration: 0.12, ease: 'power2.out' });
  }

  applyChars(changed, grid) {
    for (const [r, c] of changed) {
      const t = this.tiles[r][c];
      if (!t) continue;
      t.setChar(grid[r][c]);
      gsap.fromTo(t.scale, { x: 0.6, y: 0.6 }, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' });
    }
  }

  // Aplica cambios de mantenimiento SIN NINGUNA animación: sólo cambia el glifo, en el
  // acto. El controller lo llama durante el temblor de aterrizaje, así el cambio queda
  // escondido en la sacudida (nada de achicar/agrandar la ficha).
  applyCharsPlain(changed, grid) {
    for (const [r, c] of changed) {
      const t = this.tiles[r]?.[c];
      if (t) t.setChar(grid[r][c]);
    }
  }

  async swap(a, b) {
    const ta = this.tiles[a.r][a.c], tb = this.tiles[b.r][b.c];
    this._place(tb, a.r, a.c);
    this._place(ta, b.r, b.c);
    await Promise.all([
      tween(ta, { x: this.px(b.c), y: this.py(b.r) }, 0.16),
      tween(tb, { x: this.px(a.c), y: this.py(a.r) }, 0.16),
    ]);
  }

  setCharAt(r, c, ch) {
    const t = this.tiles[r][c];
    if (t) { t.setChar(ch); gsap.fromTo(t.scale, { x: 0.5, y: 0.5 }, { x: 1, y: 1, duration: 0.22, ease: 'back.out(2.5)' }); }
  }

  burst(x, y, color) {
    // bocanadas de "humo": círculos tenues que se expanden y suben (polvo en el aire)
    for (let i = 0; i < 4; i++) {
      const puff = new Graphics();
      puff.circle(0, 0, 7 + Math.random() * 6).fill({ color: i ? color : 0xf4f1e8, alpha: 0.2 });
      puff.x = x + (Math.random() - 0.5) * 12;
      puff.y = y + (Math.random() - 0.5) * 12;
      this.fx.addChild(puff);
      const dur = 0.6 + Math.random() * 0.35;
      gsap.to(puff.scale, { x: 2.6, y: 2.6, duration: dur, ease: 'power1.out' });
      gsap.to(puff, { y: puff.y - 16 - Math.random() * 12, alpha: 0, duration: dur, ease: 'power1.out', onComplete: () => puff.destroy() });
    }
    // specks de polvo: partículas chicas que se dispersan y caen (gravedad)
    for (let i = 0; i < 16; i++) {
      const p = new Graphics();
      p.circle(0, 0, 1 + Math.random() * 2).fill(i % 3 ? color : 0xf4f1e8);
      p.x = x; p.y = y; p.alpha = 0.9;
      this.fx.addChild(p);
      const ang = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 30;
      gsap.to(p, {
        x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist + 16,   // +16 = cae un poco
        alpha: 0, duration: 0.5 + Math.random() * 0.4, ease: 'power2.out', onComplete: () => p.destroy(),
      });
    }
  }

  // resalta las fichas que formaron la combinación, para que se vean los números.
  // epic = true (detonación de súper ficha): más largo, dorado y con más pulsos.
  async highlight(cells, epic = false) {
    const rings = [];
    // bloom central: un destello de luz que se expande y se apaga (más grande/dorado si es épico)
    const ctr = this.cellsCenter(cells);
    const bloom = new Graphics();
    bloom.circle(0, 0, TILE * (epic ? 0.72 : 0.55)).fill({ color: epic ? 0xffe07a : 0xffffff, alpha: epic ? 0.55 : 0.45 });
    bloom.x = ctr.x; bloom.y = ctr.y;
    this.fx.addChild(bloom);
    const bDur = epic ? 0.8 : 0.55;
    gsap.fromTo(bloom.scale, { x: 0.3, y: 0.3 }, { x: epic ? 3.2 : 2.4, y: epic ? 3.2 : 2.4, duration: bDur, ease: 'power2.out' });
    gsap.to(bloom, { alpha: 0, duration: bDur, ease: 'power2.out', onComplete: () => { if (!bloom.destroyed) bloom.destroy(); } });
    const ringCol = epic ? 0xffe07a : 0xfff3c4;
    const reps = epic ? 5 : 3;
    const pop = epic ? 1.22 : 1.16;
    const pd = epic ? 0.3 : 0.26;
    for (const { r, c } of cells) {
      const t = this.tiles[r][c];
      if (!t) continue;
      const s = TILE - 6;
      const ring = new Graphics();
      ring.roundRect(-s / 2, -s / 2, s, s, 13).stroke({ color: ringCol, width: epic ? 6 : 5, alignment: 0.5 });
      t.addChild(ring);
      rings.push(ring);
      gsap.to(t.scale, { x: pop, y: pop, duration: pd, yoyo: true, repeat: 1, ease: 'sine.inOut' });
      gsap.fromTo(ring, { alpha: 0.15 }, { alpha: 1, duration: pd, yoyo: true, repeat: reps, ease: 'sine.inOut' });
    }
    await new Promise((res) => setTimeout(res, epic ? 950 : 620));
    for (const ring of rings) if (ring && !ring.destroyed) ring.destroy();
  }

  async clear(cells) {
    const proms = [];
    for (const { r, c } of cells) {
      const t = this.tiles[r][c];
      if (!t) continue;
      this.tiles[r][c] = null;
      this.burst(t.x, t.y, colorFor(t.ch));
      // pop rápido: la ficha "despega" y el token DOM sigue el viaje al objetivo
      const p = tween(t.scale, { x: 1.2, y: 1.2 }, 0.1, 'power2.out')
        .then(() => Promise.all([tween(t.scale, { x: 0, y: 0 }, 0.18, 'back.in(2)'), tween(t, { alpha: 0 }, 0.18)]))
        .then(() => t.destroy());
      proms.push(p);
    }
    await Promise.all(proms);
  }

  async collapse(refill) {
    const proms = [];
    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const t = this.tiles[r][c];
        if (t) {
          if (write !== r) {
            this.tiles[r][c] = null;
            this._place(t, write, c);
            proms.push(tween(t, { y: this.py(write) }, 0.28, 'power2.in').then(() => this._squashLand(t)));
          }
          write--;
        }
      }
      let spawnAbove = 1;
      for (let r = write; r >= 0; r--) {
        const t = this._newTile(r, c, refill());
        t.y = -this.py(spawnAbove++);
        proms.push(tween(t, { y: this.py(r) }, 0.34, 'power2.in').then(() => this._squashLand(t)));
      }
    }
    await Promise.all(proms);
  }

  // squash & stretch al aterrizar: la ficha se aplasta y se recupera con rebote elástico
  _squashLand(t) {
    if (!t || t.destroyed) return;
    gsap.fromTo(t.scale, { x: 1.18, y: 0.82 }, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1, 0.55)' });
  }

  cellsCenter(cells) {
    const x = cells.reduce((a, p) => a + this.px(p.c), 0) / cells.length;
    const y = cells.reduce((a, p) => a + this.py(p.r), 0) / cells.length;
    return { x, y };
  }

  popup(x, y, text) {
    const t = new Text({
      text,
      style: { fontFamily: 'Fredoka, sans-serif', fontSize: 28, fontWeight: '700', fill: 0xffe07a, stroke: { color: 0x000000, width: 4 } },
    });
    t.anchor.set(0.5); t.x = x; t.y = y;
    this.fx.addChild(t);
    gsap.fromTo(t.scale, { x: 0.5, y: 0.5 }, { x: 1, y: 1, duration: 0.2, ease: 'back.out(3)' });
    gsap.to(t, { y: y - 60, alpha: 0, duration: 0.8, ease: 'power1.out', onComplete: () => t.destroy() });
  }

  shake(amt = 8) {
    gsap.killTweensOf(this.root);
    const tl = gsap.timeline({ onComplete: () => { this.root.x = 0; this.root.y = 0; } });
    tl.to(this.root, { x: -amt, y: amt * 0.4, duration: 0.04 })
      .to(this.root, { x: amt, y: -amt * 0.4, duration: 0.04 })
      .to(this.root, { x: -amt * 0.6, duration: 0.04 })
      .to(this.root, { x: 0, y: 0, duration: 0.05 });
  }

  // anillo de color alrededor de una ficha (se devuelve para animar/destruir)
  _ring(t, color, s = TILE - 6) {
    const ring = new Graphics();
    ring.roundRect(-s / 2, -s / 2, s, s, 13).stroke({ color, width: 5, alignment: 0.5 });
    t.addChild(ring);
    return ring;
  }

  // Pista: solo las fichas que forman la cuenta dan un saltito suave con brillo
  // de borde (anillo verde). La ficha que queda fuera de la cuenta no se anima.
  hint(a, b, line = []) {
    line.forEach((cell, i) => {
      const t = this.tiles[cell.r]?.[cell.c];
      if (!t) return;
      gsap.killTweensOf(t); gsap.killTweensOf(t.scale);
      const baseY = this.py(cell.r);
      t.y = baseY;
      const ring = this._ring(t, 0x7bed9f);
      gsap.fromTo(ring, { alpha: 0 }, { alpha: 1, duration: 0.2, yoyo: true, repeat: 3, delay: i * 0.05, ease: 'sine.inOut', onComplete: () => { if (!ring.destroyed) ring.destroy(); } });
      gsap.timeline({ delay: i * 0.05, repeat: 1, repeatDelay: 0.2 })
        .to(t, { y: baseY - 7, duration: 0.2, ease: 'power2.out' })   // salto bajo y tranquilo
        .to(t, { y: baseY, duration: 0.26, ease: 'power2.in' });
      gsap.fromTo(t.scale, { x: 1, y: 1 }, { x: 1.05, y: 1.05, duration: 0.2, yoyo: true, repeat: 1, delay: i * 0.05, ease: 'sine.inOut' });
    });
  }

  // ---------- guía del tutorial: una mano repite el gesto de arrastre ----------
  // de la ficha `a` hacia su vecina `b` (la jugada que forma el objetivo).
  // La ficha `a` "amaga" moverse (se desplaza ~1/3 hacia `b` y vuelve).
  showHandGuide(a, b) {
    this.hideHandGuide();
    const tA = this.tiles[a.r]?.[a.c];
    if (!tA) return;
    const ax = this.px(a.c), ay = this.py(a.r);
    const bx = this.px(b.c), by = this.py(b.r);
    const nx = ax + (bx - ax) * 0.34, ny = ay + (by - ay) * 0.34;   // amago: 34% hacia el vecino
    this._guideA = { tile: tA, x: ax, y: ay };

    const hand = new Text({ text: '👆', style: { fontFamily: 'system-ui, sans-serif', fontSize: 46 } });
    hand.anchor.set(0.25, 0.05);   // la yema del dedo cae sobre el centro de la ficha
    this.fx.addChild(hand);
    this._guideHand = hand;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
    this._guideTl = tl;
    tl.set(hand, { alpha: 0, x: ax + 10, y: ay + 14 })
      .set(tA.scale, { x: 1, y: 1 })
      .set(tA, { x: ax, y: ay })
      .to(hand, { alpha: 1, duration: 0.2 })
      .to(hand.scale, { x: 0.82, y: 0.82, duration: 0.14 })                       // "agarra"
      .to(tA.scale, { x: 1.08, y: 1.08, duration: 0.14 }, '<')
      .to(hand, { x: bx + 10, y: by + 14, duration: 0.6, ease: 'power1.inOut' })  // arrastra
      .to(tA, { x: nx, y: ny, duration: 0.6, ease: 'power1.inOut' }, '<')         // la ficha amaga seguirla
      .to(hand.scale, { x: 1, y: 1, duration: 0.14 })                             // "suelta"
      .to(tA.scale, { x: 1, y: 1, duration: 0.14 }, '<')
      .to(tA, { x: ax, y: ay, duration: 0.3, ease: 'power2.out' }, '<')           // y vuelve a su lugar
      .to(hand, { alpha: 0, duration: 0.25 }, '+=0.1');
  }

  hideHandGuide() {
    if (this._guideTl) { this._guideTl.kill(); this._guideTl = null; }
    if (this._guideHand && !this._guideHand.destroyed) this._guideHand.destroy();
    this._guideHand = null;
    if (this._guideA) {
      const { tile, x, y } = this._guideA;
      if (tile && !tile.destroyed) {
        gsap.killTweensOf(tile); gsap.killTweensOf(tile.scale);
        tile.x = x; tile.y = y; tile.scale.set(1, 1);
      }
      this._guideA = null;
    }
  }
}
