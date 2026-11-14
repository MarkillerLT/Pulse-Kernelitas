# Pixel art foundation

## Original assets

All station and astronaut PNGs are original programmatically authored placeholders created in this repository. No external art, game rips, downloaded illustrations or generated photorealistic imagery are used. The modern UI self-hosts licensed Inter, Public Sans and DM Mono fonts; the game itself uses rasterized monospace labels. No external art attribution requirements apply to these generated images. UI icons are Lucide; library licenses remain applicable. The art is intentionally simple and should be refined, not replaced with smooth vectors.

Regenerate with `pnpm assets:generate`. Committed outputs are in `public/assets/pixel-art/`. The deterministic script uses pngjs and integer rectangles to hand-compose silhouettes, clothing, faces, equipment and shaded environmental details; astronauts are not geometric stand-ins or emoji.

## Resolution and scale

- Virtual world: **480×270**, 16:9.
- Astronaut frame: **16×24**, 12 frames horizontally per crew sheet, 192×24 total.
- Tile grid: **16×16** design unit; equipment is composed in integer pixels with footprints around 16–64 px. The initial interior is a single baked scene rather than a runtime tilemap.
- World floor: y=220; rest arrival point y=200 at the lower sleeping pod. Five functional zones use a consistent world coordinate system, not CSS coordinates.
- Rendering source resolution 1, antialias off, nearest texture sampling via `TextureSource.defaultOptions.scaleMode`, per-source nearest settings, rounded positions.
- CSS display scale is `max(1, floor(viewportWidth / 480))`. Surplus space is letterboxed. Below 480 CSS px, the world scrolls horizontally in its own container instead of shrinking fractionally; the page itself stays responsive. This is an intentional cropping/panning strategy.
- CSS `image-rendering: pixelated` prevents browser interpolation. Integer CSS scaling remains crisp on typical integer-DPR displays. Fractional OS scaling/DPR may still distribute physical pixels unevenly; no attempt is made to force arbitrary physical-pixel sizes.

## Palette

Canonical art colors live in `src/game/rendering/palette.json`, shared by PNG generation and Pixi effects. Space #050b16; metallic hull #687e98 / #b9c7d7; walls #26394f; white suits #f1f5f9 with blue #2759a6 utility panels, dark visors and red #bf4c52 shoulder details. White selection outlines, amber #f4b544 strain and red #e34b4b critical markers carry distinct meanings. Warm stepped Mars bands and restrained plant/wood colors provide illustrative contrast. No gradients inside pixel assets.

The suits and hull display original angular PULSE/P micro-patches, not NASA logos. The application chrome uses a separately authored `ui/pulse-mission-patch.svg`. No official NASA insignia, seal, mission emblem or logotype has been included or modified. See `DESIGN_SYSTEM.md` for the brand review and attribution decision.

## Animation map

| Frames | Use                     |
| ------ | ----------------------- |
| 0–1    | Idle / breathing        |
| 2–5    | Walk cycle              |
| 6–7    | Horizontal rest pose    |
| 0,8    | Console work            |
| 0,9    | Exercise arm raise      |
| 0,10   | Medical / assessment    |
| 0,1    | Common-area idle        |
| 11     | Reserved alternate pose |

Work/medical/exercise remain basic two-pose action cycles, now with consistent white suits, distinct arm positions and a small assessment device. Rest frames have a horizontal pose with subtle suit movement; later polish can add equipment-specific interaction. Pixi `AnimatedSprite` frame changes and Ticker-driven travel are visual only. Arrival transitions stop walking and select activity frames. Fatigue slows travel. Selection outlines and amber/red markers are separate effect-layer graphics. With reduced-motion preferences, sprite cycles stop and travel snaps to the correct activity location; this does not change the simulation.

## Environment

Medical bay: blue-cross cabinet, waveform monitor, scanner arm and examination bed. Exercise: resistance rack/cables, dumbbells and braced treadmill. Quarters: stacked sleeping compartments, privacy shutters and blue blankets. Control: screens, drawers and physical keyboards. Common/science area: experiment storage, food lockers, shared table, mug and plant growth sample. Exterior includes stars, a stepped Mars silhouette, panoramic observation deck, radiators and service rails. Original bitmap PULSE and ARES-01 hull labels reinforce the fictional mission identity.

Current layering: baked sky → baked hull/walls → baked props → transparent interactive station zones/labels → selection and health effects → animated astronauts. Future refinements should split occluding props and foreground into separate layers, retaining integer coordinates and consistent sprite density.
