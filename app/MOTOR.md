# Motor de Math Crush — cómo se calcula, valida y ejecuta una cuenta

Este documento explica la lógica del juego: cómo el código **calcula** un resultado,
cómo **valida** si una jugada forma un objetivo, y cómo lo **ejecuta** (explota y suma).

Todo el cálculo vive en [`src/game/logic.js`](src/game/logic.js) (puro, sin React/Pixi).
La orquestación (qué pasa cuando jugás) vive en [`src/game/controller.js`](src/game/controller.js).

---

## 0. Representación del tablero

El tablero es una matriz de caracteres: `grid[r][c]` puede ser:
- un **dígito** `'0'`…`'9'`
- un **operador** `'+'`, `'−'`, `'×'`, `'÷'`
- un **igual** `'='`

Las dimensiones se derivan de la propia grilla (`grid.length` × `grid[0].length`), porque el
tablero cambia de tamaño según el nivel (5×5 → 8×8).

**Dirección de lectura:** las cuentas se leen en una sola dirección:
- **Filas:** izquierda → derecha (`→`)
- **Columnas:** arriba → abajo (`↓`)

(La resta y la división no son conmutativas, así que la dirección importa. Las flechas en la UI lo indican.)

---

## 1. Calcular un resultado — `evalExpr(tokens, maxDigits)`

Es el corazón del motor. Recibe una lista de caracteres (ej. `['2','3','+','4']`) y devuelve el
número que da, o `null` si no es una expresión aritmética válida.

Pasos:
1. **Arma los números**: junta dígitos consecutivos en un buffer (`'2','3'` → `23`).
   - `maxDigits` limita cuántas cifras puede tener cada número. Si un número supera ese límite
     (ej. `23` cuando el nivel sólo permite 1 cifra) → devuelve `null`. Por eso en niveles bajos
     `34−25` no se considera cuenta válida.
2. **Aplica precedencia**: primero resuelve `×` y `÷`, después `+` y `−`.
   - División por cero → `null`.
3. Devuelve el resultado acumulado.

Casos que devuelven `null` (expresión inválida): empieza/termina en operador, dos operadores
seguidos, número con demasiadas cifras, división por cero.

> **Todo lo demás se apoya en `evalExpr`.** Validar es "¿este segmento da el objetivo?" y generar
> objetivos es "¿qué da cada segmento posible?". Misma herramienta, dos usos.

---

## 2. Validar una jugada

### 2.1 ¿Un segmento cumple un objetivo? — `isTargetExpr(chars, target, maxDigits)`

Un segmento es válido para un objetivo si:
```
largo ≥ 3   &&   no contiene '='   &&   tiene ≥1 operador   &&   evalExpr(chars) === target
```

### 2.2 Escanear filas y columnas — `findTargetCellsMulti(grid, targets, maxDigits)`

Una fila/columna tiene muchas fichas; hay que encontrar **qué pedazos** forman un objetivo.
`scanLineMulti` recorre cada línea y, desde cada posición de inicio, busca el **segmento contiguo
más largo** que dé **cualquiera** de los objetivos activos. Cuando lo encuentra:
- marca esas celdas (en `cells`, formato `"r,c"`)
- anota qué valor se cumplió (en `hit`) → sirve para consumir ese objetivo
- continúa el escaneo desde el final del segmento (no se solapan)

Corre sobre **todas las filas y todas las columnas** y devuelve `{ cells, hit }`.

### 2.3 Ecuaciones con `=` — `findEquationCells(grid, maxDigits)`

Para los niveles con `=`. `isValidEquation` parte la línea en el `=`, evalúa cada lado con
`evalExpr` y verifica que sean iguales.

### 2.4 Unión — `findMatchesMulti(grid, targets, maxDigits)`

Devuelve el conjunto de **todas** las celdas que hay que romper (objetivos + ecuaciones).
Es la función que se usa para decidir si una jugada es válida.

---

## 3. Generar objetivos inteligentes (siempre resolubles)

El objetivo no es al azar: se elige analizando el tablero, de modo que **siempre exista al menos
un movimiento que lo resuelve**.

### 3.1 ¿Qué valores ya están formados? — `achievableValues(grid, maxDigits)`

Recorre todas las líneas y, con `valuesOfLine`, junta **todos los valores** de **todos los
subsegmentos** (largo ≥3 con operador) evaluados con `evalExpr`. Esto es `base` = lo que ya se
puede hacer sin mover nada.

### 3.2 Simular cada movimiento — `targetPool(grid, level)`

