import { CREW, CREW_IDS, type CrewId } from '../../domain/content/crew'
import type { SectorId } from '../../domain/content/sectors'
import type { GameState } from '../../domain/model/game'
import { BEDS, HANGAR, MED_BEDS, ROOMS, type Point } from './layout'

/**
 * Where the crew walk on the deck plan, shared by the 2D map and the 3D/VR diorama. The engine
 * decides *what* each member does; this module only decides *where* they stand and how they
 * walk there. Coordinates are logical map pixels (see layout.ts).
 */
export const WALK_SPEED = 30 // logical px per second

export interface Target {
  room: SectorId
  point: Point
  /** Wander inside the room once there (idle crew, Habbo-style). */
  wander: boolean
  hidden: boolean
}

/** Where each crew member should be, derived from what the engine says they are doing. */
export function crewTargets(game: GameState): Record<CrewId, Target> {
  const targets = {} as Record<CrewId, Target>
  const medical = CREW_IDS.filter((id) => game.crew[id].activity === 'medical')
  CREW_IDS.forEach((id, index) => {
    const crew = game.crew[id]
    const home = ROOMS[CREW[id].homeSector]
    switch (crew.activity) {
      case 'rest':
        targets[id] = { room: 'habitat', point: BEDS[index], wander: false, hidden: false }
        break
      case 'medical':
        targets[id] = {
          room: 'ride',
          point: MED_BEDS[medical.indexOf(id) % MED_BEDS.length],
          wander: false,
          hidden: false,
        }
        break
      case 'leisure':
        targets[id] = {
          room: 'habitat',
          point: ROOMS.habitat.spots[index],
          wander: true,
          hidden: false,
        }
        break
      case 'mission':
        targets[id] = { room: 'aldrin', point: HANGAR, wander: false, hidden: true }
        break
      case 'task': {
        const task = game.tasks.find((t) => t.id === crew.taskId)
        const room = ROOMS[task?.sectorId ?? CREW[id].homeSector]
        targets[id] = {
          room: room.id,
          point: room.spots[index % room.spots.length],
          wander: false,
          hidden: false,
        }
        break
      }
      case 'dead':
        targets[id] = { room: 'ride', point: MED_BEDS[0], wander: false, hidden: true }
        break
      default:
        targets[id] = {
          room: home.id,
          point: home.spots[index % home.spots.length],
          wander: true,
          hidden: false,
        }
    }
  })
  return targets
}

function route(fromRoom: SectorId, toRoom: SectorId, to: Point): Point[] {
  if (fromRoom === toRoom) return [to]
  const a = ROOMS[fromRoom]
  const b = ROOMS[toRoom]
  return [a.door, a.corridor, b.corridor, b.door, to]
}

export interface Walker {
  pos: Point
  room: SectorId
  path: Point[]
  targetKey: string
  nextWander: number
  facing: 'front' | 'back'
  /** Direction of the last step, in radians on the map plane (atan2 of dy, dx). */
  heading: number
  walking: boolean
  hidden: boolean
}

const keyOf = (t: Target) => `${t.room}:${t.point.x},${t.point.y}:${t.hidden}`

export function createWalker(target: Target, now: number): Walker {
  return {
    pos: { ...target.point },
    room: target.room,
    path: [],
    targetKey: keyOf(target),
    nextWander: now + 2000 + Math.random() * 4000,
    facing: 'front',
    heading: Math.PI / 2,
    walking: false,
    hidden: target.hidden,
  }
}

/** Advances one walker by `dt` seconds toward its target. Mutates and returns it. */
export function stepWalker(
  w: Walker,
  target: Target,
  now: number,
  dt: number,
  reducedMotion: boolean,
): Walker {
  const key = keyOf(target)
  if (w.targetKey !== key) {
    w.path = route(w.room, target.room, target.point)
    w.room = target.room
    w.targetKey = key
    if (!target.hidden) w.hidden = false
  } else if (target.wander && !w.path.length && now > w.nextWander) {
    const spots = ROOMS[target.room].spots
    const spot = spots[Math.floor(Math.random() * spots.length)]
    w.path = [{ x: spot.x + Math.round(Math.random() * 6 - 3), y: spot.y }]
    w.nextWander = now + 3000 + Math.random() * 5000
  }
  w.walking = false
  if (reducedMotion && w.path.length) {
    w.pos = { ...w.path[w.path.length - 1] }
    w.path = []
  }
  while (w.path.length) {
    const next = w.path[0]
    const dx = next.x - w.pos.x
    const dy = next.y - w.pos.y
    const dist = Math.hypot(dx, dy)
    const move = WALK_SPEED * dt
    if (dist <= move) {
      w.pos = { ...next }
      w.path.shift()
      continue
    }
    w.pos = { x: w.pos.x + (dx / dist) * move, y: w.pos.y + (dy / dist) * move }
    if (Math.abs(dy) > Math.abs(dx) * 0.5) w.facing = dy < 0 ? 'back' : 'front'
    else w.facing = 'front'
    w.heading = Math.atan2(dy, dx)
    w.walking = true
    break
  }
  if (!w.path.length && target.hidden) w.hidden = true
  return w
}
