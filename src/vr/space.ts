import type { SectorId } from '../domain/content/sectors'
import type { Point } from '../ui/ship/layout'
import { MAP_HEIGHT, MAP_WIDTH, ROOMS } from '../ui/ship/layout'

type Vec3 = [number, number, number]

/**
 * The VR ship is built from the same deck plan as the 2D map (layout.ts), so the crew walk
 * exactly where they walk in 2D. Ship geometry is authored at diorama scale: one logical map
 * pixel = PX metres, the whole ship ~1.8 × 1 m. "A bordo" view scales that same group by
 * ONBOARD_SCALE, so a map pixel becomes ~13.5 cm and the crew are life-size (~1.7 m).
 */
export const PX = 0.0045
export const ONBOARD_SCALE = 30

/** Map pixel → ship-local metres (x right, z toward the player). */
export function toWorld(p: Point): [number, number] {
  return [(p.x - MAP_WIDTH / 2) * PX, (p.y - MAP_HEIGHT / 2) * PX]
}

/** Where the player stands when visiting a sector on board: between its centre and its door. */
export function spawnPoint(sector: SectorId): Point {
  const r = ROOMS[sector]
  return { x: (r.x + r.w / 2 + r.door.x) / 2, y: (r.y + r.h / 2 + r.door.y) / 2 }
}

/** Y rotation that makes a panel at (x, z) face the player standing at the origin. */
export function faceOrigin(x: number, z: number): number {
  return Math.atan2(-x, -z)
}

const at = (x: number, y: number, z: number) => ({
  position: [x, y, z] as Vec3,
  rotY: faceOrigin(x, z),
})

/**
 * Where everything sits around a standing player (origin = their feet, looking toward -z).
 * Panels stay put in both views; only the ship moves. Everything is within arm's reach and
 * inside a comfortable ±60° arc, so nobody has to turn around to play.
 */
export const LAYOUT = {
  /** Tabletop diorama in front of the player. */
  diorama: [0, 0.8, -1.15] as Vec3,
  /** Status bar above the diorama: clock, speed, ship systems, view controls. */
  hud: at(0, 1.86, -1.5),
  /** Mission launch / return announcements, above the status bar. */
  banner: at(0, 2.32, -1.55),
  /** Pending decisions, to the left. */
  tasks: at(-1.0, 1.66, -0.62),
  /** Crew faces, to the right; the selected member's file opens under it. */
  roster: at(1.0, 1.82, -0.62),
  crewCard: at(1.0, 1.5, -0.62),
  /** Modal windows (decisions, pause menu) right in front, at eye level. */
  modal: at(0, 1.55, -0.85),
  /**
   * Cockpit-style log console: a desk at waist height, tilted toward the player and kept below
   * the line of sight from the eyes (~1.6 m) to the diorama, so it never hides the ship.
   */
  console: { position: [0, 0.84, -0.4] as Vec3, tilt: -0.85 },
}

/** Far-away planet the mission capsule flies to (world space). */
export const PLANET_POS: Vec3 = [-38, 14, -75]
