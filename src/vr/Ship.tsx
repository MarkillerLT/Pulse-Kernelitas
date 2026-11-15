import { useMemo, useRef, useState } from 'react'
import { Billboard, RoundedBox } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import {
  AdditiveBlending,
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three'
import { SECTOR_IDS, type SectorId } from '../domain/content/sectors'
import type { GameState } from '../domain/model/game'
import { CORRIDOR, ROOMS, ROOM_LABELS, type Point, type Room } from '../ui/ship/layout'
import { C, SECTOR_FLOOR, SEVERITY_COLOR } from './colors'
import { Label } from './kit'
import { MissionFx } from './MissionFx'
import { floorTexture, glowTexture, hullTexture, solarTexture } from './proc'
import { At, WALL_H } from './shipParts'
import { PX } from './space'
import {
  BridgeProps,
  CoreProps,
  EngineeringProps,
  GreenhouseProps,
  HabitatProps,
  HangarProps,
  LifeSupportProps,
  MedicalProps,
} from './ShipProps'
import { useVrUi } from './vrUi'

/**
 * The Elysium, built procedurally from the deck plan: hull with riveted plates, lit rim and
 * windows, a glazed nose, solar wings, an antenna, engines with flickering exhaust, and open-top
 * rooms with grated floors and light strips (props per sector live in ShipProps). No model files,
 * so nothing to download. In the on-board view room names and alerts are hidden, so the player
 * can just look around.
 */

const WALL_T = 2.4 // px
const DOOR = 16 // px gap
const HULL = { minX: 14, maxX: 390, minY: 18, maxY: 206 }

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
    if (y1 === y2) out.push([x1, y1, door.x - DOOR / 2, y2], [door.x + DOOR / 2, y1, x2, y2])
    else out.push([x1, y1, x2, door.y - DOOR / 2], [x1, door.y + DOOR / 2, x2, y2])
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
        const w = (horizontal ? len + WALL_T : WALL_T) * PX
        const d = (horizontal ? WALL_T : len + WALL_T) * PX
        return (
          <At key={i} p={{ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }}>
            <mesh position={[0, WALL_H / 2, 0]}>
              <boxGeometry args={[w, WALL_H, d]} />
              <meshStandardMaterial color="#5b6678" metalness={0.45} roughness={0.45} />
            </mesh>
            {/* Light strip along the top of the wall. */}
            <mesh position={[0, WALL_H + 0.0012, 0]}>
              <boxGeometry args={[w * 0.98, 0.0024, d * 0.6]} />
              <meshStandardMaterial color="#cfefff" emissive="#7fd8ff" emissiveIntensity={1.4} />
            </mesh>
          </At>
        )
      })}
    </>
  )
}

