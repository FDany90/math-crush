# Math Crush — Diseño de motivación, progresión y niveles

> Documento de diseño basado en investigación. Reúne (1) los hallazgos con
> evidencia de la investigación de diseño de juegos mobile, (2) las líneas rojas
> éticas, y (3) el plan accionable y priorizado para Math Crush: qué motivadores
> agregar, en qué orden, y cómo estructurar la progresión de niveles.
>
> Fecha: 2026-07-03 · Fuente: deep-research (24 fuentes, 107 afirmaciones,
> 25 verificadas de forma adversarial → 20 confirmadas, 5 refutadas).
> Contexto del proyecto: juego **gratis**, sin monetización agresiva, **sin dark
> patterns**; público casual mixto (chicos + adultos). Ver [`DOCUMENTACION.md`](DOCUMENTACION.md).

---

## 0. TL;DR (si solo leés esto)

1. **La competencia es la palanca #1.** Se logra con controles intuitivos +
   dificultad justa + **feedback positivo, granular y a tiempo**. Priorizar esto
   por encima de "más contenido".
2. **Recompensá con "juice" informacional, NO con monedas/loot.** El feedback
   sensorial y de maestría *refuerza* la motivación; las recompensas tangibles la
   *socavan* (y peor en chicos).
3. **Meta-progresión LIGERA** atada a completar niveles (modelo de estrellas de
   Royal Match), no una renovación/decoración profunda.
4. **No te obsesiones con la dificultad "perfecta".** Apuntá a una *banda* de
   competencia + *early wins* confiables. La sintonía fina dificultad-skill no
   mueve la aguja (estudio pre-registrado, n=311).
5. **Ética primero:** nada de mascota que culpa, ni timers FOMO abusivos, ni
   "logueate cada día o perdés". Construir apego y una racha suave está OK.
6. **Romper la monotonía** con `teach → test → twist`: cada 2-3 niveles, un giro
   nuevo (mecánica, objetivo doble, modo relax, ficha especial).

---

## 1. Los hallazgos con evidencia

Cada punto tiene confianza (alta/media) y fuente primaria. Estos son los cimientos
sobre los que apoyamos el diseño.

### 1.1 Anclá el diseño en la Teoría de la Autodeterminación (SDT) — *alta*
Las tres necesidades psicológicas —**competencia, autonomía, relación**— predicen
cada una, de forma independiente, el disfrute y la intención de seguir jugando; y
lo hacen **más que el contenido del juego en sí**.
- *Ryan, Rigby & Przybylski (2006)* — 4 estudios: autonomía, competencia y
  relación aportan varianza única al disfrute y al juego futuro.
- *Przybylski, Rigby & Ryan (2010, Review of General Psychology)*: el atractivo y
  el bienestar vienen de satisfacer estas tres necesidades "y no del contenido
  del juego per se".
- ⚠️ *Caveat:* la evidencia de "relación" viene de interacción con jugadores
  reales; el efecto de una **mascota** es una extrapolación razonable, no probada.

### 1.2 La COMPETENCIA es la palanca principal en un puzzle — *alta*
Se potencia específicamente con: **controles intuitivos/fáciles de dominar**,
**desafío óptimo** (ni abrumador ni aburrido) y **feedback positivo, granular y a
tiempo**. Dificultad mal calibrada → aburrimiento (fácil) o frustración (difícil).
- En el estudio 2006, la competencia (β=.52) predijo por sí sola el seguir jugando
  y la vitalidad. El desafío debe crecer "al ritmo de la habilidad del jugador".

### 1.3 "Juice" informacional SÍ; monedas/loot NO — *alta*
El feedback positivo **refuerza** la motivación intrínseca; las recompensas
tangibles (monedas/premios/loot condicionados a jugar) la **socavan**.
- *Deci, Koestner & Ryan (1999)*, meta-análisis de 128 experimentos: recompensas
  tangibles por participar/completar/rendir → **d = −0.40 / −0.36 / −0.28**.
  Feedback positivo → **+0.33** (conducta) / **+0.31** (interés).
- 🔑 **Para nuestro público mixto:** "las recompensas tangibles son *más* dañinas
  para chicos que para universitarios, y el elogio verbal es *menos* potente en
  chicos". → Recompensá con **feedback sensorial y señales de maestría**, no con
  una economía de monedas presentada como "el punto" del juego.
- ⚠️ *Caveats:* el beneficio del feedback solo se sostiene si es **informacional**
  (no controlador: "¡bien!" ✔, "tenés que…" ✗); el d=−0.28 (rendimiento) está
  académicamente disputado.

### 1.4 La dopamina es "querer/anticipar", no "placer" — *alta*
El bucle de recompensa funciona empujando la **anticipación y la búsqueda**
("wanting"), neurológicamente separado del placer ("liking").
- Base de la anticipación al **formar el objetivo y limpiar el tablero** (lo que ya
  tenés). *Advertencia ética:* es fácil sobre-activar el deseo sin dar disfrute
  real.
- ⚠️ **Refutado** en verificación (no apoyarse en esto): esquema de refuerzo
  **variable-ratio / Skinner** como "gancho" de diseño; y el **near-miss** ("casi
  lo lográs") como aumento confiable de las ganas de seguir.

### 1.5 Como juego gratis + educativo + con chicos, resistir dark patterns es un objetivo explícito — *alta*
- *"Level Up or Game Over" (arXiv 2412.05039, ACM):* los juegos "dark" son
  **96.8% free-to-play** vs 53% de los "healthy". La presión de diseño es real;
  hay que tratar el resistirla como meta explícita. (Correlacional.)

### 1.6 Líneas rojas éticas para mascota y timers — *alta*
- *Fairplay/Georgetown (FTC, 2021):* usar **emociones de la mascota para
  presionar/avergonzar** al jugador es un daño documentado ("dragones que lloran"
  al rechazar una compra), porque los chicos desarrollan vínculos de confianza con
  los personajes. Y las tácticas **FOMO** —countdowns, tiendas que cambian cada
  día, "logueate todos los días o perdés"— explotan funciones ejecutivas inmaduras.
- ✅ **La distinción clave:** el daño está en *weaponizar* estos elementos para
  presionar, **no** en que la mascota o una racha suave existan.

### 1.7 Meta-progresión LIGERA + streaks sobre power-ups — *media*
- *Royal Match (Naavik):* "priorizó gameplay rico por encima de la profundidad del
  metajuego", con un meta simple **basado en estrellas** (ganás estrellas al
  completar niveles, las gastás en tareas/áreas). Convirtió un booster en una
  **racha** (se activa tras ~10 victorias seguidas, se resetea al perder).
- Contexto: la renovación/decoración aparece en el 42% de los top match-3, pero
  **no es requisito** — Royal Match ganó con un meta más liviano.
- ⚠️ *Confianza media:* análisis de industria (no experimentales); datos de mercado
  de 2022.

### 1.8 No te obsesiones con la dificultad "perfecta" — *alta*
- *Cutting, Deterding et al. (Royal Society Open Science 2023, pre-registrado,
  n=311):* ajustar finamente dificultad-skill **no** cambió el disfrute
  (F(2,308)=1.29, p=0.277) ni el re-jugar voluntario (20%/29%/30%, p=0.183). Una
  tendencia exploratoria incluso favoreció lo **más fácil**.
