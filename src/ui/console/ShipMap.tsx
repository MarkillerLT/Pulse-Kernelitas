import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { CREW, CREW_IDS, firstName, type CrewId } from '../../domain/content/crew'
import { SECTORS, SECTOR_IDS, type SectorId } from '../../domain/content/sectors'
import type { GameState } from '../../domain/model/game'
import { getWorkWarnings } from '../../domain/rules/availability'
import deck from '../../assets/ship/elysium-deck.png'
import { CREW_SPRITES } from '../sprites'
import { MAP_HEIGHT, MAP_WIDTH, ROOMS, ROOM_LABELS } from '../ship/layout'
import { createWalker, crewTargets, stepWalker, type Walker } from '../ship/motion'

const SPRITE = 14
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
        const w = (walkers.current[id] ??= createWalker(target, now))
        stepWalker(w, target, now, dt, reducedMotion)
        const walking = w.walking
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
                {ROOM_LABELS[id]}
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
