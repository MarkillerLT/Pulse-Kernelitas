# ELYSIUM

RPG de supervivencia espacial y gestión de tripulación. El jugador es **N0VA-7**, la inteligencia
artificial central de la nave Elysium: supervisa a cinco astronautas, evalúa riesgos y asigna
misiones. Cada decisión tiene consecuencias.

Prototipo funcional: la misión **El Satélite Fantasma** se resuelve con reglas reales, aplica
consecuencias a las estadísticas, queda registrada en el historial y se conserva entre sesiones.

## Ejecutar

Requiere Node 22.12+ y pnpm 10.

```sh
pnpm install
pnpm dev        # http://localhost:5173
```

## Comandos

| Comando             | Uso                                                  |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo (Vite)                        |
| `pnpm build`        | Typecheck + build de producción en `dist/`           |
| `pnpm test`         | Pruebas unitarias y de componentes (Vitest + jsdom)  |
| `pnpm test:browser` | Prueba de extremo a extremo en Chromium (Playwright) |
| `pnpm lint`         | ESLint                                               |
| `pnpm typecheck`    | TypeScript                                           |

Para Playwright con un Chromium del sistema:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm test:browser`.

## Cómo jugar

1. **Puente Armstrong** (`/`): estado de la nave, alertas, monitores de la tripulación, últimos eventos y accesos.
2. **Misiones** → _El Satélite Fantasma_ → revisa riesgos, equipo óptimo y penalizaciones por ausencia.
3. Selecciona de 1 a 3 tripulantes. La vista previa muestra penalizaciones activas y consecuencias previstas.
4. **Lanzar misión** → confirma → secuencia de resolución → informe con los cambios de cada tripulante.
5. Vuelve al puente: las estadísticas ya están actualizadas. Recarga la página y el progreso sigue ahí.
6. **Sistema** (`/system`): exportar o importar la partida en JSON, reducir animaciones y reiniciar la partida (con confirmación).

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md): capas, flujo de datos, persistencia y pruebas.
- [Diseño de juego](docs/GAME_DESIGN.md): reglas implementadas, interpretaciones y huecos del documento de diseño.
- [Sistema visual](docs/DESIGN_SYSTEM.md): tokens, tipografía y sprites.
