# PULSE visual system — Aerospace / Editorial

## Intent

An independent educational simulation, not a NASA console replica or an agency-endorsed product. Strong editorial hierarchy surrounds an original low-resolution game world. The interface remains Spanish; code, saved identifiers, routes and asset filenames remain English.

This is a presentation update to the existing React/Pixi application. No changes were made to simulation rules, coefficients, progression, decisions, persistence schemas or store timing.

## Audit and references

Reviewed the live official pages during implementation:

- NASA homepage: https://www.nasa.gov/ — strong display headings, confident navigation, large primary media, editorial sections and clear supporting labels rather than glowing dashboard decoration.
- NASA Brand Center: https://www.nasa.gov/nasa-brand-center/ — restrictions on third-party branding and implied endorsement.
- NASA Brand Guidelines / Graphic Standards: https://www.nasa.gov/nasa-brand-center/brand-guidelines/ — identifier restrictions, typography and Horizon Design System principles. The page identifies Inter for headings, Public Sans for body text and DM Mono for technical labels.

These are visual/brand references, not scientific citations validating PULSE's health model. No NASA HTML, stylesheets, logos or photography were copied into the product.

Existing application audit:

- Routes `/`, `/mission`, `/research` share the app shell, advance/save/load/reset controls and resource summary.
- Zustand connects React crew controls to Pixi sprite selection and room assignment. Daily progression belongs only to the pure engine.
- The old three-column layout constrained the 480×270 station to a small native-size view; tiny labels, multiple crew accent colors and cyan borders competed with the game.
- Original assets were one baked 480×270 background and three 192×24 sheets (12 frames of 16×24). Asset URLs, frame indices, station coordinates and interaction handlers are preserved.

## Tokens and ownership

`src/styles/tokens.css` owns interface values, exposed through Tailwind CSS 4 `@theme` and CSS custom properties. Existing shadcn-style Button variants consume the same semantic styles. Do not add raw color values to component markup.

| Token         | Value   | Use                                   |
| ------------- | ------- | ------------------------------------- |
| background    | #050B16 | Page, deep space                      |
| foreground    | #FFFFFF | Headlines, readable content           |
| navy          | #101D32 | Main panel canvas                     |
| surface       | #142238 | Raised section surfaces               |
| institutional | #0B3D91 | Reserved deep-blue brand tone         |
| primary       | #2563EB | Main action, navigation marker        |
| primary-soft  | #172D50 | Selected crew/queued assignments      |
| link          | #A8C8FF | Links, keyboard focus, selection cues |
| muted         | #A8B4C7 | Secondary readable text               |
| border        | #31425C | Structural dividers                   |
| healthy       | #42B883 | Nominal health only                   |
| warning       | #F4B544 | Fatigue/strain warnings               |
| critical      | #E34B4B | Critical border/marker                |
| critical-text | #FF9999 | Critical text on dark surfaces        |

Game palette: `src/game/rendering/palette.json`, shared by PNG generation and Pixi through `palette.ts`. A separate game palette is intentional: metal, skin, plants and Mars need illustrative colors, while application chrome needs semantic tokens. The white selection outline and amber/red health markers are derived from that shared palette, not hardcoded in entities.

Simulation `crew.color` values remain untouched for save compatibility. They no longer dictate interface accents; profile identity is carried by names, original portraits, faces and small suit ID details.

## Typography

Self-hosted via Fontsource, with no runtime Google Fonts dependency:

- **Inter Variable:** headings and product wordmark. Main title scales from 36–72 px; compact screens use 44 px and intentional wrapping. Weight 750–850 for display and major editorial headings.
- **Public Sans Variable:** body, descriptions, navigation, controls. Dense information is typically 12–15 px with generous line height.
- **DM Mono:** day, mission ID, numerical values, source indices and short uppercase labels. Not used for paragraphs. Slashed zeros are a deliberate technical numeral style.
- **System monospace in Pixi:** tiny rasterized room labels, limited to the game world. No pixel font for scientific information.

All three fonts are distributed under SIL OFL 1.1. Copyright notices and complete licenses are shipped at `public/licenses/{inter,public-sans,dm-mono}-OFL.txt` and linked in Research. Fonts are not modified. Fontsource package versions are pinned by the pnpm lockfile.

