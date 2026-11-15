/** Truncates long copy so it fits a fixed-height card (SDF text has no line clamp). */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

const GLYPHS: Record<string, string> = { '→': '->', '−': '-' }

/**
 * The SDF font only ships the Latin subset: map the few glyphs the game copy uses outside it
 * (CO₂, arrows) to plain characters instead of rendering empty boxes.
 */
export function glyphSafe(text: string): string {
  return text
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[→−]/g, (c) => GLYPHS[c])
}
