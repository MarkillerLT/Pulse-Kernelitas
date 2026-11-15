import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group, type Mesh } from 'three'
import { CREW, firstName } from '../domain/content/crew'
import type { GameState } from '../domain/model/game'
import { HANGAR } from '../ui/ship/layout'
import { sfxLaunch, sfxReturn } from './sfx'
import { PLANET_POS, PX, toWorld } from './space'
import { useVrUi } from './vrUi'

const LAUNCH_DELAY = 0.8 // s: the team boards before lift-off
const LAUNCH_TIME = 8
const RETURN_TIME = 7
const CLIMB = 0.4 // m (diorama scale) straight up out of the hangar before heading out
const TRAIL = 12

interface Flight {
  kind: 'launch' | 'return'
  start: number
}

const bezier = (out: Vector3, a: Vector3, b: Vector3, c: Vector3, t: number) =>
  out
    .copy(a)
    .multiplyScalar((1 - t) * (1 - t))
    .addScaledVector(b, 2 * (1 - t) * t)
    .addScaledVector(c, t * t)

/** Mission tasks that are underway: the capsule is away while there is any. */
function activeMissions(game: GameState) {
  return game.tasks.filter((t) => t.kind === 'mission' && t.status === 'active')
}

/**
 * The exploration capsule. Docked in the hangar while no mission is underway; when the player
 * sends a team it lifts off, climbs out of the hangar and flies toward the planet on the horizon,
 * leaving a trail. When the mission ends it flies back and lands. Lives inside the ship group,
 * so it works the same on the tabletop diorama and life-size on board.
 */
export function MissionFx({ game }: { game: GameState }) {
  const capsule = useRef<Group>(null)
  const flame = useRef<Mesh>(null)
  const trail = useRef<(Mesh | null)[]>([])
  const flight = useRef<Flight | null>(null)
  const history = useRef<Vector3[]>([])
  const known = useRef<Map<string, string> | null>(null)
  const lastLogId = useRef<string | null>(game.log.at(-1)?.id ?? null)
  const showBanner = useVrUi((s) => s.showBanner)

  const away = activeMissions(game).length > 0

  // Detect launches and returns by diffing the missions underway.
  useEffect(() => {
    const now = new Map(activeMissions(game).map((t) => [t.id, t.title]))
    const before = known.current
    known.current = now
    // Log entries added since the last check (ids are strings, so find by position).
    const seen = game.log.findIndex((e) => e.id === lastLogId.current)
    const newLog = seen >= 0 ? game.log.slice(seen + 1) : game.log.slice(-5)
    lastLogId.current = game.log.at(-1)?.id ?? lastLogId.current
    if (!before) return // first render: missions already underway don't replay their launch
    const sound = useVrUi.getState().sound
    for (const [id, title] of now) {
      if (before.has(id)) continue
      const task = game.tasks.find((t) => t.id === id)
      const team = task?.assignment?.crewIds.map((c) => firstName(c)).join(', ') ?? ''
      flight.current = { kind: 'launch', start: performance.now() / 1000 + LAUNCH_DELAY }
      showBanner({
        kind: 'launch',
        title: `Despegue · ${title}`,
        text: team ? `Equipo a bordo de la cápsula: ${team}.` : 'La cápsula sale del hangar.',
        tone: 'info',
      })
      if (sound) window.setTimeout(sfxLaunch, LAUNCH_DELAY * 1000)
    }
    for (const [id, title] of before) {
      if (now.has(id)) continue
      const entry = [...newLog].reverse().find((e) => e.kind === 'mission')
      const success = entry?.severity === 'success'
      flight.current = { kind: 'return', start: performance.now() / 1000 }
      showBanner({
        kind: 'return',
        title: entry?.title ?? `Regreso · ${title}`,
        text: entry
          ? `${entry.text}${entry.crewIds.length ? ` (${entry.crewIds.map((c) => CREW[c].name).join(', ')})` : ''}`
          : 'La cápsula vuelve al hangar.',
        tone: success ? 'success' : 'critical',
      })
      if (sound) sfxReturn(success)
    }
  }, [game, showBanner])

  const [hx, hz] = toWorld(HANGAR)
  const dock = useRef(new Vector3(hx, 0.03, hz))
  const tmp = useRef({
    climb: new Vector3(),
    planet: new Vector3(),
    pos: new Vector3(),
    next: new Vector3(),
  })

  useFrame(() => {
    const c = capsule.current
    if (!c || !c.parent) return
    const v = tmp.current
    const t0 = flight.current
    const now = performance.now() / 1000
    let t = -1
    if (t0) {
      const span = t0.kind === 'launch' ? LAUNCH_TIME : RETURN_TIME
      t = (now - t0.start) / span
      if (t >= 1) {
        flight.current = null
        t = -1
      }
    }
    const flying = t >= 0
    const waiting = t0?.kind === 'launch' && !flying && now < t0.start
    c.visible = flying || waiting || (!away && !t0)
    if (flame.current) flame.current.visible = flying
    if (!flying) {
      c.position.copy(dock.current)
      c.rotation.set(0, Math.PI / 2, 0)
      history.current = []
      trail.current.forEach((m) => m && (m.visible = false))
      return
    }
    // Planet position in the ship's local space (the ship moves/scales with the view).
    c.parent.worldToLocal(v.planet.set(...PLANET_POS))
    v.climb.copy(dock.current).add(new Vector3(0, CLIMB, 0))
    // Launch accelerates away; the return decelerates into the hangar.
    const u = t0!.kind === 'launch' ? t * t : 1 - (1 - t) * (1 - t)
    const along = t0!.kind === 'launch' ? u : 1 - u
    const ahead = t0!.kind === 'launch' ? Math.min(1, along + 0.01) : Math.max(0, along - 0.01)
    bezier(v.pos, dock.current, v.climb, v.planet, along)
    bezier(v.next, dock.current, v.climb, v.planet, ahead)
    c.position.copy(v.pos)
    c.lookAt(c.parent.localToWorld(v.next.clone()))
    // Trail of fading puffs behind the capsule.
    history.current.unshift(v.pos.clone())
    history.current.length = Math.min(history.current.length, TRAIL * 3)
    trail.current.forEach((m, i) => {
      const p = history.current[i * 3]
      if (!m) return
      m.visible = !!p
      if (p) {
        m.position.copy(p)
        m.scale.setScalar(1 - i / TRAIL)
      }
    })
  })

  return (
    <>
      <group ref={capsule}>
        {/* Body points along +z so lookAt aims its nose along the flight path. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[7 * PX, 18 * PX, 6, 12]} />
          <meshStandardMaterial color="#d6dde6" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0, 3.2 * PX, 2 * PX]}>
          <boxGeometry args={[6 * PX, 2 * PX, 8 * PX]} />
          <meshStandardMaterial color="#1b2a44" emissive="#7fe3ff" emissiveIntensity={0.6} />
        </mesh>
        <mesh ref={flame} position={[0, 0, -16 * PX]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[5 * PX, 14 * PX, 12]} />
          <meshBasicMaterial color="#ffb547" transparent opacity={0.85} />
        </mesh>
      </group>
      {Array.from({ length: TRAIL }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            trail.current[i] = m
          }}
          visible={false}
        >
          <sphereGeometry args={[4 * PX, 8, 6]} />
          <meshBasicMaterial color="#ffd18a" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}
