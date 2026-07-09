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
  { name: 'Primeros pasos',   size: 4, digits: range(1, 3), ops: ['+'], eq: false, maxDigits: 1, target: 4,        quota: 10, tutorial: true, goal: 50 },  // tutorial corto: barra a 50 (~13 cuentas)
  { name: 'Amigos del 5',     size: 5, digits: range(1, 4), ops: ['+'], eq: false, maxDigits: 1, target: 5,        quota: 10 },  // fichas 1-4 (más pares posibles = menos secado): 5 = 2+3,1+4
  { name: 'Media docena',     size: 5, digits: range(1, 4), ops: ['+'], eq: false, maxDigits: 1, target: 6,        quota: 10 },  // fichas 1-4: 6 = 2+4,3+3
  { name: 'Solo pares',       size: 5, digits: ['2', '4', '6'], ops: ['+'], eq: false, maxDigits: 1, target: 8,   quota: 10, goal: 170 },  // solo pares → 8 = 2+6,4+4 (medido: con [6,8] los combos regalaban 60% → objetivo único + goal más alto)
  // 🎁 CONTRARRELOJ (nivel 5 de cada mundo: 5/15/25/35): nivel ESPECIAL con RELOJ y
  // tablero un poco más grande. Si se acaba el tiempo → "+1 minuto" (reintento).
  { name: 'Contrarreloj ⏱',   size: 6, digits: range(1, 7), ops: ['+'], eq: false, maxDigits: 1, target: [5, 10],  timed: true, time: 80, goal: 150 },  // ⏱ doble 5/10, fichas 1-7 (medido 18.4 movs: 60s era brutal → 80s + goal 150)
  // 🎁 Objetivo múltiple (varios números a la vez): 5, 8 y 10 juntos.
  { name: 'Triple objetivo',  size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: [5, 8, 10], goal: 200 },
  { name: 'La docena',        size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 12,        goal: 200 },  // normal: enseña el 12 antes de la súper ficha
  // ✨ SÚPER FICHA (mecánica tipo Candy Crush): acá se INTRODUCE. Doble objetivo alto [10,12] para
  // que las cuentas de 2 operadores (ej. 3+4+5=12, 2+3+5=10) sean viables y se aprovechen. Formar
  // una con 2 operadores deja una súper ficha '+'; usarla explota en CRUZ. El motor garantiza
  // siempre ≥1 jugada de 2 operadores. Tablero 6×6 (a+b+c son 5 celdas, entran). Ver DISEÑO §16.
  { name: 'Súper doble ✨',    size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: [10, 12], maxOps: 2, superTile: true, goal: 200 },
  // ✨ SÚPER FICHA (continúa la mecánica del nivel 8) con TRIPLE objetivo alto: 10/12/14 tienen
  // muchísimas cuentas de 2 operadores (14=5+5+4,6+4+4; 12=3+4+5; 10=3+3+4,2+3+5) → generar súper es viable.
  { name: 'Súper triple ✨',   size: 6, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: [10, 12, 14], maxOps: 2, superTile: true, goal: 250 },
  // 👹 JEFE SUMA de 2 FASES (DISEÑO §18.6.2): FASE 1 (100%→50% HP) el tablero CRECE 5×5→7×7;
  // FASE 2 (desde 50%) arranca la INFESTACIÓN de + (suben hasta tapar = perdés). `expandTo` = tamaño
  // final; `infestAt` = fracción de HP donde empieza la fase 2. Este jefe NO usa el freeze.
  // 3 objetivos [8,10,12] (misma cantidad que todos los jefes): se apoyan en lo recién visto
  // (12 = nivel 8, 10/8 previos); no retrocede a números tempranos → acompaña el progreso.
  // HP 400: expansiones cada 50 HP (350/300/250/200, los umbrales caen solos con infestAt=0.375)
  // y FASE 2 (infestación) a 150 HP → etapa final más corta, hay chances reales de ganar.
  { name: 'El Rey +', size: 5, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: [8, 10, 12], boss: { hp: 400, expandTo: 7, infestAt: 0.375 }, quota: 99 },

  // ================= MUNDO RESTA (niveles 11-19 + hito) — RAMPA DE DIFICULTAD =================
  // Mundo 2: resta de 1 cifra, resultados ≥0. Rampa balanceada a mano (2026-07-05).
  // 11-15 = intro MUY gradual (fichas y objetivos chicos, 5×5→6×6):
  //   11 (target 1, 1-4) · 12 (target 2, 1-4, 6×6) · 13 (target 3, 1-6) · 14 ([2,3], 1-6) · 15 ([3,5], 1-7, ⏱).
  //   Goals cortos: 10 · 24 · 50 · 50 · 75. La barra suma el VALOR (resultado) → cuentas ≈ goal/objetivo.
  // 16-19 = rampa dura: 7×7, fichas 1-9, dobles/triples altos, goal 120 parejo y MENOS intentos (4/4/4/3).
  //   En resta objetivo alto = MENOS pares (7 solo 8−1,9−2). Balanceado por SIMULACIÓN (sim/simulate.mjs,
  //   2026-07-06): movidas para ganar, secado del tablero, % combos. Ver DISEÑO §7.
  { name: 'Primera resta',    size: 5, digits: range(1, 4), ops: ['−'], eq: false, maxDigits: 1, target: 1,       quota: 10, goal: 10, orderCoach: true },   // solo 1-4; 1 = 2−1,3−2,4−3. Goal 10 (medido: con 20 eran 15.6 movs de puro 2−1 = grind). orderCoach: explica el ORDEN
  { name: 'Segunda resta',    size: 6, digits: range(1, 4), ops: ['−'], eq: false, maxDigits: 1, target: 2,       quota: 10, goal: 24 },   // 6×6 (medido: en 5×5 era el más apretado, 3.9 opciones y 12.5% de secado) + goal 24
  { name: 'Tercera resta',    size: 6, digits: range(1, 6), ops: ['−'], eq: false, maxDigits: 1, target: 3,        quota: 10, goal: 50 },   // 6×6, fichas 1-6, objetivo único 3
  { name: 'Resta doble',      size: 6, digits: range(1, 6), ops: ['−'], eq: false, maxDigits: 1, target: [2, 3],  quota: 10, goal: 50 },   // 🎁 doble, fichas 1-6
  { name: 'Contrarreloj ⏱',   size: 6, digits: range(1, 7), ops: ['−'], eq: false, maxDigits: 1, target: [3, 5],   timed: true, time: 80, goal: 75 },  // ⏱ doble impar 3/5, fichas 1-7 (medido 20.1 movs en 60s = brutal → 80s + goal 75); el tablero CRECE a 7×7 después
  // --- desde acá la rampa aprieta: 7×7, impares/altos, triples y MENOS intentos (goal 120 parejo, medido ~20-30 movs con 150) ---
  { name: 'Resta difícil',    size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [5, 7],  quota: 15, goal: 120, tries: 4 },  // 7×7, 7 = solo 8−1,9−2
  { name: 'Doble combos',     size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [4, 7],  quota: 15, goal: 120, comboFever: true, tries: 4 },  // 🎁 combos x2, 7×7
  { name: 'Triple resta',     size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [2, 4, 6], quota: 15, goal: 120, tries: 4 },  // 🎁 triple
  { name: 'Resta maestra',    size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [3, 5, 7], quota: 15, goal: 120, tries: 3 },  // 🎁 triple, solo 3 intentos
  // 👹 EL REY − (opuesto del Rey +): FASE 1 el tablero ENCOGE 7×7→5×5 (shrinkTo); FASE 2 (desde
  // eraseAt=50% HP) BORRA signos − (tachados permanentes → si te quedás sin jugadas, perdés). Daño = diferencia formada.
  { name: 'El Rey −', size: 7, digits: range(1, 9), ops: ['−'], eq: false, maxDigits: 1, target: [4, 5, 6], boss: { hp: 200, shrinkTo: 5, eraseAt: 0.5 }, quota: 99 },

  // ================= MUNDO MULTIPLICACIÓN (21-30, objetivo fijo) =================
  // Productos de 1 cifra. Empieza con tablas chicas (2×3=6) y sube. Dobles intercalados.
  // Nota: productos altos = MENOS pares (20 solo 4×5; 36 solo 4×9,6×6). Banda cómoda 6-24.
  { name: 'Tabla fácil',    size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 6,        quota: 10 },  // 2×3, 1×6
  { name: 'Por cuatro',     size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 8,        quota: 10 },  // 2×4
  { name: 'La docena',      size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 12,       quota: 10 },  // 3×4, 2×6
  { name: 'Doble por',      size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: [6, 12],  quota: 10 },  // 🎁 doble
  { name: 'Contrarreloj ⏱', size: 6, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 12,       timed: true, time: 60, goal: 60 },  // ⏱ nivel 25 = contrarreloj; el tablero CRECE a 7×7 después de acá
  { name: 'Por seis',       size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 24,       quota: 10 },  // 4×6, 3×8 — 7×7 (segunda mitad del mundo)
  { name: 'Relax por',      size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 16,       quota: 10, relax: true },       // 🎁 sin reloj (4×4, 2×8)
  { name: 'Doble grande',   size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: [8, 24],  quota: 15 },  // 🎁 doble
  { name: 'Fiebre por',     size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: 12,       quota: 15, comboFever: true },  // 🎁 combos x2
  // Nivel 30 = ACUMULATIVO multiplicación: sumá los productos hasta llegar a 100.
  { name: 'El Rey ×', size: 7, digits: range(1, 9), ops: ['×'], eq: false, maxDigits: 1, target: [6, 8, 12], boss: { hp: 440 }, quota: 99 },  // 👹 JEFE multiplicación (daño = producto formado)

  // ================= MUNDO DIVISIÓN (31-40, objetivo fijo, ÷ exacta) =================
  // División exacta de 1 cifra. Cocientes CHICOS (2,3,4): los altos casi no tienen pares
  // (÷5 solo 5÷1). Mucho 2 y 3 con dobles/twists para variar. Ver PLAN §D6.
  { name: 'Primera división', size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 2,      quota: 10 },  // 6÷3, 8÷4
  { name: 'Dividí en 3',    size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 3,        quota: 10 },  // 6÷2, 9÷3
  { name: 'Doble división', size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 3],   quota: 10 },  // 🎁 doble
  { name: 'A la mitad',     size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 2,        quota: 10, relax: true },       // 🎁 sin reloj
  { name: 'Contrarreloj ⏱', size: 6, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 4,        timed: true, time: 60, goal: 40 },  // ⏱ nivel 35 = contrarreloj; el tablero CRECE a 7×7 después de acá
  { name: 'Doble ÷',        size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 4],   quota: 10 },  // 🎁 doble — 7×7 (segunda mitad del mundo)
  { name: 'Fiebre ÷',       size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 3,        quota: 10, comboFever: true },  // 🎁 combos x2
  { name: 'División difícil', size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: 2,      quota: 15 },  // tablero 7×7
  { name: 'Doble maestro',  size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 3],   quota: 15 },  // 🎁 doble
  // Nivel 40 = ACUMULATIVO división: arrancás en 24 y cada división BAJA el total hasta 0.
  { name: 'El Rey ÷', size: 7, digits: range(1, 9), ops: ['÷'], eq: false, maxDigits: 1, target: [2, 3, 4], boss: { hp: 160 }, quota: 99 },  // 👹 JEFE división (daño = cociente formado)

  // 🧪 NIVEL DE PRUEBA (temporal): mecánica de INFESTACIÓN de + aislada, para verla y balancearla.
  // Los + suben desde abajo (cada 3.5 s); jugás cuentas para retroceder el frente; si llega al techo,
  // perdés. Se gana llenando la barra (meta 150). Quitar antes de un release. Ver DISEÑO §18.6.
  { name: '🧪 Infestación',   size: 7, digits: range(1, 9), ops: ['+'], eq: false, maxDigits: 1, target: 10, goal: 150, infest: true },
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
