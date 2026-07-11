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
import { zzfx, zzfxResume, zzfxVolume, zzfxContext } from './zzfx.js'

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

// ---------- música por escena (Web Audio: loop GAPLESS) ----------
// Antes iba por <audio loop>, que deja un micro-silencio al reiniciar ("se nota el loop",
// playtest 2026-07-11). Ahora el track se decodifica a un AudioBuffer y loopea con
// precisión de sample (BufferSource.loop) + fades por GainNode. Comparte el AudioContext
// de los SFX pero NO su gain maestro (mutear SFX no muta la música y viceversa).
// Si el navegador no decodifica .ogg (iOS Safari) queda en silencio sin romper nada.
const MUSIC_VOL = { map: .4, level: .3, boss: .45 }
const trackUrl = (scene) => import.meta.env.BASE_URL + 'audio/' + scene + '.ogg'
let curScene = null      // escena pedida (se recuerda aunque la música esté OFF)
let cur = null           // { src, gain, scene } del loop sonando
const bufCache = {}      // scene → Promise<AudioBuffer> (cachea fetch+decode)

// HMR de Vite (dev): al recargarse este módulo, la instancia nueva silencia el loop de la
// vieja (antes quedaba huérfano sonando hasta el F5: "se solapan todas las músicas").
try { window.__mcMusicStop?.() } catch { /* nada sonando */ }
window.__mcMusicStop = () => stopMusic(true)

function loadBuffer(scene) {
  const ctx = zzfxContext()
  return (bufCache[scene] ||= fetch(trackUrl(scene))
    .then((r) => r.arrayBuffer())
    .then((ab) => ctx.decodeAudioData(ab))
    .catch((e) => { delete bufCache[scene]; throw e }))
}

function stopMusic(hard = false) {
  if (!cur) return
  const { src, gain } = cur
  cur = null
  try {
    const t = zzfxContext().currentTime
    gain.gain.cancelScheduledValues(t)
    if (hard) { src.stop(); return }
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + .35)   // fade out
    src.stop(t + .4)
  } catch { /* ya parado */ }
}

async function startMusic() {
  if (!curScene || !musicOn) return
  const scene = curScene
  let buf
  try { buf = await loadBuffer(scene) } catch { return }   // sin red o formato no soportado: silencio
  // mientras decodificaba pudo cambiar la escena, apagarse la música o arrancar otro loop
  if (scene !== curScene || !musicOn || cur) return
  const ctx = zzfxContext()
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const gain = ctx.createGain()
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(MUSIC_VOL[scene] ?? .35, t + .6)   // fade in
  src.connect(gain)
  gain.connect(ctx.destination)
  src.start()   // con el contexto suspendido (sin gesto aún) queda en cola y arranca al resumir
  cur = { src, gain, scene }
}

export const sound = {
  // llamar en CADA gesto del usuario (barato): resume el contexto (autoplay de mobile);
  // los loops ya arrancados con el contexto suspendido empiezan a sonar solos al resumir
  unlock() {
    if (sfxOn || musicOn) zzfxResume()
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
    else if (!cur) { zzfxResume(); startMusic() }
  },
  setSfxOn(v) {
    sfxOn = !!v; setPref('math_sfx', sfxOn)
    zzfxVolume(sfxOn ? 1 : 0)
    if (sfxOn) zzfxResume()
  },
}
