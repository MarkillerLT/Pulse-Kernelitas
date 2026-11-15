import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
  type Mesh,
  type Sprite,
} from 'three'
import { useGame } from '../store/gameStore'
import { C } from './colors'
import { Label } from './kit'
import { glowTexture } from './proc'
import { sfxWarp } from './sfx'
import { useVrUi } from './vrUi'

/**
 * "Ver desde la cabina": the commander's seat in the nose of the Elysium. A static cockpit
 * (dashboard, canopy struts, rear bulkhead) surrounds the player and, through the canopy, stars
 * streak past at warp. The fixed frame around the player is deliberate: a stable reference
 * against the moving starfield is what keeps forward motion comfortable in a headset.
 *
 * The streaks are fully GPU-driven (one instanced quad per star, moved in the vertex shader), so
 * the effect costs a single draw call on the Quest.
 */

/** Current warp factor 0 (drifting) … 1 (full warp), eased; shared by the stars and the dash. */
const warp = { level: 0 }

const STAR_COUNT = 1400
const TUNNEL = 420
const EYE = 1.35

const starVertex = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aSeed;
  uniform float uDist;
  uniform float uStretch;
  uniform float uTunnel;
  varying float vAlong;
  varying float vFade;
  varying float vSeed;
  void main() {
    // Each star travels toward the player (+z) along the tunnel and wraps around far ahead.
    float z = -uTunnel + mod(aOffset.z + uDist * (0.8 + aSeed * 0.4), uTunnel + 30.0);
    float r = length(aOffset.xy);
    vec2 radial = aOffset.xy / r;
    vec2 tangent = vec2(-radial.y, radial.x);
    float width = r * 0.0035 + 0.01;
    float len = 0.15 + uStretch * (0.5 + aSeed);
    // position.x: -0.5..0.5 across the streak; position.y: -0.5 (head) .. 0.5 (tail).
    float along = position.y + 0.5;
    vec3 p = vec3(aOffset.xy + tangent * position.x * width, z - along * len);
    vAlong = along;
    vSeed = aSeed;
    vFade = smoothstep(-uTunnel, -uTunnel * 0.55, z) * (1.0 - smoothstep(-2.0, 25.0, z) * 0.85);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const starFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uWarp;
  varying float vAlong;
  varying float vFade;
  varying float vSeed;
  void main() {
    // Bright head, tail fading out; a few stars run bluer at warp.
    float a = min(1.0, (1.0 - vAlong) * vFade * 1.5);
    vec3 col = mix(vec3(1.0), uTint, uWarp * step(0.6, vSeed) * 0.8);
    gl_FragColor = vec4(col * a, a);
  }
`

function WarpStars() {
  const { geometry, material } = useMemo(() => {
    const quad = new PlaneGeometry(1, 1)
    const geo = new InstancedBufferGeometry()
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    geo.instanceCount = STAR_COUNT
    const offsets = new Float32Array(STAR_COUNT * 3)
    const seeds = new Float32Array(STAR_COUNT)
    let seed = 11
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < STAR_COUNT; i++) {
      const a = rand() * Math.PI * 2
      // Never closer than ~4 m to the line of travel: nothing flies through the cockpit.
      const r = 4 + Math.pow(rand(), 0.7) * 55
      offsets[i * 3] = Math.cos(a) * r
      offsets[i * 3 + 1] = Math.sin(a) * r
      offsets[i * 3 + 2] = rand() * TUNNEL
      seeds[i] = rand()
    }
    geo.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3))
    geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
    const mat = new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: {
        uDist: { value: 0 },
        uStretch: { value: 0 },
        uTunnel: { value: TUNNEL },
        uWarp: { value: 0 },
        uTint: { value: [0.55, 0.8, 1.0] },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { geometry: geo, material: mat }
  }, [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const mesh = useRef<Mesh>(null)
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    const w = warp.level
    const u = (m.material as ShaderMaterial).uniforms
    // Cruise ≈ 6 m/s (stars drifting by), full warp ≈ 320 m/s with long streaks.
    u.uDist.value += dt * (6 + w * w * 314)
    u.uStretch.value = w * w * 34
    u.uWarp.value = w
  })

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[0, EYE, 0]}
      frustumCulled={false}
      renderOrder={-1}
    />
  )
}

/** Soft glow far ahead, where the streaks come from; brightens with warp. */
function TunnelGlow() {
  const sprite = useRef<Sprite>(null)
  useFrame(() => {
    const s = sprite.current
    if (!s) return
    s.material.opacity = 0.08 + warp.level * 0.35
    const k = 60 + warp.level * 90
    s.scale.set(k, k, 1)
  })
  return (
    <sprite ref={sprite} position={[0, EYE, -380]}>
      <spriteMaterial
        map={glowTexture()}
        color="#8fc4ff"
        transparent
        opacity={0.1}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}

const HULL = '#2a303c'
const HULL_DARK = '#171b23'
const TRIM = '#3a4252'

/** Curved canopy rib from the window sill up over the head, at yaw `deg` from straight ahead. */
function Rib({ deg }: { deg: number }) {
  return (
    <group position={[0, 0.95, 0]} rotation={[0, Math.PI / 2 + (deg * Math.PI) / 180, 0]}>
      <mesh>
        <torusGeometry args={[1.75, 0.035, 8, 40, 1.95]} />
        <meshStandardMaterial color={TRIM} metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  )
}

/** A glowing screen on the dashboard. */
function Screen({
  position,
  rotation,
  size,
  color,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  size: [number, number]
  color: string
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
    </mesh>
  )
}

/** Live readouts on the dashboard: speed and route, refreshed a few times a second. */
function DashReadout() {
  const [speed, setSpeed] = useState(0)
  const acc = useRef(0)
  const pending = useGame((s) => s.game.tasks.filter((t) => t.status === 'open').length)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.2) return
    acc.current = 0
    setSpeed(Math.round((0.02 + warp.level * warp.level * 0.9) * 100) / 100)
  })
  const atWarp = speed > 0.5
  return (
    <group position={[0, 0.915, -0.62]} rotation={[-0.95, 0, 0]}>
      <Label world position={[-0.2, 0.06, 0.003]} size={0.022} color={C.muted} anchorX="center">
        VELOCIDAD
      </Label>
      <Label
        world
        bold
        position={[-0.2, 0.03, 0.003]}
        size={0.05}
        color={atWarp ? C.accent : C.text}
        anchorX="center"
      >
        {`${speed.toFixed(2)} c`}
      </Label>
      <Label world position={[0.2, 0.06, 0.003]} size={0.022} color={C.muted} anchorX="center">
        ESTADO
      </Label>
      <Label
        world
        bold
        position={[0.2, 0.025, 0.003]}
        size={0.026}
        color={pending ? C.warn : atWarp ? C.accent : C.good}
        anchorX="center"
      >
        {pending ? 'TAREA PENDIENTE' : atWarp ? 'HIPERVELOCIDAD' : 'CRUCERO'}
      </Label>
    </group>
  )
}

function Cabin() {
  return (
    <group>
      {/* Deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.9, 48]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.4} roughness={0.8} />
      </mesh>
      {/* Rear bulkhead: the cockpit is closed behind the commander. */}
      {/* (Cylinder angles start at +z, behind the player, so this arc is centred behind.) */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[1.9, 1.9, 2.7, 40, 1, true, -1.35, 2.7]} />
        <meshStandardMaterial color={HULL} side={BackSide} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Window sill: a ring at waist height around the front. */}
      <group position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh rotation={[0, 0, -Math.PI * 1.15]}>
          <torusGeometry args={[1.75, 0.05, 8, 48, Math.PI * 1.3]} />
          <meshStandardMaterial color={TRIM} metalness={0.6} roughness={0.45} />
        </mesh>
      </group>
      {/* Lower hull under the sill. */}
      <mesh position={[0, 0.475, 0]} rotation={[0, Math.PI * 0.35, 0]}>
        <cylinderGeometry args={[1.78, 1.78, 0.95, 40, 1, true, 0, Math.PI * 1.3]} />
        <meshStandardMaterial color={HULL} side={BackSide} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Canopy ribs; none straight ahead, so the view down the tunnel is clear. */}
      {[-70, -32, 32, 70].map((deg) => (
        <Rib key={deg} deg={deg} />
      ))}
      {/* Faint canopy glass. */}
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[1.74, 40, 20, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color="#9cc8ff"
          transparent
          opacity={0.035}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Dashboard in front, tilted toward the commander and kept below the line of sight. */}
      <group position={[0, 0, -0.62]}>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[1.25, 0.88, 0.3]} />
          <meshStandardMaterial color={HULL} metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.9, -0.02]} rotation={[-0.95, 0, 0]}>
          <boxGeometry args={[1.25, 0.34, 0.03]} />
          <meshStandardMaterial color={HULL_DARK} metalness={0.4} roughness={0.6} />
        </mesh>
        <Screen
          position={[-0.2, 0.915, -0.003]}
          rotation={[-0.95, 0, 0]}
          size={[0.34, 0.16]}
          color="#0d2236"
        />
        <Screen
          position={[0.2, 0.915, -0.003]}
          rotation={[-0.95, 0, 0]}
          size={[0.34, 0.16]}
          color="#0d2236"
        />
        {/* Rows of status lights. */}
        {Array.from({ length: 10 }, (_, i) => (
          <Screen
            key={i}
            position={[-0.5 + i * 0.111, 0.82, 0.136]}
            rotation={[-0.95, 0, 0]}
            size={[0.05, 0.016]}
            color={i % 4 === 0 ? C.warn : i % 3 === 0 ? C.good : C.accent}
          />
        ))}
      </group>
      <DashReadout />

      {/* Side consoles. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.95, 0, -0.25]} rotation={[0, -side * 0.6, 0]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.45, 0.72, 0.5]} />
            <meshStandardMaterial color={HULL} metalness={0.3} roughness={0.7} />
          </mesh>
          <Screen
            position={[0, 0.735, 0]}
            rotation={[-Math.PI / 2 + 0.4, 0, 0]}
            size={[0.36, 0.3]}
            color="#102033"
          />
        </group>
      ))}
      <pointLight position={[0, 1.05, -0.4]} intensity={0.6} distance={2.5} color="#7fc4ff" />
    </group>
  )
}

/**
 * Eases the warp factor toward the throttle setting. A pending task drops the ship out of warp
 * (the stars slow to a drift) so the commander notices before going back to the console.
 */
function WarpDrive() {
  const throttle = useVrUi((s) => s.throttle)
  const sound = useVrUi((s) => s.sound)
  const pending = useGame((s) => s.game.tasks.some((t) => t.status === 'open'))
  const target = throttle === 'warp' && !pending ? 1 : 0
  const prev = useRef<number | null>(null)

  useEffect(() => {
    if (prev.current !== null && target > prev.current && sound) sfxWarp()
    prev.current = target
  }, [target, sound])

  useEffect(() => {
    // Every visit starts at rest and jumps to warp: the jump is the show.
    warp.level = 0
    if (useVrUi.getState().sound && target) sfxWarp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, dt) => {
    const rate = target > warp.level ? 0.45 : 0.9
    const step = Math.min(1, dt * rate)
    warp.level += (target - warp.level) * step
    if (Math.abs(target - warp.level) < 0.001) warp.level = target
  })
  return null
}

export function Cockpit() {
  return (
    <>
      <WarpDrive />
      <WarpStars />
      <TunnelGlow />
      <Cabin />
    </>
  )
}
