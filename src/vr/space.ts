import type { Point } from '../ui/ship/layout'
import { MAP_HEIGHT, MAP_WIDTH } from '../ui/ship/layout'

/**
 * The VR ship is a tabletop diorama of the same deck plan the 2D map uses (layout.ts), so the
 * crew walk exactly where they walk in 2D. One logical map pixel = PX metres: the whole ship is
 * ~1.8 × 1 m, floating at table height in front of the player. No locomotion needed, which keeps
 * the experience comfortable for people who get motion sick.
 */
export const PX = 0.0045

/** Map pixel → diorama-local metres (x right, z toward the player). */
export function toWorld(p: Point): [number, number] {
  return [(p.x - MAP_WIDTH / 2) * PX, (p.y - MAP_HEIGHT / 2) * PX]
}

/** Where things sit in the room, in metres from the floor origin (standing player at 0,0,0). */
export const LAYOUT = {
  diorama: [0, 0.82, -0.8] as [number, number, number],
  tasks: { position: [-0.95, 1.62, -0.55] as [number, number, number], rotY: 0.7 },
  side: { position: [0.95, 1.62, -0.55] as [number, number, number], rotY: -0.7 },
  hud: [0, 1.56, -1.4] as [number, number, number],
  setup: [0, 1.62, -0.95] as [number, number, number],
}