- 🔑 **Implicación:** no invertir en dificultad dinámica compleja (DDA). Invertir en
  las palancas con evidencia: **feedback positivo, controles intuitivos, pacing
  teach→test→twist y early wins.**

---

## 2. Lo que la investigación DESCARTÓ (no usar)

Afirmaciones populares que **no** sobrevivieron la verificación adversarial:

| Descartado | Por qué no lo usamos |
|---|---|
| Refuerzo **variable-ratio / Skinner** (gacha) como el gancho de dopamina | Refutado como mecanismo de diseño (0-3). |
| **Near-miss** aumenta confiablemente las ganas de seguir | Parcialmente refutado (1-2). |
| "Extrínseca e intrínseca no son aditivas" | Refutado (1-2). |
| Taxonomía de 4 categorías de dark patterns | Refutado (1-2). |
| "96.8% de los juegos tienen dark patterns" (ese número específico) | Refutado (0-3) — aunque F2P sí correlaciona con ser "dark". |

Y como **principio ético** derivado de 1.3/1.5/1.6: **nada de economías de monedas
como recompensa central, nada de loot boxes, nada de FOMO abusivo, nada de mascota
que culpa.**

---

## 3. Plan priorizado para Math Crush

Ordenado por **relación evidencia / costo / ética**. Lo de arriba primero.

### Fase A — Competencia + feedback (barato, ya tenés base) 🟢 EMPEZAR ACÁ
1. **Early wins garantizados + curva suave.** Tu mecánica *target-rich* (tablero
   sesgado al objetivo + mantenimiento sutil) ya empuja esto. Mantener.
2. **Mensajes de maestría de la mascota** (competencia + relación, feedback
   *informacional*): frases cortas que reconocen logros reales —"¡3 seguidas! 🔥",
   "¡Qué rápido!", "¡Combo!"— vía el sistema **Coach** que ya existe. Regla de oro:
   informacional ("¡lo estás dominando!"), **nunca** controlador ni culposo.
3. **Progreso visible dentro del nivel.** Ya tenés el *tally* de cuentas restantes.
   Reforzar el "goal gradient" cuando faltan pocas (ej. las últimas 3 laten/brillan).

### Fase B — Progresión y meta ligera 🟡
4. **Estrellas como meta (modelo Royal Match).** Las estrellas que ya ganás por
   rapidez se **acumulan** y desbloquean cosas **simbólicas y de bajo costo**:
   colores de tiza, accesorios de la mascota búho, "mundos"/temas del pizarrón.
   Cero monedas como fin; cero pago.
5. **Racha suave y ética.** Racha de victorias (o de días) que da **reconocimiento**
   (una llama 🔥, un saludo de la mascota), **sin castigo agresivo** ni "perdés
   todo si faltás". Opcional y celebratoria, no coercitiva.
6. **Desbloqueables + tienda de estrellas** (ver **§6**): desbloqueo estructural por
   nivel (telegrafiado en el mapa) + cosméticos comprables con estrellas. Cadencia:
   denso al principio, hitos grandes cada ~10 después.

### Fase C — Variedad para romper monotonía 🟡
7. **`teach → test → twist` cada 2-3 niveles.** Ver §4 y §5. Introducir un giro
   nuevo con regularidad para que el bloque de sumas no se sienta plano.

### Fase D — Más adelante (post-validación con métricas) ⚪
8. Rediseñar niveles 11+ (restas → multiplicación) con la mecánica de objetivo fijo.
9. Calibrar `quota`/estrellas/tiempos con la página `/metricas`.
10. Sonidos, mascota animada en juego, Capacitor APK.

---

## 4. Estructura de progresión (cuándo introducir qué)

**Principio rector:** cada mecánica nueva (operación o mecánica de tablero) se
introduce con `teach → test → twist`:
- **Teach:** un nivel fácil, baja densidad, que *enseña* la mecánica sin castigo
  (idealmente con un coach breve). Early win casi garantizado.
- **Test:** un nivel que *exige* aplicarla en condiciones normales.
- **Twist:** un nivel que la *combina o retuerce* (dos objetivos, obstáculo, mezcla
  con lo anterior) → el "aha moment".

**Orden de contenido matemático sugerido:**
1. **Suma** (bloque actual, pero reestructurado — ver §5).
2. **Resta.**
3. **Suma y resta mezcladas.**
4. **Multiplicación.**
5. **Mezcla / dos cifras / ecuaciones** (avanzado).

Cada salto de operación = su propio `teach → test → twist`. **No** meter una
operación nueva sin un nivel-teach que la presente en fácil.

**Gating:** desbloqueo por estrellas (ya existe). Mantenerlo generoso para no
frustrar (coherente con §1.8: lo más fácil no perjudicó el engagement).

---

## 5. Rediseño concreto del bloque inicial (sumas)

**Dos problemas del bloque actual (objetivo 4→13):**
1. **Monotonía:** 10 niveles casi idénticos donde lo único que cambia es +1 al objetivo.
2. **Números objetivo mal elegidos:** subir de a 1 hace que aparezcan números "feos"
   (11, 13) que no tienen nada de especial ni valor pedagógico. El objetivo debería
   ser un número **con significado**, no el resultado de un contador.

### 5.1 Cómo elegir los números objetivo
La dificultad NO debe venir del número objetivo (eso lo hace sentir un contador),
sino del **tamaño de tablero + quota + tiempo + twists**. El número objetivo se
elige por **significado y sensación**, con estos criterios:

- **10 es el número héroe.** "Amigos del 10" (1+9, 2+8, 3+7, 4+6, 5+5) es el hecho de
  suma más importante que se aprende, y hacer 10 es intrínsecamente satisfactorio.
  Que el 10 **se repita** y sea la identidad del mundo Suma ("el juego de hacer 10").
- **Anclar en 5 y 10** (redondos, amigables) y usar **dobles** (4=2+2, 6=3+3, 8=4+4)
  y **pares** — se sienten más lindos y tienen valor de aprendizaje.
- **Quedarse en la banda rica (≈5-12).** Con dígitos de 1 cifra, la cantidad de pares
  que forman el objetivo es máxima entre 8 y 12; abajo de 5 y arriba de 13 se vuelve
  escaso (13→3 pares, 15→2, 17→1). Los "feos" 11/13 no aportan nada y son más pobres.
- **No subir monótonamente.** Bajar la dificultad después de un pico (competencia:
  un nivel fácil tras uno duro da confianza) y **revisitar** el 10.

### 5.2 Secuencia propuesta (mundo Suma, ~10 niveles con twists)
Los "twist" no agregan carga matemática (siguen siendo suma de 1 cifra), solo cambian
la *experiencia*. Los números están elegidos por significado, no por escalera.

| # | Tipo | Objetivo | Por qué ese número / qué introduce |
|---|---|---|---|
| 1 | Teach | **4** | Tutorial. Chico y fácil (2+2, 1+3). 4×4. |
| 2 | Test | **5** | Amigos del 5 (1+4, 2+3). Redondo, early win. |
| 3 | Test | **10** ⭐ | Amigos del 10: el número héroe, temprano = "aha" y milestone. |
| 4 | **Twist** | **5 y 10** | **Doble objetivo**: formá 5 **y** 10 a la vez. |
| 5 | Test | **6** | Dobles (3+3). Baja tras el 10 → confianza. |
| 6 | **Twist** | **8** | **Modo relax** (sin reloj). Doble 4+4. |
| 7 | Test | **10** ⭐ | El héroe otra vez, tablero mayor / quota mayor (refuerza el hecho clave). |
| 8 | **Twist** | **7** | **Fiebre de combos** (premia cascadas). |
| 9 | Test | **12** | Pasar del diez (6+6, 4+8). Par, aún en banda rica. |
| 10 | **Twist** | **10 → 6** | **Objetivo que cambia** a mitad del nivel. Cierre. |

