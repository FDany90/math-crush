// ====================================================================
// MAPA: datos, geometría y componentes puros (SVG de tiza) del mapa de niveles.
// Todo esto es sin estado (se extrajo de App.jsx para separar mapa vs juego).
// ====================================================================
import React from 'react'

// ---------- MUNDOS por operación (bloques de 10 niveles) ----------
// Cada mundo = un sector del mapa con su símbolo, nombre y color de tiza (más sobrio).
// `wip: true` = mundo EN DESARROLLO: bloqueado y no jugable todavía (cartel "Próximamente").
// Se usa para aislar el playtest de Suma+Resta sin que Mult/Div rompan nada. Quitar el flag
// para habilitarlos.
export const WORLDS = [
  { at: 0,  name: 'SUMA',           sym: '+', color: '#8ecae6' },
  { at: 10, name: 'RESTA',          sym: '−', color: '#e6a0b0' },
  { at: 20, name: 'MULTIPLICAR',    sym: '×', color: '#e7c86a', wip: true },
  { at: 30, name: 'DIVISIÓN',       sym: '÷', color: '#b0a0d8', wip: true },
]
export const worldOf = (i) => WORLDS[Math.min(WORLDS.length - 1, Math.floor(i / 10))]
export const zoneColor = (i) => worldOf(i).color
// ¿el nivel pertenece a un mundo en desarrollo? (bloqueo del playtest)
export const isWip = (i) => !!worldOf(i).wip
// Cuentas de tiza blanca repartidas por cada fase del mapa (decorativas, simples, ~7 por mundo).
// Cada una coincide con el objetivo del nivel cercano. `at` = índice de nivel de referencia
// (para la altura). Suma: L8/L9 muestran cuentas de 2 OPERADORES (mecánica de súper ficha).
export const MAP_EQS = [
  // ---- SUMA (1-10) ----
  { at: 1, text: '2+3=5' }, { at: 2, text: '2+4=6' }, { at: 3, text: '4+4=8' },
  { at: 5, text: '4+6=10' }, { at: 6, text: '5+7=12' },
  { at: 7, text: '3+4+5=12' }, { at: 8, text: '4+5+6=15' },   // 2 operadores
  // ---- RESTA (11-20) ----
  { at: 10, text: '7−3=4' }, { at: 11, text: '9−4=5' }, { at: 12, text: '9−3=6' },
  { at: 14, text: '8−3=5' }, { at: 15, text: '9−2=7' }, { at: 17, text: '8−2=6' }, { at: 18, text: '7−4=3' },
  // ---- MULTIPLICACIÓN (21-30) ----
  { at: 20, text: '2×3=6' }, { at: 21, text: '2×4=8' }, { at: 22, text: '3×4=12' },
  { at: 24, text: '2×6=12' }, { at: 25, text: '4×6=24' }, { at: 27, text: '3×8=24' }, { at: 28, text: '4×3=12' },
  // ---- DIVISIÓN (31-40) ----
  { at: 30, text: '6÷3=2' }, { at: 31, text: '9÷3=3' }, { at: 32, text: '8÷4=2' },
  { at: 34, text: '8÷2=4' }, { at: 35, text: '4÷1=4' }, { at: 37, text: '4÷2=2' }, { at: 38, text: '6÷2=3' },
]
const CHALK_COLORS = ['#7fdfff', '#ff79b8', '#ffd23f', '#b98cff', '#7bed9f', '#f4f1e8']
const DOODLE_TYPES = ['star', 'house', 'tree', 'planet', 'book', 'spark', 'heart', 'triangle', 'bulb']

// garabatos SVG repartidos a los costados del camino (flotan suave)
export function buildMapDoodles(n) {
  const rnd = (x) => Math.floor(Math.random() * x)
  const out = []
  for (let i = 0; i < n * 1.4; i++) {
    const side = i % 2 ? 'left' : 'right'
    out.push({
      type: DOODLE_TYPES[rnd(DOODLE_TYPES.length)],
      color: CHALK_COLORS[rnd(CHALK_COLORS.length)],
      top: (2 + (i * 96) / (n * 1.4) + rnd(4)) + '%',
      side,
      off: (1 + rnd(9)),
      size: 28 + rnd(30),
      rot: (rnd(2) ? 1 : -1) * rnd(18),
      dur: (3 + rnd(4)),
      delay: rnd(30) / 10,
    })
  }
  return out
}

