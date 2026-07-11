// ====================================================================
// SONIDO de Math Crush (ver DOCUMENTACION §26).
//  - MÚSICA: loops .ogg CC0 (Kenney, en /public/audio) vía HTMLAudio, una por
//    "escena" (map / level / boss) con FADE de entrada/salida.
//  - SFX: sintetizados con ZzFX (0 KB de assets). Cada sonido es una RECETA de
//    parámetros acá abajo → se tunean con feedback de playtest sin tocar archivos.
//  - JINGLES (ganar/perder/regalo): mini-secuencias de notas sobre ZzFX.
//  - MOBILE: el audio se desbloquea en el PRIMER gesto (unlock() desde App); si el
//    navegador bloqueó play() de la música, se reintenta en el próximo gesto.
//  - PREFERENCIAS: math_music / math_sfx en localStorage ('0' = apagado); toggles
//    en Ajustes y en el mapa.
// ====================================================================
import { zzfx, zzfxResume, zzfxVolume } from './zzfx.js'

// ---------- preferencias ----------
const pref = (k) => { try { return localStorage.getItem(k) !== '0' } catch { return true } }
const setPref = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0') } catch { /* sin storage */ } }
let musicOn = pref('math_music')
let sfxOn = pref('math_sfx')

// ---------- SFX: recetas ZzFX (tunear ACÁ los "gustos" de cada efecto) ----------
// Orden de parámetros: vol, random, freq, attack, sustain, release, shape(0 seno,
// 1 triángulo, 2 sierra, 3 tan, 4 ruido), shapeCurve, slide, dSlide, pitchJump,
// pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVol, decay…
const SFX = {
  click:    [.5, , 240, .005, .01, .06, 1, 1.6, , , , , , , , , , .5, .02],           // botón/tap genérico
  chip:     [.6, , 520, .005, .02, .09, 1, 1.3, , , 180, .05],                        // elegir chip (pop con salto de tono)
  cuenta:   [.7, , 830, , .05, .17, 1, 1.9, , , 320, .06, , , , , , .6, .04],          // ✔ cuenta formada (moneda ascendente)
  fail:     [.6, , 210, .01, .07, .22, 2, .6, -8, , , , , , , , , .7, .06],            // ✘ movimiento fallido (buzz descendente)
  boom:     [1.1, .1, 65, .01, .14, .65, 4, 1.4, , , , , , 1.6, , .4, , .9, .14],      // 💣 explosión de bomba
  zap:      [.8, , 430, .01, .18, .32, 2, 2, 9, , , , .06, , , , , .7, .09],           // ✨ cruz de la súper ficha
  rumble:   [.8, .2, 48, .02, .22, .5, 4, .9, , , , , , 2.4, , .3, , .8, .18],         // 🔳 temblor: tablero crece/encoge
  bossAtk:  [.8, .1, 115, .02, .11, .38, 3, 1.5, -5, , , , , .7, , .2, , .8, .09],     // 👹 embestida del jefe
  bossHurt: [.7, , 175, .01, .06, .18, 2, 1.4, 3, , , , , .5, , , , .7, .05],          // 👹 el jefe recibe el golpe
  cine:     [1, , 72, .03, .22, .75, 4, 1.1, , , , , , 1.1, , .5, .09, .9, .18],       // 🎬 slam de cinemática
  erase:    [.6, .3, 880, .02, .1, .18, 4, .5, , , , , .03, 2.2],                      // 🧽 borrador del jefe −
  infest:   [.6, , 145, .05, .18, .38, 2, .9, 2.2, .4],                                // ➕ sube la infestación
  hint:     [.5, , 660, .01, .04, .12, 1, 1.5, , , 120, .07],                          // 💡 pista
}

// ---------- jingles: secuencias cortas de notas (triángulo, suave) ----------
const note = (f, vol = .55, dur = .16) => zzfx(vol, 0, f, .01, dur * .55, dur * .6, 1, 1.4)
const seq = (notes, step = 120) => notes.forEach((f, i) => setTimeout(() => f && note(...(Array.isArray(f) ? f : [f])), i * step))
const JINGLES = {
  win: () => seq([523, 659, 784, [1047, .65, .34]], 115),        // arpegio mayor ascendente 🎉
  lose: () => seq([392, 330, [262, .5, .4]], 200),               // bajada corta (sin drama) 💔
  daily: () => seq([659, 784, [988, .6, .3]], 100),              // 🎁 regalo
  star: () => seq([[1319, .4, .1], [1568, .4, .18]], 80),        // ⭐ brillito
}