El núcleo del "objetivo inteligente":
```
para cada celda (r,c):
   para cada vecino (derecha y abajo):
      g = copia del tablero con ESE intercambio aplicado
      valores = valuesOfLine de las líneas afectadas por el swap
      para cada valor v:
         si v NO estaba en `base`  &&  0 < v ≤ tMax_del_nivel:
            v es candidato
```
O sea: por cada intercambio posible de dos fichas adyacentes (números **u** operadores), calcula
qué **valores nuevos** podrían formarse — que no estuvieran ya (para que el objetivo requiera mover
de verdad) y que no superen el tope del nivel (para no pedir números enormes).

> Optimización: tras cada swap sólo recalcula las **líneas que cambiaron**, no todo el tablero.

### 3.3 Elegir 3 — `pickTargets(grid, level, keep, count)`

Arma la lista de hasta 3 objetivos:
- **Conserva** los objetivos previos (`keep`) que **sigan siendo logrables** (siguen en el pool).
- **Completa** con candidatos nuevos, priorizando los que caen en el rango `[tMin, tMax]` del nivel.

Por construcción, cada objetivo de los 3 tiene al menos un movimiento que lo resuelve. Si el pool
queda vacío (tablero sin jugadas), el controlador re-mezcla.

---

## 4. Ejecutar una jugada (flujo completo)

En [`controller.js`](src/game/controller.js), cuando arrastrás una ficha:

```
onDragSwap(a, b) → _commitSwap(a, b)
```

`_commitSwap`:
1. Aplica el intercambio en el tablero visual (`board.swap`).
2. Pregunta `findMatchesMulti(grid, targets, maxDigits)`: ¿se formó alguna cuenta?
3. **Si NO** → deshace el swap (vuelve para atrás, estilo Candy Crush) y avisa "No forma cuenta".
4. **Si SÍ** → llama a `_resolve()` (la cascada).

`_resolve()` (bucle de cascada):
```
mientras haya matches:
   eq  = findEquationCells(grid, maxDigits)
   tg  = findTargetCellsMulti(grid, targets, maxDigits)
   celdas = eq ∪ tg.cells
   sumar puntaje (con bonus por combo y por ecuación)
   tg.hit  → marcar objetivos cumplidos (consumed) y avisar a la UI (chip ✓)
   board.highlight(celdas)   // resalta la combinación ~0.6s
   board.shake + board.popup("+N")
   board.clear(celdas)       // explosión con partículas
   board.collapse()          // gravedad + refill (caen fichas nuevas)
   _applyTidy()              // mantenimiento del tablero
```

Después de la cascada — `_afterMove(consumed)`:
1. `_replenishOperators()` — repone operadores si el tablero quedó con pocos.
2. `_pickTargets(consumed)` — descarta los objetivos cumplidos, conserva los que siguen válidos,
   y completa con nuevos (todos resolubles).

El puntaje se acumula durante toda la partida (modo por **tiempo**: 2 minutos). Al terminar, las
**estrellas** se calculan según `score` vs `goal` del nivel (`starsFor`).

---

## 5. Pista y anti-deadlock — `findHintFallback(grid, targets, maxDigits)`

Prueba cada intercambio adyacente y devuelve el **primero** que produzca `findMatchesMulti > 0`.
Se usa para:
- El botón **💡 Pista** (resalta esas dos fichas).
- El **anti-deadlock**: si no existe ninguna jugada, re-mezcla el tablero.

---

## 6. Configuración por nivel

En [`src/game/levels.js`](src/game/levels.js) cada nivel define:
- `size` — tablero NxN
- `digits` — dígitos permitidos (ej. `1..5`)
- `ops` — operadores permitidos (ej. `['+']`, `['−']`, `['+','−','×','÷']`)
- `eq` — si hay `=`
- `maxDigits` — cifras máximas por número (1 = sólo una cifra)
- `tMin`/`tMax` — rango preferido del objetivo
- `goal` — puntaje para 1 estrella (2★ = goal×2, 3★ = goal×3)

`makeGen(level, cfg)` arma el generador de fichas que respeta esos límites, y `symbolAllowed`
filtra qué power-ups aparecen según el nivel.

---

## Resumen de una línea

**Validar** = `evalExpr(segmento) === objetivo`.
**Generar** = simular cada swap y juntar los `evalExpr` nuevos ≤ tMax.
**Ejecutar** = swap → `findMatchesMulti` → cascada (highlight → clear → collapse) → reponer y re-elegir objetivos.
