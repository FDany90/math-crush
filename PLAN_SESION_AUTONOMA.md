# Plan de sesión autónoma (2026-07-04) — expansión a 40 niveles + features

> El usuario salió 1 h y pidió avanzar sin preguntar, tomando decisiones con criterio
> y documentándolas. Este doc registra el PLAN, las DECISIONES tomadas y las DUDAS
> a revisar cuando vuelva. Estado de cada ítem al final.

## Pedido original
1. Nivel 10 = Modo Acumulativo (sumar hasta 100). Nivel 20 = Resta acumulativa (100→0).
2. 9 niveles de multiplicación + 9 de división. Niveles 30 y 40 acumulativos (como 10 y 20).
3. Intercalar niveles con 2 objetivos (doble).
4. Mapa: textos y señales del sector (SUMA, RESTA, ×, ÷) con símbolos + texto. Menos infantil.
5. Reward diario en el mapa, implementado. Por ahora da PISTAS.
6. Pistas: se acaban. Máximo 10 en total (pool global). Se pueden usar todas en un nivel
   pero se acaban para el próximo.

## Estructura de niveles resultante (40 = 4 mundos × 9 + 1 acumulativo c/u)
- **SUMA (1-10):** 1-9 regulares (los actuales) + **10 = Acumulativo (0→100, +)**.
- **RESTA (11-20):** 11-19 regulares (los actuales) + **20 = Acumulativo (60→0, −)**.
- **MULTIPLICACIÓN (21-30):** 21-29 regulares (nuevos, con dobles) + **30 = Acumulativo (0→100, +)**.
- **DIVISIÓN (31-40):** 31-39 regulares (nuevos, con dobles) + **40 = Acumulativo (24→0, ÷ resta)**.

## DECISIONES tomadas (revisar al volver)
- **D1 — Modo Acumulativo v1 reusa el motor multi-objetivo.** En vez de "cualquier cuenta
  vale" (que rompía la invariante de "arranca resuelto"), el nivel acumulativo tiene un SET
  de resultados objetivo (como un doble/triple); al formar uno, su VALOR se suma/resta a un
  TOTAL en vez de descontar quota. Se gana al alcanzar la meta. Reusa todo lo existente
  (target-rich, siembra, min-jugadas). ⚠️ v2 futuro: aceptar CUALQUIER expresión válida.
- **D2 — Dirección del acumulador:** suma y multiplicación acumulan HACIA ARRIBA (0→meta);
  resta y división HACIA ABAJO (start→0). Meta/arranque elegidos para ~10-15 cuentas por
  partida (no infinito): suma 0→100, resta 60→0, mult 0→100, div 24→0. (Div y resta suman
  pocos por cuenta → arranque más bajo.)
- **D3 — Pistas globales:** pool único de máx 10 (`math_hints`, localStorage, persiste).
  Reemplaza el `MAX_HINTS=3 por nivel`. Auto-hints (niveles bajos) NO gastan pool. Se
  reponen con el reward diario.
- **D4 — Reward diario:** botón en el mapa. Da +N pistas por día (celebratorio, sin castigo
  por faltar; ver DISEÑO §7.6). 1 vez por día (`math_daily_YYYY-MM-DD`). N=3 pistas/día,
  respetando el tope de 10.
- **D5 — Mapa menos infantil:** paleta más sobria (menos blobs pastel saturados), bandas de
  SECTOR por mundo con símbolo grande (+ − × ÷) + nombre (SUMA/RESTA/…). Se mantiene el
  camino serpenteante pero con estética más "cuaderno/pizarrón" que "caramelo".
- **D6 — Números de multiplicación/división:** ver tablas en levels.js (diseñadas y
  verificadas por simulación: 0 formadas, mínimo de jugadas, sin deadlock). Empiezan fácil
  (tablas chicas) y suben; dobles intercalados.

## DUDAS / a definir con el usuario
- ¿El acumulativo debería aceptar CUALQUIER cuenta (v2) en vez del set de objetivos (v1)?
- ¿Overshoot permitido? (v1: sí — al pasar la meta, ganás igual.)
- ¿El reward diario da pistas o conviene cosméticos/estrellas? (v1: pistas, como pidió.)
- Metas del acumulador (100/60/24) son estimadas; calibrar con playtest.
- ¿Reloj en acumulativo? (v1: sí, contrarreloj normal.)

## Estado FINAL (todo hecho, build limpio, 40 niveles verificados por sim)
- [x] **40 niveles** (Suma 1-10, Resta 11-20, Mult 21-30, Div 31-40). Sim: 0 formadas,
      mínimo de jugadas, 0 deadlocks en TODOS. `PROGRESS_VERSION='6'`.
- [x] **Modo Acumulativo** (niveles 10/20/30/40): `accum:{start,goal}` en levels.js;
      `logic.findTargetCellsMulti` devuelve `sum`; controller `_addAccum` acumula el valor;
      gana al alcanzar la meta (setea `left=0`). UI: barra `.accum-fill` con el total.
- [x] **Pistas globales**: pool máx 10 (`math_hints`, persiste), arranca en 5. `getHintPool`/
      `setHintPool` exportados del controller. Auto-hints no gastan. Reemplaza el 3/nivel.
- [x] **Mapa con sectores**: `WORLDS` (SUMA/RESTA/MULTIPLICAR/DIVISIÓN) con símbolo + nombre
      (`.sector`), color de nodo por mundo (`zoneColor(i)`), blobs atenuados (menos infantil).
- [x] **Reward diario**: botón 🎁 en `.map-top` + pop-up; da +3 pistas 1 vez/día
      (`math_daily_YYYY-MM-DD`), celebratorio, sin castigo. Muestra pistas actuales.

## ⚠️ FALTA VERIFICAR A MANO (no pude testear en runtime, solo build+sim de tableros)
- **Modo Acumulativo en vivo**: que la barra suba/baje bien y que gane al llegar a la meta.
  (La lógica es aritmética simple y compila; probar niveles 10/20/30/40 con el triple-clic.)
- **Reward diario**: reclamar y ver que suma pistas; que el botón muestre el puntito verde.
- Calibrar metas del acumulador (100/40/100/24) y quotas con el playtest.
- División: mundo algo repetitivo (2/3/4 son los únicos cocientes viables con 1 cifra).
  Posible mejora futura: dividendos de 2 cifras (necesita que el generador target-rich
  soporte operandos de 2 cifras — hoy no).