// ---------- música por escena ----------
const MUSIC_VOL = { map: .4, level: .3, boss: .45 }
const trackUrl = (scene) => import.meta.env.BASE_URL + 'audio/' + scene + '.ogg'
let audioEl = null       // <audio> del loop actual
let curScene = null      // escena pedida (se recuerda aunque la música esté OFF)
let pendingPlay = false  // play() bloqueado por autoplay → reintentar en el próximo gesto

// REGISTRO GLOBAL de loops vivos (en window, sobrevive al módulo): TODO <audio> creado acá
// se anota, y cualquier "zombie" (loop que ya no es el actual) se mata en seco. Cubre:
//  - el bug original (fades con un intervalo compartido que se pisaban),
//  - carreras de play() asíncrono al cambiar rápido de escena,
//  - HMR de Vite en dev: la instancia nueva del módulo mata los loops huérfanos de la
//    vieja (antes seguían sonando hasta el F5 — "se solapan todas las músicas" en local).
const LIVE = (window.__mcMusicLive ||= new Set())
function killEl(el) {
  clearInterval(el._fadeId)
  try { el.pause() } catch { /* ya muerto */ }
  el.src = ''
  LIVE.delete(el)
}
for (const el of [...LIVE]) killEl(el)   // módulo recién cargado (o HMR): silencio garantizado

// Cada <audio> lleva SU PROPIO intervalo de fade (el._fadeId); con uno compartido, el
// fade-in del loop nuevo mataba el fade-out del anterior y quedaban los dos sonando.
function fadeTo(el, target, ms, then) {
  clearInterval(el._fadeId)
  const steps = Math.max(1, ms / 40)
  const d = (target - el.volume) / steps
  el._fadeId = setInterval(() => {
    el.volume = Math.max(0, Math.min(1, el.volume + d))
    if ((d >= 0 && el.volume >= target) || (d < 0 && el.volume <= target)) { clearInterval(el._fadeId); then?.() }
  }, 40)
}

function stopMusic() {
  // barrido: cualquier loop vivo que NO sea el actual es un zombie → en seco
  for (const el of [...LIVE]) if (el !== audioEl) killEl(el)
  const el = audioEl
  audioEl = null
  if (!el) return
  clearInterval(el._fadeId)
  if (el.paused) { killEl(el); return }               // nunca llegó a sonar (autoplay bloqueado)
  fadeTo(el, 0, 350, () => killEl(el))
}

function startMusic() {
  if (!curScene || !musicOn) return
  const scene = curScene
  const el = new Audio(trackUrl(scene))
  el.loop = true
  el.volume = 0
  audioEl = el
  LIVE.add(el)
  // guard `el === audioEl`: si la escena cambió antes de que el play() resuelva (async),
  // este loop ya fue reemplazado → matarlo en vez de subirle el volumen (se solapaba).
  el.play().then(() => {
    if (el !== audioEl) { killEl(el); return }
    pendingPlay = false
    fadeTo(el, MUSIC_VOL[scene] ?? .35, 600)
  }).catch(() => { if (el === audioEl) pendingPlay = true })   // autoplay bloqueado: unlock() reintenta
}

export const sound = {
  // llamar en CADA gesto del usuario (barato): desbloquea el contexto y reintenta la música
  unlock() {
    if (sfxOn) zzfxResume()
    if (pendingPlay && musicOn && curScene && audioEl) {
      const el = audioEl, scene = curScene
      el.play().then(() => {
        if (el !== audioEl) { killEl(el); return }
        pendingPlay = false
        fadeTo(el, MUSIC_VOL[scene] ?? .35, 600)
      }).catch(() => {})
    }
  },
  // efecto de sonido o jingle por nombre (no rompe nunca: audio es decorativo)
  play(name) {
    if (!sfxOn) return
    try {
      if (JINGLES[name]) JINGLES[name]()
      else if (SFX[name]) zzfx(...SFX[name])
    } catch { /* sin audio */ }
  },
  // música de la escena: 'map' | 'level' | 'boss' | null (silencio). Con fade.
  music(scene) {
    if (scene === curScene) return
    curScene = scene
    stopMusic()
    startMusic()
  },
  musicOn: () => musicOn,
  sfxOn: () => sfxOn,
  setMusicOn(v) {
    musicOn = !!v; setPref('math_music', musicOn)
    if (!musicOn) stopMusic()
    else if (!audioEl) startMusic()
  },
  setSfxOn(v) {
    sfxOn = !!v; setPref('math_sfx', sfxOn)
    zzfxVolume(sfxOn ? 1 : 0)
    if (sfxOn) zzfxResume()
  },
}
