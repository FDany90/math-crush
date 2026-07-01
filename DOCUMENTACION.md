# Math Crush — Documentación / Traspaso

> Match-3 estilo Candy Crush pero con **números y operadores matemáticos**.
> Arrastrás fichas y, si formás un **resultado objetivo** en una línea, explota.
> **Tema visual: "Pizarrón de colores"** (tiza de colores sobre pizarrón, marco de madera). Ver **§9**.

Última actualización: **2026-06-30**.

---

## 1. Concepto del juego

- Tablero NxN de fichas: **dígitos** `0-9`, **operadores** `+ − × ÷`, y a veces `=`.
- **Arrastrás** (drag & drop) una ficha hacia su vecina para intercambiarlas.
- Una **línea contigua** (fila o columna) explota si forma uno de los **objetivos** activos.
  - **Dirección de lectura:** filas `→` izquierda a derecha; columnas `↓` arriba a abajo (hay flechas en la UI que lo indican). La resta/división no son conmutativas, por eso importa.
- Hay hasta **3 objetivos posibles a la vez** (chips "Formá 5 o 3 o 2"), todos **garantizados resolubles en un movimiento** (objetivo inteligente).
- Si el swap **no** forma cuenta, **vuelve para atrás** (estilo Candy Crush).
- Al cumplir un objetivo: el chip se pone **verde con ✓**, las fichas explotan (con resaltado previo), caen nuevas (gravedad) y puede haber **combos en cascada**.

---

## 2. Estructura del juego

- **Modo:** **completá N cuentas contrarreloj**. Cada nivel tiene una `quota` de cuentas a formar; ganás al llegar a **0 cuentas** antes de que se acabe el reloj. El reloj arranca en **1 minuto** (`START_TIME=60`) y **cada cuenta suma +5 s** (`TIME_PER_CUENTA`), con animación "+5" sobre el reloj.
- **Cuenta:** cada objetivo formado (un "Formá 5" cumplido) o ecuación = 1 cuenta → descuenta del objetivo (tally) y suma tiempo. **Solo la jugada del jugador cuenta al objetivo**; las **cascadas "por azar"** (combo ≥ 2) NO descuentan objetivo pero **dan combo + tiempo**.
- **Intentos:** empezás con **10** (`MAX_TRIES`, override por nivel con `tries`). Cada movimiento que **NO** forma cuenta resta 1 intento (los correctos son gratis). Si llegás a 0 → perdés (mensaje "¡Te quedaste sin intentos!"). Evita el prueba-y-error al azar.
- **Estrellas:** por **rapidez** = cuánto tiempo sobró al completar. `frac = timeLeft/START_TIME` (60): 3★ si `frac ≥ 0.5`, 2★ si `≥ 0.25`, 1★ si completaste. Si se acaba el tiempo sin terminar: 0★ (se pierde). Afinable por nivel con `star2`/`star3`. ⚠️ **Pendiente calibrar:** como el tiempo crece con las cuentas, hoy las 3★ salen fáciles.
- **Pistas automáticas:** niveles 1-3 → solo en los **primeros 3 movimientos** (nivel 1 = manito instantánea; 2-3 = pista a los 5 s). Niveles 4-5 → a los **10 s** de inactividad, **máx. 2 pistas**. Nivel 6+ → ninguna. Código: `Controller._autoHintConfig/_startAutoHint/_showAutoHint`. El botón 💡 manual siempre está.
- **Mapa:** camino serpenteante (estilo Candy Crush). El nivel 1 está **abajo**, se sube. Cada nivel se **desbloquea** al sacar ≥1★ en el anterior. El **nivel actual** se resalta con un cartel "¡Acá!".
- **Progreso:** se guarda en `localStorage` (`math_progress`). Reset: `localStorage.removeItem('math_progress')` en la consola (F12).

---

## 3. Cómo arrancar (cada día)

```powershell
cd c:\Users\DanielAlbertoFernand\VSCODE\MATHY\app
npm run dev        # http://localhost:5173  (hot-reload)
```
- Mobile (misma WiFi): `http://192.168.1.2:5173` (verificar IP con `ipconfig`). Falta la regla de firewall del puerto 5173 (requiere admin): `New-NetFirewallRule -DisplayName "Vite 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Any`.
- Frenar servers: `Get-Process node | Stop-Process`.
- Build: `npm run build`. Deploy: conectado a GitHub `FDany90/math-crush` → Vercel auto-deploya. En Vercel el **Root Directory debe ser `app`**.

---

## 4. Arquitectura de `app/`

```
app/
├── MOTOR.md                # explica a fondo cómo se calcula/valida/ejecuta una cuenta
└── src/
    ├── main.jsx
    ├── App.jsx             # UI: pantallas (menú/mapa/juego), HUD, mapa SVG, overlays
    ├── styles.css
    ├── game/
    │   ├── logic.js        # LÓGICA PURA: evalExpr, objetivos inteligentes, matches, generación
    │   ├── levels.js       # DEFINICIÓN DE NIVELES (lo que se toca para diseñar niveles)
    │   └── controller.js   # ORQUESTACIÓN: drag, cascada, timer, power-ups, fin de nivel
    └── pixi/
        └── Board.js        # RENDER WebGL + animaciones (swap, explosión, gravedad, etc.)
```

