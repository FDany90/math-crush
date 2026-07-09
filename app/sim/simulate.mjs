// ============================================================================
// HARNESS DE SIMULACIÓN — juega niveles como un jugador y mide todo.
// "No se mejora lo que no se mide." Corré: node (via esbuild bundle, ver run.sh
// o el comando del final). Modela el loop real: movimiento -> cascada/combos ->
// colapso (fichas nuevas caen) -> saneo (nueva lógica: números primero).
//
// Bot: juega un movimiento VÁLIDO al azar (jugador razonable, no óptimo). Así los
// combos por cascada surgen naturalmente. NO modela súper ficha ni jefes (v1):
// esos niveles se marcan como "no modelado".
// ============================================================================
import { LEVELS, makeGen } from '../src/game/levels.js'
import {
  newGrid, destrandOperators, ensureMinOperators, breakFormedTargets, countTargetMoves,
  addTargetMovesSubtle, findHintFallback, findMatchesMulti, findTargetCellsMulti,
  plantTargetMove, OPS,
} from '../src/game/logic.js'

const isOp = (ch) => OPS.includes(ch)
const isDig = (ch) => ch != null && ch >= '0' && ch <= '9'
const dims = (g) => [g.length, g[0].length]

// ---------- mecánica del tablero (réplica del controller/Board) ----------
function collapse(grid, gen) {
  const [R, C] = dims(grid)
  for (let c = 0; c < C; c++) {
    const col = []
    for (let r = R - 1; r >= 0; r--) if (grid[r][c] != null) col.push(grid[r][c])
    for (let r = R - 1, i = 0; r >= 0; r--, i++) grid[r][c] = i < col.length ? col[i] : gen.randTile()
  }
}
function countOps(grid) { let n = 0; for (const row of grid) for (const ch of row) if (isOp(ch)) n++; return n }

// saneo NUEVO (réplica de _healFixedBoard, rama normal). Devuelve métricas de churn.
function heal(grid, gen, targets, md, mo, size) {
  const before = grid.map((r) => r.slice())
  const MIN = 1 /*level.minMoves*/ ? (size <= 5 ? 3 : size - 1) : 0
  const eachMin = 2, perTarget = targets.length > 1
  const changed = []
  destrandOperators(grid, gen)
  breakFormedTargets(grid, gen, targets, md, mo)
  const ensureMoves = () => {
    for (let pass = 0; pass < 4; pass++) {
      let ok = true
      if (perTarget) for (const t of targets) {
        if (countTargetMoves(grid, [t], md, mo, eachMin) < eachMin) { changed.push(...addTargetMovesSubtle(grid, gen, [t], md, mo, eachMin, targets)); ok = false }
      }
      if (countTargetMoves(grid, targets, md, mo, MIN) < MIN) { changed.push(...addTargetMovesSubtle(grid, gen, targets, md, mo, MIN)); ok = false }
      if (ok) break
    }
  }
  ensureMoves()
  const short = () => countTargetMoves(grid, targets, md, mo, MIN) < MIN ||
    (perTarget && targets.some((t) => countTargetMoves(grid, [t], md, mo, eachMin) < eachMin))
  let usedFallback = false
  if (short()) { usedFallback = true; ensureMinOperators(grid, gen, Math.ceil(size * 1.2)); breakFormedTargets(grid, gen, targets, md, mo); ensureMoves() }
  for (const t of (perTarget ? targets : [])) { let g = 0; while (countTargetMoves(grid, [t], md, mo, eachMin) < eachMin && g++ < 4) { const pc = plantTargetMove(grid, gen, targets.length > 1 ? t : null); if (!pc.length) break; breakFormedTargets(grid, gen, targets, md, mo) } }
  if (!findHintFallback(grid, targets, md, mo)) plantTargetMove(grid, gen)
  breakFormedTargets(grid, gen, targets, md, mo)
  // churn: cuántas celdas cambiaron y cuántas dígito->operador
  let cellsChanged = 0, digToOp = 0
  const [R, C] = dims(grid)
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (before[r][c] !== grid[r][c]) cellsChanged++
    if (isDig(before[r][c]) && isOp(grid[r][c])) digToOp++
  }
  return { cellsChanged, digToOp, usedFallback }
}

