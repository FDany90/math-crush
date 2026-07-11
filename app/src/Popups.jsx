// ====================================================================
// Pop-ups y pantallas superpuestas (presentacionales). Cada uno recibe SOLO
// los datos y callbacks que necesita; el estado vive en App.jsx. Extraído de App.jsx.
// ====================================================================
import React from 'react'
import { LEVELS } from './game/levels.js'
import { HINTS_MAX } from './game/controller.js'
import { fmtMMSS } from './uiHelpers.js'
import { heartsNextInSec } from './storage.js'
import { Stars } from './mapView.jsx'
import { sound } from './audio/sound.js'

// El jefe no tiene nombre: es SU SIGNO, en rojo llamativo (decisión de playtest 2026-07-09:
// se quitó la palabra "Rey"). El '−' de la fuente Tiza cae bajo → barra dibujada.
const BossGlyph = ({ sign }) => (sign === '−' ? <span className="minus-bar cine" /> : sign)
const BossName = ({ sign }) => <span className="boss-name"><BossGlyph sign={sign} /></span>

// CARA del jefe para cinemáticas y desenlace (la MISMA cara del HUD, pero escalable:
// posiciones en % del box del glifo, así sirve en cualquier tamaño).
// mood: 'menace' (presentación: cejas en V + sonrisita) | 'rage' (furia: grito) | 'ko' (derrota).
function CineFace({ mood }) {
  return (
    <div className={'cface ' + mood} aria-hidden="true">
      <span className="cf-brow l" /><span className="cf-brow r" />
      <span className="cf-eye l"><span className="cf-pupil" /></span>
      <span className="cf-eye r"><span className="cf-pupil" /></span>
      <span className="cf-mouth" />
    </div>
  )
}

// mensaje flotante del coach (tutorial / avisos; pausa el reloj). Un paso puede ser una
// CINEMÁTICA de jefe ({ cine: 'intro'|'phase', sign }) → se renderiza BossCine en su lugar.
export function CoachBubble({ coach, onDismiss }) {
  if (!coach || !coach[0]) return null
  if (coach[0].cine) return <BossCine step={coach[0]} onDismiss={onDismiss} />
  return (
    <div className="coach" onClick={onDismiss}>
      <div className={'coach-bubble' + (coach[0].highlight ? ' point-' + coach[0].highlight : '')}>
        <div className="coach-text">{coach[0].text}</div>
        <div className="coach-hint">{coach.length > 1 ? 'tocá para seguir →' : 'tocá para continuar'}</div>
      </div>
    </div>
  )
}

