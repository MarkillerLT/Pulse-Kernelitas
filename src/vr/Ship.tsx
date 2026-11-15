import { useRef, useState, type ReactNode } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { DoubleSide, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { SECTOR_IDS, type SectorId } from '../domain/content/sectors'
import type { GameState } from '../domain/model/game'
import {
  BEDS,
  CORRIDOR,
  MED_BEDS,
  ROOMS,
  ROOM_LABELS,
  type Point,
  type Room,
} from '../ui/ship/layout'
import { C, SECTOR_FLOOR, SEVERITY_COLOR } from './colors'
import { Label } from './kit'
import { PX, toWorld } from './space'
import { useVrUi } from './vrUi'
import { MissionFx } from './MissionFx'

/**
 * The Elysium as a procedural diorama: every mesh is a primitive (boxes, cylinders, spheres),
 * so there are no model files to make or load. Each sector gets a few props that say what the
 * room is at a glance. To swap in real models later, replace a `<…Props />` component with a
 * <Gltf src="…" /> placed at the same spot.
 */

const WALL_H = 0.045
const WALL_T = 2 // px
const DOOR = 16 // px gap

/** Places children at a map point, `h` metres above the floor. */
function At({ p, h = 0, children }: { p: Point; h?: number; children: ReactNode }) {
  const [x, z] = toWorld(p)
  return <group position={[x, h, z]}>{children}</group>
}

function Box({
  p,
  w,
  d,
  h,
  y = 0,
  color,
  emissive,
}: {
  p: Point
  w: number
  d: number
  h: number
  y?: number
  color: string
  emissive?: string
}) {
  return (
    <At p={p} h={y + h / 2}>
      <mesh>
        <boxGeometry args={[w * PX, h, d * PX]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive ?? '#000'}
          emissiveIntensity={emissive ? 1.2 : 0}
          roughness={0.7}
        />
      </mesh>
    </At>
  )
}

function Cyl({
  p,
  r,
  h,
  y = 0,
  color,
  emissive,
}: {
  p: Point
  r: number
  h: number
  y?: number
  color: string
  emissive?: string
}) {
  return (
    <At p={p} h={y + h / 2}>
      <mesh>
        <cylinderGeometry args={[r * PX, r * PX, h, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive ?? '#000'}
          emissiveIntensity={emissive ? 1.2 : 0}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
    </At>
  )
}

/** Wall segments of a room as [x1, y1, x2, y2] in px, with a gap at the door. */
function wallSegments(r: Room): [number, number, number, number][] {
  const { x, y, w, h, door, doorWall } = r
  const sides = {
    top: [x, y, x + w, y],
    bottom: [x, y + h, x + w, y + h],
    left: [x, y, x, y + h],
    right: [x + w, y, x + w, y + h],
  } as const
  const out: [number, number, number, number][] = []
  for (const [side, [x1, y1, x2, y2]] of Object.entries(sides)) {
    if (side !== doorWall) {
      out.push([x1, y1, x2, y2])
      continue
    }
    if (y1 === y2) {
      out.push([x1, y1, door.x - DOOR / 2, y2], [door.x + DOOR / 2, y1, x2, y2])
    } else {
      out.push([x1, y1, x2, door.y - DOOR / 2], [x1, door.y + DOOR / 2, x2, y2])
    }
  }
  return out
}

function Walls({ room }: { room: Room }) {
  return (
    <>
      {wallSegments(room).map(([x1, y1, x2, y2], i) => {
        const horizontal = y1 === y2
        const len = horizontal ? x2 - x1 : y2 - y1
        if (len <= 0) return null
        return (
          <Box
            key={i}
            p={{ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }}
            w={horizontal ? len + WALL_T : WALL_T}
            d={horizontal ? WALL_T : len + WALL_T}
            h={WALL_H}
            color={C.wall}
          />
        )
      })}
    </>
  )
}

function Floor({ room, alert }: { room: Room; alert: keyof typeof SEVERITY_COLOR | null }) {
  const filterSector = useVrUi((s) => s.filterSector)
  const filtered = useVrUi((s) => s.sectorFilter === room.id)
  const [hover, setHover] = useState(false)
  const mat = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (!mat.current) return
    const pulse = alert
      ? 0.35 + 0.25 * Math.sin(clock.elapsedTime * (alert === 'critical' ? 6 : 3))
      : 0
    mat.current.emissiveIntensity = (hover || filtered ? 0.25 : 0) + pulse
  })
  return (
    <At p={{ x: room.x + room.w / 2, y: room.y + room.h / 2 }} h={0.002}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          filterSector(room.id)
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[room.w * PX, 0.004, room.h * PX]} />
        <meshStandardMaterial
          ref={mat}
          color={SECTOR_FLOOR[room.id]}
          emissive={alert ? SEVERITY_COLOR[alert] : C.accent}
          emissiveIntensity={0}
          roughness={0.9}
        />
      </mesh>
    </At>
  )
}

