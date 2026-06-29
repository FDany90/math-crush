# 🔬 Fuentes y Metodología — Análisis de Mercado EquaCrush

> Anexo de [analisis-de-mercado.md](./analisis-de-mercado.md).
> Generado por investigación profunda multi-agente con verificación adversarial · 2026-06-29.

---

## Metodología

Proceso de 5 fases con fan-out de agentes y verificación cruzada:

1. **Scope** — la pregunta se descompuso en 5 ángulos de búsqueda.
2. **Search** — 5 búsquedas web en paralelo (una por ángulo).
3. **Fetch** — 22 fuentes leídas, 74 afirmaciones falsables extraídas.
4. **Verify** — verificación adversarial: 3 votos por afirmación; se descarta si ≥2 votos la refutan. 25 afirmaciones verificadas.
5. **Synthesize** — fusión de duplicados, ranking por confianza, citado de fuentes.

**Estadísticas:** 5 ángulos · 22 fuentes · 74 datos extraídos · 25 verificados · **14 confirmados / 11 refutados** · 104 agentes · 549 llamadas a herramientas · ~14 min.

---

## ✅ Afirmaciones CONFIRMADAS (14)

| # | Afirmación | Confianza | Voto |
|---|---|---|---|
| 1 | Puzzle: +10.000M USD IAP en 2025 (+14% YoY), 2.º mayor crecimiento absoluto | Alta | 3-0 / 2-1 |
| 2 | ARPDAU casual/puzzle $0,03–$0,10, monetización híbrida, conversión <5% | Alta | 3-0 |
| 3 | iOS vs Android: CPI casual $1,41 vs $0,14; puzzle $3 vs $2; ROAS D30 47% vs 15% | Alta | 3-0 |
| 4 | CPI regional: NAM $5,28 / EMEA $1,03 / APAC $0,93 / LATAM $0,34; blended $4,70/$3,40 | Media | 2-1 / 3-0 |
| 5 | Canales primarios: Meta, Apple Search Ads, TikTok; puzzle entre hyper-casual y mid-core | Media | 3-0 / 2-1 |

*(El conteo de 14 incluye sub-afirmaciones agrupadas en estos 5 hallazgos de síntesis.)*

---

## ❌ Afirmaciones REFUTADAS (11) — NO usar

| Afirmación | Voto | Fuente refutada |
|---|---|---|
| Poki ~30M MAU y 700B partidas/mes | 0-3 | gamedeveloper.com |
| CrazyGames escala similar a Poki (~30M MAU, 300M partidas) | 1-2 | gamedeveloper.com |
| Juegos web no requieren marketing (tráfico orgánico) | 0-3 | gamedeveloper.com |
| Mercado juegos educativos 17,34B USD (2025), CAGR 22,6% | 0-3 | market.us |
| iOS genera hasta 5× más ingreso por usuario que Android | 0-3 | juegostudio.com |
| Puzzle: +9,7B descargas en 2025 | 1-2 | naavik.co |
| Hyper-casual D1 retención 40-44% (Timing 44%) | 0-3 | gameanalytics.com |
| Hyper-casual D7 retención <15% (Shooting 17%) | 1-2 | gameanalytics.com |
| Timing hyper-casual: ARPDAU $0,15, ARPPU $42, conversión 0,94% | 1-2 | gameanalytics.com |
| D7 retención: top cuartil 25%+, media 15-20%, <10% problema | 0-3 | admiral.media |
| CPI plataforma: Google Play $1,22 vs App Store $3,60 | 0-3 | segwise.ai |

**Lección:** la mayoría de cifras refutadas eran sobre **web/Poki**, **nicho educativo** y **retención** — exactamente los huecos del informe. No tomar decisiones cuantitativas sobre esos tres temas con datos de internet sin verificar.

---

## 📚 Fuentes utilizadas

### Primarias (alta calidad)
- **Liftoff 2025 Casual Gaming Apps Report** — https://liftoff.ai/2025-casual-gaming-apps-report/ — CPI/ROAS por plataforma.
- **Sensor Tower State of Gaming** — https://sensortower.com/state-of-gaming-2025 — tamaño de mercado.
- Sensor Tower US Mobile Puzzle — https://sensortower.com/blog/us-mobile-puzzle-4-point-6-billion-revenue
- GameAnalytics 2025 Benchmarks — https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks

### Secundarias (benchmarks, relayan a primarias)
- Naavik (match-3 / merge) — https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/
- Naavik (edu games) — https://naavik.co/digest/edu-games-future/
- Naavik (web gaming) — https://naavik.co/digest/web-gaming-strikes-back/
- Juego Studio (ARPDAU por género) — https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre
- MAF (coste de UA) — https://maf.ad/en/blog/the-cost-of-user-acquisition/
- MAF (conversión) — https://maf.ad/en/blog/mobile-game-conversion-rates/
- Segwise (CPI/IPM/ROAS) — https://segwise.ai/blog/cpi-ipm-roas-benchmarks-optimizing-ad-spend
- Admiral Media (benchmarks marketing) — https://admiral.media/mobile-game-marketing-benchmarks/
- Business of Apps (CPI) — https://www.businessofapps.com/ads/cpi/research/cost-per-install/
- Tap Nation (KPIs hybrid casual) — https://www.tap-nation.io/blog/kpis-that-matter-metrics-to-track-in-hybrid-casual-games/

### Descartadas por baja fiabilidad
gamedeveloper.com (datos web refutados), market.us (mercado educativo refutado), appmagic.rocks, developers.poki.com, developer.crazygames.com, tech-insider.org, foxdata.com.

---

## Notas de calidad

- Las afirmaciones más sólidas (CPI/ROAS por plataforma) son de **fuente primaria robusta** (Liftoff + Singular 2025).
- Varias cifras de CPI (por género, regional) vienen de **blogs secundarios** que relayan a Business of Apps / Adjust / Statista — válidas como orden de magnitud, no como valores exactos.
- Cifras EE.UU. de Sensor Tower: correctas pero **antiguas** (año cerrado feb-2021).
- Muchas cifras de CPI regional son específicas de **Android** sin diferenciar iOS.
- Los rangos de CPI varían ampliamente entre fuentes → tratar como **órdenes de magnitud**.
