import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Cpu, Glasses, Map, Monitor, Rocket, ScrollText, Settings, Users, X } from 'lucide-react'
import { CREW_IDS } from '../domain/content/crew'
import { gameStore, useGame, type Notice } from '../store/gameStore'
import { MODE_INFO, tierOf } from '../domain/rules/difficulty'
import { formatClock } from './activity'
import { NewGameDialog } from './components/NewGameDialog'

const NAV = [
  { to: '/', label: 'Puente', icon: Monitor, end: true },
  { to: '/crew', label: 'Tripulación', icon: Users },
  { to: '/missions', label: 'Misiones', icon: Rocket },
  { to: '/sectors', label: 'Sectores', icon: Map },
  { to: '/log', label: 'Historial', icon: ScrollText },
  { to: '/system', label: 'Sistema', icon: Settings },
  { to: '/vr', label: 'Modo VR', icon: Glasses },
]

/** Drives the game clock from real time, whatever page is open. */
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

export function AppShell() {
  useGameClock()
  const game = useGame((s) => s.game)
  const speed = useGame((s) => s.speed)
  const notices = useGame((s) => s.notices)
  const persistence = useGame((s) => s.persistence)
  const { pathname } = useLocation()
  const alive = CREW_IDS.filter((id) => game.crew[id].activity !== 'dead').length
  const pending = game.tasks.filter((t) => t.status === 'open').length

  useEffect(() => {
    document.documentElement.dataset.motion = game.settings.reducedMotion ? 'reduced' : 'full'
  }, [game.settings.reducedMotion])

  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="ELYSIUM — Puente">
          <Cpu size={18} aria-hidden="true" />
          <span>
            <strong>ELYSIUM</strong>
            <small>N0VA-7 · IA CENTRAL</small>
          </span>
        </NavLink>
        <dl className="status-strip" aria-label="Estado de la nave">
          <div>
            <dt>Reloj</dt>
            <dd>
              {formatClock(game.hour)}{' '}
              {speed === 0 && game.status === 'active' && (
                <span className="text-warn">· pausa</span>
              )}
            </dd>
          </div>
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
            <dt>Decisiones</dt>
            <dd className={pending > 0 ? 'text-warn' : undefined}>{pending}</dd>
          </div>
          <div>
            <dt>Memoria</dt>
            <dd className={persistence === 'saved' ? 'text-good' : 'text-critical'}>
              {persistence === 'saved' ? 'Sincronizada' : 'Sin guardar'}
            </dd>
          </div>
        </dl>
      </header>
      <nav className="sidenav" aria-label="Navegación principal">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <NewGameDialog />
      <div className="toasts" aria-live="polite">
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} />
        ))}
      </div>
    </div>
  )
}
