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

export function isTargetExpr(chars, target, maxDigits = Infinity) {
  if (chars.length < 3) return false;
  if (chars.includes(EQ)) return false;
  if (!chars.some((c) => OPS.includes(c))) return false;
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
// Devuelve { cells: Set("r,c"), hit: Set(valores cumplidos) }.
function scanLineMulti(cells, targetSet, outCells, outHit, maxDigits) {
  let start = 0;
  while (start < cells.length) {
    let bestEnd = -1, bestVal = null;
    for (let end = cells.length; end > start + 2; end--) {
      const seg = cells.slice(start, end).map((x) => x.ch);
      if (seg.includes(EQ)) continue;
      if (!seg.some((c) => OPS.includes(c))) continue;
      const v = evalExpr(seg, maxDigits);
      if (v !== null && targetSet.has(v)) { bestEnd = end; bestVal = v; break; }
    }
    if (bestEnd !== -1) {
      for (let k = start; k < bestEnd; k++) outCells.add(cells[k].r + "," + cells[k].c);
      outHit.add(bestVal);
      start = bestEnd;
    } else start++;
  }
}
export function findTargetCellsMulti(grid, targets, maxDigits = Infinity) {
  const [ROWS, COLS] = dimsOf(grid);
  const targetSet = new Set(targets);
  const cells = new Set(), hit = new Set();
  for (let r = 0; r < ROWS; r++) {
    const line = []; for (let c = 0; c < COLS; c++) line.push({ r, c, ch: grid[r][c] });
    scanLineMulti(line, targetSet, cells, hit, maxDigits);
  }
  for (let c = 0; c < COLS; c++) {
    const line = []; for (let r = 0; r < ROWS; r++) line.push({ r, c, ch: grid[r][c] });
    scanLineMulti(line, targetSet, cells, hit, maxDigits);
  }
  return { cells, hit };
}
export function findMatchesMulti(grid, targets, maxDigits = Infinity) {
  return new Set([...findEquationCells(grid, maxDigits), ...findTargetCellsMulti(grid, targets, maxDigits).cells]);
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

// Mantiene un mínimo de operadores en el tablero (repone tras consumirlos).
// Sólo AGREGA operadores (convierte dígitos); nunca los quita. Devuelve celdas cambiadas.
export function ensureMinOperators(grid, gen, min) {
  const [ROWS, COLS] = dimsOf(grid);
  let count = 0;
  for (const row of grid) for (const ch of row) if (OPS.includes(ch)) count++;
  const changed = [];
  let guard = 0;
  while (count < min && guard++ < 200) {
    const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
    if (isSpecial(grid[r][c])) continue;
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
function valuesOfLine(cells, set, maxDigits) {
  const n = cells.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      const seg = cells.slice(i, j + 1);
      if (!seg.some((c) => OPS.includes(c))) continue;
      const v = evalExpr(seg, maxDigits);
      if (v !== null && Number.isInteger(v)) set.add(v);
    }
  }
}
const getRow = (grid, r) => grid[r].slice();
const getCol = (grid, c) => grid.map((row) => row[c]);

export function achievableValues(grid, maxDigits) {
  const [R, C] = dimsOf(grid);
  const s = new Set();
  for (let r = 0; r < R; r++) valuesOfLine(getRow(grid, r), s, maxDigits);
  for (let c = 0; c < C; c++) valuesOfLine(getCol(grid, c), s, maxDigits);
  return s;
}

// Conjunto de valores que NO están formados pero SÍ se logran con un swap adyacente
// (candidatos válidos para objetivo). Nunca mayores al tMax del nivel.
export function targetPool(grid, level) {
  const md = level.maxDigits;
  const base = achievableValues(grid, md);
  const [R, C] = dimsOf(grid);
  const cand = new Set();
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
        if (r2 >= R || c2 >= C) continue;
        const g = grid.map((row) => row.slice());
        const t = g[r][c]; g[r][c] = g[r2][c2]; g[r2][c2] = t;
        const s = new Set();
        valuesOfLine(getRow(g, r), s, md); valuesOfLine(getCol(g, c), s, md);
        if (r2 !== r) valuesOfLine(getRow(g, r2), s, md);
        if (c2 !== c) valuesOfLine(getCol(g, c2), s, md);
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

// Busca un swap adyacente que forme alguna jugada (para la pista / anti-deadlock).
export function findHintFallback(grid, targets, maxDigits = Infinity) {
  const [ROWS, COLS] = dimsOf(grid);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
        if (r2 >= ROWS || c2 >= COLS) continue;
        const g = grid.map((row) => row.slice());
        const t = g[r][c]; g[r][c] = g[r2][c2]; g[r2][c2] = t;
        if (findMatchesMulti(g, targets, maxDigits).size > 0) return { a: { r, c }, b: { r: r2, c: c2 } };
      }
    }
  }
  return null;
}
