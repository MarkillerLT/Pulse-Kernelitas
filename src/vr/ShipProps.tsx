import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { BEDS, HANGAR, MED_BEDS } from '../ui/ship/layout'
import { At, Ball, Box, Cyl, WALL_H } from './shipParts'
import { PX } from './space'

/**
 * Furniture and machinery per sector, all procedural. Positions come from the deck plan
 * (layout.ts) and leave the crew's standing spots and door paths clear.
 */

const METAL = '#8a95a3'
const DARK = '#2b333e'
const SCREEN = '#0d2236'

/** Console with an angled, glowing screen. */
function Console({
  x,
  y,
  rotY = 0,
  glow = '#3fb6ff',
}: {
  x: number
  y: number
  rotY?: number
  glow?: string
}) {
  return (
    <At p={{ x, y }}>
      <group rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.009, 0]}>
          <boxGeometry args={[7 * PX, 0.018, 12 * PX]} />
          <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[-1.2 * PX, 0.021, 0]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[6 * PX, 0.0015, 11 * PX]} />
          <meshStandardMaterial color={SCREEN} emissive={glow} emissiveIntensity={1.3} />
        </mesh>
      </group>
    </At>
  )
}

export function BridgeProps() {
  const holo = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (holo.current) holo.current.rotation.y += dt * 0.6
  })
  return (
    <>
      {/* Front arc of consoles facing the nose window. */}
      <Console x={377} y={96} rotY={-0.5} />
      <Console x={379} y={116} />
      <Console x={377} y={136} rotY={0.5} />
      {/* Side stations. */}
      <Console x={346} y={70} rotY={Math.PI / 2} glow="#c9f36b" />
      <Console x={346} y={154} rotY={-Math.PI / 2} glow="#c9f36b" />
      {/* Captain's chair. */}
      <Box p={{ x: 371, y: 116 }} w={7} d={7} h={0.01} y={0.006} color="#3a4452" metal={0.5} />
      <Box p={{ x: 367, y: 116 }} w={2} d={7} h={0.02} y={0.012} color="#3a4452" metal={0.5} />
      <Cyl p={{ x: 371, y: 116 }} r={1} h={0.006} color={METAL} metal={0.8} />
      {/* Holo table with a slowly turning hologram of the planet. */}
      <Cyl p={{ x: 357, y: 128 }} r={3} h={0.016} color={DARK} metal={0.6} />
      <Cyl
        p={{ x: 357, y: 128 }}
        r={5}
        h={0.002}
        y={0.016}
        color="#123"
        emissive="#5ad1ff"
        glow={1.6}
      />
      <At p={{ x: 357, y: 128 }} h={0.034}>
        <mesh ref={holo}>
          <sphereGeometry args={[3.2 * PX, 12, 8]} />
          <meshBasicMaterial color="#7fe3ff" wireframe transparent opacity={0.7} />
        </mesh>
      </At>
    </>
  )
}

function Reactor({ x, y }: { x: number; y: number }) {
  const rings = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (rings.current) rings.current.position.y = Math.sin(clock.elapsedTime * 1.4 + x) * 0.003
  })
  return (
    <>
      <Cyl p={{ x, y }} r={13} h={0.008} color={DARK} metal={0.7} rough={0.35} />
      <Cyl
        p={{ x, y }}
        r={9}
        h={0.056}
        y={0.008}
        color="#ffb070"
        emissive="#ff7a2e"
        glow={2}
        transparent
        opacity={0.88}
      />
      <Cyl p={{ x, y }} r={11} h={0.008} y={0.064} color={METAL} metal={0.85} rough={0.25} />
      <At p={{ x, y }}>
        <group ref={rings}>
          {[0.022, 0.038, 0.054].map((h) => (
            <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[10 * PX, 1 * PX, 8, 28]} />
              <meshStandardMaterial color="#ffd09a" emissive="#ffae4a" emissiveIntensity={1.6} />
            </mesh>
          ))}
        </group>
      </At>
    </>
  )
}

