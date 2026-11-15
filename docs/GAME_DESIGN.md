# Diseño de juego — RPG de decisiones

N0VA-7 supervisa un viaje **sin final**: el objetivo es sobrevivir lo más lejos posible. El tiempo corre en tiempo real (1 hora de juego = 2 s a 1×)
y se pausa solo cuando hace falta decidir. El jugador no mueve a los astronautas: decide qué hacen,
y ellos caminan solos por la nave hacia su sector.

## Bucle

1. Vigilar: sistemas de la nave siempre visibles; las estadísticas de un tripulante solo al pulsarlo.
2. Surgen tareas con plazo (eventos, solicitudes y misiones). Las críticas y urgentes pausan el juego.
3. Decidir: opción + equipo. Se muestra la probabilidad de éxito con su desglose.
4. Advertencias: Estrés ≥ 76, Sueño ≤ 24 o Salud ≤ 24 → "Mandar de igual forma" (Confianza −5).
5. Resultado al terminar la tarea: éxito o fallo con su causa principal; muchos fallos permiten reintentar.
6. Ignorar una tarea hasta su plazo aplica su consecuencia.

## Probabilidad de éxito (`rules/chance.ts`)

- Tareas: base de la opción + 4,5 % × mejor nivel de la especialidad requerida + 5 % por cada miembro extra + media de las penalizaciones del equipo. Se limita a 5–95 %.
- Misiones: 75 % con el equipo óptimo, −15 % por cada ausente, + media de las penalizaciones.
- Penalizaciones por miembro (según los rangos del §6.1): Estrés 51–75 −10 %, ≥76 −20 %; Sueño o Salud 25–49 −10 %, ≤24 −20 %; Moral 25–49 −5 %, ≤24 −10 %; Confianza ≤24 −10 %.

## Desgaste por hora (`rules/drift.ts`)

| Actividad                                   | Sueño                                                | Estrés        | Otros                                         |
| ------------------------------------------- | ---------------------------------------------------- | ------------- | --------------------------------------------- |
| En su puesto                                | −1,2                                                 | +0,3          | Kai produce comida; Lyra, energía             |
| Tarea / misión                              | −1,8                                                 | +0,8 / +0,5   | + desgaste de la tarea al terminar            |
| Descanso (8 h; de 22:00 a 06:00 automático) | +25 por turno, menos con estrés (20 → +25, 90 → +10) | −10 por turno | Salud +0,25/h                                 |
| Tiempo libre (4 h)                          | −0,8                                                 | −15           | Moral +5                                      |
| Enfermería                                  | —                                                    | −0,5          | Salud +10 por turno de 8 h; consume medicinas |

Además, del §7: Sueño < 30 → el estrés sube al doble y la salud se recupera a la mitad; Moral < 30 → el estrés baja a la mitad; Moral < 20 → la salud se recupera a la mitad; Estrés > 80 → Moral −5 cada día.

## Confianza (§7)

- Conceder un descanso solicitado: +5. Denegarlo: −5 (y Estrés +5). Ignorarlo: −5.
- Priorizar el bienestar (mandar a descansar, a tiempo libre o a la enfermería a alguien saturado o agotado): +10, una vez al día.
- Forzar una orden: −5. Tres veces → **Rencor** (Confianza máxima 70).

## Estados permanentes activos

- **Rencor:** tres órdenes forzadas.
- **Insomnio:** colapsar dos veces por Sueño 0.
- **Lesión Crónica:** 48 h seguidas con Salud < 25.
- **Duelo:** al morir un compañero (Moral −15 además de −20).
- **Culpa del Comandante:** Orion recibe +15 de Estrés por cada muerte.

Los multiplicadores de recuperación de los demás estados ya están en `conditionMultipliers` y se activarán cuando tengan desencadenante.

## Salud 0, colapso y muerte

