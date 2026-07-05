// ====================================================================
// Lógica del juego — pura, independiente de React/Pixi.
// Opera sobre una grilla de caracteres: grid[r][c] = '7' | '+' | '=' ...
// Las dimensiones se derivan de la propia grilla (tablero variable por nivel).
// ====================================================================

export const DIGITS = "0123456789".split("");
export const OPS = ["+", "−", "×", "÷"];
export const EQ = "=";

const dimsOf = (grid) => [grid.length, grid[0].length];

export function isSpecial(ch) { return ch === EQ || OPS.includes(ch); }
export function randDigit() { return DIGITS[Math.floor(Math.random() * 10)]; }

// cantidad de operadores en un segmento. Una "cuenta" simple tiene 1 (num op num);
// maxOps limita cuántos se permiten (default 1 = sin cuentas encadenadas tipo a+b−c).
export function opCount(chars) { let n = 0; for (const c of chars) if (OPS.includes(c)) n++; return n; }

export function kindOf(ch) {
  if (ch === EQ) return "eq";
  if (OPS.includes(ch)) return "op";
  return "num";
}

// --------- evaluación de expresiones ----------
// maxDigits limita cuántas cifras puede tener cada número (1 = sólo unidades).
export function evalExpr(tokens, maxDigits = Infinity) {
  if (!tokens.length) return null;
  const seq = [];
  let numBuf = "";
  for (const t of tokens) {
    if (DIGITS.includes(t)) numBuf += t;
    else if (OPS.includes(t)) {
      if (numBuf === "" || numBuf.length > maxDigits) return null;
      seq.push(["num", parseInt(numBuf, 10)]); numBuf = "";
      seq.push(["op", t]);
    } else return null;
  }
  if (numBuf === "" || numBuf.length > maxDigits) return null;
  seq.push(["num", parseInt(numBuf, 10)]);
  // precedencia: × ÷ primero
  const pass1 = [seq[0]];
  for (let i = 1; i < seq.length; i += 2) {
    const op = seq[i][1], rhs = seq[i + 1][1];
    if (op === "×" || op === "÷") {
      const prev = pass1.pop()[1];
      if (op === "÷" && rhs === 0) return null;
      pass1.push(["num", op === "×" ? prev * rhs : prev / rhs]);
    } else { pass1.push(seq[i]); pass1.push(seq[i + 1]); }
  }
  let acc = pass1[0][1];
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i][1], rhs = pass1[i + 1][1];
    acc = op === "+" ? acc + rhs : acc - rhs;
  }
  return acc;
}

// Las cuentas se leen en una sola dirección: izq→der (filas) y arriba→abajo (columnas).
export function isValidEquation(chars, maxDigits = Infinity) {
  if (chars.length < 3) return false;
  if (chars.filter((c) => c === EQ).length !== 1) return false;
  if (!chars.some((c) => OPS.includes(c))) return false;
  const i = chars.indexOf(EQ);
  const lv = evalExpr(chars.slice(0, i), maxDigits);
  const rv = evalExpr(chars.slice(i + 1), maxDigits);
  if (lv === null || rv === null) return false;
  return Math.abs(lv - rv) < 1e-9;
}

export function isTargetExpr(chars, target, maxDigits = Infinity, maxOps = 1) {
  if (chars.length < 3) return false;
  if (chars.includes(EQ)) return false;
  const ops = opCount(chars);
  if (ops < 1 || ops > maxOps) return false;
  const v = evalExpr(chars, maxDigits);
  return v !== null && Math.abs(v - target) < 1e-9;
}

// --------- escaneo de líneas ----------
function scanLineWith(cells, validFn) {
  const hits = [];
  let start = 0;
  while (start < cells.length) {
    let bestEnd = -1;
    for (let end = cells.length; end > start + 2; end--) {
      if (validFn(cells.slice(start, end).map((x) => x.ch))) { bestEnd = end; break; }
    }
    if (bestEnd !== -1) { for (let k = start; k < bestEnd; k++) hits.push(cells[k]); start = bestEnd; }
    else start++;
  }
  return hits;
}