function AlertMarker({ room, severity }: { room: Room; severity: keyof typeof SEVERITY_COLOR }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.13 + Math.sin(clock.elapsedTime * 3) * 0.01
  })
  return (
    <At p={{ x: room.x + room.w / 2, y: room.y + room.h / 2 }}>
      <group ref={ref}>
        <Billboard>
          <mesh>
            <circleGeometry args={[0.022, 24]} />
            <meshBasicMaterial color={SEVERITY_COLOR[severity]} />
          </mesh>
          <Label
            world
            position={[0, 0.002, 0.001]}
            size={0.032}
            anchorX="center"
            anchorY="middle"
            color="#0b0f17"
            bold
          >
            !
          </Label>
        </Billboard>
      </group>
    </At>
  )
}

function RoomLabel({ room }: { room: Room }) {
  return (
    <At p={{ x: room.x + room.w / 2, y: room.y + 8 }} h={WALL_H + 0.015}>
      <Billboard>
        <Label world size={0.018} anchorX="center" anchorY="middle" color={C.muted}>
          {ROOM_LABELS[room.id]}
        </Label>
      </Billboard>
    </At>
  )
}

/* ---------- Sector props ---------- */

function BridgeProps() {
  const r = ROOMS.armstrong
  return (
    <>
      <Box
        p={{ x: r.x + r.w - 10, y: 116 }}
        w={8}
        d={60}
        h={0.03}
        color="#34445e"
        emissive="#1d6fa8"
      />
      <Box p={{ x: 352, y: 92 }} w={10} d={8} h={0.022} color="#3a475e" emissive="#2fb7ff" />
      <Box p={{ x: 352, y: 140 }} w={10} d={8} h={0.022} color="#3a475e" emissive="#2fb7ff" />
      <Cyl p={{ x: 358, y: 116 }} r={5} h={0.02} color="#59657d" />
    </>
  )
}

function EngineeringProps() {
  const ring = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 1.5
  })
  return (
    <>
      <Cyl p={{ x: 52, y: 72 }} r={13} h={0.07} color="#5b4a3a" emissive="#ff7a2e" />
      <Cyl p={{ x: 52, y: 160 }} r={13} h={0.07} color="#5b4a3a" emissive="#ff7a2e" />
      <At p={{ x: 66, y: 116 }} h={0.035}>
        <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[14 * PX, 3 * PX, 8, 24]} />
          <meshStandardMaterial color="#806040" emissive="#ffb04a" emissiveIntensity={1.5} />
        </mesh>
      </At>
    </>
  )
}

function MedicalProps() {
  return (
    <>
      {MED_BEDS.map((b, i) => (
        <Box key={i} p={b} w={12} d={20} h={0.014} color="#d9e3ea" />
      ))}
      <Box p={{ x: 296, y: 140 }} w={14} d={4} h={0.035} color="#2c3a3e" emissive="#3dffa8" />
    </>
  )
}

function HangarProps({ away }: { away: boolean }) {
  return (
    <>
      <Box
        p={{ x: 296, y: 60 }}
        w={40}
        d={40}
        h={0.003}
        color="#3d4352"
        emissive={away ? '#ffb547' : undefined}
      />
    </>
  )
}

function GreenhouseProps() {
  const planters = [
    { x: 132, y: 44 },
    { x: 155, y: 44 },
    { x: 178, y: 44 },
    { x: 132, y: 74 },
    { x: 178, y: 74 },
  ]
  return (
    <>
      {planters.map((p, i) => (
        <group key={i}>
          <Box p={p} w={16} d={10} h={0.012} color="#5a3f2a" />
          <At p={p} h={0.022}>
            <mesh>
              <sphereGeometry args={[6 * PX, 10, 8]} />
              <meshStandardMaterial color="#4fbf4a" roughness={0.8} />
            </mesh>
          </At>
        </group>
      ))}
    </>
  )
}

