// ====================================================================
// Definición de niveles y generación de fichas por nivel.
// La dificultad crece: tablero más grande, más dígitos, más operadores,
// y recién al final aparecen los '='.
// ====================================================================
import { EQ, targetTriples } from './logic.js'

const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(String(i)); return r; };

// Cada nivel es un escenario temático por operador. size = tablero NxN.
// tMin/tMax = rango preferido del objetivo. quota = cuántas cuentas hay que completar para ganar.
// Modo contrarreloj (2 min): ganás al llegar a 0 cuentas; estrellas según el tiempo que sobre.
// maxDigits = cifras máximas por número (1 = sólo números de una cifra).
// nTargets = cuántos objetivos a la vez (default 3). tutorial = muestra la manito guía.
// maxOps = operadores por cuenta (default 1 = "num op num"; sin cuentas encadenadas).
//   👉 Pendiente: en niveles avanzados (20+) subir a maxOps: 2 (ej. 7−3+1) y AVISAR
//      al jugador con un coach. Por ahora TODOS los niveles usan 1 (una sola operación).
// target = OBJETIVO FIJO del nivel (nueva mecánica). Si está, el objetivo NO rota:
//   se muestra siempre "Formá T", el tablero se genera SESGADO al objetivo (lleno de
//   jugadas a un movimiento) y ganás al formar T `quota` veces. Ver DOCUMENTACION §13.
//   (Niveles 1-3 ya migrados; el resto sigue con objetivos inteligentes rotativos.)
export const LEVELS = [
  // ================= BLOQUE SUMAS (niveles 1-10, objetivo fijo) =================
  // Todo suma, 1 cifra, 1 operador: el jugador se acostumbra a la mecánica.
  // La dificultad sube por objetivo + tamaño de tablero + quota. Los nombres "Sumá N"
  // son informativos (fase de aprendizaje). ⚠️ Pendiente: rediseñar la PROGRESIÓN y los
  // motivadores/desbloqueos tras los 10 (investigación de diseño mobile). Ver DOCU §13.
  { name: 'Primeros pasos', size: 4, digits: range(1, 3), ops: ['+'], eq: false, maxDigits: 1, target: 4,  quota: 5,  tutorial: true },
  { name: 'Sumá 5',         size: 5, digits: range(1, 5), ops: ['+'], eq: false, maxDigits: 1, target: 5,  quota: 8  },
  { name: 'Sumá 6',         size: 5, digits: range(1, 6), ops: ['+'], eq: false, maxDigits: 1, target: 6,  quota: 10 },
  { name: 'Sumá 7',         size: 5, digits: range(1, 7), ops: ['+'], eq: false, maxDigits: 1, target: 7,  quota: 10 },
  { name: 'Sumá 8',         size: 5, digits: range(1, 8), ops: ['+'], eq: false, maxDigits: 1, target: 8,  quota: 10 },
  { name: 'Sumá 9',         size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 9,  quota: 12 },
  { name: 'Sumá 10',        size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 10, quota: 12 },
  { name: 'Sumá 11',        size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 11, quota: 12 },
  { name: 'Sumá 12',        size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 12, quota: 15 },
  { name: 'Sumá 13',        size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 13, quota: 15 },

  // ===== Niveles avanzados (WIP: a REDISEÑAR con la nueva mecánica y progresión) =====
  { name: 'Restas',         size: 5, digits: range(1, 9), ops: ['−'],            eq: false, maxDigits: 1, tMin: 1,  tMax: 8,  quota: 5 },
  { name: 'Suma y resta',   size: 5, digits: range(1, 9), ops: ['+', '−'],       eq: false, maxDigits: 1, tMin: 2,  tMax: 15, quota: 5 },
  { name: 'Práctica',       size: 5, digits: range(1, 9), ops: ['+', '−'],       eq: false, maxDigits: 1, tMin: 3,  tMax: 18, quota: 5 },

  // ---- Bloque 6×6: aparece la multiplicación (quota 10) ----
  { name: 'Más espacio',    size: 6, digits: range(1, 9), ops: ['+', '−'],       eq: false, maxDigits: 1, tMin: 3,  tMax: 18, quota: 10 },
  { name: 'Multiplicar',    size: 6, digits: range(1, 9), ops: ['×'],            eq: false, maxDigits: 1, tMin: 6,  tMax: 36, quota: 10 },
  { name: 'Suma y por',     size: 6, digits: range(1, 9), ops: ['+', '×'],       eq: false, maxDigits: 1, tMin: 5,  tMax: 36, quota: 10 },
  { name: 'Resta y por',    size: 6, digits: range(1, 9), ops: ['−', '×'],       eq: false, maxDigits: 1, tMin: 4,  tMax: 36, quota: 10 },
  { name: 'Mezcla',         size: 6, digits: range(1, 9), ops: ['+', '−', '×'],  eq: false, maxDigits: 1, tMin: 4,  tMax: 40, quota: 10 },

  // ---- Bloque 7×7: aparece la división (quota 10) ----
  { name: 'Más mezcla',     size: 7, digits: range(1, 9), ops: ['+', '−', '×'],       eq: false, maxDigits: 1, tMin: 5,  tMax: 45, quota: 10 },
  { name: 'Con división',   size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 4,  tMax: 40, quota: 10 },
  { name: 'División +',     size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 5,  tMax: 45, quota: 10 },
  { name: 'Desafío',        size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 6,  tMax: 50, quota: 10 },
  { name: 'Experto',        size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 6,  tMax: 60, quota: 10 },

  // ---- Bloque 8×8: dos cifras y ecuaciones (quota 10) ----
  { name: 'Dos cifras',     size: 8, digits: range(0, 9), ops: ['+', '−'],            eq: false, maxDigits: 2, tMin: 10, tMax: 50, quota: 10 },
  { name: 'Dos cifras ×',   size: 8, digits: range(0, 9), ops: ['+', '−', '×'],       eq: false, maxDigits: 2, tMin: 10, tMax: 60, quota: 10 },
  { name: 'Todo junto',     size: 8, digits: range(0, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 2, tMin: 12, tMax: 70, quota: 10 },
  { name: 'Ecuaciones',     size: 8, digits: range(0, 9), ops: ['+', '−', '×', '÷'],  eq: true,  maxDigits: 2, tMin: 10, tMax: 80, quota: 10 },
  { name: 'Maestría',       size: 8, digits: range(0, 9), ops: ['+', '−', '×', '÷'],  eq: true,  maxDigits: 2, tMin: 12, tMax: 99, quota: 10 },
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(i) {
  const lv = LEVELS[Math.max(0, Math.min(i, LEVELS.length - 1))];
  return { ...lv, index: i, num: i + 1 };
}

// Estrellas según la RAPIDEZ: cuánto tiempo sobró al completar las cuentas.
// frac = timeLeft / totalTime. Por nivel se puede afinar con star2/star3.
const STAR2_FRAC = 0.25;
const STAR3_FRAC = 0.5;
export function starsFor(level, { completed, timeLeft, totalTime }) {
  if (!completed) return 0;                       // se acabó el tiempo sin terminar
  const frac = totalTime ? timeLeft / totalTime : 0;
  if (frac >= (level.star3 ?? STAR3_FRAC)) return 3;
  if (frac >= (level.star2 ?? STAR2_FRAC)) return 2;
  return 1;
}

export function randTarget(level) {
  return level.tMin + Math.floor(Math.random() * (level.tMax - level.tMin + 1));
}

// Generador de fichas para un nivel (respeta dígitos/operadores/= permitidos).
// cfg aporta densidades (% operadores, % '=', mínimo '=') ajustables desde el panel.
export function makeGen(level, cfg) {
  if (level.target != null) return makeTargetGen(level, cfg);   // objetivo fijo → bag sesgado
  const digits = level.digits;
  const ops = level.ops;
  const eqEnabled = level.eq;
  const pctOps = cfg.pctOps;
  const pctEq = eqEnabled ? cfg.pctEq : 0;
  const minEq = eqEnabled ? cfg.minEq : 0;
  const randDigit = () => digits[Math.floor(Math.random() * digits.length)];
  const randTile = () => {
    const x = Math.random() * 100;
    if (x < pctOps) return ops[Math.floor(Math.random() * ops.length)];
    if (x < pctOps + pctEq) return EQ;
    return randDigit();
  };
  return { randDigit, randTile, ops, eqEnabled, minEq, size: level.size };
}

// Generador SESGADO AL OBJETIVO: los dígitos salen mayormente de los operandos que
// forman level.target, así el tablero (y lo que cae) está lleno de jugadas a un
// movimiento para llegar a ese número. Un % igual mantiene variedad (no todo sirve).
const HOT_BIAS = 0.78;       // proporción de dígitos "calientes" (operandos del objetivo)
const TARGET_PCT_OPS = 33;   // ~1 operador cada 2 dígitos → máxima densidad de "num op num"
function makeTargetGen(level, cfg) {
  const ops = level.ops;
  const digits = level.digits;
  const triples = targetTriples(level);
  const hot = [...new Set(triples.flatMap(([a, , b]) => [a, b]))];
  const randDigit = () => (hot.length && Math.random() < HOT_BIAS)
    ? hot[Math.floor(Math.random() * hot.length)]
    : digits[Math.floor(Math.random() * digits.length)];
  const randTile = () => (Math.random() * 100 < TARGET_PCT_OPS)
    ? ops[Math.floor(Math.random() * ops.length)]
    : randDigit();
  return { randDigit, randTile, ops, eqEnabled: false, minEq: 0, size: level.size, triples, hot };
}

// ¿este símbolo de power-up está permitido en el nivel?
export function symbolAllowed(level, ch) {
  if (ch === EQ) return level.eq;
  if (['+', '−', '×', '÷'].includes(ch)) return level.ops.includes(ch);
  return true; // teleport / reroll
}
