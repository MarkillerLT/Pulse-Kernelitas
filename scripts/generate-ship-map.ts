/**
 * Draws the Elysium deck plan as pixel art from src/ui/ship/layout.ts.
 * Output: src/assets/ship/elysium-deck.png (MAP_WIDTH × MAP_HEIGHT, scaled up in the browser).
 * Run: node scripts/generate-ship-map.ts   (Node ≥ 22.18 strips the types; no dependencies)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import {
  BEDS,
  CORRIDOR,
  MAP_HEIGHT,
  MAP_WIDTH,
  MED_BEDS,
  ROOMS,
  type Room,
} from '../src/ui/ship/layout.ts'

const W = MAP_WIDTH
const H = MAP_HEIGHT
const pixels = new Uint8Array(W * H * 4)

type RGB = [number, number, number]
const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
]

function px(x: number, y: number, color: string, alpha = 1) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const [r, g, b] = hex(color)
  const i = (y * W + x) * 4
  pixels[i] = Math.round(pixels[i] * (1 - alpha) + r * alpha)
  pixels[i + 1] = Math.round(pixels[i + 1] * (1 - alpha) + g * alpha)
  pixels[i + 2] = Math.round(pixels[i + 2] * (1 - alpha) + b * alpha)
  pixels[i + 3] = 255
}
function rect(x: number, y: number, w: number, h: number, color: string, alpha = 1) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, color, alpha)
}
function outline(x: number, y: number, w: number, h: number, color: string) {
  rect(x, y, w, 1, color)
  rect(x, y + h - 1, w, 1, color)
  rect(x, y, 1, h, color)
  rect(x + w - 1, y, 1, h, color)
}
function disc(cx: number, cy: number, r: number, color: string, alpha = 1) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, color, alpha)
}
function ring(cx: number, cy: number, r: number, color: string) {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180
    px(cx + Math.cos(t) * r, cy + Math.sin(t) * r, color)
  }
}

// Deterministic noise for stars and texture.
let seed = 1337
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}

// ---------- Space ----------
rect(0, 0, W, H, '#02050b')
for (let i = 0; i < 260; i++) {
  const color = rand() < 0.15 ? '#6ee7f0' : rand() < 0.5 ? '#9cc2ff' : '#ffffff'
  px(rand() * W, rand() * H, color, 0.25 + rand() * 0.6)
}

// ---------- Hull ----------
const HULL = '#16233a'
const HULL_EDGE = '#2e4566'
const hullRects: [number, number, number, number][] = [
  [12, 16, 324, 192],
  [324, 52, 64, 120],
]
for (const [x, y, w, h] of hullRects) rect(x, y, w, h, HULL)
// Nose taper
for (let i = 0; i < 12; i++) rect(388 + i, 58 + i * 4, 1, 108 - i * 8, HULL)
for (const [x, y, w, h] of hullRects) {
  rect(x, y, w, 1, HULL_EDGE)
  rect(x, y + h - 1, w, 1, '#0a1220')
}
// Hull plating seams
for (let x = 20; x < 336; x += 16) rect(x, 17, 1, 3, '#22334e')
for (let x = 20; x < 336; x += 16) rect(x, 204, 1, 3, '#22334e')
// Engine nozzles (rear)
for (const y of [56, 100, 144]) {
  rect(2, y, 12, 24, '#2b3a52')
  rect(2, y, 12, 1, '#4b6a92')
  rect(0, y + 4, 3, 16, '#f2b84b')
  rect(0, y + 8, 2, 8, '#ffe9a8')
}
// Solar wings
for (const [y, dir] of [
  [4, -1],
  [208, 1],
] as const) {
  for (let x = 60; x < 300; x += 26) {
    rect(x, y, 22, 10, '#13284a')
    outline(x, y, 22, 10, '#2e4f80')
    rect(x + 11, y, 1, 10, '#2e4f80')
  }
  rect(40, dir < 0 ? 14 : 208, 280, 1, '#2e4566')
}

// ---------- Floors ----------
const FLOORS: Record<string, [string, string]> = {
  gagarin: ['#1d1913', '#241f18'],
  tereshkova: ['#11201a', '#15271f'],
  collins: ['#0b1726', '#0f1d2f'],
  aldrin: ['#121a26', '#172131'],
  'life-support': ['#0e1e22', '#12262b'],
  habitat: ['#1d1922', '#231e29'],
  ride: ['#161e29', '#1b2532'],
  armstrong: ['#0d1829', '#112036'],
}
function floor(x: number, y: number, w: number, h: number, [a, b]: [string, string]) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) px(i, j, ((i >> 3) + (j >> 3)) % 2 ? a : b)
}
for (const room of Object.values(ROOMS)) floor(room.x, room.y, room.w, room.h, FLOORS[room.id])

// Corridor
rect(CORRIDOR.x, CORRIDOR.y, CORRIDOR.w, CORRIDOR.h, '#141c28')
for (let x = CORRIDOR.x; x < CORRIDOR.x + CORRIDOR.w; x += 6)
  rect(x, CORRIDOR.y + 9, 3, 1, '#222f42')
for (let x = CORRIDOR.x + 4; x < CORRIDOR.x + CORRIDOR.w; x += 24) {
  px(x, CORRIDOR.y + 1, '#f2b84b', 0.8)
  px(x, CORRIDOR.y + CORRIDOR.h - 2, '#f2b84b', 0.8)
}

// ---------- Walls with doorways ----------
const WALL = '#3a5274'
const WALL_LIGHT = '#5b7ba3'
const WALL_DARK = '#0b1320'
const GAP = 5
function wallRoom(room: Room) {
  const { x, y, w, h } = room
  const inGap = (i: number, j: number) => {
    if (room.doorWall === 'top' || room.doorWall === 'bottom')
      return (
        Math.abs(i - room.door.x) <= GAP && (room.doorWall === 'top' ? j <= y + 1 : j >= y + h - 2)
      )
    return (
      Math.abs(j - CORRIDOR.y - CORRIDOR.h / 2) <= 8 &&
      (room.doorWall === 'left' ? i <= x + 1 : i >= x + w - 2)
    )
  }
  for (let j = y - 1; j <= y + h; j++)
    for (let i = x - 1; i <= x + w; i++) {
      const edge = i < x + 1 || i > x + w - 2 || j < y + 1 || j > y + h - 2
      if (!edge || inGap(i, j)) continue
      const outer = i === x - 1 || i === x + w || j === y - 1 || j === y + h
      px(i, j, outer ? WALL_DARK : j <= y ? WALL_LIGHT : WALL)
    }
  // Connector between doorway and corridor.
  if (room.doorWall === 'top')
    floor(
      room.door.x - GAP,
      CORRIDOR.y + CORRIDOR.h,
      GAP * 2 + 1,
      y + 2 - (CORRIDOR.y + CORRIDOR.h),
      ['#141c28', '#141c28'],
    )
  if (room.doorWall === 'bottom')
    floor(room.door.x - GAP, y + h - 2, GAP * 2 + 1, CORRIDOR.y - (y + h - 2), [
      '#141c28',
      '#141c28',
    ])
  // Door frame markers.
  if (room.doorWall === 'top' || room.doorWall === 'bottom') {
    const wy = room.doorWall === 'top' ? y : y + h - 1
    rect(room.door.x - GAP - 1, wy - 1, 1, 3, '#6ee7f0')
    rect(room.door.x + GAP + 1, wy - 1, 1, 3, '#6ee7f0')
  }
}
for (const room of Object.values(ROOMS)) wallRoom(room)
// Corridor side walls (between room blocks)
for (let i = CORRIDOR.x; i < CORRIDOR.x + CORRIDOR.w; i++) {
  for (const j of [CORRIDOR.y - 1, CORRIDOR.y + CORRIDOR.h]) {
    const nearDoor = Object.values(ROOMS).some(
      (r) => (r.doorWall === 'top' || r.doorWall === 'bottom') && Math.abs(i - r.door.x) <= GAP,
    )
    if (!nearDoor) px(i, j, WALL)
  }
}

// ---------- Props ----------
const R = ROOMS
// Gagarin — reactor, engines, workbench
{
  const { x, y } = R.gagarin
  disc(x + 46, y + 68, 17, '#2a2218')
  ring(x + 46, y + 68, 17, '#f2b84b')
  ring(x + 46, y + 68, 12, '#8a5a22')
  disc(x + 46, y + 68, 7, '#e2702b')
  disc(x + 46, y + 68, 4, '#ffd27a')
  disc(x + 46, y + 68, 2, '#fff4d6')
  for (const [dx, dy] of [
    [-22, 0],
    [22, 0],
    [0, -22],
    [0, 22],
  ])
    rect(x + 46 + dx - 1, y + 68 + dy - 1, 3, 3, '#f2b84b')
  // engine blocks along rear wall
  for (const by of [8, 112]) {
    rect(x + 4, y + by, 30, 14, '#2b3a52')
    outline(x + 4, y + by, 30, 14, '#4b6a92')
    for (let k = 0; k < 4; k++) rect(x + 8 + k * 7, y + by + 4, 4, 6, '#14202f')
  }
  // pipes
  rect(x + 4, y + 40, 2, 56, '#8a5a22')
  rect(x + 8, y + 40, 2, 56, '#5b6b80')
  // workbench + printer
  rect(x + 64, y + 10, 24, 10, '#3a2f22')
  rect(x + 66, y + 12, 6, 4, '#9cc2ff')
  rect(x + 76, y + 12, 9, 5, '#5b6b80')
  rect(x + 64, y + 116, 22, 14, '#2a3a52')
  outline(x + 64, y + 116, 22, 14, '#5b7ba3')
  rect(x + 68, y + 120, 14, 6, '#e2702b', 0.6)
}
// Tereshkova — planters
{
  const { x, y } = R.tereshkova
  for (let row = 0; row < 3; row++) {
    const ry = y + 8 + row * 14
    rect(x + 6, ry, 66, 8, '#3b2a1c')
    rect(x + 6, ry, 66, 1, '#56402b')
    for (let k = 0; k < 16; k++) {
      const cx = x + 8 + k * 4
      px(cx, ry + 2, '#5fe08f')
      px(cx + 1, ry + 3, '#2fae6a')
      px(cx, ry + 4, '#1d6b40')
      if (k % 3 === 0) px(cx + 1, ry + 1, '#f2b84b')
    }
  }
  // water tanks + seed bank
  disc(x + 10, y + 62, 4, '#1f4a52')
  disc(x + 10, y + 62, 2, '#4fd1c5')
  rect(x + 60, y + 56, 12, 10, '#2a3a52')
  for (let k = 0; k < 3; k++) rect(x + 62 + k * 3, y + 58, 2, 2, '#5fe08f')
}
// Collins — server racks and AI core
{
  const { x, y, w } = R.collins
  for (const rx of [x + 4, x + w - 12]) {
    for (let k = 0; k < 3; k++) {
      const ry = y + 6 + k * 18
      rect(rx, ry, 8, 15, '#101c2c')
      outline(rx, ry, 8, 15, '#2e4566')
      for (let l = 0; l < 5; l++)
        px(rx + 2 + (l % 2) * 3, ry + 3 + l * 2, l % 2 ? '#5fe08f' : '#6ee7f0')
    }
  }
  const cx = x + w / 2
  disc(cx, y + 34, 10, '#0b2230')
  ring(cx, y + 34, 10, '#6ee7f0')
  ring(cx, y + 34, 6, '#2b8fa0')
  disc(cx, y + 34, 3, '#c9fbff')
  for (let k = 0; k < 8; k++) px(cx - 14 + k * 4, y + 52, '#6ee7f0', 0.7)
}
// Aldrin — hangar with capsule, lockers
{
  const { x, y } = R.aldrin
  rect(x + 18, y + 4, 28, 30, '#0d141f')
  outline(x + 18, y + 4, 28, 30, '#f2b84b')
  for (let k = 0; k < 7; k++) px(x + 18 + k * 4, y + 4, k % 2 ? '#02050b' : '#f2b84b')
  disc(x + 32, y + 18, 9, '#c9d3df')
  disc(x + 32, y + 18, 6, '#7b93ad')
  rect(x + 29, y + 15, 6, 4, '#6ee7f0')
  for (let k = 0; k < 4; k++) {
    rect(x + 4, y + 8 + k * 11, 8, 9, '#2a3a52')
    outline(x + 4, y + 8 + k * 11, 8, 9, '#4b6a92')
  }
  for (let k = 0; k < 3; k++) {
    rect(x + 52, y + 8 + k * 14, 8, 10, '#232f42')
    px(x + 55, y + 12 + k * 14, '#ff6b6b')
  }
}
// Life support — tanks, fans, pipes
{
  const { x, y } = R['life-support']
  for (const [dx, dy] of [
    [12, 22],
    [48, 22],
  ]) {
    disc(x + dx, y + dy, 8, '#1f4a52')
    ring(x + dx, y + dy, 8, '#4fd1c5')
    disc(x + dx, y + dy, 3, '#9ff3e8')
  }
  for (const fx of [x + 8, x + 40]) {
    rect(fx, y + 44, 14, 14, '#16262b')
    outline(fx, y + 44, 14, 14, '#2c5d63')
    ring(fx + 7, y + 51, 5, '#2c5d63')
    for (let k = -4; k <= 4; k++) {
      px(fx + 7 + k, y + 51 + k, '#4fd1c5')
      px(fx + 7 + k, y + 51 - k, '#4fd1c5')
    }
    px(fx + 7, y + 51, '#9ff3e8')
  }
  rect(x + 2, y + 66, 58, 2, '#2c5d63')
  rect(x + 26, y + 6, 8, 10, '#3a2f22')
  px(x + 28, y + 9, '#ff6b6b')
  px(x + 31, y + 9, '#5fe08f')
}
// Habitat — bunks, table, couch, window
{
  const { x, y } = R.habitat
  for (const bed of BEDS) {
    rect(bed.x - 5, bed.y - 14, 10, 16, '#2b3550')
    rect(bed.x - 4, bed.y - 13, 8, 4, '#d5e0ee')
    rect(bed.x - 4, bed.y - 9, 8, 10, '#4f6fa8')
    rect(bed.x - 5, bed.y + 2, 10, 1, '#141a28')
  }
  rect(x + 2, y + 24, 74, 1, '#3a3346')
  // table and chairs
  rect(x + 30, y + 38, 18, 10, '#4a3a30')
  rect(x + 30, y + 38, 18, 1, '#6a5444')
  for (const [dx, dy] of [
    [26, 41],
    [50, 41],
    [38, 34],
    [38, 50],
  ])
    rect(x + dx, y + dy, 3, 3, '#7b93ad')
  // couch + screen
  rect(x + 6, y + 58, 22, 8, '#5a3a4a')
  rect(x + 6, y + 58, 22, 2, '#7a5266')
  rect(x + 54, y + 60, 18, 3, '#9cc2ff')
  rect(x + 54, y + 63, 18, 1, '#2b3550')
  // plant
  disc(x + 70, y + 36, 2, '#2fae6a')
}
// Ride — med beds, scanner, cross
{
  const { x, y } = R.ride
  for (const bed of MED_BEDS) {
    rect(bed.x - 6, bed.y - 14, 12, 18, '#cfd8e3')
    rect(bed.x - 5, bed.y - 13, 10, 4, '#ffffff')
    rect(bed.x - 6, bed.y + 4, 12, 1, '#7b93ad')
    px(bed.x + 5, bed.y - 15, '#5fe08f')
  }
  rect(x + 26, y + 6, 12, 12, '#2a1418')
  rect(x + 30, y + 8, 4, 8, '#d2453f')
  rect(x + 28, y + 10, 8, 4, '#d2453f')
  for (let k = 0; k < 3; k++) rect(x + 46 + k * 5, y + 6, 4, 10, '#2a3a52')
  rect(x + 4, y + 6, 14, 10, '#1f2a3a')
  rect(x + 6, y + 8, 10, 4, '#6ee7f0', 0.7)
}
// Armstrong — consoles, holotable, viewport
{
  const { x, y, w, h } = R.armstrong
  rect(x + w - 6, y + 8, 4, h - 16, '#050b15')
  for (let k = 0; k < 14; k++) px(x + w - 5 + (k % 2), y + 10 + k * 6, '#ffffff', 0.7)
  for (let k = 0; k < 3; k++) {
    rect(x + 4 + k * 15, y + 4, 12, 8, '#1c2c44')
    rect(x + 6 + k * 15, y + 6, 8, 3, k === 1 ? '#f2b84b' : '#6ee7f0')
    rect(x + 4 + k * 15, y + h - 12, 12, 8, '#1c2c44')
    rect(x + 6 + k * 15, y + h - 9, 8, 3, '#9cc2ff')
  }
  disc(x + 26, y + h / 2, 8, '#0b2230')
  ring(x + 26, y + h / 2, 8, '#6ee7f0')
  disc(x + 26, y + h / 2, 4, '#6ee7f0', 0.35)
  px(x + 26, y + h / 2, '#ffffff')
  rect(x + 40, y + h / 2 - 3, 5, 6, '#3a5274')
}

// ---------- PNG encode ----------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf: Uint8Array) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  Buffer.from(data).copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
const header = Buffer.alloc(13)
header.writeUInt32BE(W, 0)
header.writeUInt32BE(H, 4)
header[8] = 8
header[9] = 6
const raw = Buffer.alloc((W * 4 + 1) * H)
for (let y = 0; y < H; y++)
  Buffer.from(pixels.subarray(y * W * 4, (y + 1) * W * 4)).copy(raw, y * (W * 4 + 1) + 1)
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', new Uint8Array()),
])
const outDir = fileURLToPath(new URL('../src/assets/ship/', import.meta.url))
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}elysium-deck.png`, png)
console.log(`wrote src/assets/ship/elysium-deck.png (${W}×${H}, ${png.length} bytes)`)