// dibujitos de tiza (SVG con trazo, se ven "dibujados a mano" con el filtro chalkRough)
export function ChalkDoodle({ type, color, size }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const svg = (kids) => (
    <svg viewBox="0 0 32 32" width={size} height={size} style={{ filter: 'url(#chalkRough)', overflow: 'visible' }}>{kids}</svg>
  )
  switch (type) {
    case 'star':     return svg(<path {...p} d="M16 3l3.6 7.4 8 1.1-5.9 5.5 1.5 8L16 28.6 8.8 32.5l1.5-8L4.4 11.5l8-1.1z" />)
    case 'house':    return svg(<><path {...p} d="M5 16L16 6l11 10" /><path {...p} d="M8 15v11h16V15" /><path {...p} d="M14 26v-6h4v6" /></>)
    case 'tree':     return svg(<><path {...p} d="M16 4l7 11H9z" /><path {...p} d="M16 11l6 9H10z" /><path {...p} d="M16 20v7" /></>)
    case 'planet':   return svg(<><circle {...p} cx="16" cy="15" r="8" /><ellipse {...p} cx="16" cy="16" rx="15" ry="4.5" transform="rotate(-20 16 16)" /></>)
    case 'book':     return svg(<><path {...p} d="M6 8c4-2 8-2 10 0 2-2 6-2 10 0v16c-4-2-8-2-10 0-2-2-6-2-10 0z" /><path {...p} d="M16 8v16" /></>)
    case 'spark':    return svg(<><path {...p} d="M16 4v24M4 16h24" /><path {...p} d="M8 8l16 16M24 8L8 24" opacity=".7" /></>)
    case 'heart':    return svg(<path {...p} d="M16 27C6 20 4 13 8 9c3-3 6-1 8 2 2-3 5-5 8-2 4 4 2 11-8 18z" />)
    case 'triangle': return svg(<path {...p} d="M16 5l12 22H4z" />)
    case 'bulb':     return svg(<><path {...p} d="M16 4a8 8 0 0 1 5 14c-1 1-1 2-1 3h-8c0-1 0-2-1-3a8 8 0 0 1 5-14z" /><path {...p} d="M12 25h8M13 28h6" /></>)
    default:         return svg(<circle {...p} cx="16" cy="16" r="10" />)
  }
}

