# Pixel art foundation

## Original assets

All station and astronaut PNGs are original programmatically authored placeholders created in this repository. No external art, game rips, downloaded illustrations, generated photorealistic imagery or third-party fonts are used. No external art attribution requirements apply to these generated images. UI icons are Lucide; library licenses remain applicable. The art is intentionally simple and should be refined, not replaced with smooth vectors.

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

Space #08111e / app #0b1521; hull #283d50 / #567086; walls #172b3b / #203546; highlights #e7f0f6; crew identification cyan #4de1d4, amber #f0c477, lavender #ac9bf2; critical #f07178. Warm Mars bands and muted wood/plant colors add restrained contrast. Avoid gradients inside pixel assets; stepped color bands are deliberate.

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

Work/medical/exercise are basic two-pose placeholders, not complete bespoke action sequences. Rest frames currently hold a horizontal pose; later polish can add blanket movement. Pixi `AnimatedSprite` frame changes and Ticker-driven travel are visual only. Arrival transitions stop walking and select activity frames. Fatigue slows travel. Selection outlines and amber/red markers are separate effect-layer graphics.

## Environment

Medical bay: cross cabinet, monitor and examination bed. Exercise: rack, dumbbells and treadmill. Quarters: stacked sleeping pods. Control: screens and consoles. Common: food lockers, shared table, mug and plant. Exterior includes stars, a stepped Mars silhouette, observation deck and service conduits.

Current layering: baked sky → baked hull/walls → baked props → transparent interactive station zones/labels → selection and health effects → animated astronauts. Future refinements should split occluding props and foreground into separate layers, retaining integer coordinates and consistent sprite density.