// CINEMÁTICA de jefe (~3 s, estilo videojuego), como paso especial del coach (pausa el juego
// igual que un mensaje): 'intro' = presentación (el signo entra RUGIENDO + banner con el nombre);
// 'phase' = cambio de fase (el signo se ENFURECE, flash rojo). Auto-avanza a los 3 s; tocar saltea.
function BossCine({ step, onDismiss }) {
  React.useEffect(() => {
    sound.play('cine')   // slam de entrada de la cinemática
    const id = setTimeout(onDismiss, 3000); return () => clearTimeout(id)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={'boss-cine ' + step.cine} onClick={onDismiss}>
      <div className="cine-flash" aria-hidden="true" />
      {/* el signo entra CON SU CARA (la misma del HUD): presentación amenazante / furia gritando */}
      <div className={'cine-sign' + (step.sign === '−' ? ' minus' : '')}>
        <BossGlyph sign={step.sign} />
        <CineFace mood={step.cine === 'intro' ? 'menace' : 'rage'} />
      </div>
      <div className="cine-banner">
        {step.cine === 'intro' ? <>¡LLEGÓ <BossName sign={step.sign} />!</> : <>¡<BossName sign={step.sign} /> SE ENFURECE!</>}
      </div>
      {step.cine === 'intro' ? <div className="cine-sub">¡Bajale toda la vida para ganar! 👹</div> : <div className="cine-sub">¡Ahora ataca más fuerte!</div>}
    </div>
  )
}

// pantalla de victoria (auto-avanza a los ~3,4 s; tocar avanza)
export function WinScreen({ win, confetti, onAdvance }) {
  if (!win) return null
  return (
    <div className="win-cele" onClick={() => onAdvance(win.index)}>
      <div className="confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <span key={i} style={{
            left: c.left, width: c.size + 'px', height: c.size * 1.6 + 'px',
            background: c.color, animationDelay: c.delay, animationDuration: c.dur,
            transform: `rotate(${c.rot}deg)`,
          }} />
        ))}
      </div>
      <div className="win-inner">
        {/* DESENLACE de jefe (estilo videojuego): el signo derrotado (con su cara en KO:
            ojos en X + boquita triste) se marea, se pone gris y CAE */}
        {win.bossSign && (
          <div className="defeat-sign" aria-hidden="true">
            <span className={'defeat-glyph' + (win.bossSign === '−' ? ' minus' : '')}>
              <BossGlyph sign={win.bossSign} />
              <CineFace mood="ko" />
            </span>
            <span className="defeat-dizzy">💫</span>
          </div>
        )}
        <div className="win-title">{win.bossSign ? <>¡<BossName sign={win.bossSign} /> derrotado!</> : '¡Nivel superado!'}</div>
        <div className="win-sub">{win.bossSign ? '¡Lo venciste! Sos más fuerte 👑' : '¡Buen trabajo! Seguí así 🎉'}</div>
        <div className="win-stars"><Stars n={win.stars} size={58} /></div>
        <div className="win-hint">tocá para seguir</div>
      </div>
    </div>
  )
}

// pop-up de inicio de nivel (estilo Candy Crush). Muestra QUÉ tiene ESTE nivel (playtest
// 2026-07-09: antes era siempre el mismo texto y no aportaba): objetivos a formar, meta de
// puntos, y lo nuevo/especial (reloj, súper ficha, combos x2, tablero grande, jefe…).
export function StartPopup({ index, onClose, onPlay }) {
  if (index == null) return null
  const lv = LEVELS[index]
  const sign = lv.ops?.[0] ?? '+'
  const targets = lv.target == null ? [] : (Array.isArray(lv.target) ? lv.target : [lv.target])
  const chips = (list) => list.map((t, i) => (
    <React.Fragment key={t}>
      {i > 0 && <span className="tor">o</span>}
      <span className="tchip mini">{t}</span>
    </React.Fragment>
  ))
  // filas de info: solo lo que APLICA a este nivel (nada genérico)
  const rows = []
  if (!lv.boss) rows.push(['🏁', <>Llená la barra: <b>{lv.goal ?? 100}</b> puntos</>])
  if (lv.timed) rows.push(['⏱', <>Antes de que se acaben <b>{lv.time ?? 120}s</b></>])
  if (lv.superTile) rows.push(['✨', <>Cuentas con <b>2 operadores</b> dan súper ficha</>])
  if (lv.comboFever) rows.push(['🔥', <>Los combos valen <b>DOBLE</b></>])
  if (lv.relax) rows.push(['🧘', 'Sin apuro: jugá tranquilo'])
  if (lv.tries && lv.tries < 5) rows.push(['✏️', <>Solo <b>{lv.tries}</b> intentos</>])
  if (lv.size >= 7) rows.push(['🔳', <>Tablero grande <b>{lv.size}×{lv.size}</b></>])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card start" onClick={(e) => e.stopPropagation()}>
        <button className="card-x" aria-label="Cerrar" onClick={onClose}>✕</button>
        {/* Sin nombre/subtítulo de nivel (decisión 2026-07-06): evita tener que traducirlos.
            `level.name` queda como identificador interno (métricas/dev). */}
        <div className="start-lvl">Nivel {index + 1}</div>
        {lv.boss ? (<>
          {/* nivel de JEFE: el signo (rojo, con cara) es el protagonista */}
          <div className="start-boss" aria-hidden="true">
            <div className={'cine-sign sm' + (sign === '−' ? ' minus' : '')}>
              <BossGlyph sign={sign} />
              <CineFace mood="menace" />
            </div>
          </div>
          <div className="start-targets"><span className="start-tlabel">Atacalo con</span>{chips(targets)}</div>
          <div className="start-rows">
            <div className="start-row"><span className="sr-ico">❤️</span><span>Bajale <b>{lv.boss.hp}</b> de vida</span></div>
          </div>
        </>) : (<>
          {lv.choose
            ? <div className="start-targets col"><span className="start-tlabel">🎯 Elegís VOS qué formar, de estos:</span><div className="start-pool">{lv.choose.pool.map((n) => <span className="tchip mini" key={n}>{n}</span>)}</div></div>
            : <div className="start-targets"><span className="start-tlabel">Formá</span>{chips(targets)}</div>}
          <div className="start-rows">
            {rows.map(([ico, txt], i) => (
              <div className="start-row" key={i}><span className="sr-ico">{ico}</span><span>{txt}</span></div>
            ))}
          </div>
        </>)}
        <button className="start-play" onClick={() => onPlay(index)}>¡Jugar!</button>
      </div>
    </div>
  )
}