// lista TODOS los swaps adyacentes que forman algún objetivo
function allMoves(grid, targets, md, mo) {
  const [R, C] = dims(grid); const moves = []
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    for (const [r2, c2] of [[r, c + 1], [r + 1, c]]) {
      if (r2 >= R || c2 >= C) continue
      const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t
      const hit = findTargetCellsMulti(grid, targets, md, mo).cells.size > 0
      grid[r2][c2] = grid[r][c]; grid[r][c] = t
      if (hit) moves.push([r, c, r2, c2])
    }
  }
  return moves
}

// cascada (réplica de _resolve): limpia matches, colapsa, repite. Devuelve puntos.
function resolve(grid, gen, targets, md, mo, level) {
  let combo = 0, ptsDeliberate = 0, ptsCombo = 0, cuentasTot = 0
  const consumed = new Set()
  while (true) {
    const tg = findTargetCellsMulti(grid, targets, md, mo)
    if (tg.cells.size === 0) break
    combo++
    const deliberate = combo === 1
    let barAdd = (!deliberate && level.comboFever) ? tg.sum * 2 : tg.sum
    if (deliberate) ptsDeliberate += barAdd; else ptsCombo += barAdd
    cuentasTot += tg.segs
    tg.hit.forEach((v) => consumed.add(v))
    for (const k of tg.cells) { const [r, c] = k.split(',').map(Number); grid[r][c] = null }
    collapse(grid, gen)
  }
  return { consumed, maxCombo: combo, ptsDeliberate, ptsCombo, cuentasTot }
}

// ---------- una partida completa ----------
function playGame(level, maxTurns = 600) {
  const gen = makeGen(level, {})
  const md = level.maxDigits, mo = level.maxOps ?? 1, size = level.size
  const targets = (Array.isArray(level.target) ? level.target : [level.target]).map(Number)
  const goalNeed = level.goal ?? 100
  const grid = newGrid(gen, size, size, md)
  heal(grid, gen, targets, md, mo, size)

  const s = {
    moves: 0, goalDone: 0, won: false, stuck: false,
    availPre: [],        // movimientos posibles al EMPEZAR cada turno (post-saneo)
    availPreHeal: [],    // movimientos posibles ANTES del saneo (tras colapsar) -> si es bajo, el saneo rescata
    opsOnBoard: [],      // operadores en pantalla por turno
    healCells: [], healDigToOp: [], healFallback: 0,
    ptsDeliberate: 0, ptsCombo: 0, maxComboSeen: 0, cascadeTurns: 0,
  }
  while (s.moves < maxTurns) {
    const moves = allMoves(grid, targets, md, mo)
    s.availPre.push(moves.length)
    s.opsOnBoard.push(countOps(grid))
    if (moves.length === 0) { s.stuck = true; break }
    // bot: swap al azar entre los válidos
    const [r, c, r2, c2] = moves[Math.floor(pseudoRand() * moves.length)]
    const t = grid[r][c]; grid[r][c] = grid[r2][c2]; grid[r2][c2] = t   // aplicar swap
    const res = resolve(grid, gen, targets, md, mo, level)
    s.moves++
    s.ptsDeliberate += res.ptsDeliberate; s.ptsCombo += res.ptsCombo
    if (res.maxCombo > s.maxComboSeen) s.maxComboSeen = res.maxCombo
    if (res.maxCombo >= 2) s.cascadeTurns++
    s.goalDone = Math.min(goalNeed, s.goalDone + res.ptsDeliberate + res.ptsCombo)
    // medir ANTES del saneo
    s.availPreHeal.push(allMoves(grid, targets, md, mo).length)
    if (s.goalDone >= goalNeed) { s.won = true; break }
    // saneo (como el juego, si hubo consumo)
    if (res.consumed.size > 0) { const h = heal(grid, gen, targets, md, mo, size); s.healCells.push(h.cellsChanged); s.healDigToOp.push(h.digToOp); if (h.usedFallback) s.healFallback++ }
  }
  return s
}

