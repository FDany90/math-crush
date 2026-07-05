// ====================================================================
// Helpers de UI puros (sin estado ni React): colores de token, formatos de
// tiempo, garabatos del menú, confeti y descripción de nivel. Extraído de App.jsx.
// ====================================================================

// color de tiza del token según el tipo de ficha (coincide con Board.js)
const OPS = ['+', '−', '×', '÷']
export function tokenColor(ch) {
  if (ch === '=') return '#e0a30f'
  if (OPS.includes(ch)) return '#db2777'
  return '#2563eb'
}

export function fmtTime(s) {
  const t = Math.ceil(s || 0)
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')
}

export function fmtMMSS(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') }

// garabatos de tiza al azar para el fondo del menú (cuentas + símbolos, en los bordes)
const DOODLE_MARKS = ['★', '♡', '∑', '√', '?', 'π', '∞']
export function buildDoodles() {
  const rnd = (n) => Math.floor(Math.random() * n)
  const a = 1 + rnd(8), b = 1 + rnd(8)
  const c = 4 + rnd(5), d = 1 + rnd(c - 1)
  const e = 2 + rnd(6), f = 2 + rnd(6)
  const items = [
    `${a} + ${b} = ${a + b}`,
    `${c} − ${d} = ${c - d}`,
    `${e} × ${f}`,
    '♥',                                          // corazón de tiza (siempre presente)
    DOODLE_MARKS[rnd(DOODLE_MARKS.length)],
  ]
  const spots = [
    { top: '9%', left: '5%' },
    { top: '15%', right: '6%' },
    { bottom: '11%', right: '8%' },
    { bottom: '9%', left: '7%' },
    { top: '7%', right: '27%' },
  ]
  return items.map((t, i) => ({ t, ...spots[i % spots.length], rot: (rnd(2) ? 1 : -1) * (4 + rnd(11)) }))
}

// confeti para la pantalla de "Nivel superado"
export function buildConfetti(n = 20) {
  const rnd = (x) => Math.floor(Math.random() * x)
  const colors = ['#ffd23f', '#4f8cff', '#ec4899', '#f4f1e8', '#f59e0b', '#7fdfff']
  return Array.from({ length: n }, () => ({
    left: rnd(100) + '%',
    delay: (rnd(70) / 100) + 's',
    dur: (1.1 + rnd(90) / 100) + 's',
    color: colors[rnd(colors.length)],
    rot: rnd(360),
    size: (7 + rnd(8)),
  }))
}

// Descripción corta del nivel para el pop-up de inicio (estilo Candy Crush)
export function levelBrief(lv) {
  if (lv.tutorial) return 'Arrastrá fichas y formá el número de arriba 👆'
  if (lv.boss) return 'Formá los resultados para atacar al jefe. ¡Bajale todo el HP! 👹'
  if (lv.accum) return 'Formá los resultados y llená la barra hasta la meta'
  if (lv.timed) return '⏱ ¡Contrarreloj! Llená la barra antes de que se acabe el tiempo'
  return Array.isArray(lv.target)
    ? 'Formá cualquiera de los resultados y llená la barra'
    : 'Formá el resultado una y otra vez para llenar la barra'
}
