import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import palette from '../../src/game/rendering/palette.json' with { type: 'json' }

const base = 'public/assets/pixel-art'
function canvas(w, h) {
  const png = new PNG({ width: w, height: h })
  const rect = (x, y, width, height, color) => {
    const hex = color.replace('#', '')
    for (let yy = Math.max(0, y); yy < Math.min(h, y + height); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(w, x + width); xx++) {
        const i = (yy * w + xx) * 4
        png.data[i] = parseInt(hex.slice(0, 2), 16)
        png.data[i + 1] = parseInt(hex.slice(2, 4), 16)
        png.data[i + 2] = parseInt(hex.slice(4, 6), 16)
        png.data[i + 3] = 255
      }
    }
  }
  return {
    rect,
    save(path) {
      mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true })
      writeFileSync(path, PNG.sync.write(png))
    },
  }
}
const {
  space,
  shadow,
  hull,
  hullLight,
  wall,
  wallLight,
  structure,
  floor,
  white,
  suitShade,
  blue,
  blueLight,
  blueDark,
  redDetail,
  visor,
  glass,
  healthy,
  warning,
  mars,
  marsLight,
  marsDark,
  plant,
  wood,
  skinLight,
  skinDark,
  hair,
} = palette
const c = canvas(480, 270),
  r = c.rect
