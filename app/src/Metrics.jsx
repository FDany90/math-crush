// ====================================================================
// Panel de métricas de playtest (ruta /metricas).
// Lee los eventos de Supabase y arma funnels + tablas por nivel y por usuario.
// Requiere policies de LECTURA para anon (ver app/supabase-metrics.sql).
// ====================================================================
import React, { useEffect, useMemo, useState } from 'react'
import { LEVELS } from './game/levels.js'
import { getSupabase } from './metrics.js'

const fmtDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
const ratio = (a, b) => (b ? (a / b).toFixed(2) : '—')

// ---------- agregación en JS sobre los eventos crudos ----------
function aggregate(events) {
  const N = LEVELS.length
  const byLevel = Array.from({ length: N }, () => ({
    starts: 0, wins: 0, losses: 0, hints: 0, continues: 0,
    startedBy: new Set(), wonBy: new Set(),
    lossTime: 0, lossMoves: 0, timeLeftSum: 0, timeLeftCount: 0,
  }))
  const players = new Map()
  const getP = (id) => {
    let p = players.get(id)
    if (!p) { p = { id, nick: '', maxLevel: -1, starts: 0, wins: 0, losses: 0, hints: 0, continues: 0, last: '' }; players.set(id, p) }
    return p
  }
  for (const e of events) {
    const p = getP(e.player_id)
    if (e.nick) p.nick = e.nick
    if (e.created_at > p.last) p.last = e.created_at
    const li = e.level_idx
    const inRange = li != null && li >= 0 && li < N
    if (inRange && (e.kind === 'start' || e.kind === 'win' || e.kind === 'lose')) p.maxLevel = Math.max(p.maxLevel, li)
    if (!inRange) continue
    const L = byLevel[li]
    switch (e.kind) {
      case 'start': L.starts++; L.startedBy.add(e.player_id); p.starts++; break
      case 'win': {
        L.wins++; L.wonBy.add(e.player_id); p.wins++
        const tl = e.meta?.timeLeft
        if (typeof tl === 'number') { L.timeLeftSum += tl; L.timeLeftCount++ }
        break
      }
      case 'lose': L.losses++; p.losses++; (e.meta?.reason === 'moves' ? L.lossMoves++ : L.lossTime++); break
      case 'hint': L.hints++; p.hints++; break
      case 'continue': L.continues++; p.continues++; break
      default: break
    }
  }
  // histograma "hasta qué nivel llegaron" (por nivel máximo alcanzado)
  const reachHist = Array(N).fill(0)
  for (const p of players.values()) if (p.maxLevel >= 0) reachHist[p.maxLevel]++
  const totals = {
    players: players.size,
    starts: byLevel.reduce((a, L) => a + L.starts, 0),
    wins: byLevel.reduce((a, L) => a + L.wins, 0),
    losses: byLevel.reduce((a, L) => a + L.losses, 0),
    hints: byLevel.reduce((a, L) => a + L.hints, 0),
    continues: byLevel.reduce((a, L) => a + L.continues, 0),
  }
  const playerList = [...players.values()].sort((a, b) => (b.last || '').localeCompare(a.last || ''))
  return { byLevel, reachHist, totals, playerList }
}

// ---------- retención: días activos por jugador (cualquier evento cuenta) ----------
// Usa el UUID anónimo (localStorage) + created_at. Cada día con ≥1 evento = día activo.
// Dn = de los jugadores con ≥n días desde su 1er día, cuántos volvieron EXACTO el día +n.
const DAY_MS = 86400000
const dayNum = (iso) => Math.floor(Date.parse(iso) / DAY_MS)   // día absoluto (UTC)

function retention(events, nowMs) {
  const byPlayer = new Map()
  for (const e of events) {
    const t = Date.parse(e.created_at); if (isNaN(t)) continue
    const d = Math.floor(t / DAY_MS)
    let p = byPlayer.get(e.player_id)
    if (!p) { p = { first: d, days: new Set() }; byPlayer.set(e.player_id, p) }
    if (d < p.first) p.first = d
    p.days.add(d)
  }
  const today = Math.floor(nowMs / DAY_MS)
  const buckets = [1, 3, 7, 14, 30].map((n) => {
    let elig = 0, back = 0
    for (const p of byPlayer.values()) {
      if (today - p.first >= n) { elig++; if (p.days.has(p.first + n)) back++ }
    }
    return { n, elig, back, pct: elig ? Math.round((back / elig) * 100) : null }
  })
  // DAU + nuevos, últimos 14 días
  const daily = []
  for (let i = 13; i >= 0; i--) {
    const day = today - i
    let active = 0, fresh = 0
    for (const p of byPlayer.values()) {
      if (p.days.has(day)) active++
      if (p.first === day) fresh++
    }
    daily.push({ day, active, fresh })
  }
  let returning = 0
  for (const p of byPlayer.values()) if (p.days.size > 1) returning++
  return { buckets, daily, players: byPlayer.size, returning }
}