**Cómo funciona el motor (cálculo/validación/ejecución): ver [`app/MOTOR.md`](app/MOTOR.md).** Resumen:
- **Validar** = `evalExpr(segmento) === objetivo`.
- **Generar objetivos** = simular cada swap posible y juntar los resultados nuevos (`targetPool` → `pickTargets`).
- **Ejecutar** = swap → `findMatchesMulti` → cascada (highlight → clear → collapse) → reponer operadores → re-elegir objetivos.

---

## 5. Cómo diseñar / agregar niveles  ⭐

Todo se edita en [`app/src/game/levels.js`](app/src/game/levels.js), en el array `LEVELS`.
Cada nivel es un objeto con estos campos:

| Campo | Qué hace | Ejemplo |
|---|---|---|
| `name` | Nombre que se ve en el mapa | `'Restas'` |
| `size` | Tablero NxN (cuadrado) | `6` |
| `digits` | Dígitos permitidos | `range(1, 9)` |
| `ops` | Operadores permitidos | `['+', '−']` |
| `eq` | Si aparece `=` | `false` |
| `maxDigits` | Cifras máx. por número (1 = sólo una cifra) | `1` |
| `tMin` / `tMax` | Rango preferido del objetivo | `1` / `8` |
| `quota` | **Cuentas a completar** para ganar el nivel | `6` |
| `tries` | (opcional) intentos antes de perder (default `MAX_TRIES`=10) | `10` |
| `star2` / `star3` | (opcional) umbrales de tiempo restante para 2★/3★ | `0.25` / `0.5` |
| `nTargets` | Cuántos objetivos a la vez (default 3) | `1` |
| `tutorial` | Muestra la **manito guía** + cartel de instrucción | `true` |

**Tutorial (manito guía):** el nivel con `tutorial: true` (nivel 1 "Primeros pasos", 4×4, dígitos 1–3, un solo objetivo) muestra una mano 👆 que repite el gesto de arrastre **sobre la ficha exacta que resuelve el objetivo** (se calcula con `findHintFallback`), y esa ficha "amaga" moverse. Aparece **al instante** y se va cuando el jugador arrastra; reaparece si vuelve a quedarse quieto (dentro de los primeros 3 movimientos). Es parte del **sistema de pistas automáticas** (ver §2). Código: `Board.showHandGuide/hideHandGuide` + `Controller._showAutoHint` + cartel `tutorial-banner` en `App.jsx`.

**Reglas prácticas:**
- El **orden del array = orden en el mapa** (índice 0 = nivel 1, abajo).
- Para un nivel **temático**, poné solo ese operador en `ops` (ej. `['−']` = solo restas → no sobran operadores de otro tipo).
- `tMax` es un tope: el objetivo nunca lo supera. Con `maxDigits: 1` igual se llega a números grandes sumando varios dígitos (`9+8+7`), pero los **números tile** son de 1 cifra.
- Progresión actual: **1 nivel tutorial (4×4)** + **5 niveles por tamaño** (5×5 → 6×6 → 7×7 → 8×8), 21 en total. **Quotas:** tutorial 3 · bloque 5×5 = 5 · 6×6/7×7/8×8 = 10. ⚠️ Al insertar el tutorial al frente los índices se corrieron: si tenías progreso guardado, reseteá con `localStorage.removeItem('math_progress')`.

**Ejemplo — agregar un nivel de restas más difícil:**
```js
{ name: 'Restas duras', size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, tMin: 1, tMax: 8, quota: 8 },
```

> Nota sobre la **paridad** de los objetivos: emerge de la aritmética (restas tienden a impares, multiplicaciones a pares). Se podría hacer niveles solo-pares / solo-impares filtrando en `targetPool` por `v % 2` (idea pendiente).

---

## 6. Pendientes / próximos pasos

**Calibrar (lo primero a hacer jugando):**
- [ ] **Umbrales de estrellas (`star2`/`star3`)**: como el tiempo crece con las cuentas (+5 s c/u), las 3★ salen fáciles. Recalibrar por rapidez real.
- [ ] **`quota` por nivel** y el balance tiempo base (60 s) / bonus (+5 s).

**Fase 4 (juice) — falta:**
- [ ] **Mascota** (búho profe / tiza con cara) en menú o juego.
- [ ] Doodles en el **fondo del juego** (ya están en menú y mapa).
- [ ] Más juice: partículas al ganar, wiggle idle de fichas, trail al arrastrar, vida en botón "Siguiente".

**Ideas de niveles nuevas:**
- [ ] **Niveles de resultados negativos** (ej. "Hacé −3"). Hoy `targetPool` filtra `v > 0`; habría que permitir un rango negativo (`tMin`/`tMax` negativos) y dejar pasar `v < 0` en el pool. `isTargetExpr` ya compara con `===`, así que matchea negativos sin cambios. Mostrar el chip "Hacé −3".
- [ ] Niveles solo-pares / solo-impares (filtro `v % 2` en `targetPool`).
- [ ] Niveles con `=` (ya existen 2 al final) — explorar más variantes de ecuaciones.