// Mascota: búho-profe de tiza (cuerpo cyan, cachetes rosa, birrete dorado, saluda)
export function Mascota() {
  const p = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg className="mascota-svg" viewBox="0 0 120 130" width="96" style={{ filter: 'url(#chalkRough)', overflow: 'visible' }}>
      {/* cuerpo */}
      <path {...p} stroke="#7fdfff" strokeWidth="3" d="M60 40c-20 0-30 16-30 38 0 24 14 40 30 40s30-16 30-40c0-22-10-38-30-38z" fill="#7fdfff22" />
      {/* orejas/plumas */}
      <path {...p} stroke="#7fdfff" strokeWidth="3" d="M38 48c-6-6-8-14-6-18 5 1 11 6 13 13M82 48c6-6 8-14 6-18-5 1-11 6-13 13" />
      {/* ojos */}
      <circle {...p} stroke="#f4f1e8" strokeWidth="3" cx="49" cy="66" r="11" fill="#1f2a26" />
      <circle {...p} stroke="#f4f1e8" strokeWidth="3" cx="71" cy="66" r="11" fill="#1f2a26" />
      <circle cx="52" cy="64" r="3.4" fill="#f4f1e8" />
      <circle cx="74" cy="64" r="3.4" fill="#f4f1e8" />
      {/* pico */}
      <path {...p} stroke="#ffd23f" strokeWidth="3" d="M60 74l-5 7h10z" fill="#ffd23f55" />
      {/* cachetes */}
      <circle cx="38" cy="78" r="5" fill="#ff79b855" />
      <circle cx="82" cy="78" r="5" fill="#ff79b855" />
      {/* pancita (líneas) */}
      <path {...p} stroke="#7fdfff" strokeWidth="2" d="M50 92c6 4 14 4 20 0M52 100c5 3 11 3 16 0" opacity=".8" />
      {/* patitas */}
      <path {...p} stroke="#ffd23f" strokeWidth="3" d="M52 118v6m-3-3h6M68 118v6m-3-3h6" />
      {/* brazo que saluda */}
      <path className="mascota-arm" {...p} stroke="#7fdfff" strokeWidth="3" d="M88 84c8-2 14-8 16-16" />
      {/* birrete (profe de mates) */}
      <g stroke="#ffd23f" strokeWidth="3" fill="none" strokeLinejoin="round">
        <path d="M60 20L40 28l20 8 20-8z" fill="#ffd23f33" />
        <path {...p} d="M50 33v8c0 3 20 3 20 0v-8" />
        <path {...p} d="M80 28v10" />
        <circle cx="80" cy="40" r="2.5" fill="#ffd23f" />
      </g>
    </svg>
  )
}

// ---------- geometría del mapa (camino serpenteante) ----------
export const MAP_W = 300        // ancho en unidades del viewBox
const MAP_SPACING = 120         // separación vertical entre niveles (px)
export function mapGeometry(n) {
  const H = n * MAP_SPACING
  const pts = []
  for (let i = 0; i < n; i++) {
    const y = H - MAP_SPACING / 2 - i * MAP_SPACING   // nivel 1 abajo, sube
    const x = MAP_W / 2 + 80 * Math.sin(i * 0.8)       // serpentea
    pts.push({ x, y })
  }
  // límites entre mundos (cada bloque de 10 niveles): ahí el camino se CORTA
  const bset = new Set(WORLDS.map((w) => w.at).filter((a) => a > 0 && a < n))
  let d = pts.length ? `M ${pts[0].x} ${pts[0].y}` : ''
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i], my = (p.y + c.y) / 2
    if (bset.has(i)) { d += ` M ${c.x} ${c.y}`; continue }  // salta el tramo → hueco de mundo
    d += ` C ${p.x} ${my}, ${c.x} ${my}, ${c.x} ${c.y}`     // curva suave
  }
  // un puente cruza cada hueco (del color del mundo previo al del siguiente)
  const bridges = [...bset].map((b) => {
    const a = pts[b - 1], c = pts[b]
    return { key: b, x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, from: zoneColor(b - 1), to: zoneColor(b) }
  })
  return { pts, H, d, bridges }
}

// Puente de tiza que cruza el hueco entre dos mundos (rieles arqueados + tablones).
export function MapBridge({ from, to }) {
  const planks = [18, 32, 46, 60, 74, 88, 102]
  return (
    <svg className="bridge-svg" viewBox="0 0 120 62" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${from}-${to}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {(() => {
        const g = `url(#bg-${from}-${to})`
        const P = { fill: 'none', stroke: g, strokeWidth: 3.4, strokeLinecap: 'round' }
        return (<>
          <path {...P} d="M10 22 Q60 10 110 22" />
          <path {...P} d="M10 44 Q60 56 110 44" />
          <line {...P} x1="10" y1="16" x2="10" y2="50" />
          <line {...P} x1="110" y1="16" x2="110" y2="50" />
          {planks.map((x) => {
            const t = (x - 10) / 100, sag = Math.sin(t * Math.PI)
            return <line key={x} {...P} strokeWidth="2.6" x1={x} y1={22 - sag * 12} x2={x} y2={44 + sag * 12} />
          })}
        </>)
      })()}
    </svg>
  )
}

export function Stars({ n, size = 16 }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'st on' : 'st'}>★</span>)}
    </span>
  )
}
