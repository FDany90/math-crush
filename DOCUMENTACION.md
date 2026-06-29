# Math Crush — Documentación / Traspaso

> Match-3 estilo Candy Crush pero con **números y operadores matemáticos**.
> En vez de alinear caramelos, formás **ecuaciones/cálculos válidos** en línea (horizontal o vertical) y las fichas explotan.

Última sesión: **2026-06-29**.

---

## 1. Concepto del juego

- Tablero 8×8 de fichas: **dígitos** `0-9`, **operadores** `+ − × ÷`, y **igual** `=`.
- Tocás una ficha y una adyacente → se intercambian (swap **libre**, nunca se revierte).
- Una **línea contigua** (fila o columna) explota si:
  - **Modo objetivo**: la expresión **da el número objetivo** que se muestra arriba (ej. objetivo 10 → `7+3`, `5×2`, `8+1+1`). Sin necesidad de `=`. (Es la jugada frecuente, da ritmo.)
  - **Ecuación con `=`**: un solo `=` y ambos lados iguales (ej. `10+55=60+5` → 65=65). Da **+60 de bonus** por combo. (Jugada "premium", más difícil.)
- Mínimo 3 fichas, requiere al menos un operador.
- Al explotar: caen las de arriba (gravedad) y entran nuevas → puede encadenar **combos en cascada**.

---

## 2. Estado actual — DOS versiones

| Versión | Ubicación | Para qué |
|---|---|---|
| **Prototipo DOM** (viejo) | [index.html](index.html) + [server.js](server.js) | Referencia. 1 archivo, HTML+CSS+JS vanilla. Funciona pero techo de calidad visual. |
| **App React + PixiJS** ⭐ (actual) | [app/](app/) | **La versión en la que seguimos.** Vite + React + PixiJS (WebGL) + GSAP. |

> A partir de ahora trabajamos en **`app/`**. El `index.html` de la raíz quedó como referencia histórica.

---

## 3. Cómo arrancar (cada día)

```powershell
cd c:\Users\DanielAlbertoFernand\VSCODE\MATHY\app
npm run dev        # server de desarrollo con hot-reload
```
- PC: abrir `http://localhost:5173`
- Editás cualquier archivo → se actualiza solo (hot-reload).

Otros comandos:
```powershell
npm run build      # build de producción (a dist/)
npm run preview    # previsualizar el build
```

### Probar en el celular (misma WiFi)
1. El server ya escucha en red (`--host`). URL del celu: **`http://192.168.1.2:5173`**
   (si cambió la IP: `ipconfig` y mirá la IPv4 de la WiFi).
2. **Una vez**, abrir el puerto en el firewall (PowerShell **como admin**):
   ```powershell
   New-NetFirewallRule -DisplayName "Vite 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Any
   ```
   > ⚠️ PENDIENTE: esta regla todavía NO se creó (faltó aceptar el UAC). Es lo primero a hacer mañana para probar en mobile.
3. Alternativa sin firewall: túnel con `cloudflared`/`ngrok` (da URL `https://...` para cualquier celular, incluso con datos). No configurado aún.

---

## 4. Arquitectura de `app/`

```
app/
├── index.html              # entry de Vite
├── package.json            # deps: react, react-dom, pixi.js, gsap, vite, @vitejs/plugin-react
├── vite.config.js
└── src/
    ├── main.jsx            # monta React
    ├── App.jsx             # UI: HUD, banner objetivo, selector de modo, inventario, overlay. Monta el canvas Pixi.
    ├── styles.css          # estilos de la UI (todo menos el tablero)
    ├── game/
    │   ├── logic.js        # LÓGICA PURA (sin framework): parser/eval de expresiones, matches, tidy, generación de grilla, pista
    │   └── controller.js   # ORQUESTACIÓN: modos, temporizador, niveles, power-ups, cascadas. Habla con Board + hooks de React.
    └── pixi/
        └── Board.js        # RENDER WebGL: sprites de fichas + animaciones (swap, explosión+partículas, gravedad, shake, popups, selección)
```

**Separación de capas (importante):**
- `logic.js` = reglas puras. Operan sobre `grid[r][c] = caracter`. Reutilizable, testeable.
- `Board.js` = "view". Mantiene sprites Pixi sincronizados con la grilla y anima cada paso. No conoce reglas.
- `controller.js` = "glue". No sabe de React ni Pixi; usa el Board y unos `hooks` para empujar estado a la UI.
- `App.jsx` = React. Solo renderiza HUD desde estado y reenvía clicks de botones al controller.

Flujo de un movimiento: `App` (tap en canvas) → `controller.onTileTap` → `board.swap` (anima) → `controller._resolve` (loop: busca matches con `logic`, `board.clear`/`collapse` animan, suma puntos, sube nivel) → `hooks` actualizan el HUD de React.

---

## 5. Mecánicas implementadas

