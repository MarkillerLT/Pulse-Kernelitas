import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { Glasses, Pause, X } from 'lucide-react'
import { CREW_IDS } from '../domain/content/crew'
import { gameStore, useClockMinutes, useGame, type Notice, type Speed } from '../store/gameStore'
import { MODE_INFO, tierOf } from '../domain/rules/difficulty'
import { formatClock } from './activity'
import { PauseMenu } from './menu/PauseMenu'

const SPEEDS: Exclude<Speed, 0>[] = [1, 2, 4]

/** Drives the game clock from real time. */
function useGameClock() {
  useEffect(() => {
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      gameStore.getState().tick(now - last)
      last = now
    }, 100)
    return () => window.clearInterval(id)
  }, [])
}

/** Esc opens the pause menu (Radix closes it again), unless another dialog is on screen. */
function usePauseKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const { menu, game, openMenu } = gameStore.getState()
      if (menu || game.status !== 'active') return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      e.preventDefault()
      openMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

const TOAST_MS = 8000

function Toast({ notice }: { notice: Notice }) {
  const onDismiss = () => gameStore.getState().dismissNotice(notice.id)
  useEffect(() => {
    const timer = window.setTimeout(() => gameStore.getState().dismissNotice(notice.id), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [notice.id])
  return (
    <div className={`notice notice-${notice.tone}`} role="status">
      <span>{notice.text}</span>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Cerrar aviso">
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Game frame: a single top bar (clock, speed, status, pause) over the console. There is no
 * page navigation: every section lives in the console's side tabs, and settings, guide and
 * difficulty live in the pause menu.
 */
export function AppShell() {
  useGameClock()
  usePauseKey()
  const game = useGame((s) => s.game)
  const speed = useGame((s) => s.speed)
  const setSpeed = useGame((s) => s.setSpeed)
  const speedMode = useGame((s) => s.speedMode)
  const setAutoSpeed = useGame((s) => s.setAutoSpeed)
  const auto = speedMode === 'auto'
  const openMenu = useGame((s) => s.openMenu)
  const notices = useGame((s) => s.notices)
  const persistence = useGame((s) => s.persistence)
  const minutes = useClockMinutes()
  const alive = CREW_IDS.filter((id) => game.crew[id].activity !== 'dead').length
  const active = game.status === 'active'

  useEffect(() => {
    document.documentElement.dataset.motion = game.settings.reducedMotion ? 'reduced' : 'full'
  }, [game.settings.reducedMotion])

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="brand" aria-label="ELYSIUM · N0VA-7">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>
            <strong>
              Elysium<span className="text-accent">.</span>
            </strong>
            <small>N0VA-7 · IA central</small>
          </span>
        </div>

        <div className="topbar-clock">
          <strong className="clock-time">{formatClock(game.hour, minutes)}</strong>
          <span className={`clock-state${speed === 0 ? ' is-paused' : ''}`}>
            <span className="status-dot" aria-hidden="true" />
            {!active
              ? 'Viaje terminado'
              : speed === 0
                ? 'En pausa'
                : `En curso · ${auto ? 'auto' : 'manual'} ${speed}×`}
          </span>
        </div>

        <div className="speed" role="group" aria-label="Velocidad del tiempo">
          <button
            type="button"
            className={`btn btn-sm${auto ? ' is-on' : ''}`}
            aria-pressed={auto}
            onClick={setAutoSpeed}
            disabled={!active}
            title="1× mientras haya tareas pendientes o en curso; 4× en los tiempos muertos"
          >
            Auto
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              // In auto mode the speed it is using is shown as a hint, not as a manual choice.
              className={`btn btn-sm${!auto && speed === s ? ' is-on' : ''}${auto && speed === s ? ' is-current' : ''}`}
              aria-pressed={!auto && speed === s}
              onClick={() => setSpeed(s)}
              disabled={!active}
            >
              {s}×
            </button>
          ))}
        </div>

        <dl className="status-strip" aria-label="Estado de la nave">
          <div>
            <dt>Nivel</dt>
            <dd>
              {game.difficulty.level} · {MODE_INFO[tierOf(game.difficulty.level)].label}
            </dd>
          </div>
          <div>
            <dt>Tripulación</dt>
            <dd className={alive < CREW_IDS.length ? 'text-critical' : undefined}>
              {alive}/{CREW_IDS.length}
            </dd>
          </div>
          <div>
            <dt>Memoria</dt>
            <dd className={persistence === 'saved' ? 'text-good' : 'text-critical'}>
              {persistence === 'saved' ? 'Sincronizada' : 'Sin guardar'}
            </dd>
          </div>
        </dl>

        <div className="topbar-actions">
          <Link to="/vr" className="btn btn-sm btn-ghost" aria-label="Modo VR">
            <Glasses size={14} aria-hidden="true" /> VR
          </Link>
          <button type="button" className="btn btn-pause" onClick={() => openMenu()}>
            <Pause size={14} aria-hidden="true" /> Pausa
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <PauseMenu />
      <div className="toasts" aria-live="polite">
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} />
        ))}
      </div>
    </div>
  )
}
