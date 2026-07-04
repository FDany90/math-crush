# Math Crush — Documentación / Traspaso

> Match-3 estilo Candy Crush pero con **números y operadores matemáticos**.
> Arrastrás fichas y, si formás un **resultado objetivo** en una línea, explota.
> **Tema visual: "Pizarrón de colores"** (tiza de colores sobre pizarrón, marco de madera). Ver **§9**.

Última actualización: **2026-07-01** (sesión de correcciones del playtest mobile — ver **§10**).

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

- **Modo:** **completá N cuentas contrarreloj**. Cada nivel tiene una `quota` de cuentas a formar; ganás al llegar a **0 cuentas** antes de que se acabe el reloj. El reloj arranca en **2 minutos** (`START_TIME=120`, subido desde 60 el 2026-07-01) y **cada cuenta suma +5 s** (`TIME_PER_CUENTA`), con animación "+5" sobre el reloj. El reloj **arranca recién en el primer movimiento** y se **pausa** mientras hay un mensaje del coach (ver §10).
- **Cuenta:** cada objetivo formado (un "Formá 5" cumplido) o ecuación = 1 cuenta → descuenta del objetivo (tally) y suma tiempo. **Solo la jugada del jugador cuenta al objetivo**; las **cascadas "por azar"** (combo ≥ 2) NO descuentan objetivo pero **dan combo + tiempo**.
- **Intentos:** empezás con **10** (`MAX_TRIES`, override por nivel con `tries`). Cada movimiento que **NO** forma cuenta resta 1 intento (los correctos son gratis) y **frena con un mensaje flotante** "Te quedan N movimientos…". Si llegás a 0 → perdés. Evita el prueba-y-error al azar.
- **Pistas:** el botón 💡 **manual está limitado a 3 por partida** (`MAX_HINTS=3`, override por nivel con `hints`); al agotarse el botón queda deshabilitado. Las **pistas automáticas** (abajo) **no** gastan ese cupo.
- **"+1 minuto" (continuar):** al perder, se puede **seguir hasta 2 veces** por partida (`MAX_CONTINUES=2`); suma 60 s (`CONTINUE_TIME`) y, si perdiste por intentos, también repone intentos. Método `Controller.resumeWithBonus()`.
- **Estrellas:** por **rapidez** = cuánto tiempo sobró al completar. `frac = timeLeft/START_TIME` (120): 3★ si `frac ≥ 0.5`, 2★ si `≥ 0.25`, 1★ si completaste. Si se acaba el tiempo sin terminar: 0★ (se pierde). Afinable por nivel con `star2`/`star3`. ⚠️ **Pendiente calibrar:** como el tiempo crece con las cuentas, hoy las 3★ salen fáciles (usar las **métricas**, §11).
- **Pistas automáticas:** niveles 1-3 → solo en los **primeros 3 movimientos** (nivel 1 = manito instantánea; 2-3 = pista a los 5 s). Niveles 4-5 → a los **10 s** de inactividad, **máx. 2 pistas**. Nivel 6+ → ninguna. Código: `Controller._autoHintConfig/_startAutoHint/_showAutoHint`. No se disparan mientras hay un mensaje del coach (`coachActive`).
- **Mapa:** camino serpenteante (estilo Candy Crush), rediseñado con color y mascota (ver §9). El nivel 1 está **abajo**, se sube. Cada nivel se **desbloquea** al sacar ≥1★ en el anterior. El **nivel actual** se resalta con un cartel "¡Acá!". **Tocar un nodo abre un pop-up de inicio** ("Nivel N" + "¡Jugar!"). **El mapa es la pantalla principal** (ya no tiene header con título/botón Menú).
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
- **Métricas (Supabase):** para que registre eventos hay que definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `app/.env` (local, ignorado por git) y en **Vercel → Settings → Environment Variables** (producción). Sin esas variables el juego funciona igual pero guarda solo en `localStorage`. Ver **§11**.

---

## 4. Arquitectura de `app/`