> Regla: si dudás entre dos números para un nivel, elegí el más **redondo/amigable**
> o el **doble**, nunca el impar-feo. El 10 puede repetirse sin problema — es la marca
> del mundo.

> Nota de implementación: "doble objetivo" requiere soportar `targets` con más de
> un número fijo (hoy `target` es un único valor). "Modo relax" = flag para
> desactivar el timer y ganar solo por quota. "Objetivo que cambia" = cambiar
> `fixedTarget` al llegar a media quota. Todos son cambios acotados sobre el motor
> actual (`controller.js` / `levels.js`).

**Después del bloque de sumas:** aplicar el mismo patrón (teach→test→twist + números
elegidos por significado) para restas y multiplicación, usando `/metricas` para ver
dónde abandona la gente y recalibrar.

---

## 6. Desbloqueables y economía de estrellas

> Cómo dar la sensación de "recién al nivel N desbloqueás X" y de "junto puntos y
> compro cosas", **sin** caer en el patrón que la evidencia dice que socava la
> motivación (§1.3) ni en dark patterns (§1.5-1.6).

### 6.1 Qué dijo la evidencia (y qué es extrapolación)
La investigación **no aisló "desbloqueables" como hallazgo verificado propio**,
pero de los hallazgos confirmados se deduce con claridad:
- **Desbloquear por progreso (jugando) = ✅ respaldado.** Se apoya en la
  **anticipación/"wanting"** (§1.4 — saber que "al nivel N viene algo nuevo" activa
  el sistema de búsqueda) y en la **meta ligera atada a completar niveles** (§1.7,
  modelo Royal Match). Telegrafiar el hito futuro *es* construir anticipación sana.
- **Economía de monedas para comprar = ⚠️ cautela fuerte.** *Deci, Koestner & Ryan
  (1999):* las recompensas tangibles condicionadas a jugar **socavan** la
  motivación intrínseca (d≈−0.40), **peor en chicos**. Recomendación textual:
  recompensá con feedback de maestría, **no** con economías de moneda "como el
  punto" del juego.
- ⚠️ *Honestidad:* que telegrafiar el desbloqueo *específico* motive más está
  **alineado** con la evidencia de anticipación, pero es buena práctica de diseño,
  no un número medido.

### 6.2 Dos pistas, un solo sistema
No separar "desbloqueo por nivel" y "moneda para comprar" como dos economías.
Unificar en el **modelo de estrellas** (que ya tenés a medias):

- **Pista 1 — Progresión (gating por nivel):** lo *estructural* (modos, mecánicas,
  mundos, mascotas grandes) se desbloquea **jugando y llegando al nivel**, no
  comprando. Telegrafiado en el mapa. Es el "recién al nivel N".
- **Pista 2 — Tienda de estrellas:** las estrellas que ya ganás por rapidez se
  **acumulan** y se gastan **solo en cosméticos** (colores de tiza, accesorios del
  búho, temas de pizarrón). Es el "junto puntos y compro cosas".

### 6.3 Qué sí / qué no (regla dura)
| Comprar/desbloquear con moneda del juego | Veredicto |
|---|---|
| **Cosméticos** (mascotas, colores, temas) con estrellas ganadas jugando | 🟡 **Defendible** — modelo Royal Match, cercano a maestría, bajo riesgo. |
| **Boosters/power-ups** con moneda | 🔴 Riesgoso — el logro se "compra", erosiona la competencia (§1.2). |
| **Desbloquear niveles/skills** con moneda (gate de progresión) | 🔴 Evitar — pay/grind-gating del avance; opuesto a "desbloqueo por competencia". |
| **Cofres/loot aleatorios** | 🔴 Descartado — es el patrón variable-ratio **refutado** (§2) + bandera de dark pattern. |
| Cualquier cosa con **dinero real** | 🔴 Prohibido (público infantil, gratis, sin monetización). |

### 6.4 Cadencia de hitos: ¿cada cuántos niveles?
El objetivo es que el jugador vea un desbloqueable **en un tiempo razonable** — ni
tan seguido que pierda valor, ni tan lejos que haya "zonas muertas". Principios
derivados de la evidencia:

1. **Front-load (primer desbloqueo MUY temprano).** El *early win* y la anticipación
   pesan más al principio, y los chicos necesitan refuerzo más rápido (§1.2-1.3).
   → **Primer cosmético en el nivel 2-3**, casi regalado: instala "este juego me da
   cosas".
2. **Regla del "siempre algo a la vista".** En todo momento el próximo hito
   telegrafiado debe estar a **≤5 niveles**. Si no, el tramo intermedio se siente
   vacío (efecto goal-gradient: la anticipación crece al acercarse).
3. **Anclar los hitos GRANDES al fin de cada bloque de operación.** Terminar todas
   las sumas → desbloqueo que *celebra haber dominado la mecánica* (competencia,
   §1.2) y abre lo siguiente (restas). Le da sentido narrativo: "lo dominaste → toma
   esto → ahora algo nuevo".
4. **Cadencia que se ensancha con el tiempo.** Al principio las sesiones son cortas
   y frágiles → premios frecuentes. Más adelante el jugador ya está enganchado y las
   sesiones son largas → premios más espaciados pero más grandes.

**Cadencia recomendada:**
- **Niveles 1-10 (enganche):** algo cada **2-3 niveles** (mayormente cosméticos +
  los "twists" del §5 presentados como *features* nuevas).
- **Niveles 10-30 (ritmo):** un hito cada **~5 niveles**.
- **Niveles 30+ (madurez):** cada **~8-10**, pero más grandes (modos, mundos,
  mascotas nuevas).

> Sobre tu ejemplo de 9/19/29: es una cadencia de **10**, que para el *arranque* es
> demasiado espaciada (el nivel 2-8 quedaría sin nada a la vista y es justo donde
> más se abandona). 9/19/29 funciona mejor para los **hitos grandes** de la fase
> media/tardía, combinado con cosméticos más frecuentes en el medio. Por eso abajo
> propongo **denso al principio, cada 10 para los hitos grandes después**.

### 6.5 Roadmap de hitos (ejemplo concreto, telegrafiado en el mapa)
Aprovecha que varios "twists" del §5 ya son features nuevas → se presentan como
desbloqueos:

| Nivel | Desbloqueo | Pista / tipo |
|---|---|---|
| 2 | Color de tiza nuevo | Cosmético (casi regalado — enganche) |
| 4 | **Modo "Doble objetivo"** | Feature (es el twist del §5) |
| 6 | **Modo "Relax" (sin reloj)** | Feature (twist del §5) |
| 8 | Accesorio del búho / tema | Cosmético |
| **10** | 🎉 **"¡Dominaste las sumas!" → Mundo Restas + mascota nueva** | **Hito grande** (fin de bloque = competencia) |
| 15 | Nueva mecánica de tablero | Feature |
| **20** | 🎉 **Mundo Multiplicación + tema nuevo** | **Hito grande** |
| 25 | Cosmético premium (estrellas) | Tienda |
| **30** | 🎉 **Modo desafío / mundo nuevo** | **Hito grande** |

