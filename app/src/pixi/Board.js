// ====================================================================
// Tablero PixiJS (WebGL) con animaciones. Es el "view": mantiene los
// sprites sincronizados con la grilla y anima cada paso.
// El tamaño del tablero es variable (cambia por nivel) -> hace resize.
// ====================================================================
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { kindOf } from '../game/logic.js'

export const TILE = 64;
export const MAX_PX = TILE * 8;  // tamaño máximo (8x8) para inicializar el canvas

const COLORS = {
  num: { fill: 0x4f7cff, top: 0x6a93ff, text: 0xffffff },
  op:  { fill: 0xff7b54, top: 0xff9b7a, text: 0x3a0f00 },
  eq:  { fill: 0xffd23f, top: 0xffe07a, text: 0x5a4500 },
};

function tween(target, props, dur = 0.2, ease = 'power2.out') {
  return new Promise((res) => gsap.to(target, { ...props, duration: dur, ease, onComplete: res }));
}

class Tile extends Container {
  constructor(ch) { super(); this.r = 0; this.c = 0; this.setChar(ch); }
  setChar(ch) {
    this.ch = ch;
    this.removeChildren();
    const k = kindOf(ch);
    const col = COLORS[k];
    const pad = 4, s = TILE - pad * 2, rad = 13;
    const shadow = new Graphics();
    shadow.roundRect(-s / 2, -s / 2 + 4, s, s, rad).fill({ color: 0x000000, alpha: 0.28 });
    this.addChild(shadow);
    const body = new Graphics();
    body.roundRect(-s / 2, -s / 2, s, s, rad).fill(col.fill);
    body.roundRect(-s / 2, -s / 2, s, s * 0.5, rad).fill({ color: col.top, alpha: 0.55 });
    this.addChild(body);
    const t = new Text({
      text: ch,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 30, fontWeight: '800', fill: col.text },
    });
    t.anchor.set(0.5); t.y = -1;
    this.addChild(t);
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

    // el stage recibe los eventos de movimiento/soltar para el drag
    stage.eventMode = 'static';
    stage.hitArea = new Rectangle(0, 0, MAX_PX, MAX_PX);
    stage.on('globalpointermove', (e) => this._onDragMove(e));
    stage.on('pointerup', () => this._endDrag());
    stage.on('pointerupoutside', () => this._endDrag());
  }

  _startDrag(r, c, e) {
    if (this.locked) return;
    this.drag = { r, c, x: e.global.x, y: e.global.y, done: false };
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
    this.rows = grid.length; this.cols = grid[0].length;
    if (this.onResize) this.onResize(this.cols * TILE);  // canvas cuadrado del tamaño del nivel
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
    for (let i = 0; i < 9; i++) {
      const p = new Graphics();
      p.circle(0, 0, 3 + Math.random() * 3).fill(color);
      p.x = x; p.y = y;
      this.fx.addChild(p);
      const ang = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 36;
      gsap.to(p, {
        x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist, alpha: 0,
        duration: 0.4 + Math.random() * 0.2, ease: 'power2.out', onComplete: () => p.destroy(),
      });
    }
  }

  // resalta las fichas que formaron la combinación, para que se vean los números
  async highlight(cells) {
    const rings = [];
    for (const { r, c } of cells) {
      const t = this.tiles[r][c];
      if (!t) continue;
      const s = TILE - 6;
      const ring = new Graphics();
      ring.roundRect(-s / 2, -s / 2, s, s, 13).stroke({ color: 0xffffff, width: 5, alignment: 0.5 });
      t.addChild(ring);
      rings.push(ring);
      gsap.to(t.scale, { x: 1.14, y: 1.14, duration: 0.26, yoyo: true, repeat: 1, ease: 'sine.inOut' });
      gsap.fromTo(ring, { alpha: 0.15 }, { alpha: 1, duration: 0.26, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    }
    await new Promise((res) => setTimeout(res, 620));
    for (const ring of rings) if (ring && !ring.destroyed) ring.destroy();
  }

  async clear(cells) {
    const proms = [];
    for (const { r, c } of cells) {
      const t = this.tiles[r][c];
      if (!t) continue;
      this.tiles[r][c] = null;
      this.burst(t.x, t.y, COLORS[kindOf(t.ch)].fill);
      const p = tween(t.scale, { x: 1.5, y: 1.5 }, 0.24, 'power2.out')
        .then(() => Promise.all([tween(t.scale, { x: 0, y: 0 }, 0.36, 'back.in(2)'), tween(t, { alpha: 0 }, 0.36)]))
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
            proms.push(tween(t, { y: this.py(write) }, 0.26, 'bounce.out'));
          }
          write--;
        }
      }
      let spawnAbove = 1;
      for (let r = write; r >= 0; r--) {
        const t = this._newTile(r, c, refill());
        t.y = -this.py(spawnAbove++);
        proms.push(tween(t, { y: this.py(r) }, 0.3, 'bounce.out'));
      }
    }
    await Promise.all(proms);
  }

  cellsCenter(cells) {
    const x = cells.reduce((a, p) => a + this.px(p.c), 0) / cells.length;
    const y = cells.reduce((a, p) => a + this.py(p.r), 0) / cells.length;
    return { x, y };
  }

  popup(x, y, text) {
    const t = new Text({
      text,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 26, fontWeight: '900', fill: 0xffe07a, stroke: { color: 0x000000, width: 4 } },
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

  hint(a, b) {
    for (const cell of [a, b]) {
      const t = this.tiles[cell.r]?.[cell.c];
      if (t) gsap.fromTo(t.scale, { x: 1, y: 1 }, { x: 1.15, y: 1.15, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    }
  }
}
