import type { CrewId } from '../domain/content/crew'
import type { SectorId } from '../domain/content/sectors'

/** Palette for the 3D view. Kept close to the 2D console's dark sci-fi look. */
export const C = {
  space: '#05070d',
  panel: '#0d1420',
  track: '#1c2636',
  text: '#e6edf7',
  muted: '#7d8aa0',
  accent: '#5ad1ff',
  button: '#1d2a3d',
  buttonHover: '#2c4160',
  buttonDisabled: '#141b26',
  active: '#21405e',
  primary: '#1f6f9e',
  danger: '#a3333f',
  good: '#4fd18b',
  warn: '#ffb547',
  critical: '#ff5468',
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