En paralelo, la **tienda de estrellas** está siempre disponible: el jugador siempre
tiene algo cercano por lo que ahorrar (objetivo de corto plazo constante).

---

## 7. Estructura de progresión de las operaciones (mundos vs paths vs modos)

> La pregunta: ¿cómo desbloqueamos Resta, Multiplicación, División, Potencia, Raíz,
> Negativos…? ¿Un solo camino? ¿Paths separados? ¿Modos? ¿Se desbloquean con
> estrellas? Esta sección define la estructura elegida y por qué.

### 7.1 Recomendación (TL;DR)
**Operaciones = "mundos" en un camino principal mayormente lineal, desbloqueados por
PROGRESO (completar el mundo anterior), con el mapa mostrando los mundos siguientes
BLOQUEADOS (candado + teaser).** Los **modos de juego** (Relax, Desafío, Doble
objetivo…) son un sistema **secundario y ortogonal**, no la forma de aprender
operaciones. **Las operaciones NO se compran gastando estrellas** (eso sería
grind-gating, §6.3); las estrellas son para cosméticos. Opcionalmente, un **umbral
de estrellas acumuladas** (no se gastan) puede servir de compuerta secundaria suave.

### 7.2 Por qué "mundos" y no paths de libre elección
- **La matemática tiene orden de dependencia.** No se puede testear multiplicación
  antes de dominar la suma; la división es la inversa de la multiplicación; los
  negativos son un salto abstracto. Un path de libre elección dejaría a un chico
  saltar a División sin base → rompe la **competencia** (§1.2) y el
  **teach→test→twist** (§4).
- **El "mundo" da el momento de maestría.** Terminar el mundo Suma → *"¡Dominaste
  las sumas!"* + abrir el mundo Resta celebra la competencia (§1.2) y le da sentido
  narrativo al avance (§1.7, modelo Royal Match).
- **El mapa se vuelve legible.** Cada mundo tiene su color/tema (ya tenés
  `zoneColor`), y los mundos bloqueados adelante **construyen anticipación** (§1.4).
- **Autonomía en lo seguro (§1.1).** La elección se da donde NO rompe el aprendizaje:
  elegir cosméticos, re-jugar niveles para 3★, elegir un modo alternativo — **no**
  "qué operación aprender primero".

### 7.3 Cómo se desbloquea cada mundo
- **Primario — por progreso:** completás el último nivel del mundo actual → se abre
  el siguiente. Simple, garantiza la base, es lo que la evidencia respalda
  (desbloqueo por competencia).
- **Secundario (opcional) — umbral de estrellas ACUMULADAS:** para pasar a ciertos
  mundos grandes, pedir *"tené N estrellas en total"* (estilo compuerta de Candy
  Crush). 🔑 **Clave:** las estrellas **NO se gastan** — es un umbral que se cumple
  jugando bien; da valor de re-juego (volver a niveles viejos a sacar 3★) y asegura
  competencia antes de avanzar.
- **🔴 Lo que NO hacemos:** **gastar/consumir** estrellas para "comprar" una
  operación o desbloquear niveles. Eso es el patrón grind-gating de §6.3 y erosiona
  la motivación intrínseca. Las operaciones se ganan **jugando**, no pagando (ni con
  estrellas ni con plata).

### 7.4 Orden y roadmap de mundos
Secuencia por dependencia matemática + dificultad. Los niveles de desbloqueo son
**aproximados** (se ajustan según el largo final de cada mundo, ~8-12 niveles c/u);
la **regla** manda sobre el número exacto. Alineado con la cadencia de §6.4 (hitos
grandes ~cada 10).

| # | Mundo | Contenido | Desbloqueo aprox. | Notas de diseño |
|---|---|---|---|---|
| 1 | **Suma** | `+`, 1 cifra, resultados chicos | Inicio | Base. Enseña la mecánica. Con twists (§5). |
| 2 | **Resta** | `−`, resultados **≥ 0** (sin negativos aún) | ~Nivel 10 | teach→test→twist propio. |
| 3 | **Suma y Resta** | `+ −` mezclados | ~Nivel 18 | Consolida las dos primeras. |
| 4 | **Multiplicación** | `×`, tablas | ~Nivel 25 | Nuevo aha. Mini-tutorial obligado. |
| 5 | **División** | `÷` **exacta** (sin resto) | ~Nivel 33 | Inversa de ×; enseñar el vínculo. |
| 6 | **Mezcla ×÷ / Todo** | `+ − × ÷` | ~Nivel 40 | Integra todo lo anterior. |
| 7 | **Números negativos** | resultados **< 0** (ej. `3−7 = −4`) | ~Nivel 48 | Salto abstracto → mundo propio, coach fuerte. |
| 8 | **Potencias y Raíces** | `x²`, `√` exacta (cuadrados chicos) | ~Nivel 55 | Presentar como "atajo de multiplicar". |
| 9 | **Dos cifras / Ecuaciones** | 2 cifras, `=` | ~Nivel 62 | Cierre avanzado (maestría). |

> Sobre tu ejemplo (Resta en 5/10, Mult en 15/20): el mundo Suma conviene que dure
> ~8-10 niveles (es donde se aprende la mecánica base), así que **Resta ~nivel 10**
> encaja. Pero **Multiplicación en 15-20 sería muy pronto**: entre medio va el mundo
> "Suma y Resta" para consolidar, así que Multiplicación cae más cerca de ~25. La
> regla ("terminá el mundo anterior") es más robusta que fijar el número.

### 7.5 Modos de juego (sistema secundario, ortogonal)
Los **modos NO son cómo se aprende una operación** — son cómo se **re-experimenta**.
Se desbloquean como features y aplican sobre los mundos ya abiertos. Ejemplos:
- **Relax** (sin reloj) — autonomía, para jugar tranquilo. *(es el twist del §5)*
- **Contrarreloj puro** — el modo actual.
- **Desafío** — quota alta / objetivo que cambia.
- **Doble objetivo** — dos targets a la vez.

Presentación: al principio aparecen **incrustados como "twists"** dentro de los
niveles (§5). Más adelante (fase madura, ~nivel 30+) se puede abrir un **menú
"Modos"** aparte, como sistema de re-juego. **No** son el eje de progresión: el eje
son los mundos.

#### 🔮 IDEA PENDIENTE — Modo Libre / Acumulación (hito cada ~10 niveles)
> Documentado 2026-07-04. Idea del usuario, **no implementada**. Poner un nivel especial
> **cada ~10 niveles** (encaja con la cadencia de hitos del §6.4) que rompa el loop de
> "formá el mismo número N veces" por uno **acumulativo y sin objetivo fijo**.

- **Mecánica (suma):** se puede formar **cualquier suma válida** (sin restricción de qué
  número hacer). Cada cuenta que hacés **suma su resultado a un total acumulado**. Meta:
  **llegar a un número grande, ej. 100.** (Ej.: hacés 7+2=9 → total 9; después 4+5=9 →
  total 18; y así hasta 100.) Es "libre": el jugador elige qué cuentas armar.
