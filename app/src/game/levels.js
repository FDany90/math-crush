// ====================================================================
// Definición de niveles y generación de fichas por nivel.
// La dificultad crece: tablero más grande, más dígitos, más operadores,
// y recién al final aparecen los '='.
// ====================================================================
import { EQ, targetTriples } from './logic.js'

const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(String(i)); return r; };
const shuffleArr = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Cada nivel es un escenario temático por operador. size = tablero NxN.
// tMin/tMax = rango preferido del objetivo. quota = cuántas cuentas hay que completar para ganar.
// Modo contrarreloj (2 min): ganás al llegar a 0 cuentas; estrellas según el tiempo que sobre.
// maxDigits = cifras máximas por número (1 = sólo números de una cifra).
// nTargets = cuántos objetivos a la vez (default 3). tutorial = muestra la manito guía.
// maxOps = operadores por cuenta (default 1 = "num op num"; sin cuentas encadenadas).
//   👉 Pendiente: en niveles avanzados (20+) subir a maxOps: 2 (ej. 7−3+1) y AVISAR
//      al jugador con un coach. Por ahora TODOS los niveles usan 1 (una sola operación).
// target = OBJETIVO FIJO del nivel. Si está, el objetivo NO rota: se muestra siempre
//   "Formá T", el tablero se genera SESGADO al objetivo (lleno de jugadas a un
//   movimiento) y ganás al formar T `quota` veces. Puede ser un ARRAY (twist "doble
//   objetivo": vale formar cualquiera de los dos). Ver DOCUMENTACION §13-15.
// --- FLAGS DE TWIST (bloque Suma, DISEÑO_PROGRESION §5.2) ---
//   relax:true     → sin reloj: se gana solo por quota; estrellas por PRECISIÓN (pocos
//                    movimientos fallados), no por rapidez.
//   comboFever:true→ los combos (cascadas por piezas nuevas) cuentan DOBLE al objetivo.
//                    (Los combos SIEMPRE cuentan al objetivo; acá valen x2.)
//   targetTo:N     → el objetivo CAMBIA a N al llegar a media quota (objetivo que cambia).
export const LEVELS = [
  // ================= MUNDO SUMA (niveles 1-10, objetivo fijo + twists) =================
  // Todo suma, 1 cifra, 1 operador. Números elegidos por SIGNIFICADO (10 = número héroe,
  // 5/dobles), no por escalera. Cada 2-3 niveles un twist rompe la monotonía (teach→test→
  // twist). La dificultad viene de tablero/quota/twist, no de +1 al objetivo. Ver DISEÑO §5.
  // teach→test→twist: se enseñan 4,5,6,8 sueltos (1-4) y desde el nivel 5 los twists
  // aparecen intercalados (un giro sí / uno no) para cortar la monotonía. La suma sigue
  // siendo de 1 cifra; los twists cambian la EXPERIENCIA, no la carga matemática.
  { name: 'Primeros pasos',   size: 4, digits: range(1, 3), ops: ['+'], eq: false, maxDigits: 1, target: 4,        quota: 10, tutorial: true },
  { name: 'Amigos del 5',     size: 5, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 5,        quota: 10 },
  { name: 'Media docena',     size: 5, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 6,        quota: 10 },
  { name: 'Solo pares',       size: 5, digits: ['2', '4', '6'], ops: ['+'], eq: false, maxDigits: 1, target: 8,   quota: 10 },  // solo pares → 2+6, 4+4
  { name: 'Doble objetivo',   size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: [4, 8],   quota: 10 },  // 🎁 twist: 4 y 8 a la vez
  { name: 'Ponete la 10',     size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 10,       quota: 10 },
  { name: 'Modo relax',       size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 9,        quota: 10, relax: true },       // 🎁 twist: sin reloj
  { name: 'Una docena',       size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 12,       quota: 10 },
  { name: 'Fiebre de combos', size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 7,        quota: 10, comboFever: true },  // 🎁 twist: los combos cuentan DOBLE
  // Nivel 10 = ACUMULATIVO (hito de fin de mundo): formá cualquiera de estos resultados y su
  // VALOR se suma a un total; ganás al llegar a 100. Ver DISEÑO §7.5 / PLAN_SESION_AUTONOMA.
  { name: 'Sumá hasta 100',   size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: [5, 6, 8, 10], accum: { start: 0, goal: 100 }, quota: 99 },  // 🏁 acumulativo

  // ================= MUNDO RESTA (niveles 11-15, objetivo fijo, mecánica nueva) =================
  // Resta de 1 cifra, resultados CHICOS y fáciles (≥0, sin negativos aún). Mismo motor
  // target-rich que la suma: tablero sesgado al objetivo, siembra de cuentas fáciles,
  // dígitos = operandos útiles (acá el minuendo puede ser mayor al resultado, ej. 9−4=5).
  // teach→test→twist, números bajos primero. Ver DISEÑO §7 (mundos por operación).
  // En resta, objetivo ALTO = MENOS pares (target 6 solo tiene 3: 9−3,8−2,7−1). Banda cómoda
  // 3-6. Arranca en 3 (no trivial) y la doble entra temprano (el jugador ya sabe la mecánica).
  { name: 'Primera resta',    size: 5, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: 3,       quota: 10 },
  { name: 'Doble resta',      size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [2, 5],  quota: 10 },  // 🎁 twist: 2 y 5 a la vez
  { name: 'Diferencia 5',     size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: 5,       quota: 10 },
  { name: 'Diferencia 6',     size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: 6,       quota: 10 },
  { name: 'Fiebre de restas', size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: 4,       quota: 10, comboFever: true },  // 🎁 twist: combos x2
  // --- 4 niveles de RESTA con DOBLE objetivo (cada uno mezcla un target cómodo con uno más
  // difícil = menos pares; ej. 7 solo tiene 8−1 y 9−2). Twists encima para variar. ---
  { name: 'Resta doble',    size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [3, 6], quota: 10 },
  { name: 'Doble relax',    size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [4, 6], quota: 10, relax: true },       // 🎁 sin reloj
  { name: 'Doble combos',   size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [2, 7], quota: 10, comboFever: true },  // 🎁 combos x2
  { name: 'Resta maestra',  size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [4, 7], quota: 15 },                    // tablero 7×7
  // Nivel 20 = ACUMULATIVO resta: arrancás en 40 y cada resta BAJA el total; ganás al llegar a 0.
  { name: 'Bajá a 0',       size: 6, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [2, 3, 4, 5], accum: { start: 40, goal: 0 }, quota: 99 },  // 🏁 acumulativo

  // ================= MUNDO MULTIPLICACIÓN (21-30, objetivo fijo) =================
  // Productos de 1 cifra. Empieza con tablas chicas (2×3=6) y sube. Dobles intercalados.
  // Nota: productos altos = MENOS pares (20 solo 4×5; 36 solo 4×9,6×6). Banda cómoda 6-24.
  { name: 'Tabla fácil',    size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 6,        quota: 10 },  // 2×3, 1×6
  { name: 'Por cuatro',     size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 8,        quota: 10 },  // 2×4
  { name: 'La docena',      size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 12,       quota: 10 },  // 3×4, 2×6
  { name: 'Doble por',      size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: [6, 12],  quota: 10 },  // 🎁 doble
  { name: 'Más grande',     size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 18,       quota: 10 },  // 3×6, 2×9
  { name: 'Por seis',       size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 24,       quota: 10 },  // 4×6, 3×8
  { name: 'Relax por',      size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 16,       quota: 10, relax: true },       // 🎁 sin reloj (4×4, 2×8)
  { name: 'Doble grande',   size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: [8, 24],  quota: 15 },  // 🎁 doble
  { name: 'Fiebre por',     size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 12,       quota: 15, comboFever: true },  // 🎁 combos x2
  // Nivel 30 = ACUMULATIVO multiplicación: sumá los productos hasta llegar a 100.
  { name: 'Multiplicá a 100', size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: [6, 8, 12], accum: { start: 0, goal: 100 }, quota: 99 },  // 🏁 acumulativo

  // ================= MUNDO DIVISIÓN (31-40, objetivo fijo, ÷ exacta) =================
  // División exacta de 1 cifra. Cocientes CHICOS (2,3,4): los altos casi no tienen pares
  // (÷5 solo 5÷1). Mucho 2 y 3 con dobles/twists para variar. Ver PLAN §D6.
  { name: 'Primera división', size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 2,      quota: 10 },  // 6÷3, 8÷4
  { name: 'Dividí en 3',    size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 3,        quota: 10 },  // 6÷2, 9÷3
  { name: 'Doble división', size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 3],   quota: 10 },  // 🎁 doble
  { name: 'A la mitad',     size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 2,        quota: 10, relax: true },       // 🎁 sin reloj
  { name: 'Por cuatro ÷',   size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 4,        quota: 10 },  // 8÷2, 4÷1
  { name: 'Doble ÷',        size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 4],   quota: 10 },  // 🎁 doble
  { name: 'Fiebre ÷',       size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 3,        quota: 10, comboFever: true },  // 🎁 combos x2
  { name: 'División difícil', size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 2,      quota: 15 },  // tablero 7×7
  { name: 'Doble maestro',  size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 3],   quota: 15 },  // 🎁 doble
  // Nivel 40 = ACUMULATIVO división: arrancás en 24 y cada división BAJA el total hasta 0.
  { name: 'Dividí a 0',     size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 3, 4], accum: { start: 24, goal: 0 }, quota: 99 },  // 🏁 acumulativo
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
  // Pool "frío" (variedad): acotado a cifras que NO superen el objetivo mayor, para que
  // no aparezcan números inútiles (ej. un 7 cuando hay que formar 5). En una suma solo
  // sirven las cifras ≤ objetivo; el tablero queda lleno de operandos (1,2,3,4 para el 5).
  const targetsArr = (Array.isArray(level.target) ? level.target : [level.target]).map(Number);
  const triples = targetTriples(level);
  const hot = [...new Set(triples.flatMap(([a, , b]) => [a, b]))];   // operandos útiles (unión)
  // Pool "frío" (variedad) = cifras ÚTILES (operandos de algún objetivo). Operación-agnóstico:
  // en SUMA los operandos son < objetivo (no aparece un "5" en formá-5); en RESTA pueden ser
  // MAYORES (el minuendo: 9−4=5). Así nunca sale una cifra que no sirva para el objetivo.
  const usefulSet = new Set(hot);
  const cold = level.digits.filter((d) => usefulSet.has(d));
  const digits = cold.length ? cold : level.digits;
  // Operandos calientes POR objetivo. En objetivo doble se elige primero un objetivo al
  // azar y después uno de SUS operandos → ambos números tienen densidad pareja. Si no,
  // el más fácil de formar (ej. 10, que sale de casi cualquier par 1-9) se come el tablero
  // y el otro (ej. 5, que necesita 1-4) casi no aparece.
  const hotByTarget = targetsArr
    .map((t) => [...new Set(targetTriples({ ...level, target: t }).flatMap(([a, , b]) => [a, b]))])
    .filter((h) => h.length);
  // Bolsa barajada de operandos: reparte PAREJO y evita rachas (ej. "muchos 4 y ningún 1"
  // en formá 5, que dejan cifras sin con qué emparejar). Un bag de objetivos elige cuál
  // objetivo (parejo en doble) y un bag por objetivo elige el operando sin reemplazo;
  // ambos se rebarajan al vaciarse. Así 1,2,3,4 salen en cantidades similares.
  const opBags = hotByTarget.map(() => []);
  let tBag = [];
  const drawHot = () => {
    if (!tBag.length) tBag = shuffleArr(hotByTarget.map((_, i) => i));
    const ti = tBag.pop();
    if (!opBags[ti].length) opBags[ti] = shuffleArr([...hotByTarget[ti]]);
    return opBags[ti].pop();
  };
  const randDigit = () => (hotByTarget.length && Math.random() < HOT_BIAS)
    ? drawHot()
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
