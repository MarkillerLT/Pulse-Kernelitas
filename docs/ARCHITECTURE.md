# Arquitectura

Aplicación local: React 19 + Vite 8 + TypeScript. No hay servidor. Un backend no aportaría nada en
este alcance (sin usuarios, sin multijugador, sin datos remotos), así que la "lógica de servidor" es
un motor de dominio puro que se ejecuta en el navegador.

```
src/
  domain/              Reglas del juego. Sin React, sin DOM, sin almacenamiento, sin reloj.
    content/           Datos estáticos: crew, missions, sectors, conditions (nunca se guardan)
    model/             Esquemas Zod + tipos: stats, game (estado persistible)
    rules/             stats (rangos, límites, clamp), availability, alerts, recovery (catálogo §7)
    engine/            createGame, analyzeTeam (validación + vista previa), resolveMission, random
  persistence/         saveGame: localStorage, sobre versionado, validación, respaldo, migraciones
  store/               gameStore (Zustand): llama al motor, publica el estado y lo guarda
  ui/                  router, AppShell, components/, views/, sprites, formato
  assets/characters/   Sprites de la tripulación (frente/espalda)
  styles/              tokens.css + index.css
```

## Flujo de una misión

1. `MissionBriefingView` mantiene la selección (estado transitorio) y llama a `analyzeTeam(state, order)` para la vista previa.
2. Al confirmar, `gameStore.launchMission(order)` llama a `resolveMission(state, order, { now })`.
3. `resolveMission` reutiliza `analyzeTeam`, así que la vista previa y el resultado no pueden divergir:
   valida la misión, la ruta y el equipo (1–3, sin duplicados, conocidos, disponibles), suma las
   consecuencias (base + efectos de equipo + cada penalización activada **una vez**), elige objetivos
   aleatorios con el PRNG de la partida, limita cada estadística **una vez** a sus límites (0–100, o
   más estrechos por estados permanentes), y devuelve un **estado nuevo** más una entrada de historial.
   La entrada original nunca se modifica (lo comprueba una prueba con objetos congelados).
4. El store publica el estado, lo guarda y la vista navega a `/log/:id`.

Las alertas, la disponibilidad y los rangos se **derivan** del estado; no se guardan, así no se
desincronizan. Los datos estáticos de personajes y misiones tampoco se guardan: la partida solo
almacena lo que cambia (estadísticas, estados activos, estado de misiones, historial, semilla, ajustes).

## Persistencia

`localStorage`, clave `elysium.save`. Motivos: una partida ocupa pocos KB, la lectura síncrona
restaura el juego antes del primer render (sin parpadeo) y no requiere dependencias. IndexedDB solo
compensaría con datos grandes o binarios.

- Sobre `{ app: 'elysium', version, savedAt, state }`; el estado se valida con `gameStateSchema` al guardar y al cargar.
- Guardado automático después de cada operación que cambia la partida (misión, reinicio, importación, ajustes).
- Partida dañada o incompatible: se copia el texto original en `elysium.save.backup`, se inicia una partida nueva y se avisa.
- Versión más reciente que la app: se rechaza. Versiones antiguas: tabla `MIGRATIONS` en `saveGame.ts`.
- Si el almacenamiento falla (cuota, modo privado), se sigue jugando en memoria y se avisa.
- Exportar/importar JSON con la misma validación.

## Aleatoriedad

`mulberry32`, con la semilla guardada en `state.rngSeed`. Cada sorteo avanza la semilla, así que un
mismo guardado produce siempre el mismo resultado. Se descartó un LCG simple: su primer valor casi
no cambia entre semillas cercanas (una prueba lo detectó).

## Extender

- **Nueva misión:** añadir un `MissionDefinition` en `content/missions.ts` con `implemented: true`. Efectos soportados: `stats` (participantes o toda la tripulación) y `random-participant`. Los efectos `unsupported` documentan lo que aún falta (recursos, modificadores futuros).
- **Rutas:** `routes[]` (la misión 5 ya está modelada así; la UI muestra un selector cuando hay varias).
- **Estados permanentes:** catálogo en `content/conditions.ts`; los límites numéricos (`bounds`) ya se aplican al hacer clamp. Faltan los disparadores.
- **Recursos:** `state.resources` está reservado y validado; el diseño aún no define valores.
- **Sectores:** `SectorView` tiene puntos de extensión (`MONITORED`, `LINKS`).

## Pruebas

- `tests/domain`: motor (estado inicial, validaciones, equipo óptimo, sin Lyra, sin Zara, sin Orion, combinaciones, límites 0–100, límites por estados, historial, inmutabilidad, reproducibilidad).
- `tests/persistence`: ida y vuelta, partidas dañadas o incompatibles, recarga, reinicio, exportar/importar, fallo de almacenamiento.
- `tests/ui`: selección (máximo 3, incapacitados bloqueados, advertencias), lanzamiento con confirmación, informe, reinicio.
- `tests/browser`: bucle completo en Chromium real con recarga y reinicio, sin errores de consola.