function Floor({
  room,
  alert,
  interactive,
}: {
  room: Room
  alert: keyof typeof SEVERITY_COLOR | null
  interactive: boolean
}) {
  const filterSector = useVrUi((s) => s.filterSector)
  const filtered = useVrUi((s) => s.sectorFilter === room.id)
  const [hover, setHover] = useState(false)
  const mat = useRef<MeshStandardMaterial>(null)
  const map = useMemo(() => {
    const t = floorTexture().clone()
    t.repeat.set((room.w * PX) / 0.03, (room.h * PX) / 0.03)
    t.needsUpdate = true
    return t
  }, [room])
  useFrame(({ clock }) => {
    if (!mat.current) return
    const pulse = alert
      ? 0.3 + 0.22 * Math.sin(clock.elapsedTime * (alert === 'critical' ? 6 : 3))
      : 0
    mat.current.emissiveIntensity = (interactive && (hover || filtered) ? 0.22 : 0) + pulse
  })
  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          filterSector(room.id)
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover(true)
        },
        onPointerOut: () => setHover(false),
      }
    : {}
  return (
    <At p={{ x: room.x + room.w / 2, y: room.y + room.h / 2 }} h={0.002}>
      <mesh {...handlers}>
        <boxGeometry args={[room.w * PX, 0.004, room.h * PX]} />
        <meshStandardMaterial
          ref={mat}
          map={map}
          color={SECTOR_FLOOR[room.id]}
          emissive={alert ? SEVERITY_COLOR[alert] : C.accent}
          emissiveIntensity={0}
          metalness={0.3}
          roughness={0.75}
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

/* ---------- Hull ---------- */

function Engine({ y }: { y: number }) {
  const flame = useRef<Mesh>(null)
  const glow = useRef<Mesh>(null)
  const seed = y * 0.37
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 18 + seed
    const flicker = 0.85 + Math.sin(t) * 0.08 + Math.sin(t * 2.3) * 0.06
    if (flame.current) flame.current.scale.set(1, flicker, 1)
    if (glow.current) (glow.current.material as MeshBasicMaterial).opacity = 0.55 * flicker
  })
  return (
    <At p={{ x: HULL.minX - 12, y }} h={-0.012}>
      {/* Nacelle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[11 * PX, 15 * PX, 26 * PX, 20]} />
        <meshStandardMaterial color="#2c3440" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[4 * PX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[13 * PX, 1.4 * PX, 8, 24]} />
        <meshStandardMaterial color="#8892a0" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Exhaust: hot core plus a soft glow. */}
      <mesh ref={flame} position={[-22 * PX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[10 * PX, 28 * PX, 16, 1, true]} />
        <meshBasicMaterial
          color="#8fe6ff"
          transparent
          opacity={0.75}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={glow} position={[-14 * PX, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[46 * PX, 46 * PX]} />
        <meshBasicMaterial
          map={glowTexture()}
          color="#9fe9ff"
          transparent
          opacity={0.5}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </At>
  )
}

function SolarWing({ side }: { side: 1 | -1 }) {
  const edge = side === 1 ? HULL.maxY : HULL.minY
  const map = useMemo(() => {
    const t = solarTexture().clone()
    t.repeat.set(6, 2)
    t.needsUpdate = true
    return t
  }, [])
  return (
    <At p={{ x: 225, y: edge }} h={-0.01}>
      {/* Truss */}
      <mesh position={[0, 0, side * 22 * PX]}>
        <boxGeometry args={[4 * PX, 4 * PX, 44 * PX]} />
        <meshStandardMaterial color="#7d8794" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh
          key={k}
          position={[k * 36 * PX, 0, side * 32 * PX]}
          rotation={[-Math.PI / 2 + side * 0.18, 0, 0]}
        >
          <planeGeometry args={[64 * PX, 30 * PX]} />
          <meshStandardMaterial
            map={map}
            color="#9db7e6"
            metalness={0.6}
            roughness={0.25}
            side={DoubleSide}
            emissive="#0c1f44"
          />
        </mesh>
      ))}
    </At>
  )
}

function NavLight({ p, color, phase }: { p: Point; color: string; phase: number }) {
  const ref = useRef<MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.opacity = (Math.sin(clock.elapsedTime * 3 + phase) + 1) / 2
  })
  return (
    <At p={p} h={0.006}>
      <mesh>
        <sphereGeometry args={[2.2 * PX, 10, 8]} />
        <meshBasicMaterial ref={ref} color={color} transparent />
      </mesh>
    </At>
  )
}

function Antenna() {
  const dish = useRef<Group>(null)
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 0.4
  })
  return (
    <At p={{ x: 360, y: HULL.minY + 8 }}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.8 * PX, 0.8 * PX, 0.06, 8]} />
        <meshStandardMaterial color="#9aa4b1" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={dish} position={[0, 0.06, 0]}>
        <mesh rotation={[-0.9, 0, 0]}>
          <sphereGeometry args={[9 * PX, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
          <meshStandardMaterial
            color="#d7dde4"
            metalness={0.5}
            roughness={0.35}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </At>
  )
}

function Corridor() {
  const strip = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (strip.current) strip.current.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 2) * 0.3
  })
  return (
    <At p={{ x: CORRIDOR.x + CORRIDOR.w / 2, y: CORRIDOR.y + CORRIDOR.h / 2 }} h={0.0015}>
      <mesh>
        <boxGeometry args={[CORRIDOR.w * PX, 0.003, CORRIDOR.h * PX]} />
        <meshStandardMaterial color="#2a3341" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0018, 0]}>
        <boxGeometry args={[CORRIDOR.w * PX * 0.96, 0.0006, 1.2 * PX]} />
        <meshStandardMaterial ref={strip} color="#bff" emissive="#5ad1ff" emissiveIntensity={0.8} />
      </mesh>
    </At>
  )
}