// PICKER "Elegí tu objetivo" (twist `choose`): overlay al empezar el nivel. Se eligen 1 o
// `max` números del pool tocando los chips; al confirmar, el nivel se arma alrededor de eso.
export function TargetPicker({ picker, onConfirm }) {
  const [sel, setSel] = React.useState([])
  React.useEffect(() => { setSel([]) }, [picker])
  if (!picker) return null
  // tocar un chip lo agrega/quita; si ya hay `max`, el nuevo reemplaza al más viejo
  const toggle = (n) => {
    sound.play('chip')
    setSel((s) => s.includes(n)
      ? s.filter((x) => x !== n)
      : (s.length >= picker.max ? [...s.slice(1), n] : [...s, n]))
  }
  return (
    <div className="overlay">
      <div className="card picker">
        <div className="start-lvl">🎯 Elegí tu objetivo</div>
        <div className="start-desc">Tocá {picker.max > 1 ? `1 o ${picker.max} números` : 'un número'} para formar en este nivel</div>
        <div className="picker-pool">
          {picker.pool.map((n) => (
            <button key={n} className={'tchip pick' + (sel.includes(n) ? ' on' : '')} onClick={() => toggle(n)}>{n}</button>
          ))}
        </div>
        <button className="start-play" disabled={!sel.length} onClick={() => onConfirm(sel)}>
          {sel.length ? `¡Jugar con ${sel.join(' y ')}!` : 'Elegí un número…'}
        </button>
      </div>
    </div>
  )
}

// resultado de nivel (sólo cuando se pierde). Reintentar cuesta 1 corazón.
export function ResultCard({ result, hearts, onRetry, onExit }) {
  if (!result || result.win) return null
  return (
    <div className="overlay">
      <div className="card">
        <div className="ot">{
          result.reason === 'frozen' ? '🧊 ¡El jefe te congeló el tablero!'
            : result.reason === 'erased' ? <>🧽 ¡<BossName sign="−" /> borró todos los signos!</>
              : result.reason === 'flooded' ? <>¡Los <BossName sign="+" /> invadieron el tablero!</>
                : result.reason === 'time' ? '¡Se acabó el tiempo!'
                  : '¡Te quedaste sin intentos!'}</div>
        <div className="ok">{result.boss ? 'Vida que le queda al jefe' : 'Puntos que faltaron'}</div>
        <div className="os">{result.left}</div>
        {hearts.n > 0 ? (
          <button className="continue-btn" onClick={onRetry}>
            {result.reason === 'flooded' ? 'Limpiar la invasión' : result.reason === 'erased' ? '✏️ Reponer los signos' : result.boss ? '🧊 Descongelar todo' : result.timed ? '+1 minuto' : 'Reintentar'} <span className="cost">❤️ 1</span>
          </button>
        ) : (
          <div className="no-hearts">💔 Sin corazones. Se recargan solos — próximo en {fmtMMSS(heartsNextInSec(hearts))}.</div>
        )}
        <div className="card-btns">
          <button onClick={onExit}>Salir</button>
        </div>
      </div>
    </div>
  )
}

