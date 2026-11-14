# Arquitectura

Aplicación local con React 19, Vite 8 y TypeScript. No hay servidor: el motor de juego es puro y
corre en el navegador.

```
src/
  domain/
    content/   Datos estáticos: crew, missions, events, sectors, ship, conditions
    model/     Esquemas Zod + tipos: stats, game (estado persistible, v2)
    rules/     stats (rangos, límites), availability (+ advertencias), chance, drift (desgaste por hora), alerts, recovery
    engine/    createGame, tick (advanceHours), commands (assignTask, orderCrew, preview), resolve, spawn, composition, state, random
  persistence/ saveGame: localStorage, sobre versionado, validación, respaldo y migraciones
  store/       gameStore (Zustand): tiempo real → horas de juego, llama al motor y guarda
  ui/
    console/   ConsoleView (Puente), ShipMap (plano + caminantes), TaskList, AssignDialog
    ship/      layout.ts: plano lógico (salas, puertas, pasillo, camas). Lo comparten el generador y el mapa
    views/     Tripulación, ficha, Misiones, Historial, Sectores, Sistema
  assets/      characters/ (hojas originales + pixel/ 16×16), ship/elysium-deck.png
scripts/       generate-ship-map.ts (PNG sin dependencias), extract-crew-sprites.py
```

## Flujo

- **Reloj.** `AppShell` llama a `store.tick(ms)` cada 100 ms. El store acumula el tiempo real × velocidad y, por cada 2 s, llama a `advanceHours(state, n)`. Si un aviso pide pausa (decisión urgente, fallo, muerte…), el store se detiene en esa hora.
- **Hora de juego** (`tick.ts`): desgaste por actividad → mantenimiento de la nave → estado y horario de cada tripulante (colapso, enfermería, muerte, dormir a las 22:00) → terminar tareas activas / vencer tareas ignoradas → efectos diarios → aparición de misiones, eventos y solicitudes → fin de partida.
- **Decisiones.** `previewAssignment` calcula errores, probabilidad, advertencias y composición, y `assignTask` reutiliza ese mismo cálculo, así que lo que ve el jugador es lo que se aplica. La probabilidad y el riesgo principal se guardan al asignar; la tirada se hace al terminar.
- **Inmutabilidad.** Cada función pública del motor hace `structuredClone` y trabaja sobre la copia. Una prueba con objetos congelados lo verifica.
- **Aleatoriedad.** `mulberry32` con la semilla en el estado: misma partida, mismos resultados.
- **Mapa.** La UI deduce el destino de cada tripulante a partir de su actividad (cama, enfermería, sector de la tarea, hangar, su puesto) y lo hace caminar por puertas y pasillo. Las posiciones viven en refs y se escriben al DOM en cada frame, sin re-renderizar React.

## Persistencia

`localStorage` (`elysium.save`) con el sobre `{ app, version: 2, savedAt, state }`, validado con Zod al guardar y al cargar. Se guarda en cada hora de juego y en cada decisión. Una partida dañada o de una versión anterior (v1 del prototipo previo) se copia a `elysium.save.backup` y empieza una nueva con aviso. El juego siempre carga en pausa. También se puede exportar e importar en JSON.

## Extender

- **Evento nuevo:** añadir un `EventDefinition` en `content/events.ts` (opciones, especialidad, probabilidad base, coste, éxito, fallo, vencimiento). Aparece solo según su peso, día mínimo y enfriamiento.
- **Misión nueva:** `content/missions.ts`, indicando su día.
- **Estado permanente con efecto:** añadir el desencadenante en `tick.ts` o `commands.ts`, y el multiplicador en `drift.ts`.
- **Sala o mueble:** editar `ui/ship/layout.ts` y regenerar el PNG.

## Pruebas

- `tests/domain/engine.test.ts`: reglas de desgaste, reloj, horario, misiones, vencimientos, victoria y derrota, probabilidad, advertencias, Rencor, solicitudes, órdenes directas e inmutabilidad.
- `tests/domain/balance.test.ts`: partidas completas con una estrategia pasiva y otra competente.
- `tests/persistence`: guardado, tiempo real → horas, recarga, reinicio, partidas dañadas o v1, exportar/importar, fallo de almacenamiento.
- `tests/ui/console.test.tsx`: Puente, diálogo de decisión, "Mandar de igual forma", misiones (máximo 3), solicitudes, órdenes, reloj y vistas.
- `tests/browser/elysium.spec.ts`: Chromium real con decisión, tiempo corriendo, recarga y reinicio, sin errores de consola.
