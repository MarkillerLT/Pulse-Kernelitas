import { Link, useParams } from 'react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { CREW, CREW_IDS } from '../../domain/content/crew'
import { MISSION_LIST } from '../../domain/content/missions'
import { SECTORS, SECTOR_IDS, isSectorId, type SectorId } from '../../domain/content/sectors'
import type { StatKey } from '../../domain/model/stats'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { StatMeter } from '../components/StatMeter'
import { pad } from '../format'
import { SECTOR_ICONS } from '../sectorIcons'
import { NotFoundView } from './NotFoundView'

/** Crew statistics each sector monitors, where the design links them (medical, habitat). */
const MONITORED: Partial<Record<SectorId, { title: string; stats: StatKey[] }>> = {
  ride: { title: 'Expedientes médicos', stats: ['health', 'sleep'] },
  habitat: { title: 'Convivencia', stats: ['morale', 'stress', 'trust'] },
}

/** Interface features that already belong to a sector. */
const LINKS: Partial<Record<SectorId, { to: string; label: string }[]>> = {
  armstrong: [
    { to: '/', label: 'Centro de operaciones' },
    { to: '/missions', label: 'Asignación de tareas' },
    { to: '/log', label: 'Historial de decisiones' },
  ],
  collins: [
    { to: '/log', label: 'Historial de misiones' },
    { to: '/system', label: 'Copias de seguridad y memoria' },
  ],
  ride: [{ to: '/crew', label: 'Fichas de la tripulación' }],
}

export function SectorView() {
  const { sectorId = '' } = useParams()
  const game = useGame((s) => s.game)
  if (!isSectorId(sectorId)) return <NotFoundView what="El sector solicitado" />
  const sector = SECTORS[sectorId]
  const Icon = SECTOR_ICONS[sectorId]
  const missions = MISSION_LIST.filter((m) => m.sectorId === sectorId)
  const tasks = game.tasks.filter((t) => t.sectorId === sectorId)
  const monitored = MONITORED[sectorId]
  const links = LINKS[sectorId] ?? []
  const next = SECTOR_IDS[(SECTOR_IDS.indexOf(sectorId) + 1) % SECTOR_IDS.length]

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Ruta">
        <Link to="/sectors">
          <ArrowLeft size={14} aria-hidden="true" /> Sectores
        </Link>
        <Link to={`/sectors/${next}`}>
          {SECTORS[next].name} <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </nav>
      <PageHeader eyebrow={`${sector.code} · ${sector.domain}`} title={sector.name}>
        {sector.summary}
      </PageHeader>
      <div className="sector-grid">
        <Panel
          title={
            <>
              <Icon size={14} aria-hidden="true" /> Equipamiento
            </>
          }
          code={`${sector.contents.length}`}
        >
          <ul className="equipment">
            {sector.contents.map((item, i) => (
              <li key={item}>
                <span className="mono muted">{pad(i + 1, 2)}</span> {item}
              </li>
            ))}
          </ul>
        </Panel>
        <div className="stack">
          {monitored && (
            <Panel title={monitored.title} code="LIVE">
              <ul className="crew-monitor">
                {CREW_IDS.map((id) => (
                  <li key={id}>
                    <Link to={`/crew/${id}`} className="crew-monitor-row">
                      <CrewSprite crewId={id} size="sm" />
                      <span className="crew-monitor-name">
                        <strong>{CREW[id].name}</strong>
                      </span>
                      <span className="crew-monitor-stats">
                        {monitored.stats.map((key) => (
                          <StatMeter
                            key={key}
                            stat={key}
                            value={game.crew[id].stats[key]}
                            compact
                          />
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {links.length > 0 && (
            <Panel title="Accesos">
              <ul className="plain-list">
                {links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} className="link-arrow">
                      {link.label} <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Tareas en este sector" code={`${tasks.length}`}>
            {tasks.length === 0 ? (
              <p className="muted">Sin incidencias.</p>
            ) : (
              <ul className="plain-list">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link to="/" className="link-arrow">
                      {t.status === 'active' ? 'En curso' : 'Pendiente'} · {t.title}{' '}
                      <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Misiones asociadas" code={`${missions.length}`}>
            {missions.length === 0 ? (
              <p className="muted">Ninguna misión registrada en este sector.</p>
            ) : (
              <ul className="plain-list">
                {missions.map((m) => (
                  <li key={m.id}>
                    <Link to="/missions" className="link-arrow">
                      {pad(m.number, 2)} · {m.title} <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <p className="small muted">
            Operaciones específicas del sector: pendientes de diseño. El sector ya está preparado
            para incorporarlas.
          </p>
        </div>
      </div>
    </div>
  )
}
