import { useLayoutEffect, useRef } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { CREW_IDS, firstName, type CrewId } from '../domain/content/crew'
import type { GameState } from '../domain/model/game'
import { getWorkWarnings } from '../domain/rules/availability'
import { createWalker, crewTargets, stepWalker, type Target, type Walker } from '../ui/ship/motion'
import { C, CREW_COLORS } from './colors'
import { Label } from './kit'
import { toWorld } from './space'
import { useVrUi } from './vrUi'

/**
 * The five crew members as procedural astronauts: white suit with their colour on arms and
 * legs, helmet with a gold reflective visor and a backpack. Arms and legs swing while they walk;
 * resting or in the infirmary they lie down. Walking reuses the 2D map's motion module, so both
 * views agree on where everyone is. Transforms are written each frame without React renders.
 */

const SUIT = '#e9edf2'
const HIP_Y = 0.02
const SHOULDER_Y = 0.039
const HEAD_Y = 0.053

function Limb({
  limb,
  x,
  y,
  radius,
  length,
  color,
}: {
  limb: (g: Group | null) => void
  x: number
  y: number
  radius: number
  length: number
  color: string
}) {
  return (
    <group ref={limb} position={[x, y, 0]}>
      <mesh position={[0, -length / 2 - radius * 0.6, 0]}>
        <capsuleGeometry args={[radius, length, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  )
}

function Astronaut({ id, game, target }: { id: CrewId; game: GameState; target: Target }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const limbs = useRef<{
    legL?: Group | null
    legR?: Group | null
    armL?: Group | null
    armR?: Group | null
  }>({})
  const walker = useRef<Walker | null>(null)
  const targetRef = useRef(target)
  useLayoutEffect(() => {
    targetRef.current = target
  })
  const selected = useVrUi((s) => s.selectedCrew === id)
  const showInfo = useVrUi((s) => s.view.mode !== 'onboard')
  const crew = game.crew[id]
  const lying = crew.activity === 'rest' || crew.activity === 'medical'
  const warned = crew.activity !== 'dead' && getWorkWarnings(crew).length > 0
  const status =
    crew.activity === 'rest' ? 'z' : crew.activity === 'medical' ? '+' : warned ? '!' : null
  const reducedMotion = game.settings.reducedMotion

  useFrame(({ clock }, delta) => {
    const now = performance.now()
    const dt = Math.min(0.1, delta)
    const w = (walker.current ??= createWalker(targetRef.current, now))
    stepWalker(w, targetRef.current, now, dt, reducedMotion)
    const g = root.current
    const b = body.current
    if (!g || !b) return
    const [x, z] = toWorld(w.pos)
    g.position.set(x, 0, z)
    g.visible = !w.hidden
    // Map heading is atan2(dy, dx) with +y toward the player (= +z); three's Y rotation 0
    // faces +z, so convert.
    g.rotation.y = Math.PI / 2 - w.heading
    const restPose = lying && !w.walking && !w.path.length
    b.rotation.z = restPose ? Math.PI / 2 : 0
    const t = clock.elapsedTime * 11
    const walking = w.walking && !reducedMotion
    const swing = walking ? Math.sin(t) * 0.7 : 0
    b.position.y = restPose ? 0.018 : walking ? Math.abs(Math.sin(t)) * 0.002 : 0
    const { legL, legR, armL, armR } = limbs.current
    if (legL) legL.rotation.x = swing
    if (legR) legR.rotation.x = -swing
    if (armL) armL.rotation.x = -swing * 0.8
    if (armR) armR.rotation.x = swing * 0.8
    // Idle: a slow breath so nobody looks frozen.
    if (!walking && !restPose) b.scale.y = 1 + Math.sin(clock.elapsedTime * 1.6 + x * 40) * 0.012
    else b.scale.y = 1
  })

  const color = CREW_COLORS[id]
  return (
    <group ref={root}>
      <group ref={body}>
        <Limb
          limb={(l) => (limbs.current.legL = l)}
          x={0.0055}
          y={HIP_Y}
          radius={0.0045}
          length={0.011}
          color={color}
        />
        <Limb
          limb={(l) => (limbs.current.legR = l)}
          x={-0.0055}
          y={HIP_Y}
          radius={0.0045}
          length={0.011}
          color={color}
        />
        {/* Torso, belt and chest panel. */}
        <mesh position={[0, 0.031, 0]}>
          <capsuleGeometry args={[0.0095, 0.008, 4, 12]} />
          <meshStandardMaterial color={SUIT} roughness={0.5} />
        </mesh>
        <mesh position={[0, HIP_Y + 0.002, 0]}>
          <cylinderGeometry args={[0.0098, 0.0098, 0.003, 14]} />
          <meshStandardMaterial color="#5a6372" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.034, 0.009]}>
          <boxGeometry args={[0.008, 0.006, 0.002]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        <Limb
          limb={(l) => (limbs.current.armL = l)}
          x={0.0125}
          y={SHOULDER_Y}
          radius={0.0034}
          length={0.012}
          color={color}
        />
        <Limb
          limb={(l) => (limbs.current.armR = l)}
          x={-0.0125}
          y={SHOULDER_Y}
          radius={0.0034}
          length={0.012}
          color={color}
        />
        {/* Helmet with a gold, reflective visor. */}
        <mesh position={[0, HEAD_Y, 0]}>
          <sphereGeometry args={[0.0105, 20, 14]} />
          <meshStandardMaterial color={SUIT} roughness={0.35} />
        </mesh>
        <mesh position={[0, HEAD_Y + 0.0005, 0.0058]} scale={[1, 0.72, 0.62]}>
          <sphereGeometry args={[0.0085, 18, 12]} />
          <meshStandardMaterial color="#c9952f" metalness={1} roughness={0.12} emissive="#3a2a08" />
        </mesh>
        {/* Life-support backpack. */}
        <mesh position={[0, 0.033, -0.0105]}>
          <boxGeometry args={[0.016, 0.019, 0.007]} />
          <meshStandardMaterial color="#aab4c2" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
      {selected && showInfo && (
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.018, 0.024, 32]} />
          <meshBasicMaterial color={C.accent} />
        </mesh>
      )}
      {showInfo && (status || selected) && (
        <Billboard position={[0, 0.085, 0]}>
          <Label
            world
            size={selected ? 0.02 : 0.024}
            anchorX="center"
            anchorY="middle"
            bold
            color={
              status === '!' ? C.warn : status === '+' ? C.good : status === 'z' ? C.accent : C.text
            }
          >
            {[selected ? firstName(id) : '', status ?? ''].filter(Boolean).join(' ')}
          </Label>
        </Billboard>
      )}
    </group>
  )
}

export function Crew({ game }: { game: GameState }) {
  const targets = crewTargets(game)
  return (
    <>
      {CREW_IDS.map((id) => (
        <Astronaut key={id} id={id} game={game} target={targets[id]} />
      ))}
    </>
  )
}
