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

### 7.6 El mapa con mundos bloqueados (tu idea)
Mostrar el mapa completo con los mundos **futuros visibles pero bloqueados** — es
justo la palanca de **anticipación** (§1.4) y hay que aprovecharla:
- Mundo bloqueado = atenuado + **candado** + **teaser** ("Mundo Multiplicación").
- Condición visible y **honesta**, sin FOMO (§1.6): *"Completá el mundo Resta"* o
  *"Llegá al nivel 25"* — **nunca** "se acaba en 24h".
- Al desbloquear: transición celebratoria (la mascota presenta el mundo nuevo).
- Esto convierte el mapa en el motivador de largo plazo: *"quiero llegar a
  Potencias"*.

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

## 10. Fuentes (primarias en negrita)

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
