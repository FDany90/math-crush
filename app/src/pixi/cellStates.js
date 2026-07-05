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
  // futuros: jelly (N golpes), lock (candado), crate (cajón que se rompe al lado), etc.
};
