# Math Crush — Documentación / Traspaso

> Match-3 estilo Candy Crush pero con **números y operadores matemáticos**.
> Arrastrás fichas y, si formás un **resultado objetivo** en una línea, explota y suma puntos.

Última actualización: **2026-06-29**.

---

## 1. Concepto del juego

- Tablero NxN de fichas: **dígitos** `0-9`, **operadores** `+ − × ÷`, y a veces `=`.
- **Arrastrás** (drag & drop) una ficha hacia su vecina para intercambiarlas.
- Una **línea contigua** (fila o columna) explota si forma uno de los **objetivos** activos.
  - **Dirección de lectura:** filas `→` izquierda a derecha; columnas `↓` arriba a abajo (hay flechas en la UI que lo indican). La resta/división no son conmutativas, por eso importa.
- Hay **3 objetivos posibles a la vez** (chips "Hacé 5 · 3 · 2"), todos **garantizados resolubles en un movimiento** (objetivo inteligente).
- Si el swap **no** forma cuenta, **vuelve para atrás** (estilo Candy Crush).
- Al cumplir un objetivo: el chip se pone **verde con ✓**, las fichas explotan (con resaltado previo), caen nuevas (gravedad) y puede haber **combos en cascada**.

---

## 2. Estructura del juego

- **Modo:** por **tiempo, 2 minutos** por nivel. El reloj arranca en tu primer movimiento.
- **Objetivo:** hacer el **máximo puntaje** posible en esos 2 min.
- **Estrellas:** según puntaje vs `goal` del nivel → 1★ = `goal`, 2★ = `goal×2`, 3★ = `goal×3`.
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
| `goal` | Puntaje para 1★ (2★=×2, 3★=×3) | `450` |

**Reglas prácticas:**
- El **orden del array = orden en el mapa** (índice 0 = nivel 1, abajo).
- Para un nivel **temático**, poné solo ese operador en `ops` (ej. `['−']` = solo restas → no sobran operadores de otro tipo).
- `tMax` es un tope: el objetivo nunca lo supera. Con `maxDigits: 1` igual se llega a números grandes sumando varios dígitos (`9+8+7`), pero los **números tile** son de 1 cifra.
- Progresión actual: **5 niveles por tamaño** (5×5 → 6×6 → 7×7 → 8×8), 20 en total.

**Ejemplo — agregar un nivel de restas más difícil:**
```js
{ name: 'Restas duras', size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, tMin: 1, tMax: 8, goal: 600 },
```

> Nota sobre la **paridad** de los objetivos: emerge de la aritmética (restas tienden a impares, multiplicaciones a pares). Se podría hacer niveles solo-pares / solo-impares filtrando en `targetPool` por `v % 2` (idea pendiente).

---

## 6. Pendientes / próximos pasos

**Calibrar (lo primero a hacer jugando):**
- [ ] **Metas de puntaje** (`goal` por nivel) ahora que es por tiempo (2 min). Anotar el puntaje máximo que se llega y ajustar los umbrales de 1/2/3★.

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
- **Objetivo inteligente** (3 a la vez, siempre resolubles) en vez de número al azar.
- **Por tiempo (2 min)** en vez de límite de movidas (modo score-attack).
- **Lectura en una sola dirección** (`→` y `↓`); se descartó la bidireccional por ser matemáticamente ambigua. Flechas en la UI lo indican.
- **`maxDigits` por nivel**: en niveles bajos solo números de 1 cifra (no `34−25`).
- **Reposición de operadores** entre jugadas para que el tablero no se seque.
- **Niveles temáticos por operador** (suma / resta / combinado / etc.) para que ningún operador quede "sin usar".

---

## 8. Notas de entorno

- Windows 11, Node v24, repo git en `FDany90/math-crush` (rama `main`).
- El prototipo viejo DOM sigue en la raíz (`index.html`, `server.js`) solo como referencia histórica.
- Build de Vercel: Root Directory = `app`.
