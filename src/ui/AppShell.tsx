import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Cpu, Map, Rocket, ScrollText, Settings, Users, X, Radar } from 'lucide-react'
import { CREW_IDS } from '../domain/content/crew'
import { getAvailability } from '../domain/rules/availability'
import { deriveAlerts } from '../domain/rules/alerts'
import { useGame } from '../store/gameStore'
import { pad } from './format'

const NAV = [
  { to: '/', label: 'Puente', icon: Radar, end: true },
  { to: '/crew', label: 'Tripulación', icon: Users },
  { to: '/missions', label: 'Misiones', icon: Rocket },
  { to: '/sectors', label: 'Sectores', icon: Map },
  { to: '/log', label: 'Historial', icon: ScrollText },
  { to: '/system', label: 'Sistema', icon: Settings },
]

export function AppShell() {
  const game = useGame((s) => s.game)
  const notice = useGame((s) => s.notice)
  const persistence = useGame((s) => s.persistence)
  const dismissNotice = useGame((s) => s.dismissNotice)
  const { pathname } = useLocation()

  const operational = CREW_IDS.filter((id) => getAvailability(game.crew[id].stats).available).length
  const critical = deriveAlerts(game).filter((a) => a.severity === 'critical').length

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
        <NavLink to="/" className="brand" aria-label="ELYSIUM — Puente Armstrong">
          <Cpu size={18} aria-hidden="true" />
          <span>
            <strong>ELYSIUM</strong>
            <small>N0VA-7 · IA CENTRAL</small>
          </span>
        </NavLink>
        <dl className="status-strip" aria-label="Estado de la nave">
          <div>
            <dt>Turno</dt>
            <dd>{pad(game.turn)}</dd>
          </div>
          <div>
            <dt>Operativos</dt>
            <dd className={operational < CREW_IDS.length ? 'text-warn' : undefined}>
              {operational}/{CREW_IDS.length}
            </dd>
          </div>
          <div>
            <dt>Alertas críticas</dt>
            <dd className={critical > 0 ? 'text-critical' : undefined}>{critical}</dd>
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
        <div aria-live="polite" className="notice-region">
          {notice && (
            <div className={`notice notice-${notice.tone}`} role="status">
              <span>{notice.text}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={dismissNotice}
                aria-label="Cerrar aviso"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  )
}
