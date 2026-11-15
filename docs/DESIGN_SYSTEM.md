# Sistema visual — consola de N0VA-7

Mismo lenguaje que la landing (`src/styles/landing.css`): tinta oscura, acento verde menta, titulares
en Manrope con tracking negativo y etiquetas en DM Mono en mayúsculas. Esquinas rectas. Fuera del
acento, el color solo comunica estado.

## Tokens (`src/styles/tokens.css`)

| Token                          | Valor                       | Uso                                                    |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| `--bg`                         | #091117                     | Fondo, espacio profundo                                |
| `--panel` / `--panel-2`        | #0D191E / #101C20           | Paneles y superficies elevadas                         |
| `--line` / `--line-strong`     | #1E2C2F / #2B3B3C           | Bordes y separadores                                   |
| `--text` / `--muted` / `--dim` | #EEF1E8 / #9EAAA5 / #667477 | Jerarquía de texto                                     |
| `--accent`                     | #C9F36B                     | Identidad de N0VA-7, foco, selección, acción principal |
| `--good`                       | #8FDC8B                     | Rango óptimo                                           |
| `--ok`                         | #9FC3B8                     | Rango normal                                           |
| `--warn`                       | #F2B84B                     | Rango degradado, penalizaciones                        |
| `--critical` / `--fail`        | #FF6B6B / #FF3D5A           | Rango crítico / valor terminal                         |

Los indicadores de estadística son barras de 10 segmentos coloreadas según los rangos del diseño
(el estrés invierte la escala). Los segmentos bloqueados por un estado permanente se dibujan rayados.

## Tipografía

Manrope para textos, botones y titulares (pesos 600–800, tracking negativo en tamaños grandes) y
DM Mono para etiquetas, códigos y números pequeños, en mayúsculas con tracking amplio. Las dos son
autoalojadas con Fontsource (licencias en `public/licenses/`).

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