- **Mecánica (resta):** al revés — **arrancás en 100** (o el número) y cada resta **baja**
  el total. Meta: **llegar a 0** (o lo más cerca posible).
- **Por qué mola:** da **autonomía** (§1.1, elegís qué cuentas) y variedad; el total
  acumulado es un **goal-gradient** natural (barra que sube/baja hacia la meta); premia
  hacer cuentas grandes (llegás más rápido) → decisión estratégica sin cambiar la mecánica
  base de mover fichas.
- **Encaje:** como **hito cada ~10 niveles** (cierre de mundo / recompensa) o como modo
  desbloqueable en el menú "Modos" de la fase madura. Nombre tentativo: **"Modo Libre"**
  o **"Acumulación"** (suma) / **"Cuenta regresiva"** (resta, 100→0).
- **Preguntas abiertas (a definir al implementarlo):**
  1. ¿Qué pasa si te **pasás** de 100 (suma) o de 0 (resta)? ¿Overshoot permitido y ganás
     igual, o hay que caer justo? (Caer justo = más difícil/estratégico; permitir pasarse =
     más relajado.)
  2. ¿Hay **reloj** o es libre (tipo relax)? Probablemente contrarreloj para darle tensión,
     pero se puede combinar con relax.
  3. ¿Las **estrellas** se dan por rapidez, por caer justo, o por eficiencia (menos cuentas)?
  4. En resta, ¿se permite bajar de 0 a **negativos** (una vez introducido ese mundo)?
  5. Necesita UI nueva: **barra/contador de total acumulado** hacia la meta (distinto del
     tally de quota actual). Motor: en vez de `target` fijo + `quota`, un `accumulate:{from,to}`.

### 7.6 El mapa con mundos bloqueados (tu idea)
Mostrar el mapa completo con los mundos **futuros visibles pero bloqueados** — es
justo la palanca de **anticipación** (§1.4) y hay que aprovecharla:
- Mundo bloqueado = atenuado + **candado** + **teaser** ("Mundo Multiplicación").
- Condición visible y **honesta**, sin FOMO (§1.6): *"Completá el mundo Resta"* o
  *"Llegá al nivel 25"* — **nunca** "se acaba en 24h".
- Al desbloquear: transición celebratoria (la mascota presenta el mundo nuevo).
- Esto convierte el mapa en el motivador de largo plazo: *"quiero llegar a
  Potencias"*.

#### 🔮 IDEA PENDIENTE — Opciones en el menú/mapa + Reward diario
> Documentado 2026-07-04. Idea del usuario, **no implementada**. El mapa (pantalla
> principal) hoy no tiene "opciones"/features accesorias. Pensar una zona (ej. barra
> superior o botones flotantes) con accesos a: **reward diario**, **tienda de estrellas**
> (§6.2), **racha**, ajustes, etc.

- **Reward diario:** un regalo por jugar cada día (estrellas para la tienda, un cosmético,
  o polvo de tiza). Un ícono en el mapa que, al tocarlo, entrega el premio del día.
- **⚠️ LÍNEA ROJA ÉTICA (§1.6, §8 — CRÍTICO en público infantil):** el reward diario es OK
  **solo si es celebratorio y NO coercitivo**. Regalo por aparecer, **nunca castigo por
  faltar**. Prohibido: "logueate todos los días o perdés X", countdowns de FOMO, rachas que
  se resetean de forma dolorosa, tiendas que rotan cada 24h para presionar. Una racha suave
  que **celebra** (🔥 "¡3 días seguidos!") sí; una que **amenaza** no.
- **Qué puede dar (§1.3, §6.3):** cosméticos / estrellas (para cosméticos). **NUNCA** power-ups
  ni ventajas que afecten la competencia (eso se "compra el logro" y socava la motivación).
- **Preguntas abiertas:** ¿racha o regalo plano por día? ¿escala el premio con días seguidos
  (sin castigo al cortarse)? ¿qué da exactamente? ¿cómo se muestra sin generar presión?
- Relación: encaja con la **tienda de estrellas** (§6.2) como fuente extra de estrellas
  "por aparecer", y con la **racha suave** de la Fase B (§3, punto 5).

---

## 8. Checklist ético (revisar antes de cada release)

- [ ] La mascota **nunca** culpa, ruega ni presiona ("no te vayas…", carita triste
      para retener). Solo celebra, enseña y acompaña.
- [ ] **Sin** economía de monedas/loot como recompensa central. Las recompensas son
      simbólicas (cosméticos) y de maestría.
- [ ] **Sin** timers de FOMO abusivos, tiendas que cambian cada día, ni "logueate
      todos los días o perdés".
- [ ] Rachas y eventos: **opcionales y celebratorios**, nunca coercitivos.
- [ ] Feedback siempre **informacional** ("¡lo dominás!"), nunca controlador
      ("tenés que…").
- [ ] Dificultad: banda cómoda + early wins. **No** castigar; el fallo invita a
      reintentar (ya tenés "+1 minuto").

---

## 9. Preguntas abiertas (a resolver con playtest + métricas)

1. **¿Cuántos niveles de la misma operación antes de que aburra?** La investigación
   establece el *principio* de variedad escalonada pero no cuantifica el pacing para
   un puzzle educativo. → Medir abandono por nivel en `/metricas`.
2. **Público mixto chico+adulto:** el daño de recompensas tangibles y el beneficio
   del elogio verbal difieren por edad. Ningún estudio cuantificó un diseño de doble
   público. → Observar en playtest.
3. **¿La mascota (single-player) genera relación/retención medible**, o es un
   beneficio no probado? La evidencia de "relación" venía de jugadores reales.
4. **Tras el fallo, ¿qué patrón concreto hace REINTENTAR** en vez de abandonar? La
   evidencia advierte contra la DDA compleja pero no identificó el patrón ganador.

---

## 10. Retención como norte + modelo de publicidad (opt-in)

> Decisión de negocio (2026-07-04): el **objetivo de Math Crush es la RETENCIÓN**
> (D1, D7 y D7+), no el volumen de descargas ni exprimir ARPU con publicidad
> agresiva. Esta sección fija por qué, cómo se mide, y el modelo de ads elegido.

### 10.1 Por qué retención y no volumen (benchmark de competidores)
Investigación ligera de mercado (2026-07-04) sobre los dos competidores directos
más visibles en el top de puzzle matemático mobile:

| Juego | Estudio | Descargas aprox. | Modelo | Lectura |
|---|---|---|---|---|
| **Crossmath** (Math Puzzle Games) | Guru Smart Holding | ~37M Android + ~12.5M iOS; ~1.2M/mes | Ads intrusivos + IAP | ARPU bajo, vive del volumen |
| **Number Match** | Easybrain (Miniclip/Tencent) | portfolio +2.5 mil M; ~1.4M/mes | Ads a escala + IAP | Vive de la distribución de Tencent |

- Las estimaciones de ingresos de herramientas gratis (~$63K/mes IAP Crossmath iOS,
  ~$10K/mes IAP Number Match) son **casi solo IAP y subestiman los ads** — que es de
  donde ambos sacan la plata. El dato real por ads no es público (requiere Sensor
  Tower / AppMagic de pago).
