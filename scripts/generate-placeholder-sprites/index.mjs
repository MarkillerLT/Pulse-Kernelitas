import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = 'public/assets/pixel-art'
function canvas(w, h) {
  const png = new PNG({ width: w, height: h })
  const rect = (x, y, width, height, color) => {
    const hex = color.replace('#', '')
    for (let yy = Math.max(0, y); yy < Math.min(h, y + height); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(w, x + width); xx++) {
        const i = (yy * w + xx) * 4
        png.data[i] = parseInt(hex.slice(0, 2), 16)
        png.data[i + 1] = parseInt(hex.slice(2, 4), 16)
        png.data[i + 2] = parseInt(hex.slice(4, 6), 16)
        png.data[i + 3] = 255
      }
  }
  return {
    png,
    rect,
    save(path) {
      mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true })
      writeFileSync(path, PNG.sync.write(png))
    },
  }
}
const c = canvas(480, 270),
  r = c.rect
r(0, 0, 480, 270, '#08111e')
let seed = 42
for (let i = 0; i < 125; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const x = seed % 480
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  r(x, seed % 112, 1, 1, i % 3 ? '#426078' : '#c7e0e9')
}
// Stepped planet silhouette and shaded bands. Everything is integer pixel geometry.
for (let y = -26; y <= 26; y++) {
  const half = Math.floor(Math.sqrt(26 * 26 - y * y))
  r(385 - half, 52 + y, half * 2, 1, y < -8 ? '#b16d61' : y < 7 ? '#99584f' : '#733f42')
}
r(372, 40, 15, 3, '#c3846d')
r(385, 57, 18, 3, '#854945')
r(365, 61, 13, 2, '#ad6c59')
// Hull and observation deck.
r(8, 100, 464, 144, '#283d50')
r(12, 104, 456, 136, '#567086')
r(16, 108, 448, 127, '#182b3d')
r(32, 76, 296, 32, '#293f52')
r(36, 80, 288, 24, '#587184')
r(40, 83, 280, 20, '#0c1b2b')
for (let x = 44; x < 319; x += 40) {
  r(x, 86, 32, 1, '#294353')
  r(x + 34, 81, 3, 23, '#3d5669')
}
const rooms = [
  [16, 88, '#28494e'],
  [104, 88, '#3d4141'],
  [192, 88, '#323a52'],
  [280, 88, '#203e4d'],
  [368, 96, '#3c3c4b'],
]
rooms.forEach(([x, w, color]) => {
  r(x, 121, w - 2, 99, color)
  r(x + 3, 124, w - 8, 92, '#172b3b')
  for (let xx = x + 4; xx < x + w - 5; xx += 16) {
    r(xx, 129, 1, 85, '#203546')
    r(xx, 156, 15, 1, '#203546')
  }
  r(x + 6, 114, w - 16, 2, '#4de1d4')
  r(x + 4, 220, w - 8, 4, '#738696')
  r(x + 4, 224, w - 8, 9, '#293d4f')
  for (let xx = x + 8; xx < x + w - 8; xx += 12) r(xx, 227, 7, 1, '#40566a')
})
// Medical scanner, cabinets, bed.
r(23, 142, 25, 32, '#8c9ba8')
r(25, 144, 21, 27, '#304859')
r(33, 150, 5, 15, '#d7e8e8')
r(28, 155, 15, 5, '#d7e8e8')
r(59, 150, 29, 20, '#607a87')
r(62, 153, 23, 13, '#102736')
r(65, 160, 5, 1, '#4de1d4')
r(70, 156, 2, 5, '#4de1d4')
r(72, 159, 10, 1, '#4de1d4')
r(53, 192, 37, 5, '#a9c5c9')
r(54, 188, 11, 4, '#e2eded')
r(57, 197, 3, 22, '#64828c')
r(84, 197, 3, 22, '#64828c')
r(52, 202, 39, 2, '#3b5968')
// Exercise rack, treadmill, dumbbells.
r(113, 145, 4, 72, '#6e8392')
r(147, 145, 4, 72, '#6e8392')
r(113, 145, 38, 3, '#9dafb4')
for (let y = 154; y < 195; y += 8) r(116, y, 32, 2, '#415d6c')
r(157, 210, 29, 7, '#738b97')
r(160, 212, 23, 2, '#152937')
r(179, 177, 3, 34, '#a8b5b5')
r(170, 175, 14, 4, '#6d8995')
r(172, 176, 8, 1, '#4de1d4')
r(123, 207, 18, 3, '#a7b9c1')
r(121, 202, 4, 12, '#647d8d')
r(139, 202, 4, 12, '#647d8d')
// Sleeping pods.
for (const y of [144, 180]) {
  r(201, y, 61, 28, '#637386')
  r(204, y + 3, 55, 22, '#0b192b')
  r(206, y + 16, 50, 7, '#837dba')
  r(206, y + 13, 11, 4, '#d1d9e9')
  r(262, y + 5, 4, 5, '#4de1d4')
  r(222, y + 3, 2, 12, '#30465a')
}
// Mission control consoles.
for (const x of [288, 325]) {
  r(x, 145, 30, 28, '#758795')
  r(x + 3, 148, 24, 21, '#0a1d2d')
  r(x + 6, 151, 16, 1, '#4de1d4')
  for (let y = 156; y < 167; y += 3) r(x + 6, y, 7 + (y % 7), 1, '#397c89')
  r(x - 1, 180, 33, 4, '#8296a3')
  r(x + 2, 184, 3, 35, '#415e70')
  r(x + 26, 184, 3, 35, '#415e70')
  r(x + 4, 178, 19, 1, '#4de1d4')
}
// Common area: plant, mess table, food lockers.
r(432, 144, 23, 35, '#627386')
r(435, 147, 17, 13, '#253a4c')
r(435, 162, 17, 13, '#253a4c')
r(448, 152, 2, 3, '#f0c477')
r(448, 167, 2, 3, '#f0c477')
r(384, 192, 45, 5, '#c1aa88')
r(390, 197, 3, 22, '#677787')
r(420, 197, 3, 22, '#677787')
r(400, 186, 5, 6, '#d5e5e3')
r(406, 187, 2, 3, '#d5e5e3')
r(376, 176, 10, 10, '#b17e5d')
r(380, 158, 2, 18, '#7fa47c')
r(374, 161, 8, 5, '#568c77')
r(381, 155, 7, 5, '#75ac8c')
// Structural supports and lower service conduits.
for (const x of [16, 100, 188, 276, 364, 460]) {
  r(x, 120, 4, 60, '#40566a')
  r(x, 209, 4, 25, '#40566a')
}
r(24, 239, 432, 3, '#314d5d')
r(38, 245, 390, 2, '#294757')
r(30, 252, 420, 1, '#162e40')
for (let x = 42; x < 440; x += 38) {
  r(x, 238, 3, 10, '#56717d')
  r(x + 6, 234, 12, 2, '#c49e62')
}
c.save(`${base}/station/backgrounds/station.png`)