r(0, 0, 480, 270, space)
let seed = 42
for (let i = 0; i < 100; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const x = seed % 480
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  r(x, seed % 91, 1, 1, i % 5 ? structure : suitShade)
}
// Original stepped Mars illustration; no downloaded photographs or agency marks.
for (let y = -30; y <= 30; y++) {
  const half = Math.floor(Math.sqrt(900 - y * y))
  r(412 - half, 43 + y, half * 2, 1, y < -12 ? marsLight : y < 9 ? mars : marsDark)
}
r(397, 21, 18, 2, suitShade)
r(391, 32, 18, 3, marsLight)
r(407, 35, 24, 2, marsDark)
r(421, 49, 14, 3, mars)
r(392, 56, 16, 2, marsLight)
r(408, 61, 12, 2, mars)
// Exterior radiators, roof rails, and panoramic observation windows.
for (const x of [26, 315]) {
  r(x, 65, 9, 36, hull)
  r(x - 17, 69, 43, 22, blueDark)
  for (let xx = x - 15; xx < x + 25; xx += 6) {
    r(xx, 71, 1, 18, blue)
    r(xx, 79, 5, 1, structure)
  }
}
r(8, 91, 464, 153, shadow)
r(10, 93, 460, 146, hull)
r(13, 97, 454, 139, hullLight)
r(17, 101, 446, 131, wall)
r(17, 101, 446, 3, white)
r(74, 69, 205, 29, structure)
r(78, 72, 197, 24, hullLight)
r(82, 75, 189, 19, shadow)
for (let x = 85; x < 266; x += 31) {
  r(x, 77, 26, 2, glass)
  r(x + 27, 74, 3, 22, hull)
}
// A separate original PULSE patch. Angular, no sphere/orbit/vector or NASA lettering.
function patch(draw, x, y) {
  draw(x + 1, y, 7, 9, blueDark)
  draw(x, y + 1, 9, 6, blue)
  draw(x + 1, y + 7, 7, 2, blue)
  draw(x + 3, y + 9, 3, 1, blueDark)
  draw(x + 2, y + 2, 1, 5, white)
  draw(x + 3, y + 2, 3, 1, white)
  draw(x + 5, y + 3, 1, 2, white)
  draw(x + 3, y + 4, 2, 1, white)
}
patch(r, 28, 104)
const glyphs = {
  P: ['110', '101', '110', '100', '100'],
  U: ['101', '101', '101', '101', '111'],
  L: ['100', '100', '100', '100', '111'],
  S: ['111', '100', '111', '001', '111'],
  E: ['111', '100', '110', '100', '111'],
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  '-': ['000', '000', '111', '000', '000'],
}
function label(text, x, y, color) {
  ;[...text].forEach((char, index) =>
    glyphs[char]?.forEach((row, yy) =>
      [...row].forEach((pixel, xx) => {
        if (pixel === '1') r(x + index * 4 + xx, y + yy, 1, 1, color)
      }),
    ),
  )
}
label('PULSE', 43, 106, white)
label('ARES-01', 417, 106, white)
r(71, 107, 328, 1, structure)
const roomStarts = [16, 104, 192, 280, 368]
for (const x of roomStarts) {
  r(x + 3, 120, 83, 100, shadow)
  r(x + 5, 122, 79, 96, wall)
  r(x + 5, 122, 79, 14, blueDark)
  r(x + 8, 118, 72, 2, white)
  for (let xx = x + 7; xx < x + 78; xx += 16) {
    r(xx, 139, 1, 77, wallLight)
    r(xx, 177, 16, 1, wallLight)
  }
  r(x + 7, 138, 70, 1, structure)
  r(x + 5, 220, 79, 4, hullLight)
  r(x + 5, 224, 79, 8, structure)
  for (let xx = x + 9; xx < x + 80; xx += 12) {
    r(xx, 227, 7, 1, floor)
    r(xx, 229, 7, 1, shadow)
  }
}
// Medical bay: instrument locker, waveform monitor, scanner arm and examination bed.
r(24, 144, 24, 35, hullLight)
r(26, 146, 20, 29, white)
r(33, 151, 5, 16, blue)
r(28, 156, 15, 5, blue)
r(27, 176, 18, 2, structure)
r(58, 146, 32, 25, hullLight)
r(61, 149, 26, 18, visor)
r(64, 162, 5, 1, blueLight)
r(69, 156, 2, 7, blueLight)
r(71, 159, 4, 1, blueLight)
r(75, 161, 9, 1, blueLight)
r(63, 169, 4, 1, healthy)
r(80, 169, 5, 1, structure)
r(52, 188, 39, 7, white)
r(54, 185, 10, 3, suitShade)
r(65, 189, 24, 3, blue)
r(56, 195, 3, 24, hull)
r(85, 195, 3, 24, hull)
r(54, 205, 36, 2, structure)
r(91, 171, 2, 33, hullLight)
r(83, 171, 10, 2, hullLight)
r(80, 171, 4, 6, blue)
// Exercise: resistance rack with cables and a braced treadmill.
r(113, 145, 4, 73, hullLight)
r(147, 145, 4, 73, hullLight)
r(113, 145, 38, 4, hull)
for (let y = 155; y < 196; y += 9) r(117, y, 30, 2, structure)
r(123, 150, 1, 45, suitShade)
r(139, 150, 1, 45, suitShade)
r(120, 192, 7, 4, blue)
r(136, 192, 7, 4, blue)
r(156, 210, 29, 7, hullLight)
r(159, 211, 23, 4, shadow)
for (let x = 160; x < 181; x += 5) r(x, 213, 2, 1, floor)
r(179, 178, 3, 32, hull)
r(170, 174, 14, 6, hullLight)
r(172, 175, 9, 3, visor)
r(174, 176, 5, 1, blueLight)
r(121, 208, 20, 3, hullLight)
r(120, 203, 4, 13, blueDark)
r(140, 203, 4, 13, blueDark)
// Sleeping compartments with restrained blue blankets and privacy shutters.
for (const y of [144, 180]) {
  r(201, y, 62, 29, hullLight)
  r(204, y + 3, 56, 23, shadow)
  r(206, y + 17, 51, 7, blue)
  r(206, y + 14, 11, 4, white)
  r(219, y + 18, 36, 1, glass)
  r(258, y + 4, 2, 18, structure)
  r(264, y + 4, 3, 7, hull)
  r(264, y + 5, 2, 2, blueLight)
  r(208, y + 5, 12, 1, wallLight)
  r(226, y + 5, 20, 1, wallLight)
}
// Flight workstations: equipment drawers, multiple monitors and physical keyboards.
for (const x of [288, 325]) {
  r(x, 145, 30, 28, hullLight)
  r(x + 3, 148, 24, 20, visor)
  r(x + 5, 151, 20, 2, blue)
  r(x + 6, 157, 8, 1, blueLight)
  r(x + 6, 160, 12, 1, glass)
  r(x + 6, 164, 16, 1, glass)
  r(x + 18, 156, 6, 7, blueDark)
  r(x + 20, 158, 2, 3, blueLight)
  r(x - 1, 180, 33, 4, hullLight)
  r(x + 2, 184, 28, 11, hull)
  r(x + 4, 186, 23, 7, wallLight)
  r(x + 5, 190, 4, 1, suitShade)
  r(x + 2, 195, 3, 24, structure)
  r(x + 26, 195, 3, 24, structure)
  for (let xx = x + 5; xx < x + 26; xx += 4) r(xx, 177, 2, 2, suitShade)
}
// Common/science area: experiment cabinet, plant growth sample, table and food storage.
r(432, 144, 24, 39, hullLight)
for (const y of [147, 164]) {
  r(435, y, 18, 14, wall)
  r(448, y + 4, 2, 4, suitShade)
  r(437, y + 2, 9, 1, blue)
}
r(376, 146, 45, 28, hull)
r(379, 149, 39, 22, shadow)
r(382, 154, 17, 11, glass)
r(383, 155, 15, 2, blueLight)
r(403, 153, 11, 13, wallLight)
r(405, 155, 7, 2, suitShade)
r(385, 191, 43, 5, hullLight)
r(389, 196, 3, 23, structure)
r(421, 196, 3, 23, structure)
r(400, 185, 5, 6, white)
r(405, 186, 2, 3, white)
r(414, 188, 9, 2, wood)
r(375, 179, 10, 8, hullLight)
r(379, 164, 2, 15, plant)
r(374, 168, 7, 4, plant)
r(380, 163, 6, 4, plant)
// Structural beams, recessed hatches, numbered service rails and lighting.
for (const x of [16, 100, 188, 276, 364, 460]) {
  r(x, 120, 4, 58, hull)
  r(x, 209, 4, 25, hull)
  r(x + 1, 143, 1, 32, suitShade)
  r(x, 179, 3, 2, blueLight)
}
r(24, 239, 432, 3, structure)
r(38, 245, 390, 2, hull)
r(30, 252, 420, 1, wall)
for (let x = 42; x < 440; x += 38) {
  r(x, 238, 3, 10, hullLight)
  r(x + 6, 234, 12, 2, blueDark)
  r(x + 8, 234, 6, 1, blueLight)
}
r(18, 235, 9, 2, warning)
r(453, 235, 9, 2, warning)
c.save(`${base}/station/backgrounds/station.png`)

