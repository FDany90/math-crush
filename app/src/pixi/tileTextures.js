// ====================================================================
// CACHÉ DE TEXTURAS DE FICHA (optimización de performance)
// --------------------------------------------------------------------
// El look de una ficha (fondo pizarrón + garabato de tiza + contorno +
// número) es CARO de dibujar: ~70 trazos de Graphics + un Text que Pixi
// rasteriza a canvas. Antes se re-dibujaba en CADA `setChar` -> al caer
// muchas fichas juntas (cascada) se creaban decenas de Tile en el mismo
// frame = tirón.
//
// Como sólo hay ~15 caracteres distintos (0-9, + − × ÷ =), acá cada uno
// se dibuja UNA sola vez a una textura (`generateTexture`) y todas las
// fichas de ese carácter reusan esa textura vía un Sprite. Crear una
// ficha pasa a costar ~0 (sólo apuntar a la textura). Se pierde la
// variedad "hecha a mano" (todos los "5" quedan idénticos): decisión del
// usuario a favor del rendimiento.
// ====================================================================
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { kindOf } from '../game/logic.js'
import { TILE } from './Board.js'

// Colores de tiza (mismos que tenía Board): números azul, operadores rosa, = oro.
const CHALK_NUM = 0x2563eb;
const CHALK_OP  = 0xdb2777;
const CHALK_EQ  = 0xe0a30f;
function colorFor(ch) {
  const k = kindOf(ch);
  if (k === 'num') return CHALK_NUM;
  if (k === 'eq') return CHALK_EQ;
  return CHALK_OP;
}

let _renderer = null;
const _cache = new Map();   // key `${ch}` o `${ch}_s` (súper) -> Texture

// Dibuja UNA ficha (el mismo arte que hacía Tile.setChar) en un Container
// temporal centrado en (0,0). `isSuper` = número dorado en vez de blanco.
function drawTile(ch, isSuper) {
  const col = colorFor(ch);
  const s = TILE - 8, rad = 13;
  const node = new Container();

  // sombrita
  const shadow = new Graphics();
  shadow.roundRect(-s / 2, -s / 2 + 3, s, s, rad).fill({ color: 0x000000, alpha: 0.22 });
  node.addChild(shadow);

  // máscara redondeada: recorta el "pintado" a la forma de la ficha
  const mask = new Graphics();
  mask.roundRect(-s / 2, -s / 2, s, s, rad).fill(0xffffff);
  node.addChild(mask);

  // ficha = pizarrón NEGRO con tiza de color garabateada encima
  const paint = new Container();
  const base = new Graphics();
  base.roundRect(-s / 2, -s / 2, s, s, rad).fill({ color: 0x222d27, alpha: 0.92 });
  paint.addChild(base);
  const scribble = (width, alpha, step, dir) => {
    const g = new Graphics();
    let x = -s;
    while (x < s) {
      const x1 = x + (Math.random() - 0.5) * 5, y1 = -s / 2 - 3 + (Math.random() - 0.5) * 7;
      const x2 = x + dir * s + (Math.random() - 0.5) * 9, y2 = s / 2 + 3 + (Math.random() - 0.5) * 7;
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 7, my = (y1 + y2) / 2 + (Math.random() - 0.5) * 7;
      g.moveTo(x1, y1).lineTo(mx, my).lineTo(x2, y2);
      x += step + Math.random() * step;
    }
    g.stroke({ color: col, width, alpha });
    paint.addChild(g);
  };
  scribble(3.2, 0.7, 4, 1);
  scribble(1.6, 0.42, 7, 1);
  scribble(2.6, 0.5, 6, -1);
  paint.mask = mask;
  node.addChild(paint);

  // contorno de tiza (doble trazo, leve desfasaje = dibujado a mano)
  const outline = new Graphics();
  outline.roundRect(-s / 2, -s / 2, s, s, rad).stroke({ color: 0xffffff, width: 2.5, alpha: 0.85, alignment: 0.5 });
  outline.roundRect(-s / 2 + 1, -s / 2 - 1.5, s, s, rad).stroke({ color: 0xffffff, width: 1, alpha: 0.3, alignment: 0.5 });
  node.addChild(outline);

  // número/símbolo en tiza (blanco; dorado si es súper)
  const t = new Text({
    text: ch,
    style: { fontFamily: 'Tiza, "Patrick Hand", cursive', fontSize: 42, fill: isSuper ? 0xffe07a : 0xffffff },
  });
  t.anchor.set(0.5);
  // el glifo '−' de la fuente Tiza cae bajo (parece guión bajo): subirlo para centrarlo
  t.y = ch === '−' ? -10 : -1;
  node.addChild(t);
  return node;
}

// Genera (y cachea) la textura de un carácter. Lazy: si aún no existe, la
// crea; si el renderer no está listo, devuelve null (no debería pasar en
// runtime porque buildTileTextures corre al iniciar).
export function getTileTexture(ch, isSuper = false) {
  if (!_renderer) return null;
  const key = ch + (isSuper ? '_s' : '');
  let tex = _cache.get(key);
  if (tex) return tex;
  const node = drawTile(ch, isSuper);
  // frame TILE×TILE centrado en (0,0): captura la ficha con un pelín de margen
  // (sombra/contorno) y queda centrada para un Sprite con anchor 0.5.
  tex = _renderer.generateTexture({
    target: node,
    frame: new Rectangle(-TILE / 2, -TILE / 2, TILE, TILE),
    resolution: 2,
    antialias: true,
  });
  node.destroy({ children: true });
  _cache.set(key, tex);
  return tex;
}

// Pre-calienta todas las texturas comunes al arrancar (tras cargar la fuente
// Tiza). Debe llamarse ANTES de crear fichas. Los caracteres raros (ej.
// números de 2 cifras) se generan igual en caliente vía getTileTexture.
const COMMON = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '−', '×', '÷', '='];
export function buildTileTextures(renderer) {
  _renderer = renderer;
  for (const ch of COMMON) {
    getTileTexture(ch, false);
    if (kindOf(ch) === 'op') getTileTexture(ch, true);   // súper sólo aplica a operadores
  }
}