Use `formatNumber` for decimal UI values (Spanish decimal comma). Raw mission model scores remain numbers; formatting never changes calculations.

## Spacing, borders and controls

- 4 px base spacing scale; named CSS aliases cover 4, 8, 12, 16, 20, 24, 32 and 48 px.
- Responsive page gutter: 16–48 px.
- 24 px between major functional sections; 20–24 px standard panel content; 48 px editorial section padding on desktop.
- Panels are square with thin structural borders. Controls have a restrained 2 px radius. No glassmorphism, glow, floating shadows or decorative gradients.
- Primary blue Button: execute/confirm. Outline: assignments/cancel. Ghost: save/load/new utility operations. Typical minimum control height is 44 px.
- Selected state uses both background/border changes and `aria-pressed`; a queued assignment also shows a check mark on larger layouts. Color is not the only signal.

## Layout rules

At **1440 px and wider**, the station/telemetry area occupies the broad left track and diagnostics use a 304 px rail. Crew profiles sit below the habitat area as a technical manifest, rather than shrinking the canvas with a second sidebar. At 1440, the game has enough room for integer 2× display (960×540).

Below **1440 px**, the habitat spans the whole grid; profiles and diagnostics move below. Below **700 px**, all functional sections stack. The current mission day and advance action remain visible at every breakpoint, including mobile. No hidden mobile mission clock.

The world remains 480×270 internally. Display scale is `max(1, floor(availableWidth / 480))`. Spare width is letterboxed; below native width, only the world pans horizontally, with an explicit swipe hint and a keyboard-focusable scroll region. Do not stretch the canvas to fit arbitrary widths. This means intermediate viewports can show deliberate spare space rather than a larger blurred image.

Navigation order, accessible DOM order and all routes are unchanged. Crew cards remain keyboard-accessible alternatives to sprites; assignment buttons remain alternatives to rooms. A skip link focuses the main content.

## Mission UX and data display

- The page header adapts to Crew, Mission and Research instead of repeating one slogan everywhere.
- A pre-turn strip explicitly connects the execute button to pending orders, mission day and actual OP/MED costs. `aria-describedby` exposes the explanation to assistive technology. Terminal missions show a completion/abort explanation instead of promising another shift.
- Diagnostics label readings **simulated**, not live medical measurements. Meters provide names, numeric ranges, values and a short explanation of whether higher/lower is desirable. Colors for fatigue/stress use the existing 65/90 game thresholds; no new physiological thresholds are introduced.
- Cognition uses a solid pale-blue line; fatigue uses amber and a dash pattern. Both use actual saved telemetry. A one-sample state explains that another turn is needed to see change; there are no fake historical points.
- Info, warning and critical reports use a labeled hierarchy with semantic top/side rules. The mission journal retains all actual historical reports.
- Research distinguishes current game mechanics from future evidence integration. Sources are labeled portals, not fabricated paper citations. No NASA dataset has been integrated.

## Game art

The generator now authors a coherent white/blue habitat with observation windows, exterior radiators, service rails, lockers, a medical waveform monitor/scanner, resistance cables/treadmill, sleeping compartments, physical keyboards and experiment storage. The medical cross is blue, not a protected Red Cross emblem.

White pressure suits share dark visors, blue utility panels, a red shoulder detail and original PULSE micro-patches. Identity comes from faces/hair, helmet tabs and chest ID pixels. All idle/walk/rest/work/exercise/assessment frame indices and 16×24 dimensions remain intact. Walking speed still reflects existing fatigue state.

`pulse-mission-patch.svg` is an original angular shield/P identifier used only in application chrome; it is not presented as an agency approval mark. A separately hand-composed pixel micro-patch appears on suits and hull; neither is a NASA identifier. Regenerate with `pnpm assets:generate`.

### Mission journal portraits

`MissionJournal` renders optional event `astronautIds` references using the existing crew sheets. `src/game/sprites/spriteDefinitions.ts` centralizes crew ID → asset URL, 16×24 frame geometry and activity frame indices for both Pixi and CSS portraits. Journal portraits use idle frame 0 at integer 3× desktop / 2× mobile scale with nearest/pixelated rendering. Names are visible captions, never used to infer the affected crew.

