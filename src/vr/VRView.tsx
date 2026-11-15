import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Link } from 'react-router'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import type { Mesh } from 'three'
import { gameStore, useGame } from '../store/gameStore'
import { C } from './colors'
import { diag, installDiag } from './diag'
import { DiagOverlay } from './DiagOverlay'
import { Crew } from './Crew'
import { Ship } from './Ship'
import { LAYOUT } from './space'
import { useVrUi } from './vrUi'
import { AssignPanel } from './panels/AssignPanel'
import { CrewPanel } from './panels/CrewPanel'
import { HudPanel } from './panels/HudPanel'
import { SetupPanel } from './panels/SetupPanel'
import { TaskPanel } from './panels/TaskPanel'

/**
 * /vr — the same game as the 2D console, played around a floating diorama of the ship.
 * Works on desktop (mouse + orbit) and on Meta Quest via WebXR: VR over a starfield, or mixed
 * reality with the ship on your real table (passthrough). Controllers and hand tracking both
 * click the panels; there is no locomotion, everything is within arm's reach.
 */
installDiag()
diag('módulo VR cargado')

const xrStore = createXRStore({
  controller: { teleportPointer: false },
  hand: { teleportPointer: false },
})
let lastSession: XRSession | undefined
xrStore.subscribe((state) => {
  if (state.session === lastSession) return
  lastSession = state.session
  diag(state.session ? `sesión XR iniciada (${state.mode})` : 'sesión XR terminada')
})

/** Shown inside the 3D scene while fonts load; reports if it takes suspiciously long. */
function Loading() {
  const box = useRef<Mesh>(null)
  useEffect(() => {
    diag('esperando assets 3D (fuente del texto)…')
    const t = window.setTimeout(() => diag('AVISO: los assets siguen cargando tras 10 s'), 10000)
    return () => window.clearTimeout(t)
  }, [])
  useFrame((_, dt) => {
    if (box.current) box.current.rotation.y += dt
  })
  return (
    <mesh ref={box} position={[0, 1.2, -1]}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshBasicMaterial color={C.accent} wireframe />
    </mesh>
  )
}

/** Logs the first rendered frame (and the first XR frame once a session starts). */
function FrameProbe() {
  const seen = useRef({ any: false, xr: false })
  const inSession = useXR((s) => s.session != null)
  useEffect(() => {
    if (!inSession) seen.current.xr = false
  }, [inSession])
  useFrame(() => {
    if (!seen.current.any) {
      seen.current.any = true
      diag('primer frame renderizado')
    }
    if (inSession && !seen.current.xr) {
      seen.current.xr = true
      diag('primer frame dentro de la sesión XR')
    }
  })
  return null
}

function SceneReady() {
  useEffect(() => diag('escena lista (assets cargados)'), [])
  return null
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    diag(`ERROR en la escena: ${error instanceof Error ? error.message : String(error)}`)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Drives the game clock from the render loop (window timers can stall inside a session). */
function Clock() {
  useFrame((_, delta) => gameStore.getState().tick(Math.min(250, delta * 1000)))
  return null
}

function World() {
  const game = useGame((s) => s.game)
  const setupOpen = useGame((s) => s.setupOpen)
  const selectedCrew = useVrUi((s) => s.selectedCrew)
  const assigning = useVrUi((s) => s.assigning)
  const mode = useXR((s) => s.mode)
  const inSession = useXR((s) => s.session != null)
  const passthrough = mode === 'immersive-ar'

  return (
    <>
      <Clock />
      {!passthrough && <color attach="background" args={[C.space]} />}
      {!passthrough && <Stars radius={60} depth={30} count={2500} factor={3} fade speed={0.3} />}
      <hemisphereLight args={['#bcd4ff', '#1a1f2b', 0.9]} />
      <directionalLight position={[1.5, 3, 1]} intensity={1.4} />
      {!inSession && (
        <OrbitControls
          target={[LAYOUT.diorama[0], LAYOUT.diorama[1] + 0.2, LAYOUT.diorama[2]]}
          maxDistance={4}
          minDistance={0.4}
        />
      )}

      <group position={LAYOUT.diorama}>
        <Ship game={game} />
        <Crew game={game} />
      </group>

      <HudPanel game={game} position={LAYOUT.hud} />
      <TaskPanel game={game} position={LAYOUT.tasks.position} rotY={LAYOUT.tasks.rotY} />
      {assigning ? (
        <AssignPanel
          key={`${assigning.taskId}:${assigning.optionId}`}
          game={game}
          taskId={assigning.taskId}
          optionId={assigning.optionId}
          position={LAYOUT.side.position}
          rotY={LAYOUT.side.rotY}
        />
      ) : selectedCrew ? (
        <CrewPanel
          game={game}
          crewId={selectedCrew}
          position={LAYOUT.side.position}
          rotY={LAYOUT.side.rotY}
        />
      ) : null}
      {setupOpen && <SetupPanel position={LAYOUT.setup} />}
    </>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  left: 16,
  right: 16,
  bottom: 16,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
}

export function VRView() {
  const [error, setError] = useState<string | null>(null)
  const enter = (kind: 'vr' | 'ar') => {
    setError(null)
    diag(`botón entrar ${kind}`)
    const p = kind === 'vr' ? xrStore.enterVR() : xrStore.enterAR()
    p.catch((e: unknown) => {
      diag(`ERROR al entrar ${kind}: ${e instanceof Error ? e.message : String(e)}`)
      setError(
        `No se pudo iniciar la sesión ${kind === 'vr' ? 'VR' : 'de realidad mixta'}: ${e instanceof Error ? e.message : String(e)}. En el Quest abre la página por HTTPS.`,
      )
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.space }}>
      <Canvas
        camera={{ position: [0, 1.95, 1.7], fov: 60, near: 0.02, far: 200 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          const ctx = gl.getContext()
          const ext = ctx.getExtension('WEBGL_debug_renderer_info')
          diag(
            `canvas creado: ${ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'GPU desconocida'}`,
          )
        }}
      >
        {/* Everything — including @react-three/xr's own controller/hand models, which suspend
            while they download — sits under this boundary. Anything suspending above it would
            freeze the whole page on the router's loading text. */}
        <SceneBoundary>
          <Suspense fallback={<Loading />}>
            <XR store={xrStore}>
              <FrameProbe />
              <Suspense fallback={<Loading />}>
                <World />
                <SceneReady />
              </Suspense>
            </XR>
          </Suspense>
        </SceneBoundary>
      </Canvas>
      <DiagOverlay />
      <div style={overlay}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ pointerEvents: 'auto' }}
          onClick={() => enter('vr')}
        >
          Entrar en VR
        </button>
        <button
          type="button"
          className="btn"
          style={{ pointerEvents: 'auto' }}
          onClick={() => enter('ar')}
        >
          Realidad mixta (passthrough)
        </button>
        <Link to="/" className="btn" style={{ pointerEvents: 'auto' }}>
          Volver a la consola 2D
        </Link>
        {error && (
          <p
            className="small text-critical"
            role="alert"
            style={{ flexBasis: '100%', textAlign: 'center' }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default VRView