- **Dos modos seleccionables** (botones arriba):
  - ⏱ **Tiempo**: 180s (3 min). Cumplir objetivo = **+3s**.
  - 🔢 **Movidas**: 20. Cada swap normal = **−1**. Cumplir objetivo = **+2 movidas**. Power-ups NO gastan movida.
- **Objetivos que escalan**: cada objetivo cumplido sube el **nivel** y el próximo número es más difícil (`randomTarget` crece con el nivel).
- **Récord por modo** (guardado en `localStorage`: `equa_best_time`, `equa_best_moves`).
- **Fin de partida**: overlay con puntaje, nivel alcanzado y récord + botón "De nuevo".
- **Power-ups / consumibles** (barra debajo del tablero, no gastan tiempo/movida):
  - `+ − × ÷ =` → colocar ese símbolo reemplazando cualquier ficha.
  - `⇄` → intercambio a distancia (dos fichas cualesquiera).
  - `🎯` → cambiar el objetivo actual.
  - **Se ganan**: combo x3+ otorga un consumible al azar.
- **Pista automática**: si te quedás 4s sin mover, pulsa dos fichas que forman jugada.
- **tidyBoard**: mantiene el tablero jugable — rompe operadores/`=` pegados (los vuelve dígito) y garantiza un mínimo de `=` (`minEq`).

### Animaciones (PixiJS + GSAP)
swap deslizante · explosión (escala + implosión + partículas) · gravedad con rebote (`bounce.out`) · screen shake · popups "+N" que suben con fade · selección (ficha achicada + borde blanco) · pista (pulso de escala).

---

## 6. Parámetros para ajustar (dónde tocar)

En [app/src/game/controller.js](app/src/game/controller.js):
- `START_TIME = 180` — segundos del modo tiempo.
- `START_MOVES = 20` — movidas del modo movidas.
- `BOOSTER_DEFS` — qué power-ups hay y cantidad inicial (`base`).
- `_objectiveReached()` — recompensas (+3s / +2 movidas).
- `this.cfg = { pctOps: 18, pctEq: 20, minEq: 6 }` — distribución de fichas (% operadores, % `=`, mínimo de `=`).

En [app/src/game/logic.js](app/src/game/logic.js):
- `randomTarget(level)` — curva de dificultad del objetivo (`base = 3 + level*2`, `span = 6 + level*2`).
- `ROWS`, `COLS` — tamaño del tablero (8×8).
- `tidyBoard` — probabilidad 0.85 de romper clusters de operadores.

En [app/src/pixi/Board.js](app/src/pixi/Board.js):
- `TILE = 64` — tamaño de ficha en px.
- `COLORS` — paleta de las fichas.
- Duraciones/eases de cada animación.

---

## 7. Decisiones de diseño tomadas (y por qué)

- **Swap libre (no se revierte)**: evita quedar trabado; con ecuaciones es más difícil que con colores. Sí se detecta si "hay jugada posible" (`findHintFallback`), pero nunca es callejón sin salida.
- **Modo objetivo además del `=`**: exigir solo `=` con lados iguales era muy lento/poco divertido. El objetivo hace que casi siempre haya jugada → ritmo arcade.
- **Recurso limitado (tiempo/movidas)**: le da valor a los power-ups (que son gratis).
- **Stack React + PixiJS**: para "nivel Candy Crush" el cuello de botella era el render DOM, no React. Pixi (WebGL) anima a 60fps. React queda para la UI. La lógica es framework-agnóstica → migró intacta.

---

## 8. Pendientes / próximos pasos

**Inmediato (mañana):**
- [ ] Crear la regla de firewall del puerto 5173 (aceptar UAC) y **probar en el celular**.

**Ideas de juice/efectos (lo que seguía):**
- [ ] Destello de fondo al hacer combo grande.
- [ ] Sonidos (explosión, combo, objetivo, fin).
- [ ] Trail/estela en las fichas que caen.
- [ ] Fondo animado.

**Ideas de mecánica (backlog):**
- [ ] Comodín 🃏: ficha que vale cualquier dígito (facilita ecuaciones con `=`).
- [ ] Bomba 💣: revienta fila/columna entera.
- [ ] Martillo 🔨: elimina una sola ficha.
- [ ] Panel de configuración en vivo (estaba en el prototipo DOM; falta re-portarlo a React).
- [ ] Calibrar curva de dificultad y recompensas jugando varias partidas.

**Más adelante:**
- [ ] Empaquetar como app mobile real con **Capacitor** (genera APK/iOS desde la misma web).

---

## 9. Notas de entorno

- Windows 11, Node v24, sin git inicializado.
- Servers que pueden quedar corriendo: Vite (5173) y el `server.js` viejo (8000). Para frenarlos: `Get-Process node | Stop-Process`.
- La IP LAN de la sesión anterior era `192.168.1.2` (verificar con `ipconfig`).
