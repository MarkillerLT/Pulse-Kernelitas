import type { CrewId } from '../domain/content/crew'
import type { SectorId } from '../domain/content/sectors'

/** Palette for the 3D view, matched to the game and landing page (ink + mint accent). */
export const C = {
  space: '#04080b',
  panel: '#0d191e',
  track: '#1e2c2f',
  text: '#eef1e8',
  muted: '#9eaaa5',
  dim: '#667477',
  accent: '#c9f36b',
  accentHover: '#d7ff83',
  accentInk: '#10171a',
  button: '#16252a',
  buttonHover: '#22363c',
  buttonDisabled: '#111c20',
  active: '#1b2e24',
  primary: '#c9f36b',
  danger: '#a3333f',
  dangerHover: '#bf3f4c',
  good: '#8fdc8b',
  warn: '#f2b84b',
  critical: '#ff6b6b',
  hull: '#2a3140',
  hullDark: '#171c26',
  wall: '#46526a',
  corridor: '#232b3a',
} as const

export const CREW_COLORS: Record<CrewId, string> = {
  orion: '#4c8dff',
  lyra: '#ff9f43',
  elias: '#e8f1ff',
  zara: '#ff5d73',
  kai: '#8fdc5a',
}

export const SECTOR_FLOOR: Record<SectorId, string> = {
  armstrong: '#24344f',
  gagarin: '#3a2c22',
  ride: '#28383c',
  aldrin: '#2c2f38',
  tereshkova: '#22381f',
  collins: '#2c2343',
  habitat: '#33293a',
  'life-support': '#1f3242',
}

export const SEVERITY_COLOR = { critical: C.critical, urgent: C.warn, routine: C.accent } as const