**Juice / pulido:**
- [ ] Sonidos (explosión, combo, objetivo, fin).
- [ ] Cartel grande central al cumplir objetivo / al hacer combo grande.
- [ ] Decorar el mapa (paisaje, íconos al costado del camino).

**Más adelante:**
- [ ] Empaquetar como app mobile con **Capacitor** (APK/iOS desde la misma web).

---

## 7. Historial de decisiones clave

- **Drag & drop** en vez de tap-tap (más natural). El tap quedó solo para power-ups.
- **Objetivo inteligente** (hasta 3 a la vez, siempre resolubles) en vez de número al azar.
- **Modo "completá N cuentas"** (en vez de score-attack). Contrarreloj: **1 min base + 5 s por cuenta**; estrellas por rapidez. Combos por azar (cascadas) dan tiempo pero NO cuentan al objetivo.
- **Tema "Pizarrón de colores"** (reskin, ver §9): se descartó el look "caramelo"; fichas = tiza de color garabateada sobre pizarrón negro.
- **Lectura en una sola dirección** (`→` y `↓`); se descartó la bidireccional por ser matemáticamente ambigua. Flechas en la UI lo indican.
- **`maxDigits` por nivel**: en niveles bajos solo números de 1 cifra (no `34−25`).
- **Reposición de operadores** entre jugadas para que el tablero no se seque.
- **Niveles temáticos por operador** (suma / resta / combinado / etc.) para que ningún operador quede "sin usar".

---

## 8. Notas de entorno

- Windows 11, Node v24, repo git en `FDany90/math-crush` (rama `main`).
- El prototipo viejo DOM sigue en la raíz (`index.html`, `server.js`) solo como referencia histórica.
- Build de Vercel: Root Directory = `app`.
- **Skills de diseño instalados** (`.agents/skills/`, símlink a Claude Code): `ui-ux-pro-max` (base de paletas/tipografía/UX, para proponer/validar) y `web-design-guidelines` (auditor de a11y/UX del UI DOM). Sirvieron para validar la paleta y el font pairing (Fredoka + Nunito).

---

## 9. UI, tema pizarrón y animaciones (reskin)

**Tema "Pizarrón de colores"** — tokens en `styles.css` (`:root`): fondo slate verde `#1f2a26`, marco de **madera** `--wood`, tiza cálida `--chalk #f4f1e8`. Colores de tiza (fuertes, sobre fondo oscuro): números **azul** `#2563eb`, operadores `+ − × ÷` **rosa/bordó** `#db2777`, `=` **oro** `#e0a30f` (en `Board.js` → `CHALK_NUM/OP/EQ` y `App.jsx` → `tokenColor`).

**Fuentes** (cargadas en `index.html` + `@font-face`): **Tiza** (real, self-host `app/public/fonts/tiza.ttf`, de dafont/deFharo — ⚠️ chequear licencia antes de publicar) para fichas/título/objetivo/HUD; **Fredoka** (display), **Patrick Hand** (labels/tutorial), **Nunito** (body).

**Fichas (`Board.js` → `Tile.setChar`):** fondo oscuro "pizarrón" con **pinceladas de tiza garabateadas a mano** (diagonales irregulares con quiebre, recortadas con máscara redondeada) + contorno de tiza + número en fuente Tiza blanca.

**HUD (`App.jsx`):** fila superior en grilla **Intentos (✋, sin label) · Tiempo (grande) · Tally**. Debajo, **tarjeta de objetivo** a ancho completo ("Formá N o N o N"). **Cuentas restantes = marcas de tiza (tally)**, agrupadas de a 5 (4 + diagonal tachada); se borran al completar (componente `Tally`).

**Animaciones:**
- **Recolección (collect):** al hacer una cuenta, las fichas hacen *pop* y salen **tokens que vuelan al chip del objetivo** (capa DOM `fly-overlay`, porque el chip está fuera del canvas); el chip se **infla** al recibirlos (`.absorb`). Delay ~360 ms antes de recambiar objetivos. Cambio de objetivo animado (`chipIn`/`chipOut`).
- **"+5" de tiempo:** sube desde el reloj al sumar tiempo (`showTimeBonus`, `.time-bonus`).
- **Squash & stretch:** las fichas caen con gravedad y **se aplastan al aterrizar** (`Board._squashLand`).
- **Bloom/destello:** flash de luz al formar la cuenta (`Board.highlight`), + nube de **polvo/humo de tiza** al explotar (`Board.burst`).
- **Menú:** título centrado en Tiza, **botón "Jugar" amarillo de tiza con vida** (latido + glow + destello `btnShine`), **borde de madera** en la pantalla, y **garabatos/cuentas de tiza al azar** que se regeneran al abrir el menú (`buildDoodles`). El **mapa** también tiene garabatos de fondo (`buildMapDoodles`).