function scanAll(grid, validFn) {
  const [ROWS, COLS] = dimsOf(grid);
  const s = new Set();
  for (let r = 0; r < ROWS; r++) {
    const line = [];
    for (let c = 0; c < COLS; c++) line.push({ r, c, ch: grid[r][c] });
    for (const cell of scanLineWith(line, validFn)) s.add(cell.r + "," + cell.c);
  }
  for (let c = 0; c < COLS; c++) {
    const line = [];
    for (let r = 0; r < ROWS; r++) line.push({ r, c, ch: grid[r][c] });
    for (const cell of scanLineWith(line, validFn)) s.add(cell.r + "," + cell.c);
  }
  return s;
}

export function findEquationCells(grid, maxDigits = Infinity) {
  return scanAll(grid, (ch) => isValidEquation(ch, maxDigits));
}

// Busca segmentos que den CUALQUIERA de los objetivos activos.
// Devuelve el nº de segmentos encontrados en la línea (para contar cuentas por segmento,
// no por valor distinto: formar el objetivo 2 veces en un movimiento = 2 cuentas).
function scanLineMulti(cells, targetSet, outCells, outHit, maxDigits, maxOps = 1, acc = null) {
  let start = 0, segs = 0;
  while (start < cells.length) {
    let bestEnd = -1, bestVal = null;
    for (let end = cells.length; end > start + 2; end--) {
      const seg = cells.slice(start, end).map((x) => x.ch);
      if (seg.includes(EQ)) continue;
      const ops = opCount(seg);
      if (ops < 1 || ops > maxOps) continue;
      const v = evalExpr(seg, maxDigits);
      if (v !== null && targetSet.has(v)) { bestEnd = end; bestVal = v; break; }
    }
    if (bestEnd !== -1) {
      for (let k = start; k < bestEnd; k++) outCells.add(cells[k].r + "," + cells[k].c);
      outHit.add(bestVal);
      if (acc) {
        acc.sum += bestVal;                             // suma del VALOR (modo acumulativo)
        acc.byVal[bestVal] = (acc.byVal[bestVal] || 0) + 1;   // segmentos POR objetivo (vasos)
      }
      segs++;
      start = bestEnd;
    } else start++;
  }
  return segs;
}
export function findTargetCellsMulti(grid, targets, maxDigits = Infinity, maxOps = 1) {
  const [ROWS, COLS] = dimsOf(grid);
  const targetSet = new Set(targets);
  const cells = new Set(), hit = new Set();
  const acc = { sum: 0, byVal: {} };
  let segs = 0;   // cantidad de cuentas formadas (por segmento)
  for (let r = 0; r < ROWS; r++) {
    const line = []; for (let c = 0; c < COLS; c++) line.push({ r, c, ch: grid[r][c] });
    segs += scanLineMulti(line, targetSet, cells, hit, maxDigits, maxOps, acc);
  }
  for (let c = 0; c < COLS; c++) {
    const line = []; for (let r = 0; r < ROWS; r++) line.push({ r, c, ch: grid[r][c] });
    segs += scanLineMulti(line, targetSet, cells, hit, maxDigits, maxOps, acc);
  }
  return { cells, hit, segs, sum: acc.sum, byVal: acc.byVal };   // sum/byVal para acumulativo y vasos
}
export function findMatchesMulti(grid, targets, maxDigits = Infinity, maxOps = 1) {
  return new Set([...findEquationCells(grid, maxDigits), ...findTargetCellsMulti(grid, targets, maxDigits, maxOps).cells]);
}

