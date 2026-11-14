# Diseño de juego — estado de implementación

Fuente: documento de diseño de ELYSIUM (prompt maestro). Este archivo registra qué está
implementado, qué interpretaciones se hicieron y qué falta definir. No se inventaron reglas.

## Implementado

- 5 tripulantes con estadísticas iniciales (§6.2) y especialidades (§6.3) exactas.
- Rangos y etiquetas de las 5 estadísticas (§6.1); estrés con escala invertida.
- Límite 0–100 en todas las operaciones.
- Catálogo completo de estados permanentes, únicos y legendarios (§6.4–6.6). Hipervigilancia se conserva como dos entradas (Sueño y Estrés).
- Límites numéricos de estados aplicados al hacer clamp: Lesión Crónica (Salud máx. 80), Desmotivación Crónica (Moral máx. 80), Rencor (Confianza máx. 70), Ruptura de Autoridad (Confianza máx. 50), Lealtad Inquebrantable (Confianza mín. 40).
- Misión 1, El Satélite Fantasma, completa: base del equipo óptimo, sin Lyra (+15 Estrés / −10 Sueño a participantes), sin Zara (−25 Salud a un participante al azar, registrado), sin Orion (+10 Estrés / −5 Confianza a participantes).
- Misiones 2–5 como datos (equipo óptimo, consecuencias, penalizaciones, rutas de la misión 5). No se pueden lanzar.
- 8 sectores con función y equipamiento; el Centro Médico y el Módulo Habitacional muestran las estadísticas que les corresponden.
- Reglas de recuperación (§7) como catálogo de datos en `domain/rules/recovery.ts`, con lo que falta para cada una.

## Interpretaciones (revisables)

| Tema                                  | Decisión                                                                                                    | Motivo                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Participantes fuera del equipo óptimo | Sin consecuencia base; reciben solo las penalizaciones dirigidas a "participantes".                         | El diseño solo define la base de los miembros óptimos.                                                  |
| Penalización sin Zara                 | El participante al azar se elige entre los enviados.                                                        | "Un personaje al azar" en el contexto de la misión.                                                     |
| Información sin equipo óptimo         | Se registra como "no determinada".                                                                          | El diseño solo define "Se obtiene toda la información" con el equipo óptimo.                            |
| Disponibilidad                        | Bloquean: Salud 0, Moral 0 ("Se niega a cooperar"), Sueño 0 ("Colapso inmediato"). Confianza 0 solo alerta. | Estados terminales de §6.1; "Desobediencia" describe un comportamiento futuro, no una indisponibilidad. |
| Turno                                 | Avanza 1 por misión resuelta.                                                                               | No hay sistema de tiempo definido.                                                                      |
| Misión completada                     | No se repite.                                                                                               | "Misiones completadas / disponibles" en los requisitos.                                                 |
| Orden de aplicación                   | Se suman todas las consecuencias y se limita una sola vez.                                                  | Evita aplicar dos veces o depender del orden.                                                           |

## Pendiente de definición en el diseño

- Recursos de la nave (tipos, valores iniciales, consumo): lo necesitan misiones 2–5, §7 y las alertas de recursos.
- Disparadores de estados permanentes ("durante varias misiones", "sobreexplotar", etc.).
- Magnitudes no cuantificadas: Resentimiento (Confianza máxima reducida), Hipervigilancia (Sueño < 100), rangos de §7 (+5 a +15, etc.).
- Fórmula de recuperación de Sueño según Estrés (solo hay dos ejemplos: 20 → +25, 90 → +10).
- Alcance de "todos" en misiones 2 y 4 (participantes o tripulación completa) y la sustitución "Moral +5 solamente" de la misión 4.
- Acciones fuera de misión (descanso, recreación): requieren un sistema de turnos.
- Muerte frente a incapacidad con Salud 0; estados legendarios y finales.