```
app/
├── MOTOR.md                # explica a fondo cómo se calcula/valida/ejecuta una cuenta
└── src/
    ├── main.jsx
    ├── App.jsx             # UI: pantallas (menú/mapa/juego), HUD, mapa SVG, overlays, coach, pop-ups
    ├── styles.css
    ├── metrics.js          # MÉTRICAS: ID anónimo + nick, envío de eventos a Supabase (§11)
    ├── game/
    │   ├── logic.js        # LÓGICA PURA: evalExpr, objetivos inteligentes, matches, generación
    │   ├── levels.js       # DEFINICIÓN DE NIVELES (lo que se toca para diseñar niveles)
    │   └── controller.js   # ORQUESTACIÓN: drag, cascada, timer, pausa/coach, pistas, fin de nivel
    └── pixi/
        └── Board.js        # RENDER WebGL + animaciones (swap, explosión, gravedad, mascota/doodles no)
```
> `supabase.sql` (crear tablas + RLS) y `.env.example` (plantilla de credenciales) también viven en `app/`.

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
| `hints` | (opcional) pistas manuales por partida (default `MAX_HINTS`=3) | `3` |
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

**Calibrar (lo primero a hacer jugando) — ahora con datos:**
- [ ] **Umbrales de estrellas (`star2`/`star3`)**: como el tiempo crece con las cuentas (+5 s c/u), las 3★ salen fáciles. Recalibrar por rapidez real **usando las métricas** (§11): cuántas pistas y "+1 min" se piden por nivel.
- [ ] **`quota` por nivel** y el balance tiempo base (120 s) / bonus (+5 s).

**Fase 4 (juice) — falta:**
- [x] **Mascota** (búho profe de tiza) — hecha en el mapa (§9). Falta llevarla al menú/juego si se quiere.
- [ ] Doodles en el **fondo del juego** (ya están en menú y mapa).
- [ ] Más juice: partículas al ganar, wiggle idle de fichas, trail al arrastrar.
- [ ] **Performance render:** cachear texturas de fichas (`Board.Tile.setChar` redibuja ~70 trazos de tiza + `Text` por ficha; en cascadas 8×8 puede tironear). Candidato: pre-render a textura + `Sprite`, o `BitmapText` para los números. (Ya se optimizó el motor, ver §12.)

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
- **Modo "completá N cuentas"** (en vez de score-attack). Contrarreloj: **2 min base + 5 s por cuenta** (era 1 min hasta el 2026-07-01); estrellas por rapidez. Combos por azar (cascadas) dan tiempo pero NO cuentan al objetivo.
- **Sin boosters** (2026-07-01): se quitaron los power-ups y "Mezclar" del juego; quedó solo la Pista (limitada) + Ajustes. El código de boosters sigue en `controller.js` pero **desconectado de la UI**.
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

**HUD (`App.jsx`):** fila superior en grilla **Intentos (número solo, sin ícono) · Tiempo (grande) · Tally**. Debajo, **tarjeta de objetivo** a ancho completo ("Formá N o N o N"). **Cuentas restantes = marcas de tiza (tally)**, agrupadas de a 5 (4 + diagonal tachada); se borran al completar (componente `Tally`). Más aire entre header/objetivo/tablero/botones (ajustado el 2026-07-01). Abajo, **solo** los botones **💡 Pista (N)** (cyan, con badge de cantidad; deshabilitado a 0) y **⚙ Ajustes** (circular violeta). El menú de ajustes tiene **"Abandonar nivel"** (volver al mapa).

**Animaciones:**
- **Recolección (collect):** al hacer una cuenta, las fichas hacen *pop* y salen **tokens que vuelan al chip del objetivo** (capa DOM `fly-overlay`, porque el chip está fuera del canvas); el chip se **infla** al recibirlos (`.absorb`). Delay ~360 ms antes de recambiar objetivos. Cambio de objetivo animado (`chipIn`/`chipOut`).
- **"+5" de tiempo:** sube desde el reloj al sumar tiempo (`showTimeBonus`, `.time-bonus`).
- **Squash & stretch:** las fichas caen con gravedad y **se aplastan al aterrizar** (`Board._squashLand`).
- **Bloom/destello:** flash de luz al formar la cuenta (`Board.highlight`), + nube de **polvo/humo de tiza** al explotar (`Board.burst`).
- **Menú:** título centrado en Tiza, **botón "Jugar" amarillo de tiza con vida** (latido + glow + destello `btnShine`), **borde de madera** en la pantalla, y **garabatos/cuentas de tiza al azar** que se regeneran al abrir el menú (`buildDoodles`).

