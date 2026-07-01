// ====================================================================
// Definición de niveles y generación de fichas por nivel.
// La dificultad crece: tablero más grande, más dígitos, más operadores,
// y recién al final aparecen los '='.
// ====================================================================
import { EQ } from './logic.js'

const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(String(i)); return r; };

// Cada nivel es un escenario temático por operador. size = tablero NxN.
// tMin/tMax = rango preferido del objetivo. quota = cuántas cuentas hay que completar para ganar.
// Modo contrarreloj (2 min): ganás al llegar a 0 cuentas; estrellas según el tiempo que sobre.
// maxDigits = cifras máximas por número (1 = sólo números de una cifra).
// nTargets = cuántos objetivos a la vez (default 3). tutorial = muestra la manito guía.
export const LEVELS = [
  // ---- Tutorial: el más fácil posible, un solo objetivo y guía con la mano ----
  { name: 'Primeros pasos', size: 4, digits: range(1, 3), ops: ['+'],            eq: false, maxDigits: 1, tMin: 2,  tMax: 6,  quota: 3,  nTargets: 1, tutorial: true },

  // ---- Bloque 5×5: aprender suma y resta (quota baja: 5) ----
  { name: 'Sumas',          size: 5, digits: range(1, 5), ops: ['+'],            eq: false, maxDigits: 1, tMin: 3,  tMax: 9,  quota: 5,  nTargets: 2 },
  { name: 'Más sumas',      size: 5, digits: range(1, 9), ops: ['+'],            eq: false, maxDigits: 1, tMin: 5,  tMax: 18, quota: 5 },
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

// ¿este símbolo de power-up está permitido en el nivel?
export function symbolAllowed(level, ch) {
  if (ch === EQ) return level.eq;
  if (['+', '−', '×', '÷'].includes(ch)) return level.ops.includes(ch);
  return true; // teleport / reroll
}
