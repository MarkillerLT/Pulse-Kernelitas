import type { SectorId } from '../../domain/content/sectors'

/**
 * Top-down deck plan of the Elysium, in logical pixels. Single source of truth for both the
 * background generator (scripts/generate-ship-map.ts) and the walking astronauts on the map.
 * No runtime imports: the generator runs this file directly with Node.
 */
export const MAP_WIDTH = 400
export const MAP_HEIGHT = 224
/** Walkway between sectors. Crew walk along `walkY` (feet position). */
export const CORRIDOR = { x: 112, y: 102, w: 220, h: 20, walkY: 116 }

export interface Point {
  x: number
  y: number
}

export interface Room {
  id: SectorId
  x: number
  y: number
  w: number
  h: number
  /** Point inside the doorway, and its matching point on the corridor centre line. */
  door: Point
  corridor: Point
  /** Which wall the doorway is cut into. */
  doorWall: 'top' | 'bottom' | 'left' | 'right'
  /** Standing spots (feet position) where crew idle or work. */
  spots: Point[]
}

export const ROOMS: Record<SectorId, Room> = {
  gagarin: {
    id: 'gagarin',
    x: 20,
    y: 44,
    w: 92,
    h: 136,
    door: { x: 106, y: 116 },
    corridor: { x: 118, y: 116 },
    doorWall: 'right',
    spots: [
      { x: 44, y: 84 },
      { x: 86, y: 84 },
      { x: 44, y: 160 },
      { x: 86, y: 160 },
      { x: 92, y: 122 },
    ],
  },
  tereshkova: {
    id: 'tereshkova',
    x: 116,
    y: 24,
    w: 78,
    h: 74,
    door: { x: 155, y: 92 },
    corridor: { x: 155, y: 116 },
    doorWall: 'bottom',
    spots: [
      { x: 132, y: 60 },
      { x: 155, y: 60 },
      { x: 178, y: 60 },
      { x: 140, y: 86 },
      { x: 172, y: 86 },
    ],
  },
  collins: {
    id: 'collins',
    x: 198,
    y: 24,
    w: 62,
    h: 74,
    door: { x: 229, y: 92 },
    corridor: { x: 229, y: 116 },
    doorWall: 'bottom',
    spots: [
      { x: 214, y: 82 },
      { x: 244, y: 82 },
      { x: 229, y: 86 },
    ],
  },
  aldrin: {
    id: 'aldrin',
    x: 264,
    y: 24,
    w: 64,
    h: 74,
    door: { x: 296, y: 92 },
    corridor: { x: 296, y: 116 },
    doorWall: 'bottom',
    spots: [
      { x: 278, y: 84 },
      { x: 314, y: 84 },
      { x: 296, y: 86 },
    ],
  },
  'life-support': {
    id: 'life-support',
    x: 116,
    y: 126,
    w: 62,
    h: 74,
    door: { x: 147, y: 136 },
    corridor: { x: 147, y: 116 },
    doorWall: 'top',
    spots: [
      { x: 132, y: 160 },
      { x: 162, y: 160 },
      { x: 147, y: 188 },
    ],
  },
  habitat: {
    id: 'habitat',
    x: 182,
    y: 126,
    w: 78,
    h: 74,
    door: { x: 190, y: 136 },
    corridor: { x: 190, y: 116 },
    doorWall: 'top',
    spots: [
      { x: 204, y: 170 },
      { x: 222, y: 166 },
      { x: 240, y: 170 },
      { x: 212, y: 186 },
      { x: 234, y: 186 },
    ],
  },
  ride: {
    id: 'ride',
    x: 264,
    y: 126,
    w: 64,
    h: 74,
    door: { x: 296, y: 136 },
    corridor: { x: 296, y: 116 },
    doorWall: 'top',
    spots: [
      { x: 280, y: 152 },
      { x: 312, y: 152 },
      { x: 296, y: 190 },
    ],
  },
  armstrong: {
    id: 'armstrong',
    x: 332,
    y: 64,
    w: 52,
    h: 96,
    door: { x: 338, y: 116 },
    corridor: { x: 326, y: 116 },
    doorWall: 'left',
    spots: [
      { x: 352, y: 96 },
      { x: 352, y: 136 },
      { x: 368, y: 116 },
      { x: 346, y: 116 },
    ],
  },
}

/** Bunks in the habitat cabins (top strip) used for sleeping. */
export const BEDS: Point[] = [
  { x: 204, y: 146 },
  { x: 216, y: 146 },
  { x: 228, y: 146 },
  { x: 240, y: 146 },
  { x: 252, y: 146 },
]
/** Recovery beds in the medical bay. */
export const MED_BEDS: Point[] = [
  { x: 276, y: 172 },
  { x: 296, y: 172 },
  { x: 316, y: 172 },
]
/** Where a mission team boards the exploration capsule. */
export const HANGAR: Point = { x: 296, y: 56 }