**Mapa rediseñado (2026-07-01) — "pizarrón con color":**
- **Fondo con zonas de color** por bloque de niveles (cyan→rosa→oro→violeta→verde de abajo hacia arriba) + **blobs difusos** de color (`.map-bg`).
- **Camino de tiza brillante** con rayas de color (`.road-under/base/dash`) y glow.
- **Nodos por zona** (`--nc` = `zoneColor(size)`): anillo de tiza dibujado (borde punteado); el **actual grande** con glow + "¡Acá!" + pulso; **completados** más chicos; **bloqueados** apagados con 🔒.
- **Garabatos SVG** temáticos a los costados (estrella, casa, árbol, planeta, libro, corazón, foco…) con filtro `chalkRough` (temblor a mano) que flotan (`ChalkDoodle`, `buildMapDoodles`).
- **Mascota de tiza** = búho-profe (`Mascota`, SVG) junto al nivel actual: **saluda con el brazo**, flota, globito "¡Vamos!".
- ⚠️ Detalle técnico: `.map-path` usa **`flex: none`** para ocupar toda su altura (si no, al ser hijos `position:absolute`, el flex encogía la altura y los doodles/fondo en `%` se apretaban arriba). El scroll al fondo (nivel 1) ocurre **solo al entrar** al mapa (`useEffect` sobre `screen`), no en cada render.

---

## 10. Flujo de nivel, coach/tutorial y pop-ups (2026-07-01)

**Inicio de nivel (estilo Candy Crush):** tocar un nodo del mapa abre un **pop-up** ("Nivel N" + nombre + descripción + botón **"¡Jugar!"**). Estado `startPopup` en `App.jsx`; `openStart(i)` lo abre, `playLevel(i)` arranca.

**Fin de nivel:**
- **Ganás** → **pantalla de victoria** a pantalla completa (`winScreen`): "¡Nivel superado!" + estrellas que rebotan + **confeti** (`buildConfetti`) + destello. Dura ~3,4 s (o tap para saltear, `advanceFromWin`). Luego vuelve al **mapa** y, tras ~1,6 s (`startPopupTimer`, para que se vea el mapa), abre el **pop-up de inicio del siguiente nivel**.
- **Perdés** → tarjeta con botón **"+1 minuto"** (si quedan continues, hasta 2×; `resumeWithBonus`) y un único botón **"Salir"** (al mapa). Ya no hay botón "Mapa/Reintentar" separado (Reintentar = volver a tocar el nivel en el mapa).

**Coach = mensajes flotantes que PAUSAN el juego** (`App.jsx` estado `coach` = array de pasos; `Controller.pause()/resume()/_coach()/coachDismissed()`):
- Overlay semitransparente; se cierra tocando (avanza de paso o reanuda). El elemento señalado (objetivo o tally) se **eleva por encima del velo con glow** (`.coach-hl`, prop `highlight: 'target'|'tally'`).
- Mientras hay coach: reloj pausado + `coachActive` bloquea pistas/manito automáticas.
- **Tutorial (nivel 1) DINÁMICO** (no todo junto): 1 mensaje al arrancar ("Arrastrá una ficha… formar el número de arriba", resalta el objetivo) y, **después del primer acierto**, otro ("¡Así se hace!…", resalta el tally). Reemplaza al viejo `tutorial-banner` (eliminado).
- **Movimiento equivocado:** frena y muestra "Eso no forma una cuenta. Te quedan N movimientos…" (`_failMove`).
- **Nivel 2, primera cuenta:** frena el reloj y muestra "Te quedan X cuentas por hacer" resaltando el **tally** (`_afterMove`, flag `coachedFirstCuenta`).

---

## 11. Métricas de playtest (Supabase) — `src/metrics.js`

**Objetivo:** juntar datos de amigos/testers para **balancear niveles** (cuántas pistas y "+1 min" se piden, victorias/derrotas por nivel).

