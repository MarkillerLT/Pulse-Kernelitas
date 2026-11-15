import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { BackSide, Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three'
import { LAYOUT, ONBOARD_SCALE, spawnPoint, spawnYaw, toWorld } from './space'
import { useVrUi, type View } from './vrUi'

const UP = new Vector3(0, 1, 0)
const FADE_OUT = 0.22
const FADE_IN = 0.35
const same = (a: View, b: View) =>
  a.mode === b.mode && (a.mode === 'diorama' || a.sector === b.sector)

/** Ship group transform for a view: tabletop diorama, or life-size around the player. */
function applyView(group: Group, view: View) {
  if (view.mode === 'diorama') {
    group.position.set(...LAYOUT.diorama)
    // Raised a few degrees at the far edge: reads better than a flat table and stands apart
    // from the log console in front of it.
    group.rotation.set(LAYOUT.dioramaTilt, 0, 0)
    group.scale.setScalar(1)
    return
  }
  // Life-size, turned so the player looks into the room from its doorway.
  const [x, z] = toWorld(spawnPoint(view.sector))
  const yaw = spawnYaw(view.sector)
  group.rotation.set(0, yaw, 0)
  group.scale.setScalar(ONBOARD_SCALE)
  const feet = new Vector3(x, 0, z).multiplyScalar(ONBOARD_SCALE).applyAxisAngle(UP, yaw)
  group.position.set(-feet.x, 0, -feet.z)
}

/**
 * Holds the ship (and the crew walking on it) and switches between the diorama and the
 * on-board view. Changing view never slides the world around the player: it fades to black,
 * moves the ship while nothing is visible, and fades back — the comfortable way to "teleport".
 */
export function ShipRig({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  const fadeMesh = useRef<Mesh>(null)
  const applied = useRef<View | null>(null)
  const fade = useRef(0)
  const phase = useRef<'idle' | 'out' | 'in'>('idle')
  const eye = useRef(new Vector3())

  useFrame(({ camera }, dt) => {
    const g = group.current
    if (!g) return
    const target = useVrUi.getState().view
    if (!applied.current) {
      applied.current = target
      applyView(g, target)
    }
    if (phase.current === 'idle' && !same(target, applied.current)) phase.current = 'out'
    if (phase.current === 'out') {
      fade.current = Math.min(1, fade.current + dt / FADE_OUT)
      if (fade.current >= 1) {
        applied.current = target
        applyView(g, target)
        phase.current = 'in'
      }
    } else if (phase.current === 'in') {
      fade.current = Math.max(0, fade.current - dt / FADE_IN)
      if (fade.current <= 0) phase.current = 'idle'
    }
    const f = fadeMesh.current
    if (f) {
      f.visible = fade.current > 0
      ;(f.material as MeshBasicMaterial).opacity = fade.current
      camera.getWorldPosition(eye.current)
      f.position.copy(eye.current)
    }
  })

  return (
    <>
      <group ref={group}>{children}</group>
      {/* Black sphere around the eyes, used to fade between views. */}
      <mesh ref={fadeMesh} renderOrder={10000} visible={false}>
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshBasicMaterial
          color="#000"
          transparent
          opacity={0}
          side={BackSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <DesktopCamera />
    </>
  )
}

/** Outside a headset, moves the orbit camera to suit the current view. */
function DesktopCamera() {
  const inSession = useXR((s) => s.session != null)
  const mode = useVrUi((s) => s.view.mode)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as { target: Vector3; update: () => void } | null
  useEffect(() => {
    if (inSession) return
    const [cam, target] =
      mode === 'onboard'
        ? [new Vector3(0, 1.6, 0.9), new Vector3(0, 1.55, -1)]
        : [new Vector3(0, 1.75, 0.75), new Vector3(0, 1.2, -1)]
    camera.position.copy(cam)
    controls?.target.copy(target)
    controls?.update()
  }, [mode, inSession, camera, controls])
  return null
}
