// ====================================================================
// Definición de niveles y generación de fichas por nivel.
// La dificultad crece: tablero más grande, más dígitos, más operadores,
// y recién al final aparecen los '='.
// ====================================================================
import { EQ } from './logic.js'

const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(String(i)); return r; };

// Cada nivel es un escenario temático por operador. size = tablero NxN.
// tMin/tMax = rango preferido del objetivo. goal = puntaje para 1 estrella (2★=goal*2, 3★=goal*3).
// maxDigits = cifras máximas por número (1 = sólo números de una cifra).
export const LEVELS = [
  // ---- Bloque 5×5: aprender suma y resta ----
  { name: 'Sumas',          size: 5, digits: range(1, 5), ops: ['+'],            eq: false, maxDigits: 1, tMin: 3,  tMax: 9,  goal: 300 },
  { name: 'Más sumas',      size: 5, digits: range(1, 9), ops: ['+'],            eq: false, maxDigits: 1, tMin: 5,  tMax: 18, goal: 350 },
  { name: 'Restas',         size: 5, digits: range(1, 9), ops: ['−'],            eq: false, maxDigits: 1, tMin: 1,  tMax: 8,  goal: 350 },
  { name: 'Suma y resta',   size: 5, digits: range(1, 9), ops: ['+', '−'],       eq: false, maxDigits: 1, tMin: 2,  tMax: 15, goal: 400 },
  { name: 'Práctica',       size: 5, digits: range(1, 9), ops: ['+', '−'],       eq: false, maxDigits: 1, tMin: 3,  tMax: 18, goal: 450 },

  // ---- Bloque 6×6: aparece la multiplicación ----
  { name: 'Más espacio',    size: 6, digits: range(1, 9), ops: ['+', '−'],       eq: false, maxDigits: 1, tMin: 3,  tMax: 18, goal: 450 },
  { name: 'Multiplicar',    size: 6, digits: range(1, 9), ops: ['×'],            eq: false, maxDigits: 1, tMin: 6,  tMax: 36, goal: 500 },
  { name: 'Suma y por',     size: 6, digits: range(1, 9), ops: ['+', '×'],       eq: false, maxDigits: 1, tMin: 5,  tMax: 36, goal: 500 },
  { name: 'Resta y por',    size: 6, digits: range(1, 9), ops: ['−', '×'],       eq: false, maxDigits: 1, tMin: 4,  tMax: 36, goal: 550 },
  { name: 'Mezcla',         size: 6, digits: range(1, 9), ops: ['+', '−', '×'],  eq: false, maxDigits: 1, tMin: 4,  tMax: 40, goal: 600 },

  // ---- Bloque 7×7: aparece la división ----
  { name: 'Más mezcla',     size: 7, digits: range(1, 9), ops: ['+', '−', '×'],       eq: false, maxDigits: 1, tMin: 5,  tMax: 45, goal: 600 },
  { name: 'Con división',   size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 4,  tMax: 40, goal: 650 },
  { name: 'División +',     size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 5,  tMax: 45, goal: 700 },
  { name: 'Desafío',        size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 6,  tMax: 50, goal: 750 },
  { name: 'Experto',        size: 7, digits: range(1, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 1, tMin: 6,  tMax: 60, goal: 800 },

  // ---- Bloque 8×8: dos cifras y ecuaciones ----
  { name: 'Dos cifras',     size: 8, digits: range(0, 9), ops: ['+', '−'],            eq: false, maxDigits: 2, tMin: 10, tMax: 50, goal: 800 },
  { name: 'Dos cifras ×',   size: 8, digits: range(0, 9), ops: ['+', '−', '×'],       eq: false, maxDigits: 2, tMin: 10, tMax: 60, goal: 850 },
  { name: 'Todo junto',     size: 8, digits: range(0, 9), ops: ['+', '−', '×', '÷'],  eq: false, maxDigits: 2, tMin: 12, tMax: 70, goal: 900 },
  { name: 'Ecuaciones',     size: 8, digits: range(0, 9), ops: ['+', '−', '×', '÷'],  eq: true,  maxDigits: 2, tMin: 10, tMax: 80, goal: 1000 },
  { name: 'Maestría',       size: 8, digits: range(0, 9), ops: ['+', '−', '×', '÷'],  eq: true,  maxDigits: 2, tMin: 12, tMax: 99, goal: 1200 },
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(i) {
  const lv = LEVELS[Math.max(0, Math.min(i, LEVELS.length - 1))];
  return { ...lv, index: i, num: i + 1 };
}

// Estrellas según el puntaje final vs la meta del nivel.
export function starsFor(level, score) {
  if (score >= level.goal * 3) return 3;
  if (score >= level.goal * 2) return 2;
  if (score >= level.goal) return 1;
  return 0;
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