- **Identidad:** UUID anónimo persistente en `localStorage` (`math_player_id`) + **nick opcional**. El nick se pide en un **pop-up al empezar el nivel 3** (`math_nick_asked` evita repetir; salteable).
- **Eventos** (`trackEvent(kind, levelIdx, meta)`): `start` · `win` (meta: stars, timeLeft) · `lose` (meta: reason, left) · `hint` · `continue`. Fire-and-forget; siempre guarda **copia local** (`math_metrics`) como fallback.
- **Backend:** Supabase proyecto `hpotzavqnrimfqtnnwxe`. Tablas `players` y `events` con **RLS** (el cliente solo puede *insert*; nadie lee con la anon key). SQL en **`app/supabase.sql`** (incluye queries para balancear).
- ⚠️ **`upsert` choca con RLS** en Supabase → en `players` usamos `update` + `insert` planos (el error de PK duplicada se ignora). No volver a usar `upsert`.
- **Config:** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (nueva *publishable key* `sb_publishable_…`) en `app/.env` (local) y Vercel (prod). Sin eso → solo localStorage.
- **Leer métricas:** Supabase → SQL Editor, queries del final de `supabase.sql` (resumen por nivel; pistas/continues por intento).

---

## 12. Optimizaciones de performance (2026-07-01)

- **`logic.js` `targetPool` / `findHintFallback`:** hacían **clone de toda la grilla** por cada swap candidato (hasta ~128/llamada) → ahora **swap in-place** sobre la copia descartable y se deshace (menos GC tras cada movimiento).
- **`findHintFallback`:** antes re-escaneaba **todo el tablero** (`findMatchesMulti`) por candidato (~160k evals en 8×8). Como el tablero está resuelto, ahora solo chequea las **4 líneas afectadas** por el swap (`lineHasMatch`) con early-exit → pista casi instantánea.
- **`App.jsx`:** `mapGeometry` y `currentLevel` **memoizados** (`useMemo`) para no recalcularse en cada tick del reloj (5×/seg).
- **Pendiente (mayor):** cachear texturas de fichas en `Board.js` (ver §6).

---

## 13. Rediseño de mecánica: objetivo fijo + tablero "target-rich" (2026-07-03)

**Por qué:** el modo de objetivos rotativos se sentía "sopa de letras" (ves un número y lo cazás). Nueva mecánica: **un objetivo fijo** por nivel y un **tablero diseñado para estar lleno de formas de llegar a ese número**; la meta es **repetirlo `quota` veces**.

**Se activa** con el campo `target: N` en `levels.js`. Si un nivel lo tiene, usa la mecánica nueva; si no, sigue con los **objetivos inteligentes rotativos** de siempre.

**Cómo funciona (código):**
- **Objetivo fijo, no rota:** el controlador fuerza `targets = [target]` (`Controller.fixedTarget`); la tarjeta muestra siempre "Formá N".
- **Generador sesgado** (`makeTargetGen` en `levels.js`): las fichas caen mayormente de los **operandos** que forman el objetivo (`HOT_BIAS=0.78`) + más operadores (`TARGET_PCT_OPS=33`) → tablero lleno de jugadas a un movimiento. `targetTriples(level)` enumera los `[a, op, b]` que dan el objetivo.
- **Arranca "resuelto":** `breakFormedTargets` rompe los objetivos ya formados al construir (`_rebuild`).
- **Mantenimiento sutil (clave):** tras CADA movimiento, si quedan **menos de 3** jugadas al objetivo (`countTargetMoves`), se agregan **de a 1 pieza** (`addTargetMovesSubtle`, cambia un dígito, **de abajo hacia arriba** para revivir el fondo del tablero) hasta tener 3. Medido: ~1.4 piezas por ajuste, nunca deja <3 ni objetivos pre-formados. Último recurso (rarísimo): `plantTargetMove` (planta una jugada a un movimiento).

**Reglas de conteo (transversales a TODOS los niveles):**
- **1 operador por cuenta** (`maxOps=1`; sin `7−3+1`). Pendiente: `maxOps:2` en niveles 20+ con aviso.
- **Conteo por segmento:** formar el objetivo 2 veces en un movimiento cuenta **2** (`findTargetCellsMulti` devuelve `segs`; el controlador usa `tg.segs`).
- **Combos** (cuentas al caer fichas, combo≥2): dan **tiempo** pero **NO** descuentan del objetivo (decisión confirmada).