// --------- mantenimiento del tablero ----------
// gen = generador del nivel: { randDigit, randTile, eqEnabled, minEq }
// Garantiza un mínimo de '=' (si el nivel los permite). Ya no toca los operadores.
export function tidyBoard(grid, gen) {
  const [ROWS, COLS] = dimsOf(grid);
  const changed = [];
  if (!gen.eqEnabled || gen.minEq <= 0) return changed;
  let eq = 0;
  for (const row of grid) for (const ch of row) if (ch === EQ) eq++;
  let guard = 0;
  while (eq < gen.minEq && guard++ < 300) {
    const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
    if (isSpecial(grid[r][c])) continue;
    const clean =
      (c === 0 || !isSpecial(grid[r][c - 1])) && (c === COLS - 1 || !isSpecial(grid[r][c + 1])) &&
      (r === 0 || !isSpecial(grid[r - 1][c])) && (r === ROWS - 1 || !isSpecial(grid[r + 1][c]));
    if (!clean) continue;
    grid[r][c] = EQ; eq++; changed.push([r, c]);
  }
  return changed;
}

// Deja entre `min` y `max` operadores por fila (agrega si faltan, quita si sobran).
function ensureRowOperators(grid, gen, min, max) {
  const [ROWS, COLS] = dimsOf(grid);
  for (let r = 0; r < ROWS; r++) {
    const opCols = [];
    for (let c = 0; c < COLS; c++) if (OPS.includes(grid[r][c])) opCols.push(c);
    let guard = 0;
    while (opCols.length < min && guard++ < 30) {       // faltan -> agregar sobre un dígito
      const c = Math.floor(Math.random() * COLS);
      if (isSpecial(grid[r][c])) continue;
      grid[r][c] = gen.ops[Math.floor(Math.random() * gen.ops.length)];
      opCols.push(c);
    }
    while (opCols.length > max) {                        // sobran -> volver a dígito
      const c = opCols.splice(Math.floor(Math.random() * opCols.length), 1)[0];
      grid[r][c] = gen.randDigit();
    }
  }
}

// ¿un operador en (r,c) puede ser el centro de "num op num" en ALGUNA línea?
// (necesita dos vecinos NO especiales enfrentados, en fila o en columna).
function opUsableAt(grid, r, c, ROWS, COLS) {
  const hMid = c > 0 && c < COLS - 1 && !isSpecial(grid[r][c - 1]) && !isSpecial(grid[r][c + 1]);
  const vMid = r > 0 && r < ROWS - 1 && !isSpecial(grid[r - 1][c]) && !isSpecial(grid[r + 1][c]);
  return hMid || vMid;
}

// Convierte a dígito los operadores VARADOS: los que no pueden ser el centro de una
// cuenta en ninguna línea (esquinas, o rodeados de otros operadores/bordes). Limpia
// el tablero de operadores inservibles. Un solo paso (quitar especiales sólo puede
// mejorar a los vecinos, nunca empeorarlos). Devuelve celdas cambiadas.
export function destrandOperators(grid, gen) {
  const [ROWS, COLS] = dimsOf(grid);
  const changed = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!OPS.includes(grid[r][c])) continue;
    if (!opUsableAt(grid, r, c, ROWS, COLS)) { grid[r][c] = gen.randDigit(); changed.push([r, c]); }
  }
  return changed;
}

// Mantiene un mínimo de operadores en el tablero (repone tras consumirlos).
// Sólo AGREGA operadores (convierte dígitos); nunca los quita. Elige celdas donde el
// operador SIRVE (centro de una cuenta) y REPARTIDAS (evita amontonarlos). Devuelve celdas.
export function ensureMinOperators(grid, gen, min) {
  const [ROWS, COLS] = dimsOf(grid);
  const isOp = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS && OPS.includes(grid[r][c]);
  let count = 0;
  for (const row of grid) for (const ch of row) if (OPS.includes(ch)) count++;
  const changed = [];
  let guard = 0;
  while (count < min && guard++ < 200) {
    let best = null, bestScore = Infinity;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (isSpecial(grid[r][c]) || !opUsableAt(grid, r, c, ROWS, COLS)) continue;  // no varados
      // menos operadores vecinos = mejor reparto; desempate al azar
      const adj = (isOp(r, c - 1) ? 1 : 0) + (isOp(r, c + 1) ? 1 : 0) + (isOp(r - 1, c) ? 1 : 0) + (isOp(r + 1, c) ? 1 : 0);
      const score = adj * 2 + Math.random();
      if (score < bestScore) { bestScore = score; best = [r, c]; }
    }
    if (!best) break;                                   // no hay lugar sano -> mejor no forzar
    const [r, c] = best;
    grid[r][c] = gen.ops[Math.floor(Math.random() * gen.ops.length)];
    count++; changed.push([r, c]);
  }
  return changed;
}

