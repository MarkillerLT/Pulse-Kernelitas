# ELYSIUM

RPG de supervivencia espacial y gestión de tripulación. El jugador es **N0VA-7**, la inteligencia
artificial central de la nave Elysium: supervisa a cinco astronautas, evalúa riesgos y asigna
misiones. Cada decisión tiene consecuencias.

RPG de decisiones en tiempo real con pausa y supervivencia sin fin (tres modos, dificultad
progresiva por niveles) en el que N0VA-7 vigila las estadísticas, responde a crisis y elige a quién enviar a cada tarea.

## Ejecutar

Requiere Node 22.12+ y pnpm 10.

```sh
pnpm install
pnpm dev        # landing: http://localhost:5173/ · juego: http://localhost:5173/juego/
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

Eres N0VA-7. No controlas a los astronautas: decides qué hacen.

1. **Una sola pantalla** (`/juego/`): arriba el reloj, la velocidad y el botón de pausa; debajo los sistemas de la nave, el plano de la Elysium con la tripulación caminando y un panel lateral con pestañas (**Tareas, Tripulación, Misiones, Sectores, Registro**). Cambiar de pestaña no cambia la vista.
2. El juego abre en el **menú de pausa** (guía rápida, dificultad y ajustes). Al reanudar, el tiempo **siempre corre** (1 hora = 8 s a 1×, en cuartos de hora) y nada lo pausa solo: únicamente ese menú (botón Pausa o `Esc`). La velocidad **Auto** (predeterminada) va a 1× mientras haya tareas pendientes o en curso y a 4× en los tiempos muertos; si eliges 1×, 2× o 4× a mano, se respeta hasta que vuelvas a pulsar Auto.
   Pulsa a un astronauta y sus estadísticas aparecen en una ficha flotante que lo sigue por la nave.
3. Surgen **tareas** ("El motor se incendia", "Plaga en los cultivos", solicitudes de descanso…). Elige una opción, selecciona a quién mandas y revisa la **probabilidad de éxito** y sus causas.
4. Si alguien está saturado o agotado verás "Advertencia: niveles de estrés altos". Puedes **Mandar de igual forma**, pero pierde confianza (y tras tres veces le queda Rencor).
5. Los fallos explican su causa y permiten **reintentar**. Las tareas ignoradas tienen consecuencias.
6. Las 5 **misiones** del documento aparecen en los días 2, 7, 13, 19 y 25. El equipo óptimo da un 75 % de éxito y cada ausencia lo reduce.
7. También puedes dar órdenes directas: Descansar, Tiempo libre, Enfermería o Volver al puesto.
8. No hay final: sobrevive lo más lejos posible. El viaje termina si el soporte vital o el casco llegan a 0, o si muere toda la tripulación. La partida se guarda sola.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md): capas, flujo de datos, persistencia y pruebas.
- [Diseño de juego](docs/GAME_DESIGN.md): reglas implementadas, interpretaciones y huecos del documento de diseño.
- [Sistema visual](docs/DESIGN_SYSTEM.md): tokens, tipografía y sprites.