**Estructura de niveles al 2026-07-03:**
- **Niveles 1-10 = BLOQUE SUMAS** (objetivo fijo, 1 cifra, solo `+`): objetivo 4→13, tablero 4×4→6×6, quota 5→15. Para que el jugador agarre la mecánica.
- **Niveles 11+** = los avanzados viejos (restas, multiplicación, división, ecuaciones) **con objetivos rotativos** — marcados **WIP: a rediseñar**.
- ⚠️ Cambió la cantidad/orden de niveles → **resetear** `localStorage.removeItem('math_progress')`.

**Pendiente (próximo foco):** el bloque de 10 sumas puede sentirse **monótono**. Antes de rediseñar los niveles 11+, hacer una **investigación de diseño de juegos mobile** para sumar **motivadores/desbloqueos** (progresión, recompensas, variedad) que enganchen a seguir jugando.

---

## 14. Ajustes de mantenimiento, temblor de aterrizaje y fixes (2026-07-03 bis)

Refinamientos sobre la mecánica de objetivo fijo (§13) a partir de playtest. **Todo el mantenimiento del tablero de objetivo fijo está ahora en `Controller._healFixedBoard()`** (antes estaba disperso en `_pickTargets`/`_rebuild`).

**Fixes:**
- **Cuentas YA formadas por el reponedor de operadores:** `_replenishOperators` metía un operador entre dos dígitos que sumaban el objetivo (ej. un `+` entre 3 y 2 = 5) y dejaba la cuenta **hecha** en el tablero. Fix: tras reponer operadores, `_healFixedBoard` corre `breakFormedTargets` → el tablero se entrega siempre **resuelto** (solo jugadas a un movimiento). Verificado 0/1200 tableros con cuenta formada.

**Mejoras de tablero (`logic.js`):**
- **`MIN_MOVES` escala con el tamaño:** `level.minMoves ?? (size <= 5 ? 3 : size − 1)` → 4×4→3, 5×5→3, 6×6→5, 7×7→6, 8×8→7. Cuanto más grande el tablero, más jugadas visibles.
- **`ensureMinOperators` reescrito:** coloca operadores solo donde **sirven** (pueden ser el centro de una cuenta, `opUsableAt`) y **repartidos** (penaliza vecinos-operador) → no más columnas llenas de `+`.
- **`destrandOperators` (nueva):** convierte a dígito los operadores **varados** (esquinas / sin uso posible en ninguna línea). Corre antes de reponer.
- Verificado en 1200 tableros: siempre ≥ mínimo de jugadas, 0 operadores varados, 0 cuentas formadas.

**Temblor de aterrizaje + intercambio invisible (`controller.js` + `pixi/Board.js`):**
- El temblor ya **no** ocurre al explotar la cuenta. Ahora se dispara **al ATERRIZAR las piezas** (al final de la caída, después del último `collapse`, en `_resolve`): `this.board.shake(12)`.
- **Dentro de ese temblor**, con todas las posiciones ya definidas, corre `_healFixedBoard()`, que aplica los cambios con **`Board.applyCharsPlain`** — **sin ninguna animación** (solo `setChar`, sin el "pop"/escala) → el ajuste de fichas queda **escondido en la sacudida** del aterrizaje.
- Un solo temblor por movimiento. `_pickTargets` para objetivo fijo ahora solo fija/muestra el objetivo (el mantenimiento salió de ahí).

**Reset de progreso por versión (`App.jsx`):** `PROGRESS_VERSION` (const). Al cargar, si la versión guardada en el browser no coincide, se borra `math_progress` una vez → **todos los jugadores empiezan de cero** en su próxima visita (subir el número cada vez que se reestructuren niveles). Requiere redeploy.

**Diseño de progresión (documento aparte):** todo lo de motivadores, desbloqueos, economía de estrellas y estructura de mundos por operación está en **`DISEÑO_PROGRESION.md`** (raíz). Es el doc maestro para diseñar la progresión.

## 15. Rediseño del Mundo Suma + twists (2026-07-04)

Aplicación de **DISEÑO_PROGRESION §5.2**: el bloque de 10 sumas dejó de ser una escalera monótona de objetivos (4→13, con los "feos" 11/13) y pasó a números elegidos por **significado** + un **twist cada 2-3 niveles** (teach→test→twist). La dificultad viene del tablero/quota/twist, no de +1 al objetivo.