export function EngineeringProps() {
  const ring = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 1.5
  })
  return (
    <>
      <Reactor x={52} y={72} />
      <Reactor x={52} y={160} />
      {/* Plasma ring between the reactors. */}
      <Cyl p={{ x: 62, y: 116 }} r={4} h={0.012} color={DARK} metal={0.6} />
      <At p={{ x: 62, y: 116 }} h={0.034}>
        <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[12 * PX, 2.6 * PX, 10, 32]} />
          <meshStandardMaterial
            color="#806040"
            emissive="#ffb04a"
            emissiveIntensity={1.8}
            metalness={0.4}
          />
        </mesh>
      </At>
      {/* Coolant pipes from the reactors to the engines behind the bulkhead. */}
      {[72, 160].map((y) => (
        <At key={y} p={{ x: 30, y }} h={0.03}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[2 * PX, 2 * PX, 18 * PX, 10]} />
            <meshStandardMaterial color={METAL} metalness={0.85} roughness={0.25} />
          </mesh>
        </At>
      ))}
      {/* Manifold running along the bulkhead. */}
      <At p={{ x: 30, y: 116 }} h={0.03}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2 * PX, 2 * PX, 88 * PX, 10]} />
          <meshStandardMaterial color={METAL} metalness={0.85} roughness={0.25} />
        </mesh>
      </At>
      <Console x={100} y={56} rotY={Math.PI} glow="#ffb547" />
    </>
  )
}

function Bed({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <>
      <Box p={{ x, y }} w={11} d={19} h={0.008} y={0.003} color={METAL} metal={0.7} />
      <Box p={{ x, y: y + 1 }} w={10} d={16} h={0.005} y={0.011} color={color} rough={0.9} />
      <Box p={{ x, y: y - 7 }} w={8} d={4} h={0.005} y={0.015} color="#f2f4f7" rough={0.9} />
    </>
  )
}

export function MedicalProps() {
  return (
    <>
      {MED_BEDS.map((b, i) => (
        <group key={i}>
          <Bed x={b.x} y={b.y} color="#e7eef4" />
          {/* Monitor on a pole at the head of each bed. */}
          <Cyl p={{ x: b.x + 6, y: b.y - 9 }} r={0.6} h={0.03} color={METAL} metal={0.8} />
          <Box
            p={{ x: b.x + 6, y: b.y - 9 }}
            w={5}
            d={1}
            h={0.012}
            y={0.03}
            color={SCREEN}
            emissive="#3dffa8"
            glow={1.4}
          />
        </group>
      ))}
      {/* Red cross on the back wall. */}
      <Box
        p={{ x: 296, y: 199 }}
        w={8}
        d={1}
        h={0.006}
        y={WALL_H - 0.012}
        color="#ff4d5a"
        emissive="#ff2a3a"
        glow={1.6}
      />
      <Box
        p={{ x: 296, y: 199 }}
        w={2.6}
        d={1}
        h={0.02}
        y={WALL_H - 0.019}
        color="#ff4d5a"
        emissive="#ff2a3a"
        glow={1.6}
      />
      {/* Medicine cabinets. */}
      <Box p={{ x: 322, y: 146 }} w={6} d={14} h={0.035} color="#dfe6ec" rough={0.5} />
      <Box p={{ x: 270, y: 146 }} w={6} d={14} h={0.035} color="#dfe6ec" rough={0.5} />
    </>
  )
}

