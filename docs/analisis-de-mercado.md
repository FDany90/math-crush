# 📊 Análisis de Mercado — Math Crush

> Juego puzzle matemático casual (cuentas/ecuaciones con mecánica match-3 estilo Candy Crush).
> Informe basado en investigación multi-fuente con verificación adversarial.
> **Fecha:** 2026-06-29 · **Fuentes:** Liftoff 2025, Naavik/Sensor Tower, AppsFlyer, Business of Apps, Adjust 2026, Segwise, Admiral Media.

---

## ⚠️ Nivel de confianza de los datos

La investigación extrajo 74 datos, verificó 25 con votación adversarial (3 votos por dato) y **solo 14 sobrevivieron**. Lo que sigue distingue claramente lo confirmado de lo no confirmado.

| Bloque | Estado |
|---|---|
| CPI / ROAS por plataforma | ✅ Confianza ALTA (fuente primaria) |
| Tamaño mercado puzzle + monetización (ARPDAU, conversión) | ✅ Confianza ALTA |
| CPI por región y canales de marketing | 🟡 Confianza MEDIA |
| Reparto Web vs móvil (Poki/CrazyGames) | ❌ NO confirmado (cifras refutadas) |
| Nicho matemático/educativo (tamaño de mercado) | ❌ NO confirmado (cifra refutada) |
| Retención D1/D7/D30 | ❌ NO confirmado (benchmarks refutados) |
| Proyección por escenarios | 🟡 Modelado propio sobre datos confirmados |

---

## 1) Reparto por plataforma (Web vs Android vs iOS)

Fuente primaria: **Liftoff 2025 Casual Gaming Apps Report** (2.500M instalaciones, 1,4T impresiones, 11.900M USD gasto publicitario, feb 2024 – feb 2025).

| Métrica | iOS | Android |
|---|---|---|
| **CPI casual** | $1,41 | $0,14 (~**10× más barato**) |
| **CPI puzzle específico** | ~$3,00 | ~$2,00 |
| **ROAS a 30 días** | **47%** | **15%** |
| **ROAS a 7 días** (mediana) | 7,6% | 7,6% |

**Regla de oro:** Android = volumen barato, monetiza mal. iOS = caro de captar, **recupera ~3× más** dinero. Justifica presupuestos de UA separados por plataforma.

> ❌ **Web (Poki/CrazyGames/HTML5):** sin datos confirmados. Las cifras típicas (Poki ~30M MAU, 700B partidas/mes; CrazyGames escala similar) **fueron refutadas** (votos 0-3 / 1-2). La versión web sigue siendo válida como gancho de fricción cero, pero su aporte cuantitativo no tiene respaldo fiable.

---

## 2) Tamaño de mercado y monetización

**Confirmado (confianza alta):**

- Género **puzzle: +10.000M USD en compras in-app (IAP) en 2025** (+14% interanual). **2.º género** que más creció en absoluto (+1.790M USD), tras Estrategia. *(Naavik / Sensor Tower)*
- Contexto histórico EE.UU.: gasto puzzle 4.600M USD (+31,4%) y ~685M descargas (año cerrado feb-2021 — dato correcto pero antiguo).
- **Monetización híbrida (ads + IAP)** es lo realista para casual/puzzle.
- **ARPDAU** (ingreso por usuario activo diario): **$0,03–$0,10** base; títulos optimizados **$0,15–$0,30**. *(Juego Studio / AppsFlyer)*
- **Conversión a pago: < 5%** de los jugadores. La mayoría monetiza solo por anuncios.

> ❌ **Retención D1/D7/D30:** todos los benchmarks aparecidos fueron refutados. Orientación cultural (no citable): D1 ~30-40%, D7 ~10-15%, D30 <5%.
> ❌ **Mercado matemático/educativo:** cifra que circula (17.340M USD, CAGR 22,6%) **refutada** (0-3). Sin dato fiable del nicho.

---

## 3) Proyección de jugadores e ingresos

⚠️ **Modelo propio** sobre datos confirmados (ARPDAU $0,03–$0,10, conversión <5%). Órdenes de magnitud, no promesas.

| Escenario | DAU | ARPDAU | Ingreso mensual | Ingreso anual |
|---|---|---|---|---|
| **Modesto** (indie) | 1.000 | $0,05 | ~$1.500 | ~$18.000 |
| **Medio** (tracción) | 20.000 | $0,07 | ~$42.000 | ~$500.000 |
| **Éxito** (top segmento) | 200.000 | $0,10 | ~$600.000 | ~$7,2M |
| **Mega-hit** (tipo Candy Crush) | 1M+ | $0,15+ | $4,5M+ | $50M+ |

**Fórmulas:**
- `Ingreso diario = DAU × ARPDAU`
- `MAU ≈ 3–5 × DAU`
- DAU ≈ descargas acumuladas × retención

**Realidad del sector:** la mayoría de juegos casuales nuevos se quedan en "modesto". "Medio" exige producto pulido + inversión en marketing. "Éxito" es percentil top.

---

## 4) Marketing, redes y publicidad

**Canales primarios confirmados** (casual/puzzle): **Meta (FB/Instagram), Apple Search Ads, TikTok**. YouTube y ASO como complemento.

**CPI por región** (confianza media; principalmente Android, iOS ~30-50% más caro):

| Región | CPI aprox. |
|---|---|
| 🇺🇸 Norteamérica | ~$5,28 (más caro) |
| 🇪🇺 EMEA | ~$1,03 |
| 🌏 APAC | ~$0,93 |
| 🌎 **Latinoamérica** | **~$0,34** (más barato) |

CPI blended general de mercado 2025: ~$4,70 iOS / ~$3,40 Android.

**Implicación:** captar en EE.UU. cuesta ~15× más que en LatAm. Con texto matemático (poca barrera de idioma), **empezar por LatAm** para volumen barato y validar retención es una jugada eficiente.

**Presupuesto UA vs ingresos:** solo gastar en captación si `LTV > CPI`. Con CPI puzzle ~$2-3 y ARPDAU $0,05-0,10, se necesita buena retención para que el jugador "se pague solo". Validar retención orgánicamente (web + ASO + orgánico) **antes** de invertir en ads.

---

## 🎯 Recomendación estratégica para Math Crush

1. **Web (`index.html`) como laboratorio gratis** — valida que la mecánica engancha sin gastar en captación. Cero fricción, compartible.
2. **Android + LatAm para volumen barato** — CPI $0,14-0,34, miles de jugadores para medir retención real.
3. **iOS para monetizar** — con retención probada, iOS recupera ~3× más.
4. **Monetización híbrida desde día 1** — anuncios (mayoría que no paga) + IAP opcionales (quitar ads, pistas, vidas). <5% paga.
5. **No invertir en ads hasta que la retención cierre** los números (LTV > CPI).

---

## Huecos pendientes de investigar

- Reparto real de jugadores/ingresos Web vs Android vs iOS y ARPU de la distribución web.
- Tamaño/ingresos/descargas del nicho específico matemático-educativo y efecto del público estudiantil en monetización.
- Retención D1/D7/D30 fiable para puzzle/match-3 y juegos educativos.
- Cifras MAU/DAU/ingresos por escenario y ratio presupuesto-UA vs ingresos que hace viable el negocio.

Ver [metodología y fuentes](./fuentes-y-metodologia.md) para el detalle de verificación.
