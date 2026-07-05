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

// mensaje flotante del coach (tutorial / avisos; pausa el reloj)
export function CoachBubble({ coach, onDismiss }) {
  if (!coach || !coach[0]) return null
  return (
    <div className="coach" onClick={onDismiss}>
      <div className={'coach-bubble' + (coach[0].highlight ? ' point-' + coach[0].highlight : '')}>
        <div className="coach-text">{coach[0].text}</div>
        <div className="coach-hint">{coach.length > 1 ? 'tocá para seguir →' : 'tocá para continuar'}</div>
      </div>
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
        <div className="win-title">¡Nivel superado!</div>
        <div className="win-sub">¡Buen trabajo! Seguí así 🎉</div>
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
        <div className="start-lvl">Nivel {index + 1}</div>
        <div className="start-name">{lv.name}</div>
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
            : result.reason === 'flooded' ? '🌿 ¡Los + invadieron el tablero!'
              : result.reason === 'time' ? '¡Se acabó el tiempo!'
                : '¡Te quedaste sin intentos!'}</div>
        <div className="ok">{result.boss ? 'HP restante del jefe' : 'Puntos que faltaron'}</div>
        <div className="os">{result.left}</div>
        {hearts.n > 0 ? (
          <button className="continue-btn" onClick={onRetry}>
            {result.boss ? '🧊 Descongelar todo' : result.reason === 'flooded' ? '🌿 Limpiar la invasión' : result.timed ? '+1 minuto' : 'Reintentar'} <span className="cost">❤️ 1</span>
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
          : <button className="start-play" onClick={onClaim}>Reclamar +{dailyHints} pistas 💡</button>}
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
