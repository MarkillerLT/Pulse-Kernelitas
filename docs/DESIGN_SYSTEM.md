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

## Sprites

`src/assets/characters/*.jpeg`: 1248×624, vista frontal y trasera, personaje en la mitad izquierda
sobre negro. Se recortan con CSS (`.sprite`, `image-rendering: pixelated`) dentro de un marco negro
tipo monitor. La correspondencia color → personaje está solo en `src/ui/sprites.ts`:

| Sprite     | Personaje   |
| ---------- | ----------- |
| AzulClaro  | Orion Vega  |
| Naranja    | Lyra Kess   |
| Rojo       | Elias Nova  |
| AzulOscuro | Zara Void   |
| Verde      | Kai Verdant |

La vista trasera se usa en los puestos del equipo (tripulantes "partiendo" a la misión) y en la ficha.

## Movimiento

Discreto: cursor parpadeante, líneas de la secuencia de misión y transiciones de borde. Se desactiva
con `prefers-reduced-motion` o con la opción "Reducir animaciones" de Sistema (persistida).