// Grilla nueva (rows x cols) sin ecuaciones iniciales (el objetivo se elige aparte).
export function newGrid(gen, rows, cols, maxDigits = Infinity) {
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, gen.randTile));
  tidyBoard(grid, gen);
  let guard = 0;
  let m = findEquationCells(grid, maxDigits);
  while (m.size && guard++ < 60) {
    for (const key of m) { const [r, c] = key.split(",").map(Number); grid[r][c] = gen.randTile(); }
    tidyBoard(grid, gen);
    m = findEquationCells(grid, maxDigits);
  }
  ensureRowOperators(grid, gen, 1, Math.max(1, Math.round(cols / 3)));  // 1..~2 por fila
  return grid;
}

// --------- objetivo inteligente ----------
// Todos los valores enteros que se pueden formar en una línea (segmentos len>=3 con operador).
function valuesOfLine(cells, set, maxDigits, maxOps = 1) {
  const n = cells.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      const seg = cells.slice(i, j + 1);
      const ops = opCount(seg);
      if (ops < 1 || ops > maxOps) continue;
      const v = evalExpr(seg, maxDigits);
      if (v !== null && Number.isInteger(v)) set.add(v);
    }
  }
}
const getRow = (grid, r) => grid[r].slice();
const getCol = (grid, c) => grid.map((row) => row[c]);

export function achievableValues(grid, maxDigits, maxOps = 1) {
  const [R, C] = dimsOf(grid);
  const s = new Set();
  for (let r = 0; r < R; r++) valuesOfLine(getRow(grid, r), s, maxDigits, maxOps);
  for (let c = 0; c < C; c++) valuesOfLine(getCol(grid, c), s, maxDigits, maxOps);
  return s;
}

// Conjunto de valores que NO están formados pero SÍ se logran con un swap adyacente
// (candidatos válidos para objetivo). Nunca mayores al tMax del nivel.
export function targetPool(grid, level) {
  const md = level.maxDigits;
  const mo = level.maxOps ?? 1;               // operadores por cuenta (1 = num op num)
  const base = achievableValues(grid, md, mo);
  const [R, C] = dimsOf(grid);
  const cand = new Set();
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
        if (r2 >= R || c2 >= C) continue;
        // swap in-place sobre la copia descartable (evita clonar toda la grilla por candidato)
        const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t;
        const s = new Set();
        valuesOfLine(getRow(grid, r), s, md, mo); valuesOfLine(getCol(grid, c), s, md, mo);
        if (r2 !== r) valuesOfLine(getRow(grid, r2), s, md, mo);
        if (c2 !== c) valuesOfLine(getCol(grid, c2), s, md, mo);
        grid[r2][c2] = grid[r][c]; grid[r][c] = t;   // deshacer el swap
        for (const v of s) if (!base.has(v) && v > 0 && v <= level.tMax) cand.add(v);
      }
    }
  }
  return cand;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Elige hasta `count` objetivos distintos y alcanzables.
// Conserva los de `keep` que sigan siendo válidos; completa con nuevos.
export function pickTargets(grid, level, keep = [], count = 3) {
  const pool = targetPool(grid, level);
  const result = keep.filter((t) => pool.has(t));
  const avail = [...pool].filter((v) => !result.includes(v));
  const inRange = shuffle(avail.filter((v) => v >= level.tMin && v <= level.tMax));
  const below = shuffle(avail.filter((v) => v < level.tMin));
  for (const v of [...inRange, ...below]) {
    if (result.length >= count) break;
    result.push(v);
  }
  return result;
}

export const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

