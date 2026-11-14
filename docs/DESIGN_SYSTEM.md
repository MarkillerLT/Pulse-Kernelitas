# Sistema visual — consola de N0VA-7

Interfaz de una IA que administra la nave: terminal retro, oscura y casi monocroma. El color solo
comunica estado.

## Tokens (`src/styles/tokens.css`)

| Token                          | Valor                       | Uso                                                    |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| `--bg`                         | #02050B                     | Fondo, espacio profundo                                |
| `--panel` / `--panel-2`        | #07101D / #0B1726           | Paneles y superficies elevadas                         |
| `--line` / `--line-strong`     | #172840 / #27405F           | Bordes y separadores                                   |
| `--text` / `--muted` / `--dim` | #D5E0EE / #8193AD / #4D6080 | Jerarquía de texto                                     |
| `--accent`                     | #6EE7F0                     | Identidad de N0VA-7, foco, selección, acción principal |
| `--good`                       | #5FE08F                     | Rango óptimo                                           |
| `--ok`                         | #9CC2FF                     | Rango normal                                           |
| `--warn`                       | #F2B84B                     | Rango degradado, penalizaciones                        |
| `--critical` / `--fail`        | #FF6B6B / #FF3D5A           | Rango crítico / valor terminal                         |

Los indicadores de estadística son barras de 10 segmentos coloreadas según los rangos del diseño
(el estrés invierte la escala). Los segmentos bloqueados por un estado permanente se dibujan rayados.

## Tipografía

DM Mono para toda la interfaz (etiquetas, números, terminal) y Public Sans para párrafos largos.
Ambas son autoalojadas con Fontsource (licencias en `public/licenses/`).

## Sprites y nave

- **Tripulación:** `src/assets/characters/*.jpeg` son las hojas originales (1248×624, una cuadrícula de 16×16 celdas de 39 px sobre negro). `scripts/extract-crew-sprites.py` toma el centro de cada celda y genera `pixel/*.png` de 16×16 con transparencia. Todo el juego usa esos PNG con `image-rendering: pixelated`. La correspondencia color → personaje está en `src/ui/sprites.ts`:

| Sprite     | Personaje   |
| ---------- | ----------- |
| AzulClaro  | Orion Vega  |
| Naranja    | Lyra Kess   |
| Rojo       | Elias Nova  |
| AzulOscuro | Zara Void   |
| Verde      | Kai Verdant |

- **Nave:** plano cenital de 400×224 px lógicos, generado por `scripts/generate-ship-map.ts` a partir de `src/ui/ship/layout.ts`: ingeniería con el reactor, invernadero, núcleo de N0VA-7, hangar con la cápsula, soporte vital, hábitat con literas, centro médico y puente en la proa. Se escala por múltiplos de 0,5 (y de forma proporcional en móvil). Los nombres de las salas son HTML, no están dentro del PNG.
- **Caminantes:** de frente al bajar y de espaldas al subir, con un pequeño rebote al caminar. Encima llevan una marca de estado: `z` dormido, `+` en enfermería y `!` con advertencia.

## Movimiento

Discreto: caminantes, salas en alarma, cursor parpadeante. Con `prefers-reduced-motion` o con la opción
"Reducir animaciones" de Sistema (que se guarda), los tripulantes aparecen directamente en su destino.