- 🔑 **Conclusión:** ambos ganan por **escala de instalaciones + publicidad**, con
  juegos que el propio usuario probó y encontró **"más aburridos que el mío"**. No se
  puede competir contra el presupuesto de UA de Tencent (Number Match) ni tiene
  sentido pelear por descargas baratas.
- **La ventaja de Math Crush es ser más divertido → mejor retención y sesión.** El
  eje competitivo es **D7/D30 y minutos por sesión**, no descargas. Es coherente con
  toda esta guía: la diversión (competencia + autonomía, §1) es justo lo que a la
  competencia le falta.

### 10.2 Instrumentación (ya implementada, 2026-07-04)
No se puede optimizar lo que no se mide. Se instrumentó la retención **antes** de
construir features de retención:
- **Evento `open`** (`metrics.js` → `initMetrics`): se registra al abrir la app (una
  vez por carga; `level_idx` null). Es la base de **DAU** y del denominador de
  retención. Antes solo se sabía cuándo alguien *empezaba un nivel*, no cuándo
  *volvía*.
- **Sección "Retención" en `/metricas`** (`Metrics.jsx` → `retention()`): calcula
  cohortes **D1 / D3 / D7 / D14 / D30** desde `created_at` + el UUID persistente que
  ya existía, y un gráfico de **actividad diaria** (activos + nuevos, últimos 14
  días). Semáforo contra benchmark casual (**D1 ~35-45%, D7 ~10-15%**).
- Eventos futuros ya documentados en `supabase.sql`: `rewarded_ad` (meta:
  `placement`, `reward`) y `daily_reward` (meta: `day`, `reward`, `boosted`).
- ⚠️ *Caveats:* la retención se cuenta **por dispositivo** (UUID en localStorage;
  limpiar el navegador = jugador nuevo) y el bucketing de días es **UTC**. Aceptable
  para playtest; si escala, pasar a identidad más estable + tz local.
- **Método de trabajo:** instrumentar → shippear la feature → **leer si D1/D7 sube**.
  No adivinar el efecto; medirlo.

### 10.3 Modelo de publicidad: SOLO rewarded, opt-in, nunca invasivo
Regla dura de producto, alineada con la ética de §1.5-1.6 y con la **autonomía**
(§1.1: dejar al jugador *elegir* respeta la autonomía; obligarlo la rompe):

- ✅ **Solo rewarded (recompensado) y por elección.** El jugador ve **de 1 a 5
  anuncios/día si le apetece**; el rewarded por naturaleza lo pide él, así que casi
  se autolimita.
- 🔴 **Nada de interstitials** entre niveles, **nada de banners** sobre el gameplay,
  nada forzado. Esto es lo que hace la competencia y es justo lo que NO hacemos.
- **Placements previstos** (todos opt-in, el beneficio base siempre disponible sin
  ad):
  1. **+2 min al perder por tiempo** — es un "continue" (ya existe `MAX_CONTINUES`);
     da otra oportunidad, **no** resuelve el nivel. Mantener el tope.
  2. **Power-up puntual desde el menú** a cambio de ver un anuncio antes.
  3. **Boost del regalo diario** (ver §11) — la fuente natural de los 1-5 ads/día.

### 10.4 Candado de diseño: el ad no puede robar la maestría
La competencia es la palanca #1 (§1.2) y las recompensas extrínsecas la socavan
(§1.3). Por eso:
- Un rewarded **ayuda, no juega por el jugador.** Si un power-up "resuelve" el
  tablero, se gana pero no se *siente* el logro → menos disfrute y menos retención.
- Los rewarded **nunca dan estrellas** ni desbloquean niveles/mundos (eso es solo por
  habilidad, §7.3). Solo dan helpers acotados (pistas, +tiempo) y **cosméticos**.

### 10.5 El trade-off, asumido a conciencia
Solo-rewarded = **se gana bastante menos por usuario** que quien mete interstitials.
Es una **apuesta deliberada** a retención + reputación en vez de exprimir. Para un
juego cuya tesis es "más divertido que los competidores", es la decisión correcta;
solo debe quedar claro que es a propósito, no un descuido.

---

## 11. Regalo diario ("Regalo del día")

> Diseño del daily reward, atado a las dos reglas de §10 (retención + no abusar de
> ads) y a la ética de §1.3/§1.6 (nada de monedas/loot, nada de FOMO/culpa).

### 11.1 Tres candados de diseño (no negociables)
1. **El regalo NUNCA da estrellas** ni desbloquea niveles/mundos → eso se gana solo
   con habilidad (§7.3). Si no, se rompe la sensación de logro (§1.2).
2. Los premios **funcionales** (pistas, +tiempo) **ayudan pero no resuelven** el
   nivel.
3. Los **cosméticos** son el premio estrella: dan alegría **sin tocar la
   dificultad**. Es la moneda emocional segura (modelo Royal Match, §1.7 / §6).

### 11.2 Estructura: "Semana de bienvenida" + regalo perpetuo
En vez de una racha castigadora (§1.6 **refutó** el FOMO/culpa), un **calendario de
los primeros 7 días distintos** del jugador — que es *literalmente* la ventana D1-D7,
el norte de §10:

| Día | Premio | Tipo |
|---|---|---|
| 1 | 3 pistas + saludo de la mascota | funcional suave |
| 2 | 🎨 Color de tiza nuevo (fichas) | cosmético |
| 3 | ⏱️ 1 token "+2 min" | funcional (opt-in) |
| 4 | 🦉 Accesorio de la mascota (gorrito) | cosmético |
| 5 | 3 pistas + doodle de fondo | mixto |
| 6 | 🖼️ Marco de pizarrón alternativo | cosmético |
| **7** | ✨ **Tiza dorada / skin de mascota** | **cosmético héroe** |

- **Se cuenta por días jugados distintos, NO consecutivos** → si falta un día no
  pierde nada, **no** hay pantalla roja de "¡rompiste tu racha!". Framing siempre
  positivo ("¡Día 4! 🎉"). Coherente con §1.6 y el checklist ético (§8).
- **Después del día 7 (D7+):** regalo perpetuo chico rotativo (1-3 pistas *o* una
  pieza cosmética de un pool). Sostiene el hábito sin treadmill.

### 11.3 Tie-in con rewarded ads (opt-in)
Cada regalo tiene dos botones: **"Recoger"** (gratis, siempre) y **"Mejorar 🎬"**
(ver 1 anuncio → duplica las pistas / suma una pieza cosmética / adelanta el
cosmético). **Nunca obligatorio**; el regalo base se toma sin ad. Esto, más los otros
placements de §10.3, genera naturalmente los 1-5 rewarded/día sin ser invasivo.

### 11.4 Secuencia de implementación (realista)
El sistema de cosméticos/tienda todavía **no existe** (planificado en §6). Por eso:
- **v1 (se puede shippear ya):** calendario con **pistas + tokens de +tiempo**
  solamente + boost por ad. El loop de retención queda vivo y **medible** con la
  retención de §10.2.
- **v2:** primer cosmético real (color de tiza) → el regalo empieza a soltar
  cosméticos.
- **v3:** integrado con la tienda de estrellas (§6) cuando exista.

### 11.5 Honestidad de diseño
Que el regalo diario *mueva* D1/D7 está **alineado** con la evidencia de anticipación
(§1.4) y de hábito, pero es buena práctica de diseño, **no un número medido** para
este juego. Por eso se instrumentó primero (§10.2): se valida leyendo la retención,
no se asume.

