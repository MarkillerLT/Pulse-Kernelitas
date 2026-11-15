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
import { Backdrop } from './Backdrop'
import { C } from './colors'
import { diag, installDiag } from './diag'
import { DiagOverlay } from './DiagOverlay'
import { Crew } from './Crew'
import { UiLayer } from './kit'
import { sfxTask } from './sfx'
import { Ship } from './Ship'
import { SceneEnvironment } from './SceneEnvironment'
import { ShipRig } from './ShipRig'
import { LAYOUT } from './space'
import { useVrUi } from './vrUi'
import { AssignPanel } from './panels/AssignPanel'
import { CrewPanel } from './panels/CrewPanel'
import { CrewRoster } from './panels/CrewRoster'
import { HudPanel } from './panels/HudPanel'
import { LogConsole } from './panels/LogConsole'
import { MissionBanner } from './panels/MissionBanner'
import { OnboardBar } from './panels/OnboardBar'
import { PausePanel } from './panels/PausePanel'
import { TaskPanel } from './panels/TaskPanel'

/**
 * /juego/vr — the same game as the 2D console, played from inside the Elysium. Works on desktop
 * (mouse + orbit) and on Meta Quest via WebXR: VR in deep space, or mixed reality in the
 * player's room (passthrough). The ship is a tabletop diorama or, "a bordo", life-size around
 * the player; moving between sectors fades to black instead of sliding (no motion sickness).
 * Panels surround the player within arm's reach: tasks on the left, crew faces on the right,
 * status bar ahead, the log as a cockpit console, and decisions / pause right in front.
 */
installDiag()
diag('módulo VR cargado')
// Dev-only handles to drive the scene from the console / automated checks.
if (import.meta.env.DEV) Object.assign(window, { __game: gameStore, __vrUi: useVrUi })

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

/** Console chime whenever a new task appears (not for the ones already there on load). */
function TaskChime() {
  const openIds = useGame((s) =>
    s.game.tasks
      .filter((t) => t.status === 'open')
      .map((t) => t.id)
      .join(','),
  )
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = new Set(openIds ? openIds.split(',') : [])
    const before = seen.current
    seen.current = ids
    if (!before || !useVrUi.getState().sound) return
    if ([...ids].some((id) => !before.has(id))) sfxTask()
  }, [openIds])
  return null
}

function World() {
  const game = useGame((s) => s.game)
  const menuOpen = useGame((s) => s.menu !== null)
  const selectedCrew = useVrUi((s) => s.selectedCrew)
  const assigning = useVrUi((s) => s.assigning)
  const mode = useXR((s) => s.mode)
  const inSession = useXR((s) => s.session != null)
  const passthrough = mode === 'immersive-ar'
  // On board, every panel disappears to let the ship be seen; only a way back remains.
  const onboard = useVrUi((s) => s.view.mode === 'onboard')

  return (
    <>
      <Clock />
      <TaskChime />
      {!passthrough && <color attach="background" args={[C.space]} />}
      {!passthrough && <Stars radius={320} depth={80} count={5000} factor={6} fade speed={0.3} />}
      {!passthrough && <Backdrop />}
      <SceneEnvironment />
      <hemisphereLight args={['#cfe0ff', '#1a1f2b', 0.6]} />
      <directionalLight position={[1.5, 3, 1]} intensity={1.0} />
      {!inSession && <OrbitControls makeDefault maxDistance={6} minDistance={0.3} />}

      <ShipRig>
        <Ship game={game} />
        <Crew game={game} />
      </ShipRig>

      {onboard ? (
        <OnboardBar />
      ) : (
        <>
          <HudPanel game={game} position={LAYOUT.hud.position} rotY={LAYOUT.hud.rotY} />
          <MissionBanner position={LAYOUT.banner.position} rotY={LAYOUT.banner.rotY} />
          <TaskPanel game={game} position={LAYOUT.tasks.position} rotY={LAYOUT.tasks.rotY} />
          {/* Panels with textures load on their own, so they never suspend the whole world. */}
          <Suspense fallback={null}>
            <CrewRoster game={game} position={LAYOUT.roster.position} rotY={LAYOUT.roster.rotY} />
          </Suspense>
          {selectedCrew && (
            <Suspense fallback={null}>
              <CrewPanel
                game={game}
                crewId={selectedCrew}
                position={LAYOUT.crewCard.position}
                rotY={LAYOUT.crewCard.rotY}
              />
            </Suspense>
          )}
          <LogConsole
            log={game.log}
            position={LAYOUT.console.position}
            tilt={LAYOUT.console.tilt}
          />
        </>
      )}

      {/* Modal windows: right in front, drawn above every other panel. */}
      {menuOpen ? (
        <UiLayer base={200}>
          <PausePanel position={LAYOUT.modal.position} rotY={LAYOUT.modal.rotY} />
        </UiLayer>
      ) : (
        assigning &&
        !onboard && (
          <UiLayer base={100}>
            <AssignPanel
              key={`${assigning.taskId}:${assigning.optionId}`}
              game={game}
              taskId={assigning.taskId}
              optionId={assigning.optionId}
              position={LAYOUT.modal.position}
              rotY={LAYOUT.modal.rotY}
            />
          </UiLayer>
        )
      )}
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

function useFullscreen() {
  const [on, setOn] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  )
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled
  return { on, toggle, supported }
}

export function VRView() {
  const [error, setError] = useState<string | null>(null)
  const fullscreen = useFullscreen()
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
        camera={{ position: [0, 1.75, 0.75], fov: 60, near: 0.02, far: 1200 }}
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
        {fullscreen.supported && (
          <button
            type="button"
            className="btn"
            style={{ pointerEvents: 'auto' }}
            onClick={fullscreen.toggle}
          >
            {fullscreen.on ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        )}
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