export function HangarProps({ away }: { away: boolean }) {
  const ring = away ? '#ffb547' : '#c9f36b'
  return (
    <>
      {/* Landing pad: dark disc, lit ring and corner beacons. */}
      <Cyl p={HANGAR} r={18} h={0.002} color="#1c2129" metal={0.5} />
      <At p={HANGAR} h={0.003}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[16 * PX, 0.8 * PX, 6, 40]} />
          <meshStandardMaterial color={ring} emissive={ring} emissiveIntensity={1.6} />
        </mesh>
      </At>
      {[
        [278, 38],
        [314, 38],
        [278, 74],
        [314, 74],
      ].map(([x, y]) => (
        <Cyl
          key={`${x}-${y}`}
          p={{ x, y }}
          r={1.4}
          h={0.006}
          color={ring}
          emissive={ring}
          glow={2}
        />
      ))}
      {/* Cargo crates. */}
      <Box p={{ x: 271, y: 32 }} w={7} d={7} h={0.014} color="#c27a2c" rough={0.8} />
      <Box p={{ x: 271, y: 32 }} w={5} d={5} h={0.01} y={0.014} color="#d58f3b" rough={0.8} />
      <Box p={{ x: 321, y: 32 }} w={7} d={9} h={0.012} color="#596577" rough={0.6} metal={0.4} />
    </>
  )
}

function Plant({ x, y, kind }: { x: number; y: number; kind: number }) {
  if (kind === 0)
    return (
      <At p={{ x, y }} h={0.02}>
        <mesh>
          <coneGeometry args={[3 * PX, 0.022, 8]} />
          <meshStandardMaterial color="#2f8f4a" roughness={0.8} />
        </mesh>
      </At>
    )
  if (kind === 1) return <Ball p={{ x, y }} r={3.2} y={0.016} color="#5fcf5a" rough={0.8} />
  return (
    <>
      <Ball p={{ x, y }} r={2.6} y={0.015} color="#3c9e48" rough={0.8} />
      <Ball p={{ x: x + 1.5, y: y - 1 }} r={1} y={0.02} color="#e2463c" rough={0.5} />
    </>
  )
}

export function GreenhouseProps() {
  const planters: { x: number; y: number; w: number }[] = [
    { x: 155, y: 38, w: 60 },
    { x: 132, y: 74, w: 22 },
    { x: 178, y: 74, w: 22 },
  ]
  return (
    <>
      {planters.map((pl, i) => (
        <group key={i}>
          <Box p={pl} w={pl.w} d={9} h={0.01} color="#5a3f2a" rough={0.9} />
          <Box p={pl} w={pl.w - 2} d={7} h={0.002} y={0.01} color="#3b2a1d" rough={1} />
          {Array.from({ length: Math.floor(pl.w / 6) }, (_, k) => (
            <Plant key={k} x={pl.x - pl.w / 2 + 3 + k * 6} y={pl.y} kind={(k + i) % 3} />
          ))}
          {/* Grow light hovering over the row. */}
          <Box
            p={pl}
            w={pl.w - 4}
            d={2}
            h={0.003}
            y={0.05}
            color="#f0c8ff"
            emissive="#c25bff"
            glow={2.2}
          />
        </group>
      ))}
      <Cyl
        p={{ x: 187, y: 62 }}
        r={4}
        h={0.04}
        color="#8fd3ff"
        emissive="#1c6fa8"
        glow={0.6}
        transparent
        opacity={0.7}
        rough={0.1}
      />
    </>
  )
}