// --------- tableros "sesgados al objetivo" (nivel con target fijo) ---------
// Tríos [a, op, b] de UNA cifra tales que a op b == alguno de los objetivos.
// level.target puede ser un número o un array (twist "doble objetivo"). Sirven para
// ponderar el bag de fichas (que caiga mayormente lo que forma el objetivo).
export function targetTriples(level) {
  const targets = new Set((Array.isArray(level.target) ? level.target : [level.target]).map(Number));
  const digs = level.digits.map(Number);
  const out = [];
  for (const op of level.ops) {
    for (const a of digs) for (const b of digs) {
      let v;
      if (op === '+') v = a + b;
      else if (op === '−') v = a - b;
      else if (op === '×') v = a * b;
      else v = (b !== 0 && a % b === 0) ? a / b : NaN;   // ÷ entero
      if (targets.has(v)) out.push([String(a), op, String(b)]);
    }
  }
  return out;
}

// Cuenta cuántos swaps adyacentes forman el objetivo (corta al llegar a `cap`).
export function countTargetMoves(grid, targets, maxDigits = Infinity, maxOps = 1, cap = Infinity) {
  const [R, C] = dimsOf(grid);
  const set = new Set(targets);
  let n = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
      if (r2 >= R || c2 >= C) continue;
      if (grid[r][c] === '#' || grid[r2][c2] === '#') continue;   // ficha con estado (hielo): no se puede mover
      const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t;
      const ok =
        lineHasMatch(getRow(grid, r), set, maxDigits, maxOps) ||
        lineHasMatch(getCol(grid, c), set, maxDigits, maxOps) ||
        (r2 !== r && lineHasMatch(getRow(grid, r2), set, maxDigits, maxOps)) ||
        (c2 !== c && lineHasMatch(getCol(grid, c2), set, maxDigits, maxOps));
      grid[r2][c2] = grid[r][c]; grid[r][c] = t;
      if (ok && ++n >= cap) return n;
    }
  }
  return n;
}

// Agrega movimientos "de a poco": cambia UNA pieza (un dígito) por vez, lo menos
// brusco posible y de ABAJO hacia arriba (el fondo es lo que se queda sin juego),
// hasta llegar a `want` movimientos. Evita dejar el objetivo ya formado. Devuelve celdas.
// `avoid` = objetivos a NO dejar formados (default = targets). En objetivo doble se pasan
// TODOS los objetivos aunque se refuercen las jugadas de uno solo, para no formar el otro.
export function addTargetMovesSubtle(grid, gen, targets, maxDigits = Infinity, maxOps = 1, want = 3, avoid = targets) {
  const [R, C] = dimsOf(grid);
  const cands = gen.hot && gen.hot.length ? gen.hot : (gen.triples || []).flatMap(([a, , b]) => [a, b]);
  const changed = [];
  let cur = countTargetMoves(grid, targets, maxDigits, maxOps, want);
  let guard = 0;
  while (cur < want && guard++ < 10) {
    let best = null;
    for (let r = R - 1; r >= 0 && !best; r--) {
      for (let c = 0; c < C && !best; c++) {
        const orig = grid[r][c];
        if (isSpecial(orig)) continue;                 // tocamos dígitos (num→num = mínimo cambio)
        for (const v of cands) {
          if (v === orig) continue;
          grid[r][c] = v;
          const formed = findTargetCellsMulti(grid, avoid, maxDigits, maxOps).cells.size;
          const moves = formed ? -1 : countTargetMoves(grid, targets, maxDigits, maxOps, want + 1);
          grid[r][c] = orig;
          if (moves > cur) { best = { r, c, v, moves }; break; }
        }
      }
    }
    if (!best) break;                                  // no encontró cambio de 1 pieza
    grid[best.r][best.c] = best.v;
    changed.push([best.r, best.c]);
    cur = best.moves;
  }
  return changed;
}

function evalOp(aCh, op, bCh) {
  const a = parseInt(aCh, 10), b = parseInt(bCh, 10);
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  return b !== 0 && a % b === 0 ? a / b : NaN;   // ÷
}