- Salud 0 → incapacitado y trasladado a la enfermería. Tras 24 h seguidas en 0, muere.
- Sueño 0 → colapsa y queda 8 h fuera de servicio.
- Moral 0 → se niega a cooperar (no acepta tareas).

## Misiones (§8–9)

Aparecen el día indicado a las 09:00 y hay 24 h para enviar un equipo (1–3 tripulantes). Las consecuencias del documento se aplican tanto si sale bien como si sale mal; la recompensa solo llega con éxito. Un fallo resta Moral y abre "Reintentar misión"; dejarla vencer la pierde.

| Misión                    | Día | Recompensa (decidida para el juego)                          |
| ------------------------- | --- | ------------------------------------------------------------ |
| El Satélite Fantasma      | 2   | Energía +10                                                  |
| Brote en los Huertos      | 7   | Comida +25 (sin Kai: ×0,6)                                   |
| Campo de Asteroides       | 13  | Energía +30 (sin Lyra: ×0,5); casco −5 siempre               |
| La Señal de Auxilio       | 19  | Moral +15 y Confianza +20 a todos (sin Orion: solo Moral +5) |
| El Corazón de la Tormenta | 25  | La tormenta daña la nave; cada ruta protege un sistema       |

## Interpretaciones del documento

- "Todos" en las penalizaciones = participantes, salvo en las de Moral ("Moral −10/−15 para todos"), que afectan a toda la tripulación.
- Los participantes fuera del equipo óptimo no tienen consecuencia base; solo reciben las penalizaciones.
- "Éxito en misiones: +5 a +20 Moral" → +10 para el equipo.
- "Toda recuperación futura −50 %" (tormenta sin Elias) → multiplicador permanente de recuperación ×0,5.
- Los valores de la nave, los eventos aleatorios y sus probabilidades son diseño propio del juego, documentado en `content/events.ts` y `content/ship.ts`.

## Equilibrio

`tests/domain/balance.test.ts` juega partidas completas: un N0VA-7 pasivo pierde pronto, uno
competente llega a la fase Media, y los modos más difíciles terminan antes. Con el bot de prueba:
Fácil ≈ días 13–20 (nivel 8–14), Medio ≈ días 11–14, Difícil ≈ días 7–10.

## Dificultad progresiva (tipo Tetris)

El nivel sube cada **36 horas de juego** (no depende de la velocidad del reloj). El modo elegido al
empezar fija el nivel inicial; la fase del nivel actual decide cuánta ayuda da N0VA-7.

| Modo / fase | Niveles | Nivel inicial | Ayuda |
| --- | --- | --- | --- |
| Fácil (inicial) | 1–4 | 1 | Recomienda el equipo óptimo en todas las tareas |
| Medio (intermedio) | 5–9 | 5 | Solo en tareas críticas y misiones (las de más desgaste) |
| Difícil (avanzado) | 10+ | 10 | Solo la probabilidad; sin equipo óptimo ni penalizaciones por ausencia |

Cada nivel (s = nivel − 1), definido en `src/domain/rules/difficulty.ts`:

- Consumo de energía ×(1 + 0,12·s), comida ×(1 + 0,07·s).
- Probabilidad de evento por hora 4,5% + 0,9%·s; hasta 3 + s/3 eventos abiertos (máx. 6); enfriamientos ÷(1 + 0,08·s).
- Duración de tareas y misiones ×(1 + 0,06·s); plazos para responder ×(1 − 0,03·s) (mín. 60%).
- Descoordinación de sueño: de noche (22–06) los eventos pesan 0,5 + 0,12·s (menos al principio, más que de día desde el nivel 6).
- Expediciones recurrentes desde el nivel 3, cada ~72 − 5·(nivel − 3) h (mín. 20 h), a cualquier hora; dos simultáneas desde el nivel 10. Repiten ruta, coste y recompensa de una misión de la historia sin cambiar su estado.

Al perder se guarda el récord (nivel y día) por modo en `elysium.records`.