// pop-up de ajustes (dentro del juego): música/sonidos + abandonar nivel
export function SettingsPopup({ levelNum, onClose, onLeave }) {
  const [musicOn, setMusicOn] = React.useState(() => sound.musicOn())
  const [sfxOn, setSfxOn] = React.useState(() => sound.sfxOn())
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card settings" onClick={(e) => e.stopPropagation()}>
        <button className="card-x" aria-label="Cerrar" onClick={onClose}>✕</button>
        <div className="start-lvl">Ajustes</div>
        <div className="start-name">Nivel {levelNum}</div>
        <div className="audio-toggles">
          <button className={'audio-btn' + (musicOn ? ' on' : '')}
            onClick={() => { const v = !musicOn; setMusicOn(v); sound.setMusicOn(v) }}>
            {musicOn ? '🎵' : '🔇'} Música
          </button>
          <button className={'audio-btn' + (sfxOn ? ' on' : '')}
            onClick={() => { const v = !sfxOn; setSfxOn(v); sound.setSfxOn(v); if (v) sound.play('chip') }}>
            {sfxOn ? '🔊' : '🔈'} Sonidos
          </button>
        </div>
        <button className="start-play" onClick={onClose}>Seguir jugando</button>
        <button className="leave-btn" onClick={onLeave}>Abandonar nivel</button>
      </div>
    </div>
  )
}

// pop-up REGALO DIARIO
export function DailyPopup({ hintPool, claimed, dailyHints, onClose, onClaim }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card daily-card" onClick={(e) => e.stopPropagation()}>
        <button className="card-x" aria-label="Cerrar" onClick={onClose}>✕</button>
        <div className="daily-emoji">🎁</div>
        <div className="start-lvl">Regalo del día</div>
        <div className="daily-hints">Tenés <b>{hintPool}</b> / {HINTS_MAX} pistas 💡</div>
        {claimed
          ? <div className="daily-done">¡Ya lo reclamaste hoy! Volvé mañana 😊</div>
          : <button className="start-play" onClick={onClaim}>Reclamar +{dailyHints} pistas 💡 y vidas ❤️</button>}
      </div>
    </div>
  )
}

// pop-up "Mundo en desarrollo" (Mult/Div bloqueados durante el playtest de Suma+Resta)
export function WipPopup({ worldName, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card wip-card" onClick={(e) => e.stopPropagation()}>
        <button className="card-x" aria-label="Cerrar" onClick={onClose}>✕</button>
        <div className="daily-emoji">🚧</div>
        <div className="start-lvl">{worldName}</div>
        <div className="start-desc">Este mundo está <b>en desarrollo</b>.<br />¡Estará disponible pronto! 🔜</div>
        <button className="start-play" onClick={onClose}>¡Ya voy!</button>
      </div>
    </div>
  )
}

// pop-up "Ingresá tu Nick" (aparece al empezar el nivel 3)
export function NickPopup({ value, onChange, onSave, onSkip }) {
  return (
    <div className="overlay">
      <div className="card nick">
        <div className="start-name">Ingresá tu Nick</div>
        <div className="start-desc">Para las pruebas del juego. Es opcional, podés saltearlo.</div>
        <input className="nick-input" type="text" maxLength={24} autoFocus
          placeholder="Tu apodo" value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSave() }} />
        <button className="start-play" disabled={!value.trim()} onClick={onSave}>Guardar</button>
        <button className="leave-btn" onClick={onSkip}>Saltear</button>
      </div>
    </div>
  )
}