function CoreProps() {
  const ring = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ring.current) {
      ring.current.rotation.x += dt * 0.8
      ring.current.rotation.y += dt * 1.1
    }
  })
  return (
    <At p={{ x: 229, y: 54 }} h={0.05}>
      <mesh>
        <sphereGeometry args={[7 * PX, 20, 16]} />
        <meshStandardMaterial color="#b18cff" emissive="#9b6bff" emissiveIntensity={2} />
      </mesh>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[12 * PX, 1.2 * PX, 8, 32]} />
          <meshStandardMaterial color="#d8c8ff" emissive="#9b6bff" emissiveIntensity={1} />
        </mesh>
      </group>
      <pointLight color="#9b6bff" intensity={0.15} distance={0.4} />
    </At>
  )
}

function HabitatProps() {
  return (
    <>
      {BEDS.map((b, i) => (
        <Box key={i} p={b} w={10} d={14} h={0.012} color="#6b5a7a" />
      ))}
      <Cyl p={{ x: 222, y: 178 }} r={9} h={0.016} color="#7d6a8c" />
    </>
  )
}

function LifeSupportProps() {
  return (
    <>
      <Cyl p={{ x: 130, y: 146 }} r={7} h={0.06} color="#3c6d8f" emissive="#2a8cff" />
      <Cyl p={{ x: 164, y: 146 }} r={7} h={0.06} color="#3c6d8f" emissive="#2a8cff" />
      <Box p={{ x: 147, y: 176 }} w={30} d={8} h={0.02} color="#45566a" />
    </>
  )
}

/* ---------- Hull ---------- */

function Hull() {
  const minX = 14
  const maxX = 390
  const minY = 18
  const maxY = 206
  return (
    <>
      <Box
        p={{ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }}
        w={maxX - minX}
        d={maxY - minY}
        h={0.03}
        y={-0.03}
        color={C.hull}
      />
      <Box
        p={{ x: CORRIDOR.x + CORRIDOR.w / 2, y: CORRIDOR.y + CORRIDOR.h / 2 }}
        w={CORRIDOR.w}
        d={CORRIDOR.h}
        h={0.003}
        color={C.corridor}
      />
      {/* Nose past the bridge. */}
      <At p={{ x: maxX + 22, y: 112 }} h={-0.015}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[60 * PX, 44 * PX, 4, 1]} />
          <meshStandardMaterial color={C.hull} roughness={0.6} metalness={0.3} />
        </mesh>
      </At>
      {/* Engines behind engineering. */}
      {[64, 112, 160].map((y) => (
        <At key={y} p={{ x: minX - 10, y }} h={-0.015}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[11 * PX, 15 * PX, 20 * PX, 16]} />
            <meshStandardMaterial color={C.hullDark} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[-10.5 * PX, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[14 * PX, 16]} />
            <meshBasicMaterial color="#5ad1ff" side={DoubleSide} />
          </mesh>
        </At>
      ))}
    </>
  )
}

export function Ship({ game }: { game: GameState }) {
  const away = Object.values(game.crew).some((c) => c.activity === 'mission')
  const worst = new Map<SectorId, keyof typeof SEVERITY_COLOR>()
  for (const t of game.tasks) {
    if (t.status !== 'open') continue
    const prev = worst.get(t.sectorId)
    const rank = { critical: 0, urgent: 1, routine: 2 }
    if (!prev || rank[t.severity] < rank[prev]) worst.set(t.sectorId, t.severity)
  }
  return (
    <group>
      <Hull />
      {SECTOR_IDS.map((id) => (
        <group key={id}>
          <Floor room={ROOMS[id]} alert={worst.get(id) ?? null} />
          <Walls room={ROOMS[id]} />
          <RoomLabel room={ROOMS[id]} />
          {worst.has(id) && <AlertMarker room={ROOMS[id]} severity={worst.get(id)!} />}
        </group>
      ))}
      <BridgeProps />
      <EngineeringProps />
      <MedicalProps />
      <HangarProps away={away} />
      <MissionFx game={game} />
      <GreenhouseProps />
      <CoreProps />
      <HabitatProps />
      <LifeSupportProps />
    </group>
  )
}
