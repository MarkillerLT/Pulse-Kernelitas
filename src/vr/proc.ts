import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

/**
 * Procedural textures drawn on canvases at startup: hull plating, floor grating, the planet's
 * surface and clouds, the sun's glow and the nebula. No image files to download (the headset is
 * often on a slow connection), and each texture is built once and shared.
 */

const cache = new Map<string, Texture>()

function make(
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
  repeat = false,
) {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping
  cache.set(key, tex)
  return tex
}

/** Deterministic pseudo-random generator, so textures look the same every load. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth value noise with a few octaves (fractal Brownian motion), tiling horizontally. */
function fbm(width: number, height: number, seed: number, octaves = 5) {
  const rand = rng(seed)
  const grids = Array.from({ length: octaves }, (_, o) => {
    const gw = 4 << o
    const gh = Math.max(2, (4 << o) / 2)
    return { gw, gh, v: Array.from({ length: gw * (gh + 1) }, rand) }
  })
  const out = new Float32Array(width * height)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let sum = 0
      let amp = 1
      let norm = 0
      for (const { gw, gh, v } of grids) {
        const fx = (x / width) * gw
        const fy = (y / height) * gh
        const x0 = Math.floor(fx)
        const y0 = Math.floor(fy)
        const tx = smooth(fx - x0)
        const ty = smooth(fy - y0)
        const at = (i: number, j: number) => v[(j % (gh + 1)) * gw + (i % gw)]
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
        sum += (a + (b - a) * ty) * amp
        norm += amp
        amp *= 0.5
      }
      out[y * width + x] = sum / norm
    }
  return out
}

/** Draws `img` onto `g` through a blur filter (via a scratch canvas). */
function softenInto(g: CanvasRenderingContext2D, img: ImageData, radius: number) {
  const scratch = document.createElement('canvas')
  scratch.width = img.width
  scratch.height = img.height
  scratch.getContext('2d')!.putImageData(img, 0, 0)
  g.filter = `blur(${radius}px)`
  g.drawImage(scratch, 0, 0)
  g.filter = 'none'
}

/** Riveted hull plates. */
export function hullTexture() {
  return make(
    'hull',
    256,
    256,
    (g) => {
      g.fillStyle = '#4a5463'
      g.fillRect(0, 0, 256, 256)
      const rand = rng(7)
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const shade = 70 + Math.floor(rand() * 18)
          g.fillStyle = `rgb(${shade - 6},${shade},${shade + 12})`
          g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60)
          g.fillStyle = 'rgba(20,24,30,0.7)'
          for (const [rx, ry] of [
            [6, 6],
            [56, 6],
            [6, 56],
            [56, 56],
          ])
            g.fillRect(x * 64 + rx, y * 64 + ry, 3, 3)
        }
    },
    true,
  )
}

/** Metal floor grating, tinted per sector by the material colour. */
export function floorTexture() {
  return make(
    'floor',
    128,
    128,
    (g) => {
      g.fillStyle = '#cfd6dc'
      g.fillRect(0, 0, 128, 128)
      g.strokeStyle = '#8b949c'
      g.lineWidth = 2
      for (let i = 0; i <= 128; i += 32) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i, 128)
        g.moveTo(0, i)
        g.lineTo(128, i)
        g.stroke()
      }
      g.fillStyle = '#a8b0b8'
      for (let y = 8; y < 128; y += 32) for (let x = 8; x < 128; x += 32) g.fillRect(x, y, 16, 3)
    },
    true,
  )
}

/** Solar cells. */
export function solarTexture() {
  return make(
    'solar',
    128,
    128,
    (g) => {
      g.fillStyle = '#0d1f3d'
      g.fillRect(0, 0, 128, 128)
      g.strokeStyle = '#3d6fb0'
      g.lineWidth = 1.5
      for (let i = 0; i <= 128; i += 16) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i, 128)
        g.moveTo(0, i)
        g.lineTo(128, i)
        g.stroke()
      }
    },
    true,
  )
}

/** Ocean world with continents, ice caps and some deserts. */
export function planetTexture() {
  return make('planet', 1024, 512, (g) => {
    const w = 1024
    const h = 512
    const n = fbm(w, h, 11, 6)
    const img = g.createImageData(w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = n[y * w + x]
        const lat = Math.abs(y / h - 0.5) * 2
        let c: [number, number, number]
        if (lat > 0.86 - v * 0.12) c = [232, 240, 245]
        else if (v < 0.5) c = [20 + v * 30, 60 + v * 80, 110 + v * 90]
        else if (v < 0.53) c = [196, 184, 140]
        else if (v < 0.64) c = [58 + (v - 0.5) * 120, 110 - (v - 0.5) * 60, 60]
        else c = [120 + (v - 0.6) * 200, 100 + (v - 0.6) * 120, 70]
        const i = (y * w + x) * 4
        img.data[i] = c[0]
        img.data[i + 1] = c[1]
        img.data[i + 2] = c[2]
        img.data[i + 3] = 255
      }
    // Soften the contour lines of the noise so coastlines don't look stepped.
    softenInto(g, img, 1.6)
  })
}

/** Cloud layer (white with alpha). */
export function cloudTexture() {
  return make('clouds', 512, 256, (g) => {
    const w = 512
    const h = 256
    const n = fbm(w, h, 23, 6)
    const img = g.createImageData(w, h)
    for (let i = 0; i < w * h; i++) {
      const a = Math.max(0, Math.min(1, (n[i] - 0.52) * 4))
      img.data[i * 4] = 255
      img.data[i * 4 + 1] = 255
      img.data[i * 4 + 2] = 255
      img.data[i * 4 + 3] = Math.round(a * 220)
    }
    softenInto(g, img, 1.2)
  })
}

/** Soft radial glow for the sun and engine flares. */
export function glowTexture() {
  return make('glow', 128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.2, 'rgba(255,240,210,0.8)')
    grad.addColorStop(0.5, 'rgba(255,200,140,0.18)')
    grad.addColorStop(1, 'rgba(255,180,120,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  })
}

/** Faint coloured clouds of gas for the sky sphere. */
export function nebulaTexture() {
  return make('nebula', 1024, 512, (g) => {
    g.fillStyle = '#000'
    g.fillRect(0, 0, 1024, 512)
    const rand = rng(41)
    const colors = ['80,60,160', '40,90,170', '150,50,120', '30,120,140']
    for (let i = 0; i < 70; i++) {
      const x = rand() * 1024
      const y = 120 + rand() * 280
      const r = 40 + rand() * 160
      const grad = g.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, `rgba(${colors[i % colors.length]},${0.05 + rand() * 0.08})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
  })
}
