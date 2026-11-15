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
 * The five crew members as little procedural astronauts (capsule body, round helmet, visor).
 * Walking reuses the 2D map's motion module, so both views always agree on where everyone is.
 * Positions are written to the scene graph each frame; React only re-renders on game changes.
 */

const BODY_R = 0.009
const BODY_L = 0.02
const HEAD_R = 0.011
const HEAD_Y = BODY_L + BODY_R * 2 + HEAD_R * 0.6

function Astronaut({ id, game, target }: { id: CrewId; game: GameState; target: Target }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const walker = useRef<Walker | null>(null)
  const targetRef = useRef(target)
  useLayoutEffect(() => {
    targetRef.current = target
  })
  const selected = useVrUi((s) => s.selectedCrew === id)
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
    b.position.y = restPose
      ? 0.016
      : w.walking && !reducedMotion
        ? Math.abs(Math.sin(clock.elapsedTime * 12)) * 0.006
        : 0
  })

  const color = CREW_COLORS[id]
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, BODY_R + BODY_L / 2, 0]}>
          <capsuleGeometry args={[BODY_R, BODY_L, 4, 10]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, HEAD_Y, 0]}>
          <sphereGeometry args={[HEAD_R, 16, 12]} />
          <meshStandardMaterial color="#f2f5fa" roughness={0.4} />
        </mesh>
        <mesh position={[0, HEAD_Y, HEAD_R * 0.55]} scale={[1, 0.6, 0.6]}>
          <sphereGeometry args={[HEAD_R * 0.75, 14, 10]} />
          <meshStandardMaterial color="#1b2a44" metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Backpack */}
        <mesh position={[0, BODY_R + BODY_L * 0.7, -BODY_R]}>
          <boxGeometry args={[BODY_R * 1.6, BODY_L * 0.9, BODY_R]} />
          <meshStandardMaterial color="#9aa6b8" />
        </mesh>
      </group>
      {selected && (
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.018, 0.024, 32]} />
          <meshBasicMaterial color={C.accent} />
        </mesh>
      )}
      {(status || selected) && (
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