**Secuencia (`levels.js`) — teach→test→twist: enseña 4,5,6,8 sueltos y desde el nivel 5 intercala twists (uno sí/uno no) para cortar la monotonía:**

| # | Nombre | Objetivo | Twist |
|---|--------|----------|-------|
| 1 | Primeros pasos | 4 | tutorial |
| 2 | Amigos del 5 | 5 | — |
| 3 | Media docena | 6 | — |
| 4 | El pulpo | 8 | — |
| 5 | Doble objetivo | **[4, 8]** | 🎁 doble objetivo |
| 6 | Ponete la 10 | 10 ⭐ | — |
| 7 | Modo relax | 9 | 🎁 **relax** (sin reloj) |
| 8 | Una docena | 12 | — |
| 9 | Fiebre de combos | 7 | 🎁 **comboFever** |
| 10 | Cambia el objetivo | **10 → 6** | 🎁 **targetTo** |

**Twists (todos son cambios acotados sobre el motor de objetivo fijo del §13):**
- **Doble objetivo** (`target: [5, 10]`): el objetivo fijo ahora puede ser un **array**. La maquinaria multi-objetivo ya existía (`this.targets` siempre fue un array; `findTargetCellsMulti`/`countTargetMoves`/etc. reciben un array). Solo hubo que: (a) `targetTriples` acepta array (une los operandos de todos los objetivos en el bag "caliente"), (b) el controller normaliza `level.target` → `this.fixedTargets` (array). Vale formar **cualquiera** de los dos; ambos descuentan quota. La UI ya renderiza "Formá 5 o 10" (chips con "o").
- **Modo relax** (`relax: true`): `_ensureStarted` **no arranca el reloj**; se gana solo por quota. Las estrellas premian **precisión** (movimientos fallados = intentos gastados): 3★ sin fallar, 2★ hasta 3 fallos, 1★ completar. La UI muestra "😌 Relax" en vez del cronómetro (hook `setMode`, estado `mode.relax`, CSS `.time-big.relax`).
- **Fiebre de combos** (`comboFever: true`): las cascadas "por azar" (combo≥2), que normalmente solo dan tiempo, **también descuentan del objetivo** y vuelan al chip. Toast "¡Fiebre de combos! +N cuentas 🔥".
- **Objetivo que cambia** (`targetTo: N`): al llegar a **media quota**, `_maybeSwitchTarget` cambia el objetivo fijo a `targetTo`, **regenera el bag** (nuevos dígitos calientes con `makeGen`), reacomoda el tablero (`_healFixedBoard`) y avisa por coach (que pausa el reloj un instante). Flag `this.switched` evita repetirlo.

**Verificación:** build OK + simulación de **400 tableros por nivel** (incluyendo ambos objetivos del switch 10 y 6): **0 cuentas ya formadas, 0 tableros bajo el mínimo de jugadas, 0 deadlocks**. El generador target-rich funciona igual para objetivo array y para todos los twists.

**Ajustes finos del generador (mismo día):**
- **Cifras acotadas al objetivo:** el pool "frío" (variedad) de `makeTargetGen` se limita a cifras **≤ objetivo mayor** (`Number(d) <= maxT`). Antes, con `digits: range(1,9)` en todos los niveles, aparecían 6/7/8/9 inútiles en un tablero de "formá 5" (donde solo sirven 1-4). Ahora el tablero queda lleno de operandos del objetivo.
- **Balance del objetivo DOBLE (mínimo de jugadas POR objetivo):** en `[5,10]` el 10 (fácil de armar con cualquier par 1-9) se comía el tablero y el 5 casi no tenía jugadas. Tres capas: (1) el generador elige **primero un objetivo al azar y después uno de SUS operandos** (`hotByTarget`) → densidad pareja; (2) `_healFixedBoard` garantiza jugadas por objetivo (`minMovesEach`, default 2) en un bucle, con `addTargetMovesSubtle(..., avoid)` = todos los objetivos para no formar el otro; (3) respaldo: `plantTargetMove(grid, gen, onlyTarget)` planta jugadas (incluido el operador) para el objetivo faltante. Sim 4000 tableros: **mín. 2 jugadas para CADA objetivo**, promedio ~4.5/~4.1, 0 formadas. Campo de nivel nuevo: `minMovesEach`.