---

## 12. Fuentes (primarias en negrita)

**Académicas / primarias**
- **Ryan, Rigby & Przybylski (2006), "The Motivational Pull of Video Games", *Motivation and Emotion* 30:344-360** — SDT, competencia/autonomía/relación.
  <https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf>
- **Przybylski, Rigby & Ryan (2010), *Review of General Psychology*** — atractivo/bienestar por necesidades, no por contenido.
  <https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf>
- **Deci, Koestner & Ryan (1999), *Psychological Bulletin* 125(6)** — meta-análisis 128 experimentos: recompensas tangibles socavan, feedback positivo refuerza.
  <https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf>
- **Cutting, Deterding et al. (2023), *Royal Society Open Science* (pre-registrado, n=311)** — la sintonía dificultad-skill no cambia el disfrute.
  <https://royalsocietypublishing.org/rsos/article/10/2/220274/91884/>
- **DiGRA — dopamina como "wanting"** <https://dl.digra.org/index.php/dl/article/download/2731/2717>
- **Berridge & Robinson (incentive-salience), PMC3077261** <https://pmc.ncbi.nlm.nih.gov/articles/PMC3077261/>
- **"Level Up or Game Over" (arXiv 2412.05039, ACM)** — F2P y dark patterns.
  <https://arxiv.org/html/2412.05039v1>
- **Fairplay/Georgetown Law, filing FTC (2021)** — mascotas y FOMO como daño a chicos.
  <https://fairplayforkids.org/wp-content/uploads/2021/05/darkpatterns.pdf>

**Industria / práctica (secundarias)**
- Naavik — Royal Match: <https://naavik.co/digest/royal-match-finding-success-through-iteration/>
- GameRefinery — renovación en casual: <https://www.gamerefinery.com/why-renovation-and-construction-elements-are-becoming-more-popular-in-casual-games/>
- Celia Hodent — ética en videojuegos: <https://celiahodent.com/ethics-in-the-videogame-industry/>
- Game Developer — diseño ético (ex-UX lead de Fortnite): <https://www.gamedeveloper.com/design/former-i-fortnite-i-ux-lead-digs-into-ethical-game-design>
- Level progression & pacing en puzzles: <https://medium.com/@mdelally/level-progression-and-pacing-in-puzzle-games-eb9e6a97e571>
- The player's progress (mobile puzzle): <https://www.gamedeveloper.com/design/the-player-s-progress-designing-levels-for-mobile-puzzle-games>

---

## 13. Idea: niveles hito (cada 10) = BATALLA DE JEFE (HP) — a implementar

**Origen:** al unificar los niveles normales a "llená la barra a 1000 sin reloj", los niveles
acumulativos (10/20/30/40) quedaron demasiado parecidos al resto (misma barra que sube). Hacía
falta diferenciar el hito de fin de mundo. Idea del usuario (2026-07-04): reencuadrar el hito
como una **batalla contra números-enemigo con HP**.

### Concepto
- Cada objetivo del nivel es un **enemigo con HP** (una barra de vida que arranca LLENA).
- Formar una cuenta = **ATACAR**: el efecto de absorción de fichas (que ya existe y ya está
  sincronizado con el llenado de la barra) pasa a leerse como un golpe que **baja el HP**.
- Cuando un enemigo llega a **0 HP se derrota**: explota / desaparece con juice.
- Un hito tiene varios enemigos (los 4 resultados del set acumulativo). Se puede **atacar a
  todos a la vez** (cualquier resultado formado golpea a su número) o enfocarse en uno.
- Se **derrota a los 4 → se pasa el nivel** (clímax de fin de mundo, "jefe del Mundo Suma").

### Por qué encaja (no es sólo estética)
- **Mismo motor, otra piel.** HP = la barra; ataque = absorción; "derrotado" = meta alcanzada.
  Bajo riesgo de implementación. La dirección "baja de lleno a 0" ya coincide con cómo restan
  los mundos Resta/División.
- **Feedback de competencia con personalidad** (SDT, §1): darle carita/reacción a un número que
  recibe golpes y explota es feedback informacional motivador, sin recompensas extrínsecas.
- **Diferencia el hito** con un molde narrativo ("derrotá al jefe") en vez de "una barra más
  larga". Justifica HP alto (500/1000) porque es *un jefe*, no un nivel más.
- **Justifica el set múltiple** que esos niveles ya tienen (varios resultados = varios enemigos).

### Decisiones (RESUELTAS 2026-07-04)
- **Daño = VALOR formado.** Cada golpe resta al HP el valor del resultado (de N en N). Coherente
  con la barra normal y reusa lo hecho.
- **HP = objetivo × 10.** Cada enemigo N arranca con HP = N·10 y cada golpe le hace N de daño →
  **siempre 10 golpes para derrotar a cualquier enemigo**, sin importar el número. (Enemigo 5:
  HP 50, golpe 5 → 10 hits. Enemigo 10: HP 100, golpe 10 → 10 hits.) Ritmo parejo entre enemigos.
- **HP por enemigo (barra propia).** Cada número tiene su HP; se ven todos. Derrotás a los N → pasás.
- **Dirección: baja (lleno → 0).** La barra de HP arranca **amarilla llena** (como el chip actual)
  y baja; al llegar a 0 el enemigo queda **apagado/gris** (derrotado) + pop.
- **Targeteo: cada resultado golpea a SU número.** Sin seleccionar blanco. Formar 5 daña al 5.
- **Línea roja temática (§8): estilo "pop"/monstruitos simpáticos** (P&D). **Nada de sangre ni
  armas.** El número rebota / se marea / hace pop al ser derrotado. Feedback alegre, no violento.
- **Reloj:** coherente con el resto = sin reloj (se pierde sólo por intentos). [pendiente confirmar]

### ⚠️ Tensión de balance a resolver
Con estos números, un jefe = N enemigos × 10 golpes (ej. [5,6,8,10] = 40 cuentas). Pero los
niveles NORMALES quedaron en meta 1000 por VALOR → en objetivo chico (sumar 5) son ~200 cuentas.
O sea: hoy el jefe sería MÁS CORTO que un nivel normal. Hay que decidir si (a) se acortan los
normales, (b) el jefe tiene más enemigos/HP, o (c) está bien que el jefe sea intenso pero corto.

### Visión ampliada — JEFE REAL = signo de operación personificado (idea 2026-07-04, a futuro)
Evolución del concepto (a hacer DESPUÉS de la versión base de arriba):
- **Dos capas de batalla:**
  1. **Mini-batallas** en algunos niveles NORMALES: enemigos-número chicos con HP (la versión
     base de §13), como antesala/tutorial de la mecánica de combate ("teach→test→twist").
  2. **Jefe REAL** en el nivel 10 de cada mundo: **el SIGNO de la operación personificado** —
     un "+" (Mundo Suma), "−", "×", "÷" con **cara, brazos y animación**, tipo mascota-villano.
- **El jefe recibe varios ataques de varias cuentas** según el momento (fases): distintos
  resultados le pegan; puede tener fases/partes.