export default function Metrics() {
  const supa = getSupabase()
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supa) { setError('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const page = 1000; let from = 0; let all = []
      for (;;) {
        const { data, error } = await supa.from('events')
          .select('player_id,nick,level_idx,kind,meta,created_at')
          .order('created_at', { ascending: true })
          .range(from, from + page - 1)
        if (error) throw error
        all = all.concat(data)
        if (data.length < page) break
        from += page
      }
      setEvents(all)
    } catch (e) {
      setError((e.message || String(e)) + '  ·  ¿Corriste app/supabase-metrics.sql (policies de lectura)?')
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const agg = useMemo(() => aggregate(events || []), [events])
  const ret = useMemo(() => retention(events || [], Date.now()), [events])
  const maxReach = Math.max(1, ...agg.byLevel.map((L) => L.startedBy.size))
  const maxDau = Math.max(1, ...ret.daily.map((d) => d.active))

  return (
    <div className="mtx">
      <header className="mtx-head">
        <h1>📊 Math Crush · Métricas</h1>
        <div className="mtx-actions">
          <a className="mtx-btn ghost" href="/">← Volver al juego</a>
          <button className="mtx-btn" onClick={load} disabled={loading}>{loading ? 'Cargando…' : '↻ Actualizar'}</button>
        </div>
      </header>

      {error && <div className="mtx-error">{error}</div>}
      {loading && !events && <div className="mtx-loading">Cargando eventos…</div>}

      {events && (
        <>
          {/* KPIs globales */}
          <section className="mtx-kpis">
            <Kpi label="Jugadores" value={agg.totals.players} />
            <Kpi label="Partidas" value={agg.totals.starts} />
            <Kpi label="Ganadas" value={agg.totals.wins} />
            <Kpi label="Perdidas" value={agg.totals.losses} />
            <Kpi label="Pistas" value={agg.totals.hints} accent="#7fdfff" />
            <Kpi label="+1 minuto" value={agg.totals.continues} accent="#ffd23f" />
          </section>

          {/* Retención: ¿vuelven al día siguiente / a la semana? (el NORTE del juego) */}
          <section className="mtx-card">
            <h2>Retención <small>(días activos por jugador · el objetivo del juego)</small></h2>
            <div className="mtx-ret">
              {ret.buckets.map((b) => (
                <div key={b.n} className="mtx-retcell">
                  <div className="mtx-retval" style={{ color: b.pct == null ? '#6b7a75' : b.pct >= 30 ? '#7fe0a0' : b.pct >= 15 ? '#ffd23f' : '#ff7a7a' }}>
                    {b.pct == null ? '—' : b.pct + '%'}
                  </div>
                  <div className="mtx-retlabel">D{b.n}</div>
                  <div className="mtx-retsub">{b.elig ? `${b.back}/${b.elig}` : 'sin datos'}</div>
                </div>
              ))}
            </div>
            <p className="mtx-hint">
              Dn = de los que ya tuvieron {`≥`}n días desde su 1ª vez, cuántos volvieron el día n.
              Benchmark casual: D1 ~35-45%, D7 ~10-15%. {ret.returning} de {ret.players} jugadores volvieron algún otro día.
            </p>
            <h2 style={{ marginTop: 18 }}>Actividad diaria <small>(últimos 14 días · ▓ activos · ● nuevos)</small></h2>
            <div className="mtx-dau">
              {ret.daily.map((d) => (
                <div key={d.day} className="mtx-daucol" title={`activos ${d.active} · nuevos ${d.fresh}`}>
                  <div className="mtx-daubar" style={{ height: Math.round((d.active / maxDau) * 100) + '%' }}>
                    <span className="mtx-daun">{d.active || ''}</span>
                  </div>
                  {d.fresh > 0 && <div className="mtx-daufresh" style={{ height: Math.round((d.fresh / maxDau) * 100) + '%' }} />}
                </div>
              ))}
            </div>
          </section>

          {/* Funnel: cuántos jugadores llegaron a cada nivel + cuántos lo ganaron */}
          <section className="mtx-card">
            <h2>Funnel de niveles <small>(jugadores que empezaron cada nivel · ▓ = lo ganaron)</small></h2>
            <div className="mtx-funnel">
              {agg.byLevel.map((L, i) => {
                const reached = L.startedBy.size
                const won = L.wonBy.size
                return (
                  <div key={i} className="mtx-frow">
                    <div className="mtx-flabel">{i + 1}. {LEVELS[i].name}</div>
                    <div className="mtx-fbar">
                      <div className="mtx-freached" style={{ width: pct(reached, maxReach) + '%' }}>
                        <div className="mtx-fwon" style={{ width: pct(won, reached) + '%' }} />
                      </div>
                      <span className="mtx-fnum">{reached} <em>llegaron</em> · {won} <em>ganaron</em> ({pct(won, reached)}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Tabla por nivel: dificultad, pistas y +1min */}
          <section className="mtx-card">
            <h2>Por nivel</h2>
            <div className="mtx-scroll">
              <table className="mtx-table">
                <thead>
                  <tr>
                    <th>Nivel</th><th>Intentos</th><th>Ganadas</th><th>Perdidas</th><th>% win</th>
                    <th>Pierde× tiempo</th><th>Pierde× intentos</th>
                    <th>Pistas</th><th>Pistas/int</th><th>+1min</th><th>+1min/int</th><th>⌀ seg. rest.</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.byLevel.map((L, i) => (
                    <tr key={i}>
                      <td className="mtx-lname">{i + 1}. {LEVELS[i].name}</td>
                      <td>{L.starts}</td><td>{L.wins}</td><td>{L.losses}</td>
                      <td className={pct(L.wins, L.starts) < 40 ? 'mtx-warn' : ''}>{pct(L.wins, L.starts)}%</td>
                      <td>{L.lossTime}</td><td>{L.lossMoves}</td>
                      <td>{L.hints}</td><td className={ratio(L.hints, L.starts) > 1.5 ? 'mtx-warn' : ''}>{ratio(L.hints, L.starts)}</td>
                      <td>{L.continues}</td><td className={ratio(L.continues, L.starts) > 0.7 ? 'mtx-warn' : ''}>{ratio(L.continues, L.starts)}</td>
                      <td>{L.timeLeftCount ? Math.round(L.timeLeftSum / L.timeLeftCount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mtx-hint">En rojo: % win &lt; 40, pistas/intento &gt; 1.5, o +1min/intento &gt; 0.7 (candidatos a rebalancear).</p>
          </section>

          {/* Hasta qué nivel llegó cada jugador */}
          <section className="mtx-card">
            <h2>¿Hasta qué nivel llegaron?</h2>
            <div className="mtx-funnel">
              {agg.reachHist.map((n, i) => (
                <div key={i} className="mtx-frow">
                  <div className="mtx-flabel">{i + 1}. {LEVELS[i].name}</div>
                  <div className="mtx-fbar">
                    <div className="mtx-freached alt" style={{ width: pct(n, Math.max(1, ...agg.reachHist)) + '%' }} />
                    <span className="mtx-fnum">{n} jugador{n === 1 ? '' : 'es'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Por usuario */}
          <section className="mtx-card">
            <h2>Por jugador <small>({agg.playerList.length})</small></h2>
            <div className="mtx-scroll">
              <table className="mtx-table">
                <thead>
                  <tr><th>Jugador</th><th>Nivel máx</th><th>Partidas</th><th>Ganadas</th><th>Perdidas</th><th>Pistas</th><th>+1min</th><th>Última vez</th></tr>
                </thead>
                <tbody>
                  {agg.playerList.map((p) => (
                    <tr key={p.id}>
                      <td className="mtx-lname">{p.nick || <span className="mtx-anon">anon·{p.id.slice(0, 6)}</span>}</td>
                      <td>{p.maxLevel >= 0 ? p.maxLevel + 1 : '—'}</td>
                      <td>{p.starts}</td><td>{p.wins}</td><td>{p.losses}</td>
                      <td>{p.hints}</td><td>{p.continues}</td>
                      <td className="mtx-date">{fmtDate(p.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, accent }) {
  return (
    <div className="mtx-kpi">
      <div className="mtx-kval" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="mtx-klabel">{label}</div>
    </div>
  )
}