**UI — cuentas restantes pegadas al objetivo:** el tally (palitos) se movió de arriba-derecha a **dentro de `.obj-card`**, a la derecha del "Formá [N]" (contador pegado al objetivo, tipo Candy Crush). Se quitó el **verde persistente** del chip al cumplir (borradas `.tchip.achieved`/`::after` y el estado `achieved`/hook `targetHit`); el chip queda dorado y solo **titila** (escala + brillo/glow dorado por WAAPI en `flyTokens`, un pulso por ficha que llega) mientras absorbe.

**Reset de progreso:** `PROGRESS_VERSION` subido a `'4'` (cambió contenido y ORDEN de los niveles → todos empiezan de cero al redeployar).

### Cómo agregar/reordenar niveles (y el pendiente de progreso por `id`)
`LEVELS` (en `levels.js`) es un **array ordenado**; agregar un nivel en cualquier posición = **insertar un objeto literal**. Todo se recalcula solo (mapa, `LEVEL_COUNT = LEVELS.length`, desbloqueos por estrellas). No hay que tocar nada más.

⚠️ **Único costo hoy:** el progreso se guarda en `localStorage.math_progress` **indexado por POSICIÓN** (`{ stars: { 0: 3, 1: 2, ... } }`). Insertar/reordenar en el medio corre los índices → las estrellas quedan asignadas al nivel equivocado. Por eso, cada vez que se reestructura, hay que **subir `PROGRESS_VERSION`** (borra el progreso una vez; ver §14). En etapa de desarrollo esto es inofensivo (decisión del usuario, 2026-07-04: por ahora no importa perder progreso).

🔜 **PENDIENTE / FUTURO (cuando haya jugadores reales con progreso a conservar):** migrar el progreso a estar **indexado por un `id` estable de nivel** en vez de por índice. Plan:
1. Agregar un campo `id` único e inmutable a cada nivel en `LEVELS` (ej. `id: 'suma-05'`, `id: 'suma-doble-5-10'`). El `id` NO cambia aunque el nivel se mueva de posición.
2. Guardar el progreso como `{ stars: { 'suma-05': 3, ... } }` (por `id`), no por índice numérico.
3. Al leer/escribir estrellas y decidir desbloqueos, usar `level.id` en lugar de `index`. Migrar el `math_progress` viejo (por índice) mapeando índice→id una única vez, o simplemente resetear si aún no hay usuarios que importen.
4. Con esto, **insertar/reordenar/renombrar niveles NO borra el avance de nadie** y se puede dejar de bumpear `PROGRESS_VERSION` por cambios de orden (solo por cambios que afecten la validez de las estrellas guardadas).

**Pendiente del plan A+B:** los twists están en el MOTOR pero aún **no** hay desbloqueos/telegrafiado en el mapa (§6.5) ni tienda de estrellas. Próximo gran bloque = **mundos + desbloqueos** (DISEÑO §6-7).

## 16. Mundo Resta + limpieza de niveles (2026-07-04)

- **Se eliminaron los 18 niveles avanzados viejos** (prototipo con mecánica rotativa `tMin/tMax`). Quedan **15 niveles**: 10 Suma (§15, intactos) + **5 Resta nuevos** con la mecánica pulida (target fijo, target-rich, siembra local, dígitos útiles). Desbloqueo secuencial (1★ abre el siguiente).
- **Mundo Resta (11-15):** `ops:['−']`, resultados chicos ≥0 (sin negativos), dígitos 1-9, quota 10. `11 Primera resta`(1) · `12 Diferencia 2`(2) · `13 Diferencia 3`(3) · `14 Diferencia 5`(5) · `15 Doble resta`([2,4], twist doble objetivo). teach→test→twist, números bajos primero.
- **Generador operación-agnóstico:** la regla del pool "frío" pasó de "dígitos < objetivo" (solo servía para suma) a **"dígitos = operandos útiles"** (los que devuelve `targetTriples`, que maneja `+ − × ÷`). En resta el minuendo es mayor al resultado (9−4=5) → esos dígitos ahora aparecen; en suma sigue sin salir un "5" en formá-5. Verificado 1500 tableros/nivel: 0 formadas, 0 deadlocks, resultados ≥0.
- **`PROGRESS_VERSION='5'`** (cambió cantidad y contenido → reset).
