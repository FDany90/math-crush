// ====================================================================
// Registro de ESTADOS de casillero (efectos del tablero, estilo Candy Crush). Aislado del
// Board para que agregar un estado nuevo (jelly, candado, cajón, bomba…) sea UNA entrada acá,
// sin tocar el render. El motor ya soporta los estados genéricamente. Ver DISEÑO §18.
//   blocksUse : la ficha NO se puede usar en una cuenta (se ve como pared en la detección)
//   blocksDrag: la ficha NO se puede agarrar ni recibir un intercambio
//   overlay   : (s, rad) => Container con el dibujo encima de la ficha (s = TILE-8)
//   breakFx   : color del "burst" al quitarse el estado
// ====================================================================
import { Container, Graphics, Text } from 'pixi.js'

export const CELL_STATES = {
  frozen: {
    blocksUse: true, blocksDrag: true, breakFx: 0xbfefff,
    overlay: (s, rad) => {
      const ice = new Container();
      const g = new Graphics();
      g.roundRect(-s / 2, -s / 2, s, s, rad).fill({ color: 0x8fe4ff, alpha: 0.42 });
      g.roundRect(-s / 2, -s / 2, s, s, rad).stroke({ color: 0xe8faff, width: 3, alpha: 0.95 });
      g.moveTo(-s / 4, -s / 2).lineTo(0, 0).lineTo(s / 4, s / 3).stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
      ice.addChild(g);
      const fl = new Text({ text: '❄', style: { fontFamily: 'sans-serif', fontSize: 24, fill: 0xffffff } });
      fl.anchor.set(0.5); ice.addChild(fl);
      return ice;
    },
  },
  // INFESTACIÓN de + (jefe/escenario Suma): la ficha se vuelve un '+' COMÚN y corriente (sin look
  // especial). NO se rompe jugando al lado; sólo se consume si se usa en una cuenta. El estado
  // 'infested' existe para (a) hacerlo INMUTABLE al auto-mantenimiento y (b) rastrear el frente que
  // sube de abajo hacia arriba. Sin overlay visual → se ve como un + normal. Ver DISEÑO §18.6.
  infested: {
    blocksUse: false, blocksDrag: false,
    overlay: () => new Container(),   // + común: sin marca visual
  },
  // BORRÓN de − (jefe Resta): el Rey − TACHA un signo −. La ficha queda inutilizable (mancha de
  // tiza + cruz encima) y es PERMANENTE: NO se rompe jugando al lado (se excluye de _breakStatesNear),
  // sólo el reintento la restaura. Como bloquea el uso, la detección la ve como pared → acumula
  // presión hasta que te quedás sin jugadas (= perdés). Ver DISEÑO §18.1.
  erased: {
    blocksUse: true, blocksDrag: true, breakFx: 0xf4f1e8,
    // MANCHA borroneada: varias elipses de tiza translúcida superpuestas + rayas de arrastre del
    // borrador. Tapa el signo (queda "todo borrado"), sin cruz. La animación de barrido del borrador
    // la hace Board.applyErase al aplicarse.
    overlay: (s, rad) => {
      const g = new Graphics();
      g.roundRect(-s / 2, -s / 2, s, s, rad).fill({ color: 0x141d19, alpha: 0.46 });   // "limpia" el fondo (un poco más oscuro)
      const blobs = [[0, 0, 0.74, 0.62, 0.36], [-0.13, -0.09, 0.5, 0.42, 0.28], [0.15, 0.1, 0.46, 0.38, 0.28], [0.06, -0.16, 0.36, 0.3, 0.24], [-0.18, 0.15, 0.34, 0.28, 0.24]];
      for (const [ox, oy, rx, ry, a] of blobs)
        g.ellipse(ox * s, oy * s, (rx * s) / 2, (ry * s) / 2).fill({ color: 0xeae6da, alpha: a });
      // rayas de arrastre (horizontal, como pasadas de borrador)
      g.moveTo(-s * 0.32, -s * 0.04).lineTo(s * 0.32, -s * 0.01).stroke({ color: 0xf4f1e8, width: 3, alpha: 0.28 });
      g.moveTo(-s * 0.3, s * 0.13).lineTo(s * 0.32, s * 0.11).stroke({ color: 0xf4f1e8, width: 3, alpha: 0.22 });
      return g;
    },
  },
  // futuros: jelly (N golpes), lock (candado), crate (cajón que se rompe al lado), etc.
};
