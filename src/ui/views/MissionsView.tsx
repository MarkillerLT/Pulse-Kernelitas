import { Link } from 'react-router'
import { CREW, firstName } from '../../domain/content/crew'
import { MISSION_LIST } from '../../domain/content/missions'
import { SECTORS } from '../../domain/content/sectors'
import type { MissionStatus } from '../../domain/model/game'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { pad } from '../format'

const STATUS: Record<MissionStatus, { label: string; tag: string }> = {
  pending: { label: 'Próximamente', tag: 'tag-muted' },
  available: { label: 'Disponible', tag: 'tag-ok' },
  active: { label: 'En curso', tag: 'tag-info' },
  completed: { label: 'Cumplida', tag: 'tag-ok' },
  failed: { label: 'Fallida · reintentar', tag: 'tag-warn' },
  lost: { label: 'Perdida', tag: 'tag-critical' },
}

export function MissionsView() {
  const game = useGame((s) => s.game)
  return (
    <div className="page">
      <PageHeader eyebrow="Bitácora del viaje" title="Misiones">
        Cinco hitos del viaje. Cada misión aparece en la lista de tareas del Puente el día indicado,
        a las 09:00, y hay 24 horas para enviar un equipo.
      </PageHeader>
      <ol className="mission-list">
        {MISSION_LIST.map((mission) => {
          const status = game.missions[mission.id]
          const open = status === 'available' || status === 'failed'
          return (
            <li key={mission.id} className={`mission-card is-${status}`}>
              <div className="mission-card-head">
                <span className="mission-number">{pad(mission.number, 2)}</span>
                <div>
                  <h2>{mission.title}</h2>
                  <span className="muted small">
                    Día {mission.day} · {SECTORS[mission.sectorId].name} · {mission.durationHours} h
                    fuera
                  </span>
                </div>
                <span className={`tag ${STATUS[status].tag}`}>{STATUS[status].label}</span>
              </div>
              <p>{mission.objective}</p>
              <div className="mission-card-meta">
                <div>
                  <h3 className="subhead">Riesgos</h3>
                  <ul className="risk-inline">
                    {mission.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="subhead">
                    {mission.routes.length > 1 ? 'Rutas' : 'Equipo óptimo'}
                  </h3>
                  {mission.routes.map((route) => (
                    <div key={route.id} className="team-inline">
                      {mission.routes.length > 1 && (
                        <span className="mono small">{route.name}</span>
                      )}
                      {route.optimalCrew.map((id) => (
                        <span key={id} className="team-chip" title={CREW[id].name}>
                          <CrewSprite crewId={id} size="sm" />
                          {firstName(id)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <details className="design-notes">
                <summary>Penalizaciones por ausencia</summary>
                <ul className="plain-list small">
                  {mission.routes.flatMap((route) =>
                    route.absenceRules.map((rule) => (
                      <li key={route.id + rule.crewId}>
                        {mission.routes.length > 1 && `${route.name} · `}Sin{' '}
                        {firstName(rule.crewId)}: {rule.summary}
                      </li>
                    )),
                  )}
                </ul>
              </details>
              {open && (
                <Link to="/" className="btn btn-primary">
                  Ir al Puente para asignar equipo
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