// All crew share a white pressure suit, blue utility panels and a red shoulder stripe.
// Identity is preserved through face/hair tones, helmet tabs and chest-ID pixels.
for (let person = 0; person < 3; person++) {
  const s = canvas(16 * 12, 24)
  for (let frame = 0; frame < 12; frame++) {
    const x = frame * 16,
      bob = frame === 1 ? 1 : 0
    const p = (xx, yy, w, h, color) => s.rect(x + xx, yy + bob, w, h, color)
    const skin = person === 1 ? skinDark : skinLight
    if (frame === 6 || frame === 7) {
      p(1, 11, 14, 9, shadow)
      p(2, 12, 5, 6, white)
      p(3, 13, 3, 3, visor)
      p(3, 15, 3, 2, skin)
      p(7, 13, 7, 5, white)
      p(8, 14, 3, 2, blue)
      p(12, 17, 3, 2, suitShade)
      p(7, frame === 7 ? 12 : 13, 7, 1, suitShade)
      p(13, 17, 2, 2, blueDark)
      continue
    }
    p(4, 0, 8, 1, shadow)
    p(3, 1, 10, 9, shadow)
    p(4, 1, 8, 8, white)
    p(5, 2, 6, 1, blue)
    p(4, 3, 8, 5, visor)
    p(5, 4, 5, 1, glass)
    p(5, 6, 6, 2, skin)
    p(5, 6, 2, 1, person === 2 ? hair : visor)
    p(9, 6, 1, 1, shadow)
    p(3, 4, 1, 4, suitShade)
    p(12, 4, 1, 4, suitShade)
    p(4 + person * 2, 1, 1, 1, redDetail)
    p(5, 9, 6, 1, blueDark)
    p(3, 10, 10, 10, shadow)
    p(4, 10, 8, 9, white)
    p(4, 17, 8, 2, suitShade)
    p(5, 11, 3, 4, blue)
    p(5, 11, 2, 1, blueLight)
    p(5, 13, 2, 1, blueLight)
    p(9, 11, 2, 4, blueDark)
    p(9, 12, 1, 2, white)
    p(10, 12, 1, 1, white)
    for (let id = 0; id <= person; id++) p(5 + id * 2, 16, 1, 1, blue)
    p(4, 19, 8, 1, blueDark)
    const arm = frame === 9 ? -5 : frame === 8 || frame === 10 ? -2 : 0
    p(1, 11 + arm, 3, 8, shadow)
    p(12, 11 + arm, 3, 8, shadow)
    p(2, 11 + arm, 2, 6, white)
    p(12, 11 + arm, 2, 6, white)
    p(2, 11 + arm, 2, 1, redDetail)
    p(12, 11 + arm, 2, 1, blue)
    p(2, 16 + arm, 2, 2, suitShade)
    p(12, 16 + arm, 2, 2, suitShade)
    if (frame === 10) {
      p(12, 15, 3, 3, blueDark)
      p(13, 15, 1, 2, blueLight)
    }
    const left = frame === 2 || frame === 5 ? 1 : 0,
      right = frame === 3 || frame === 4 ? 1 : 0
    p(4, 20, 3, 3 - left, white)
    p(9, 20, 3, 3 - right, suitShade)
    p(3, 22 - left, 4, 2, blueDark)
    p(9, 22 - right, 4, 2, blueDark)
  }
  s.save(`${base}/astronauts/spritesheets/crew-${person}.png`)
}
// Vector patch belongs only to the modern application chrome, never to the pixel characters.
const patchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48"><path fill="${blueDark}" stroke="${blueLight}" d="M1 1h38v33L20 47 1 34z"/><path fill="${blue}" d="M5 5h30v27L20 42 5 32z"/><path fill="${white}" d="M12 12h12l5 5v9l-5 5h-6v7h-6zm6 6v7h5l1-1v-5l-1-1z"/></svg>`
mkdirSync(`${base}/ui`, { recursive: true })
writeFileSync(`${base}/ui/pulse-mission-patch.svg`, patchSvg)
writeFileSync('public/favicon.svg', patchSvg)
console.log(
  'Generated PULSE station, three 16×24 astronaut sheets, and original mission patch. No NASA identifiers used.',
)