function Hull() {
  const { minX, maxX, minY, maxY } = HULL
  const w = (maxX - minX) * PX
  const d = (maxY - minY) * PX
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const plates = useMemo(() => {
    const t = hullTexture().clone()
    t.repeat.set(10, 5)
    t.needsUpdate = true
    return t
  }, [])
  // Rim pieces: centre, size along x, size along z (metres).
  const rim: [Point, number, number][] = [
    [{ x: cx, y: minY }, w, 2 * PX],
    [{ x: cx, y: maxY }, w, 2 * PX],
    [{ x: minX, y: cy }, 2 * PX, d],
    [{ x: maxX, y: cy }, 2 * PX, d],
  ]
  const windows: Point[] = []
  for (let x = 40; x < 360; x += 14) windows.push({ x, y: minY - 0.5 }, { x, y: maxY + 0.5 })
  return (
    <>
      {/* Main slab with riveted plates, and a darker keel underneath. */}
      <At p={{ x: cx, y: cy }} h={-0.018}>
        <RoundedBox args={[w, 0.034, d]} radius={0.012} smoothness={3}>
          <meshStandardMaterial map={plates} color="#aab4c2" metalness={0.55} roughness={0.42} />
        </RoundedBox>
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[w * 0.86, 0.03, d * 0.7]} />
          <meshStandardMaterial color="#232a33" metalness={0.6} roughness={0.5} />
        </mesh>
      </At>
      {/* Raised rim around the deck with a mint light line, like the landing's accents. */}
      {rim.map(([p, rw, rd], i) => (
        <At key={i} p={p} h={0.004}>
          <mesh>
            <boxGeometry args={[rw, 0.008, rd]} />
            <meshStandardMaterial color="#3a4452" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.0045, 0]}>
            <boxGeometry
              args={rw > rd ? [rw * 0.99, 0.001, 0.6 * PX] : [0.6 * PX, 0.001, rd * 0.99]}
            />
            <meshBasicMaterial color={C.accent} />
          </mesh>
        </At>
      ))}
      {/* Rows of lit windows along both flanks. */}
      {windows.map((p, i) => (
        <At key={i} p={p} h={-0.012}>
          <mesh>
            <boxGeometry args={[6 * PX, 0.008, 1 * PX]} />
            <meshStandardMaterial color="#fff2c8" emissive="#ffd98a" emissiveIntensity={1.6} />
          </mesh>
        </At>
      ))}
      <Corridor />
      {/* Nose with a glazed cockpit past the bridge. */}
      <At p={{ x: maxX + 20, y: cy }} h={-0.012}>
        {/* Local x becomes vertical after the rotation: flatten it so the nose is a low wedge. */}
        <mesh rotation={[0, 0, -Math.PI / 2]} scale={[0.09, 1, 1]}>
          <coneGeometry args={[d / 2 + 0.002, 46 * PX, 24, 1]} />
          <meshStandardMaterial map={plates} color="#aab4c2" metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[-8 * PX, 0.012, 0]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[18 * PX, 0.004, 52 * PX]} />
          <meshStandardMaterial
            color="#1d3b5c"
            metalness={0.9}
            roughness={0.05}
            emissive="#2a7bd1"
            emissiveIntensity={0.5}
          />
        </mesh>
      </At>
      {[64, 112, 160].map((y) => (
        <Engine key={y} y={y} />
      ))}
      <SolarWing side={1} />
      <SolarWing side={-1} />
      <Antenna />
      <NavLight p={{ x: maxX + 4, y: minY + 4 }} color="#ff4d4d" phase={0} />
      <NavLight p={{ x: maxX + 4, y: maxY - 4 }} color="#4dff88" phase={Math.PI} />
      <NavLight p={{ x: minX + 2, y: cy }} color="#ffffff" phase={1.5} />
    </>
  )
}

export function Ship({ game }: { game: GameState }) {
  // On board the player just looks around: no labels, alerts or clickable floors.
  const showInfo = useVrUi((s) => s.view.mode !== 'onboard')
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
          <Floor
            room={ROOMS[id]}
            alert={showInfo ? (worst.get(id) ?? null) : null}
            interactive={showInfo}
          />
          <Walls room={ROOMS[id]} />
          {showInfo && <RoomLabel room={ROOMS[id]} />}
          {showInfo && worst.has(id) && <AlertMarker room={ROOMS[id]} severity={worst.get(id)!} />}
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