// PRNG determinista (para reproducibilidad; varía por corrida global con seed)
let _seed = 123456789
function pseudoRand() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff }

const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
const pct = (a, f) => a.length ? (100 * a.filter(f).length / a.length) : 0
const minA = (a) => a.length ? Math.min(...a) : 0
const maxA = (a) => a.length ? Math.max(...a) : 0

function report(idx, N) {
  const level = LEVELS[idx]
  if (level.boss || level.accum) return console.log(`N${idx + 1} ${level.name} — JEFE/ACUM: no modelado en v1`)
  const superNote = level.superTile ? ' (⚠ súper ficha no modelada: puntos de cruz/combo subestimados)' : ''
  const games = []
  for (let i = 0; i < N; i++) games.push(playGame(level))
  const movesToWin = games.filter((g) => g.won).map((g) => g.moves)
  const stuckRate = pct(games, (g) => g.stuck)
  // agregados por turno (aplanar todas las partidas)
  const availPre = games.flatMap((g) => g.availPre)
  const availPreHeal = games.flatMap((g) => g.availPreHeal)
  const opsBoard = games.flatMap((g) => g.opsOnBoard)
  const healCells = games.flatMap((g) => g.healCells)
  const healDigToOp = games.flatMap((g) => g.healDigToOp)
  const ptsD = avg(games.map((g) => g.ptsDeliberate)), ptsC = avg(games.map((g) => g.ptsCombo))
  const comboShare = (ptsD + ptsC) > 0 ? 100 * ptsC / (ptsD + ptsC) : 0
  const tgt = JSON.stringify(level.target)
  console.log(`\nN${idx + 1} "${level.name}" ${level.size}x${level.size} fichas=${level.digits.length} tgt=${tgt} goal=${level.goal ?? 100}${superNote}`)
  console.log(`  Movs para ganar:   media ${avg(movesToWin).toFixed(1)}  (min ${minA(movesToWin)}, max ${maxA(movesToWin)})   ${movesToWin.length}/${N} ganó`)
  console.log(`  Movs posibles/turno: media ${avg(availPre).toFixed(1)}  (min ${minA(availPre)})   turnos con <2 opciones: ${pct(availPre, (x) => x < 2).toFixed(1)}%`)
  console.log(`  Antes del saneo:     media ${avg(availPreHeal).toFixed(1)}   turnos SIN jugadas (saneo rescata): ${pct(availPreHeal, (x) => x === 0).toFixed(1)}%`)
  console.log(`  Operadores en pantalla: media ${avg(opsBoard).toFixed(1)} / ${level.size * level.size} celdas`)
  console.log(`  Saneo por movida:  celdas cambiadas media ${avg(healCells).toFixed(1)} (max ${maxA(healCells)})  | díg→signo media ${avg(healDigToOp).toFixed(2)} (max ${maxA(healDigToOp)})  | fallback ops: ${(100 * games.reduce((a, g) => a + g.healFallback, 0) / Math.max(1, healCells.length)).toFixed(1)}%`)
  console.log(`  Puntos: deliberado ${ptsD.toFixed(0)} / combo ${ptsC.toFixed(0)}  → combos aportan ${comboShare.toFixed(1)}%   | combo máx visto ${maxA(games.map((g) => g.maxComboSeen))}`)
}

// ---------- MAIN ----------
const args = process.argv.slice(2)
const N = Number(process.env.SIMN) || 300
let idxs
if (args.length) idxs = args.map((a) => Number(a) - 1)   // niveles 1-based por CLI
else idxs = [...Array(LEVELS.length).keys()]
console.log(`Simulando ${N} partidas por nivel (bot = movimiento válido al azar)...`)
for (const idx of idxs) report(idx, N)