One or multiple affected crew appear to the left of the title and description; duplicates are omitted. General events and older saved events without references retain the text-only layout. Existing v1 saves remain valid because the reference is optional; no names are parsed and historical references are not fabricated. New personal events, including the initial Okafor briefing, overload, delayed strain, assessment and adaptation, carry explicit IDs. Unknown references are rejected during save validation and omitted defensively by the UI. Simulation health/resource calculations are unchanged.

## NASA identifier decision and attribution

The reviewed Brand Center and Graphic Standards restrict use of NASA's insignia, seal and logotype and prohibit third-party branding or implied endorsement. Educational purpose was **not** treated as blanket permission. Explicit permission/compliant official-logo usage has not been established for this project, so **no official NASA identifier is included, redrawn, pixelated, recolored or downloaded into the application**. PULSE is the primary product identity.

The intended disclosure is:

> PULSE is an independent educational simulation developed for the NASA Space Apps Challenge. It is not an official NASA product and does not imply NASA endorsement.

The Research/About panel displays its Spanish equivalent:

> PULSE es una simulación educativa independiente desarrollada para el NASA Space Apps Challenge. No es un producto oficial de la NASA ni implica su respaldo.

Scientific portal links and the brand-guidance link are ordinary attributed text links, not NASA-logo badges. These notes document the conservative design decision, not legal clearance from NASA.

## Motion and accessibility

Motion is limited to a brief new-report transition. `useReducedMotion` disables its entry animation; CSS disables transitions under the same user preference. Pixi observes `prefers-reduced-motion`: visual travel snaps to the correct activity location and sprite cycles stop, without advancing or changing simulation state. Normal animation remains frame-based.

Visible keyboard focus, skip navigation, scroll-region focus, semantic meter values, source links, Radix dialog focus management, meaningful labels and readable type are retained. Automated contrast tests verify body/status text on the defined dark surfaces and white text on the primary button meet WCAG AA's 4.5:1 threshold. This is not a claim of a complete accessibility certification; broader assistive-technology review remains worthwhile.

## Changed/new files

- `src/styles/{tokens.css,index.css}`: centralized tokens and responsive component system.
- `src/main.tsx`: self-hosted font imports.
- `src/app/App.tsx`: page hierarchy, mission preview, chart styles, editorial Research, disclosure and reduced-motion report transition.
- `src/components/crew/{CrewList,CrewInspector}.tsx`: uniform portraits, semantic metrics and assignment hierarchy.
- `src/game/{GameCanvas.tsx,entities/AstronautSprite.tsx,scenes/SpaceStationScene.tsx}`: palette use, hover affordance, keyboard scroll and reduced motion; existing gameplay handlers retained.
- `src/game/rendering/{palette.json,palette.ts}`: shared original-art/render palette.
- `scripts/generate-placeholder-sprites/index.mjs`: complete original art refinement, same dimensions/frame mapping.
- `public/assets/pixel-art/`: regenerated station and three crew PNGs; new `ui/pulse-mission-patch.svg`.
- `public/favicon.svg`, `index.html`: original PULSE patch and deep-space browser theme.
- `public/licenses/*.txt`, `package.json`, `pnpm-lock.yaml`: font dependencies and license notices.
- `tests/components/design.test.ts`, `tests/browser/design.spec.ts`, `tests/browser/playable.spec.ts`: contrast, asset contract, responsive, accessibility and integration regression checks.
- README and pixel art documentation updated to match the new system.

Spanish localization files and tests were already pending locally before this redesign and are preserved.

## Validation and remaining work

49 Vitest tests and 6 Chromium browser tests pass. Browser checks cover actual Pixi rendering, 2× desktop display, sprite selection, room rest assignment, all six activity controls, actual cost/health updates, progression, save/load/reload, research attribution, keyboard skip navigation, reduced-motion operation and responsive widths 320/390/768/1024/1280/1920. TypeScript, ESLint and production build are also required checks; see README for commands.

Remaining refinements: bespoke equipment-use animation, object occlusion/capacity, stronger portrait differentiation at tiny scales, a full screen-reader audit and bundle optimization. The station remains a baked cutaway, not a dynamic tilemap. Fractional OS pixel ratios can distribute physical pixels unevenly even with nearest filtering. Small screens intentionally pan the habitat. These are explicit trade-offs rather than hidden resampling or gameplay changes.
