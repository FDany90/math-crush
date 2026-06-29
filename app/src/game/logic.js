// ====================================================================
// Lógica del juego — pura, independiente de React/Pixi.
// Opera sobre una grilla de caracteres: grid[r][c] = '7' | '+' | '=' ...
// ====================================================================

export const DIGITS = "0123456789".split("");
export const OPS = ["+", "−", "×", "÷"];
export const EQ = "=";
export const COLS = 8;
export const ROWS = 8;

export function isSpecial(ch) { return ch === EQ || OPS.includes(ch); }
export function randDigit() { return DIGITS[Math.floor(Math.random() * 10)]; }

export function kindOf(ch) {
  if (ch === EQ) return "eq";
  if (OPS.includes(ch)) return "op";
  return "num";
}

// Generador de fichas según porcentajes configurables.
export function makeRandTile(cfg) {
  return () => {
    const x = Math.random() * 100;
    if (x < cfg.pctOps) return OPS[Math.floor(Math.random() * OPS.length)];
    if (x < cfg.pctOps + cfg.pctEq) return EQ;
    return randDigit();
  };
}

// Objetivo que escala con el nivel: más difícil de formar al avanzar.
export function randomTarget(level) {
  const base = 3 + level * 2;
  const span = 6 + level * 2;
  return base + Math.floor(Math.random() * span);
}

// --------- evaluación de expresiones ----------
export function evalExpr(tokens) {
  if (!tokens.length) return null;
  const seq = [];
  let numBuf = "";
  for (const t of tokens) {
    if (DIGITS.includes(t)) numBuf += t;
    else if (OPS.includes(t)) {
      if (numBuf === "") return null;
      seq.push(["num", parseInt(numBuf, 10)]); numBuf = "";
      seq.push(["op", t]);
    } else return null;
  }
  if (numBuf === "") return null;
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

export function isValidEquation(chars) {
  if (chars.length < 3) return false;
  if (chars.filter((c) => c === EQ).length !== 1) return false;
  if (!chars.some((c) => OPS.includes(c))) return false;
  const i = chars.indexOf(EQ);
  const lv = evalExpr(chars.slice(0, i));
  const rv = evalExpr(chars.slice(i + 1));
  if (lv === null || rv === null) return false;
  return Math.abs(lv - rv) < 1e-9;
}

export function isTargetExpr(chars, target) {
  if (chars.length < 3) return false;
  if (chars.includes(EQ)) return false;
  if (!chars.some((c) => OPS.includes(c))) return false;
  const v = evalExpr(chars);
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

export function findEquationCells(grid) { return scanAll(grid, isValidEquation); }
export function findTargetCells(grid, target) { return scanAll(grid, (ch) => isTargetExpr(ch, target)); }
export function findMatches(grid, target) {
  return new Set([...findEquationCells(grid), ...findTargetCells(grid, target)]);
}

// --------- mantenimiento del tablero ----------
// Sin operadores/= pegados y con un mínimo de '='. Devuelve celdas modificadas.
export function tidyBoard(grid, cfg) {
  const changed = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isSpecial(grid[r][c])) continue;
      const left = c > 0 && isSpecial(grid[r][c - 1]);
      const up = r > 0 && isSpecial(grid[r - 1][c]);
      if ((left || up) && Math.random() < 0.85) { grid[r][c] = randDigit(); changed.push([r, c]); }
    }
  }
  let eq = 0;
  for (const row of grid) for (const ch of row) if (ch === EQ) eq++;
  let guard = 0;
  while (eq < cfg.minEq && guard++ < 300) {
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

// Grilla nueva sin matches iniciales.
export function newGrid(cfg, target, randTile) {
  const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, randTile));
  tidyBoard(grid, cfg);
  let guard = 0;
  let m = findMatches(grid, target);
  while (m.size && guard++ < 60) {
    for (const key of m) { const [r, c] = key.split(",").map(Number); grid[r][c] = randTile(); }
    tidyBoard(grid, cfg);
    m = findMatches(grid, target);
  }
  return grid;
}

export const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

// Busca un swap adyacente que forme alguna jugada (para la pista).
export function findHintFallback(grid, target) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
        if (r2 >= ROWS || c2 >= COLS) continue;
        const g = grid.map((row) => row.slice());
        const t = g[r][c]; g[r][c] = g[r2][c2]; g[r2][c2] = t;
        if (findMatches(g, target).size > 0) return { a: { r, c }, b: { r: r2, c: c2 } };
      }
    }
  }
  return null;
}
