// ====================================================================
// Pop-ups y pantallas superpuestas (presentacionales). Cada uno recibe SOLO
// los datos y callbacks que necesita; el estado vive en App.jsx. Extraído de App.jsx.
// ====================================================================
import React from 'react'
import { LEVELS } from './game/levels.js'
import { HINTS_MAX } from './game/controller.js'
import { levelBrief, fmtMMSS } from './uiHelpers.js'
import { heartsNextInSec } from './storage.js'
import { Stars } from './mapView.jsx'

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
  React.useEffect(() => { const id = setTimeout(onDismiss, 3000); return () => clearTimeout(id) }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  const signEl = step.sign === '−' ? <span className="minus-bar cine" /> : step.sign
  return (
    <div className={'boss-cine ' + step.cine} onClick={onDismiss}>
      <div className="cine-flash" aria-hidden="true" />
      <div className="cine-sign">{signEl}</div>
      <div className="cine-banner">{step.cine === 'intro' ? `¡EL REY ${step.sign}!` : `¡EL REY ${step.sign} SE ENFURECE!`}</div>
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
        {/* DESENLACE de jefe (estilo videojuego): el signo derrotado se marea, se pone gris y CAE */}
        {win.bossSign && (
          <div className="defeat-sign" aria-hidden="true">
            <span className="defeat-glyph">{win.bossSign === '−' ? <span className="minus-bar cine" /> : win.bossSign}</span>
            <span className="defeat-dizzy">💫</span>
          </div>
        )}
        <div className="win-title">{win.bossSign ? `¡Rey ${win.bossSign} derrotado!` : '¡Nivel superado!'}</div>
        <div className="win-sub">{win.bossSign ? '¡Lo venciste! Sos más fuerte que el Rey 👑' : '¡Buen trabajo! Seguí así 🎉'}</div>
        <div className="win-stars"><Stars n={win.stars} size={58} /></div>
        <div className="win-hint">tocá para seguir</div>
      </div>
    </div>
  )
}

// pop-up de inicio de nivel (estilo Candy Crush)
export function StartPopup({ index, onClose, onPlay }) {
  if (index == null) return null
  const lv = LEVELS[index]
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card start" onClick={(e) => e.stopPropagation()}>
        <button className="card-x" aria-label="Cerrar" onClick={onClose}>✕</button>
        {/* Sin nombre/subtítulo de nivel (decisión 2026-07-06): evita tener que traducirlos.
            `level.name` queda como identificador interno (métricas/dev). */}
        <div className="start-lvl">Nivel {index + 1}</div>
        <div className="start-desc">{levelBrief(lv)}</div>
        <button className="start-play" onClick={() => onPlay(index)}>¡Jugar!</button>
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
            : result.reason === 'erased' ? '🧽 ¡El Rey − borró todos los signos!'
              : result.reason === 'flooded' ? '¡Los + invadieron el tablero!'
                : result.reason === 'time' ? '¡Se acabó el tiempo!'
                  : '¡Te quedaste sin intentos!'}</div>
        <div className="ok">{result.boss ? 'HP restante del Rey' : 'Puntos que faltaron'}</div>
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

// pop-up de ajustes (dentro del juego)
export function SettingsPopup({ levelNum, onClose, onLeave }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card settings" onClick={(e) => e.stopPropagation()}>
        <button className="card-x" aria-label="Cerrar" onClick={onClose}>✕</button>
        <div className="start-lvl">Ajustes</div>
        <div className="start-name">Nivel {levelNum}</div>
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