// Si el tablero quedó SIN jugadas al objetivo, "planta" una a un movimiento: en una
// fila deja a-op-filler y justo debajo del filler pone b, así un swap vertical forma
// a op b == target. filler se elige para NO dejar la fila ya formada. Devuelve celdas.
export function plantTargetMove(grid, gen, onlyTarget = null) {
  let triples = gen.triples || [];
  if (onlyTarget != null) triples = triples.filter(([a, op, b]) => evalOp(a, op, b) === onlyTarget);
  const [R, C] = dimsOf(grid);
  if (!triples.length || R < 2 || C < 3) return [];
  const [a, op, b] = triples[Math.floor(Math.random() * triples.length)];
  const T = evalOp(a, op, b);
  const r = Math.floor(Math.random() * (R - 1));
  const c = Math.floor(Math.random() * (C - 2));
  let filler = b, guard = 0;
  do { filler = gen.randDigit(); guard++; }
  while (guard < 30 && (filler === b || evalOp(a, op, filler) === T));
  grid[r][c] = a; grid[r][c + 1] = op; grid[r][c + 2] = filler; grid[r + 1][c + 2] = b;
  return [[r, c], [r, c + 1], [r, c + 2], [r + 1, c + 2]];
}

// ¿Colocar el valor actual en (r,c) habilita un swap adyacente (usando esa celda) que
// forme algún objetivo? (para sembrar jugadas: la celda tocada es parte de la jugada).
function cellEnablesMove(grid, r, c, targetSet, maxDigits, maxOps) {
  const [R, C] = dimsOf(grid);
  for (const [r2, c2] of [[r, c + 1], [r, c - 1], [r + 1, c], [r - 1, c]]) {
    if (r2 < 0 || c2 < 0 || r2 >= R || c2 >= C) continue;
    const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t;
    const ok = lineHasMatch(getRow(grid, r), targetSet, maxDigits, maxOps)
      || lineHasMatch(getCol(grid, c), targetSet, maxDigits, maxOps)
      || lineHasMatch(getRow(grid, r2), targetSet, maxDigits, maxOps)
      || lineHasMatch(getCol(grid, c2), targetSet, maxDigits, maxOps);
    grid[r2][c2] = grid[r][c]; grid[r][c] = t;
    if (ok) return true;
  }
  return false;
}

// Siembra "cuentas fáciles" (jugadas a un movimiento) CERCA de las columnas `cols` —donde
// el jugador acaba de jugar—. Cambia dígitos (num→num) dentro de esas columnas hasta que
// haya `want` swaps que formen el objetivo tocando esa banda. No deja cuentas ya formadas.
// Devuelve las celdas transformadas (el controller las anima EXPLÍCITAMENTE con un pop, para
// que el jugador vea que hacer una cuenta acomoda los vecinos y facilita las siguientes).
export function seedTargetMovesNear(grid, gen, targets, cols, maxDigits = Infinity, maxOps = 1, want = 3) {
  const [R, C] = dimsOf(grid);
  const colSet = new Set(cols.filter((c) => c >= 0 && c < C));
  if (!colSet.size) return [];
  const set = new Set(targets);
  const cands = gen.hot && gen.hot.length ? gen.hot : (gen.triples || []).flatMap(([a, , b]) => [a, b]);
  const changed = [];
  // cuántas jugadas al objetivo TOCAN la banda (corta al llegar a `want`)
  const localMoves = () => {
    let n = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
        if (r2 >= R || c2 >= C) continue;
        if (!colSet.has(c) && !colSet.has(c2)) continue;
        const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t;
        const ok = lineHasMatch(getRow(grid, r), set, maxDigits, maxOps)
          || lineHasMatch(getCol(grid, c), set, maxDigits, maxOps)
          || (r2 !== r && lineHasMatch(getRow(grid, r2), set, maxDigits, maxOps))
          || (c2 !== c && lineHasMatch(getCol(grid, c2), set, maxDigits, maxOps));
        grid[r2][c2] = grid[r][c]; grid[r][c] = t;
        if (ok && ++n >= want) return n;
      }
    }
    return n;
  };
  let guard = 0;
  while (localMoves() < want && guard++ < want + 8) {
    let best = null;
    for (let r = 0; r < R && !best; r++) {          // de arriba (fichas nuevas) hacia abajo
      for (const c of colSet) {
        if (isSpecial(grid[r][c])) continue;         // tocamos dígitos
        const orig = grid[r][c];
        for (const v of cands) {
          if (v === orig) continue;
          grid[r][c] = v;
          const forms = lineHasMatch(getRow(grid, r), set, maxDigits, maxOps)
            || lineHasMatch(getCol(grid, c), set, maxDigits, maxOps);   // no dejar formada
          const enables = !forms && cellEnablesMove(grid, r, c, set, maxDigits, maxOps);
          grid[r][c] = orig;
          if (enables) { best = { r, c, v }; break; }
        }
        if (best) break;
      }
    }
    if (!best) break;
    grid[best.r][best.c] = best.v;
    changed.push([best.r, best.c]);
  }
  return changed;
}

