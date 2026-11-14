import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { CREW, CREW_IDS, firstName, type CrewId } from '../../domain/content/crew'
import { SECTORS, SECTOR_IDS, type SectorId } from '../../domain/content/sectors'
import type { GameState } from '../../domain/model/game'
import { getWorkWarnings } from '../../domain/rules/availability'
import deck from '../../assets/ship/elysium-deck.png'
import { CREW_SPRITES } from '../sprites'
import { BEDS, HANGAR, MAP_HEIGHT, MAP_WIDTH, MED_BEDS, ROOMS, type Point } from '../ship/layout'

const SPRITE = 14
/** Short names that fit inside each room on the map. */
const MAP_LABELS: Record<SectorId, string> = {
  armstrong: 'Puente',
  gagarin: 'Ingeniería',
  ride: 'Médico',
  aldrin: 'Hangar',
  tereshkova: 'Invernadero',
  collins: 'Núcleo',
  habitat: 'Hábitat',
  'life-support': 'Soporte',
}
const WALK_SPEED = 30 // logical px per second

interface Target {
  room: SectorId
  point: Point
  /** Wander inside the room once there (idle crew, Habbo-style). */
  wander: boolean
  hidden: boolean
}

/** Where each crew member should be, derived from what the engine says they are doing. */
function crewTargets(game: GameState): Record<CrewId, Target> {
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

interface Walker {
  pos: Point
  room: SectorId
  path: Point[]
  targetKey: string
  nextWander: number
  facing: 'front' | 'back'
  hidden: boolean
}

interface Props {
  game: GameState
  selectedId: CrewId | null
  onSelect: (id: CrewId) => void
  reducedMotion: boolean
}

/**
 * Top-down deck with the crew walking between sectors. The engine decides *what* each member
 * does; this component only animates *where* they are. Positions live in refs and are written
 * straight to the DOM each frame, so walking never re-renders React.
 */
export function ShipMap({ game, selectedId, onSelect, reducedMotion }: Props) {
  const navigate = useNavigate()
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(2)
  const nodes = useRef<Partial<Record<CrewId, HTMLButtonElement | null>>>({})
  const walkers = useRef<Partial<Record<CrewId, Walker>>>({})
  const targets = crewTargets(game)
  const targetsRef = useRef(targets)
  const scaleRef = useRef(scale)
  // The animation loop reads the latest targets and scale without restarting.
  useLayoutEffect(() => {
    targetsRef.current = targets
    scaleRef.current = scale
  })

  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const fit = () => {
      const ratio = el.clientWidth / MAP_WIDTH
      setScale(ratio >= 1 ? Math.max(1, Math.floor(ratio * 2) / 2) : ratio)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      for (const id of CREW_IDS) {
        const target = targetsRef.current[id]
        const key = `${target.room}:${target.point.x},${target.point.y}:${target.hidden}`
        let w = walkers.current[id]
        if (!w) {
          w = walkers.current[id] = {
            pos: { ...target.point },
            room: target.room,
            path: [],
            targetKey: key,
            nextWander: now + 2000 + Math.random() * 4000,
            facing: 'front',
            hidden: target.hidden,
          }
        }
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
        let walking = false
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
          walking = true
          break
        }
        if (!w.path.length && target.hidden) w.hidden = true
        const node = nodes.current[id]
        if (node) {
          const s = scaleRef.current
          node.style.transform = `translate(${(w.pos.x - SPRITE / 2) * s}px, ${(w.pos.y - SPRITE) * s}px)`
          node.style.zIndex = String(Math.round(w.pos.y))
          node.dataset.walking = String(walking)
          node.dataset.facing = w.facing
          node.dataset.hidden = String(w.hidden)
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [reducedMotion])

  const tasksBySector = new Map<SectorId, typeof game.tasks>()
  for (const task of game.tasks)
    tasksBySector.set(task.sectorId, [...(tasksBySector.get(task.sectorId) ?? []), task])

  return (
    <div className="ship-frame" ref={frame}>
      <div
        className="ship-map-canvas"
        style={
          { width: MAP_WIDTH * scale, height: MAP_HEIGHT * scale, '--s': scale } as CSSProperties
        }
      >
        <img
          src={deck}
          alt="Plano de la nave Elysium con sus ocho sectores"
          className="ship-deck"
          draggable={false}
        />
        {SECTOR_IDS.map((id) => {
          const room = ROOMS[id]
          const tasks = tasksBySector.get(id) ?? []
          const open = tasks.filter((t) => t.status === 'open')
          const worst = open.some((t) => t.severity === 'critical')
            ? 'critical'
            : open.length
              ? 'urgent'
              : null
          return (
            <button
              key={id}
              type="button"
              className={`room-hotspot${worst ? ` has-${worst}` : ''}`}
              style={{
                left: room.x * scale,
                top: room.y * scale,
                width: room.w * scale,
                height: room.h * scale,
              }}
              onClick={() => navigate(`/sectors/${id}`)}
              aria-label={`${SECTORS[id].name}${open.length ? `: ${open.length} tarea(s) pendiente(s)` : ''}`}
            >
              <span className="room-label" title={SECTORS[id].name}>
                {MAP_LABELS[id]}
              </span>
              {open.length > 0 && <span className="room-alert">!</span>}
            </button>
          )
        })}
        {CREW_IDS.map((id) => {
          const crew = game.crew[id]
          const warned = crew.activity !== 'dead' && getWorkWarnings(crew).length > 0
          const status =
            crew.activity === 'rest' ? 'z' : crew.activity === 'medical' ? '+' : warned ? '!' : null
          return (
            <button
              key={id}
              type="button"
              ref={(el) => {
                nodes.current[id] = el
              }}
              className={`walker${selectedId === id ? ' is-selected' : ''}`}
              style={{ width: SPRITE * scale, height: SPRITE * scale }}
              onClick={() => onSelect(id)}
              aria-label={`${CREW[id].name}`}
              aria-pressed={selectedId === id}
            >
              <img className="walker-front" src={CREW_SPRITES[id].front} alt="" draggable={false} />
              <img className="walker-back" src={CREW_SPRITES[id].back} alt="" draggable={false} />
              {status && (
                <span
                  className={`walker-status status-${status === '!' ? 'warn' : status === '+' ? 'med' : 'sleep'}`}
                >
                  {status}
                </span>
              )}
              {selectedId === id && <span className="walker-name">{firstName(id)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
