import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'
import palette from '../../src/game/rendering/palette.json'

const tokens = readFileSync('src/styles/tokens.css', 'utf8')
function token(name: string) {
  const match = tokens.match(new RegExp(`--color-${name}: (#[a-fA-F0-9]{6})`))
  if (!match) throw new Error(`Missing color token: ${name}`)
  return match[1]
}
function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
describe('aerospace design system', () => {
  it('keeps body text, status text and primary buttons at AA contrast', () => {
    for (const background of ['background', 'navy', 'surface', 'surface-raised', 'primary-soft']) {
      for (const foreground of [
        'foreground',
        'muted',
        'link',
        'healthy',
        'warning',
        'critical-text',
      ]) {
        expect(
          contrast(token(foreground), token(background)),
          `${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
    expect(contrast(token('foreground'), token('primary'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('muted'), token('warning-surface'))).toBeGreaterThanOrEqual(4.5)
  })
  it('preserves the logical scene and all original animation frame dimensions', () => {
    const station = PNG.sync.read(
      readFileSync('public/assets/pixel-art/station/backgrounds/station.png'),
    )
    expect([station.width, station.height]).toEqual([480, 270])
    for (const i of [0, 1, 2]) {
      const sheet = PNG.sync.read(
        readFileSync(`public/assets/pixel-art/astronauts/spritesheets/crew-${i}.png`),
      )
      expect([sheet.width, sheet.height]).toEqual([16 * 12, 24])
    }
    expect(palette.white).toBeDefined()
  })
  it('ships original PULSE patch and required font license notices', () => {
    const patch = readFileSync('public/assets/pixel-art/ui/pulse-mission-patch.svg', 'utf8')
    expect(patch).toContain('viewBox="0 0 40 48"')
    expect(patch).not.toMatch(/NASA|meatball|worm/i)
    for (const name of ['inter', 'public-sans', 'dm-mono']) {
      expect(readFileSync(`public/licenses/${name}-OFL.txt`, 'utf8')).toContain(
        'SIL OPEN FONT LICENSE Version 1.1',
      )
    }
  })
})