// Rompe los objetivos YA formados en el tablero (cambia un dígito por segmento)
// para que arranque "resuelto" (sin matches). Devuelve celdas cambiadas.
export function breakFormedTargets(grid, gen, targets, maxDigits = Infinity, maxOps = 1) {
  const changed = [];
  let guard = 0;
  let cells = findTargetCellsMulti(grid, targets, maxDigits, maxOps).cells;
  while (cells.size && guard++ < 80) {
    let broke = false;
    for (const key of cells) {
      const [r, c] = key.split(',').map(Number);
      if (!isSpecial(grid[r][c])) { grid[r][c] = gen.randDigit(); changed.push([r, c]); broke = true; break; }
    }
    if (!broke) break;
    cells = findTargetCellsMulti(grid, targets, maxDigits, maxOps).cells;
  }
  return changed;
}

// ¿alguna sub-línea (len>=3) forma una ecuación válida o alcanza un objetivo?
function lineHasMatch(chars, targetSet, maxDigits, maxOps = 1) {
  const n = chars.length;
  for (let start = 0; start < n; start++) {
    for (let end = n; end > start + 2; end--) {
      const seg = chars.slice(start, end);
      if (isValidEquation(seg, maxDigits)) return true;
      if (!seg.includes(EQ)) {
        const ops = opCount(seg);
        if (ops >= 1 && ops <= maxOps) {
          const v = evalExpr(seg, maxDigits);
          if (v !== null && targetSet.has(v)) return true;
        }
      }
    }
  }
  return false;
}

// Busca un swap adyacente que forme alguna jugada (para la pista / anti-deadlock).
// El tablero está en estado resuelto (sin matches), así que un swap solo puede crear
// un match en las líneas que pasan por las celdas intercambiadas: chequeamos solo esas
// (en vez de re-escanear TODO el tablero por cada candidato) y hacemos swap in-place.
export function findHintFallback(grid, targets, maxDigits = Infinity, maxOps = 1) {
  const [ROWS, COLS] = dimsOf(grid);
  const targetSet = new Set(targets);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
        if (r2 >= ROWS || c2 >= COLS) continue;
        if (grid[r][c] === '#' || grid[r2][c2] === '#') continue;   // ficha con estado (hielo): no sugerir moverla
        const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t;
        const ok =
          lineHasMatch(getRow(grid, r), targetSet, maxDigits, maxOps) ||
          lineHasMatch(getCol(grid, c), targetSet, maxDigits, maxOps) ||
          (r2 !== r && lineHasMatch(getRow(grid, r2), targetSet, maxDigits, maxOps)) ||
          (c2 !== c && lineHasMatch(getCol(grid, c2), targetSet, maxDigits, maxOps));
        grid[r2][c2] = grid[r][c]; grid[r][c] = t;   // deshacer el swap
        if (ok) return { a: { r, c }, b: { r: r2, c: c2 } };
      }
    }
  }
  return null;
}