const colors = ['#4de1d4', '#f0c477', '#ac9bf2']
for (let person = 0; person < 3; person++) {
  const s = canvas(16 * 12, 24),
    color = colors[person]
  for (let f = 0; f < 12; f++) {
    const x = f * 16,
      bob = f === 1 || f === 3 ? 1 : 0
    const p = (xx, yy, w, h, col) => s.rect(x + xx, yy + bob, w, h, col)
    if (f === 6 || f === 7) {
      p(1, 12, 14, 6, '#172838')
      p(2, 13, 4, 4, '#d5e3e7')
      p(3, 14, 3, 2, '#ad795e')
      p(7, 13, 8, 5, color)
      p(10, 17, 5, 2, '#72869b')
      continue
    }
    p(5, 1, 7, 1, '#162534')
    p(3, 2, 10, 8, '#d8e5e7')
    p(4, 3, 8, 5, '#253a4f')
    p(5, 4, 6, 4, person === 1 ? '#9d7359' : '#c79d81')
    p(5, 3, 6, 2, person === 2 ? '#302c44' : '#4d3b39')
    p(9, 5, 1, 1, '#192b37')
    p(2, 5, 2, 4, color)
    p(4, 10, 8, 9, color)
    p(5, 11, 6, 5, '#d6e3e4')
    p(6, 12, 4, 2, '#32495b')
    p(9, 15, 2, 2, '#f0c477')
    p(4, 18, 8, 2, '#435c70')
    const arm = f === 9 ? -5 : f === 8 || f === 10 ? -2 : 0
    p(2, 11 + arm, 2, 7, color)
    p(12, 11 + arm, 2, 7, color)
    p(2, 17 + arm, 2, 2, '#d8e5e7')
    p(12, 17 + arm, 2, 2, '#d8e5e7')
    const step = f >= 2 && f <= 5 ? (f % 2 ? 2 : -1) : 0
    p(4, 20, 3, 3 - Math.max(0, step), '#9cb4c2')
    p(9, 20, 3, 3 + Math.min(0, step), '#9cb4c2')
    p(3, 22 - Math.max(0, step), 4, 2, '#273c50')
    p(9, 22 + Math.min(0, step), 4, 2, '#273c50')
  }
  s.save(`${base}/astronauts/spritesheets/crew-${person}.png`)
}
console.log('Generated original 480×270 station and three 16×24, 12-frame astronaut sheets.')