export function CoreProps() {
  const ring = useRef<Group>(null)
  const ring2 = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ring.current) {
      ring.current.rotation.x += dt * 0.8
      ring.current.rotation.y += dt * 1.1
    }
    if (ring2.current) ring2.current.rotation.z -= dt * 0.7
  })
  return (
    <>
      <Cyl p={{ x: 229, y: 54 }} r={8} h={0.012} color={DARK} metal={0.7} />
      <At p={{ x: 229, y: 54 }} h={0.05}>
        <mesh>
          <sphereGeometry args={[6.5 * PX, 24, 18]} />
          <meshStandardMaterial color="#c4a8ff" emissive="#9b6bff" emissiveIntensity={2.2} />
        </mesh>
        <group ref={ring}>
          <mesh>
            <torusGeometry args={[11 * PX, 0.9 * PX, 8, 40]} />
            <meshStandardMaterial
              color="#e2d6ff"
              emissive="#9b6bff"
              emissiveIntensity={1.2}
              metalness={0.5}
            />
          </mesh>
        </group>
        <group ref={ring2}>
          <mesh rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[14 * PX, 0.6 * PX, 8, 40]} />
            <meshStandardMaterial color="#cfe9ff" emissive="#5ad1ff" emissiveIntensity={1.2} />
          </mesh>
        </group>
      </At>
      {/* Data columns in the corners. */}
      {[
        [205, 32],
        [253, 32],
        [205, 70],
        [253, 70],
      ].map(([x, y]) => (
        <group key={`${x}-${y}`}>
          <Box p={{ x, y }} w={5} d={5} h={0.04} color={DARK} metal={0.6} />
          <Box
            p={{ x, y: y + 2.6 }}
            w={1.4}
            d={0.4}
            h={0.032}
            y={0.004}
            color="#123"
            emissive="#c9f36b"
            glow={1.4}
          />
        </group>
      ))}
    </>
  )
}

export function HabitatProps() {
  return (
    <>
      {BEDS.map((b, i) => (
        <Bed
          key={i}
          x={b.x}
          y={b.y}
          color={['#5c6bc0', '#8e5ca8', '#3f8f86', '#c07a4a', '#4a7fc0'][i]}
        />
      ))}
      {/* Round table with stools. */}
      <Cyl p={{ x: 222, y: 178 }} r={1} h={0.012} color={METAL} metal={0.8} />
      <Cyl p={{ x: 222, y: 178 }} r={8} h={0.003} y={0.012} color="#d9d2c4" rough={0.5} />
      {[
        [212, 178],
        [232, 178],
        [222, 168],
        [222, 188],
      ].map(([x, y]) => (
        <Cyl key={`${x}-${y}`} p={{ x, y }} r={2.4} h={0.008} color="#6b5a7a" rough={0.7} />
      ))}
      {/* Lockers along the left wall and a potted plant. */}
      {[160, 172, 184].map((y) => (
        <Box
          key={y}
          p={{ x: 186, y }}
          w={5}
          d={10}
          h={0.038}
          color="#56657a"
          metal={0.5}
          rough={0.4}
        />
      ))}
      <Cyl p={{ x: 254, y: 194 }} r={2.4} h={0.01} color="#7a5236" />
      <Ball p={{ x: 254, y: 194 }} r={3.6} y={0.016} color="#4fbf4a" rough={0.8} />
    </>
  )
}

export function LifeSupportProps() {
  const fan = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (fan.current) fan.current.rotation.y += dt * 6
  })
  return (
    <>
      {[130, 164].map((x) => (
        <group key={x}>
          <Cyl p={{ x, y: 146 }} r={7} h={0.05} color="#4f88b0" metal={0.6} rough={0.3} />
          <Ball p={{ x, y: 146 }} r={7} y={0.05} color="#5c97c0" metal={0.6} rough={0.3} />
          <Cyl
            p={{ x, y: 146 }}
            r={7.2}
            h={0.004}
            y={0.03}
            color="#9fe7ff"
            emissive="#2a8cff"
            glow={1.8}
          />
        </group>
      ))}
      {/* Pipe between the tanks. */}
      <At p={{ x: 147, y: 146 }} h={0.035}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.6 * PX, 1.6 * PX, 20 * PX, 10]} />
          <meshStandardMaterial color={METAL} metalness={0.85} roughness={0.25} />
        </mesh>
      </At>
      {/* Air recycler with a spinning fan. */}
      <Box p={{ x: 168, y: 190 }} w={14} d={10} h={0.02} color="#45566a" metal={0.5} />
      <At p={{ x: 168, y: 190 }} h={0.021}>
        <mesh ref={fan}>
          <cylinderGeometry args={[4 * PX, 4 * PX, 0.002, 6]} />
          <meshStandardMaterial color="#cfd8e2" metalness={0.7} roughness={0.3} />
        </mesh>
      </At>
    </>
  )
}