- **El jefe TE ATACA modificando el tablero y estorbándote:** mezcla fichas, bloquea celdas,
  mete "basura", cambia el objetivo un rato, etc. Acá está el oro de la idea: **la dificultad
  del hito viene del TABLERO** (ataques del jefe), no de una barra más larga. Convierte el hito
  en un duelo real.

**Por qué es fuerte:** antagonista temático memorable por mundo (el propio signo), personalidad
sin violencia (villano simpático, estilo pop), y dificultad genuina desde el tablero — justo
donde el research dice que debe venir el desafío (competencia, no grind).

**A cuidar (define si es divertido o molesto):**
- Ataques **justos**: telegrafiados, reversibles, que NUNCA te dejen sin jugada posible.
- **Costo de arte/animación**: 4 personajes-signo con estados (idle, ataca, recibe golpe,
  derrotado). Es el ítem más pesado del proyecto.
- **Balance del duelo**: HP del jefe, frecuencia/intensidad de ataques, cómo los contrarrestás.
- Empezar por la **versión base** (números-enemigo con HP, sin ataques) y recién después sumar
  el jefe animado con ataques al tablero.

### Primer ataque concreto del jefe: CONGELAR (idea 2026-07-04)
Ataque del jefe "+" (y molde para los demás). El jefe actúa **cada ~5 s**:
- **Congela** algunas piezas del tablero (operadores Y números) → quedan **inutilizables**
  (no se pueden arrastrar/usar) con overlay de hielo/escarcha ❄️.
- **Romper el hielo:** si formás una cuenta **que hace contacto** (adyacencia ortogonal) con
  una pieza congelada, se **descongela** y volvés a poder usarla.
- Da tensión sin reloj-de-perder: el timer es **del jefe**, no del jugador (no perdés por tiempo;
  el jefe simplemente estorba periódicamente).

**Guardrails (críticos, definidos):**
1. **Nunca dejar sin jugada:** capear nº de celdas congeladas y garantizar SIEMPRE ≥1 cuenta
   posible con piezas libres (chequeo tipo `findHintFallback` ignorando congeladas). Si congelar
   trabaría el tablero, congelar menos / saltear ese tick.
2. **Contacto = adyacencia ortogonal** a las celdas de la cuenta jugada. Simple y legible.
3. **Visual obvio** de congelado + animación de ruptura.
4. **El mantenimiento** (siembra/reacomodo/`_healFixedBoard`) **saltea** celdas congeladas.
5. **Cadencia** 5 s fija al inicio; acelerar por fases (poco HP → más seguido) a futuro.

**Implementación (esbozo):** estado `frozen` por celda en el board (Set de "r,c"); scheduler
`setInterval`/tick solo en niveles `boss`; el drag/selección ignora congeladas; tras `_resolve`,
descongelar las adyacentes a `playedCols`/celdas jugadas; overlay de hielo en Pixi (`Board.js`).
Toca el motor de tablero + Pixi (más pesado que la versión base estática).

### Estado
Versión base del jefe (signo + HP 1000, daño=valor) **YA IMPLEMENTADA** (2026-07-04, nivel 10
"Jefe: el signo +"). El ataque CONGELAR y el jefe animado son la fase 2, **no implementados aún**.
La mecánica base reemplazó la `accum` en el nivel 10 (los hitos 20/30/40 siguen en `accum`).
Diseño base cerrado. Reemplazaría la mecánica `accum` de los niveles
10/20/30/40 (hoy: barra `{start,goal}`). Montado sobre el motor de barra/absorción ya sincronizado
(ver [[equa-crush-project]]). Modelo base: `boss: true` + `target: [set]`; HP[n]=n·10; daño=valor;
win al derrotar a todos. El **jefe-signo animado con ataques al tablero** es la fase 2 (a futuro).

## 16. Súper Ficha (mecánica tipo Candy Crush) — IMPLEMENTADA en SUMA (2026-07-05)

Idea del usuario: como en Candy Crush combinar 4/5 caramelos genera una pieza especial, acá
formar una cuenta con **2 operadores** (ej. `2+1+3=6` en vez de `2+4`) genera una **SÚPER FICHA**
del signo (arranca con `+`). Es un premio por armar una cuenta más elaborada.

**Reglas (v1, sólo SUMA):**
- **Generar:** una cuenta que use 2 operadores deja una súper ficha `+` (se conserva 1 de los
  operadores del segmento; el resto de la cuenta explota normal y cuenta su valor a la barra).
- **Ver:** la súper ficha se ve cargada/especial (dorada + ✨ + aura). Pendiente: pulso animado
  (se dejó estático por lifecycle de tweens en Pixi al destruir la ficha).
- **Usar:** cuando la súper `+` participa de una cuenta (ej. `2+4` usándola como el `+`), además
  de contar la cuenta **explota en CRUZ** = fila + columna completas (decisión: cruz completa,
  más satisfactoria que "sólo arriba+costados"; fácil de restringir). Los destruidos generan
  cascada (combos que sí cuentan).
- **Validación/generación:** como armar una cuenta de 2 operadores es difícil (necesita
  `[a][+][b][+][c]` alineados), el motor **garantiza siempre ≥1 jugada de 2 operadores** en el
  tablero (`countComboMoves`/`plantComboMove` en logic.js; el heal reintenta hasta 3 veces). Por
  eso el nivel es **grande (7×7)**: la cuenta de 2 operadores necesita espacio.

**Implementación (archivos):**
- `logic.js`: `findTargetSegments` (segmentos con nº de operadores → detectar cuentas de 2 ops),
  `countComboMoves`/`lineHasComboMatch` (jugadas de exactamente 2 ops), `targetTriosTwoOps`
  (tríos a+b+c=target, SÓLO suma), `plantComboMove` (siembra una cuenta de 2 ops a un swap).
- `Board.js`: `Tile.super` + `_applySuper` (look), `makeSuper`/`isSuper`/`superCells`/`superCross`.
- `controller.js` `_resolve`: detona la cruz de las súper usadas + genera súper de cuentas de 2 ops
  (conserva 1 operador antes del colapso). `_healFixedBoard`: protege súper fichas del
  mantenimiento + garantiza ≥1 jugada de 2 ops.
- `levels.js`: **nivel 8 "Súper ficha ✨"** = 7×7, target 12, `maxOps: 2`, `superTile: true`, goal 200.
- Flags de nivel nuevos: `superTile: true` y `maxOps: 2`.

**Verificado (sim 4000 tableros):** 0 cuentas ya formadas, 0 deadlocks, 0 tableros sin jugada de 2
operadores. Falta probar en runtime (visual de la súper + detonación en cruz).

**PENDIENTE (documentado, no implementado):**
- **Otras operaciones (−, ×, ÷):** `targetTriosTwoOps` y `plantComboMove` son SÓLO suma (a+b+c).
  Para resta/mult/div hay que generalizar los tríos con la operación (y decidir qué signo tiene la
  súper: la del mundo). El resto del motor (detección por `opCount`, detonación, protección) ya es
  operación-agnóstico.
- **Pulso animado** de la súper ficha (hoy estático).
- **Balance:** ¿cuántas súper por partida? ¿la cruz debería ser sólo fila, o cruz+área (tipo
  envuelto)? ¿combinar dos súper? ¿la súper debería poder generarse también en niveles normales?
- **Telegrafía/tutorial:** un coach la primera vez que se genera una súper explicando cómo usarla.
