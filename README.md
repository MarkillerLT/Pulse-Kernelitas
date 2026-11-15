# ELYSIUM

**Simulador de monitoreo de salud de la tripulación para misiones espaciales de larga duración.**
Proyecto para el NASA Space Apps Challenge.

El jugador es **N0VA-7**, la inteligencia artificial central de la nave Elysium. Su trabajo:
mantener sanos a cinco astronautas lejos de la Tierra. N0VA-7 reúne los indicadores de salud de
la tripulación, evalúa los riesgos y decide quién descansa, quién va a la enfermería y a quién se
envía a cada tarea. Cada decisión tiene consecuencias.

Funciona en cualquier navegador de escritorio y en **VR o realidad mixta en Meta Quest** (WebXR).

## La misión: el reto

> Long-duration missions expose astronauts to space radiation, isolation and confinement, altered
> gravity, and a hostile closed environment, which can bring immune changes, bone loss,
> cardiovascular events, and behavioral health problems. On long missions, astronauts carry much
> of the responsibility for spotting these changes in themselves. Your challenge is to build a
> health monitoring software that gathers health indicators and enables astronauts to evaluate and
> act on the status of their health.

En una misión larga no hay un médico en la Tierra vigilando en tiempo real: la tripulación tiene
que detectar por sí misma cuándo algo empieza a fallar. ELYSIUM convierte esa responsabilidad en
la mecánica central del juego.

## La idea

ELYSIUM es un RPG de decisiones en tiempo real y supervivencia sin fin, construido sobre el ciclo
que pide el reto:

1. **Reunir.** Cada astronauta tiene indicadores vivos: **Salud, Estrés, Sueño, Moral y
   Confianza**. La nave tiene los suyos: **soporte vital, energía, casco, comida y medicina**.
   Cambian con la carga de trabajo, el descanso, los eventos y el entorno cerrado (por ejemplo,
   filtros de aire saturados que elevan el CO₂).
2. **Evaluar.** Cuando un indicador cruza un umbral de riesgo (estrés alto, falta de sueño, salud
   baja), el sistema lanza una alerta. Antes de cada asignación muestra la **probabilidad de
   éxito y sus causas**, de modo que el riesgo nunca es una caja negra.
3. **Actuar.** Se puede ordenar descanso, enfermería, tiempo libre o volver al puesto, o asignar
   tareas y misiones. Ignorar una alerta tiene coste: la confianza baja y, si se repite, queda
   rencor. Las tareas desatendidas también tienen consecuencias.

Todo queda en un **registro de misión**. No hay final: el objetivo es sobrevivir lo más lejos
posible mientras la dificultad crece.

**Qué modelamos y qué no:** ELYSIUM trabaja con indicadores generales de salud física y mental y
del entorno. Los riesgos del reto (radiación, pérdida ósea, eventos cardiovasculares) son el
contexto de la misión, no simulaciones clínicas.

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

## Modo VR (`/juego/vr`)

El mismo juego, jugado desde dentro de la Elysium. Funciona con ratón en el escritorio y en Meta
Quest con controles o seguimiento de manos, en VR (espacio profundo) o en realidad mixta
(passthrough, en tu habitación).

- **Maqueta:** la nave aparece como una mesa de mando holográfica inclinada hacia el jugador,
  con la tripulación caminando. Alrededor, al alcance del brazo: tareas a la izquierda, caras de
  la tripulación y su ficha a la derecha, la barra de estado arriba y el registro como una consola
  de cabina.
- **A bordo:** cualquier sector se puede recorrer a tamaño real.
- **Cabina de mando:** con todas las tareas resueltas se desbloquea "Ver desde la cabina": el
  asiento del comandante con las estrellas pasando a hipervelocidad. Si surge una tarea, la nave
  sale de hipervelocidad para avisar.
- **Confort:** los cambios de vista son fundidos a negro (sin desplazar al jugador), los paneles
  quedan dentro de un arco cómodo y la cabina mantiene un marco fijo durante la hipervelocidad
  para reducir el mareo.
- Escenario, texturas y sonidos se generan por código: no hay modelos ni audio que descargar.

Para probar en el visor, sirve el build de producción por HTTPS:

```sh
pnpm preview:vr   # https://<IP de la red>:5174/juego/vr  (añade ?diag para diagnósticos)
```

En el Quest escribe `https://` explícitamente y acepta el aviso del certificado.

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
| `pnpm preview:vr`   | Build + preview HTTPS en la red local para el Quest  |
| `pnpm test`         | Pruebas unitarias y de componentes (Vitest + jsdom)  |
| `pnpm test:browser` | Prueba de extremo a extremo en Chromium (Playwright) |
| `pnpm lint`         | ESLint                                               |
| `pnpm typecheck`    | TypeScript                                           |

Para Playwright con un Chromium del sistema:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm test:browser`.

## Tecnología

- **Lenguaje y app:** TypeScript, React 19, Vite, React Router, Zustand, Zod.
- **3D y XR:** Three.js, React Three Fiber, drei y @react-three/xr (WebXR).
- **Pruebas:** Vitest, Testing Library y Playwright.
- **Hardware:** Meta Quest 3 (VR y realidad mixta) y navegadores de escritorio.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md): capas, flujo de datos, persistencia y pruebas.
- [Diseño de juego](docs/GAME_DESIGN.md): reglas implementadas, interpretaciones y huecos del documento de diseño.
- [Sistema visual](docs/DESIGN_SYSTEM.md): tokens, tipografía y sprites.

## Equipo

| Integrante                     | GitHub                                                |
| ------------------------------ | ----------------------------------------------------- |
| Daniel Guzmán Rodríguez        | [Akbal-146](https://github.com/Akbal-146)             |
| Nerea Isabella Trujillo Zavala | [sweetfedya](https://github.com/sweetfedya)           |
| Carlos de León Ávila           | [carlosavila8100](https://github.com/carlosavila8100) |
| Marco Antonio García Lavariega | [MarkillerLT](https://github.com/MarkillerLT)         |
