import { CREW, firstName } from '../../../domain/content/crew'
import { MISSION_LIST } from '../../../domain/content/missions'
import { SECTORS } from '../../../domain/content/sectors'
import type { GameState, MissionStatus } from '../../../domain/model/game'
import { showsOptimalTeam } from '../../../domain/rules/difficulty'
import { CrewSprite } from '../../components/CrewSprite'
import { pad } from '../../format'

const STATUS: Record<MissionStatus, { label: string; tag: string }> = {
  pending: { label: 'Próximamente', tag: 'tag-muted' },
  available: { label: 'Disponible', tag: 'tag-ok' },
  active: { label: 'En curso', tag: 'tag-info' },
  completed: { label: 'Cumplida', tag: 'tag-ok' },
  failed: { label: 'Fallida · reintentar', tag: 'tag-warn' },
  lost: { label: 'Perdida', tag: 'tag-critical' },
}

/** The five story missions: status, risks and (when the difficulty allows) the optimal team. */
export function MissionsTab({ game, onGoToTasks }: { game: GameState; onGoToTasks: () => void }) {
  const hints = showsOptimalTeam(game.difficulty.level, 'critical')
  return (
    <>
      <p className="small muted">
        Cada misión aparece en Tareas el día indicado, a las 09:00. Desde el nivel 3 también llegan
        expediciones recurrentes.
      </p>
      <ol className="mission-list">
        {MISSION_LIST.map((mission) => {
          const status = game.missions[mission.id]
          const open = status === 'available' || status === 'failed'
          return (
            <li key={mission.id} className={`mission-card is-${status}`}>
              <div className="mission-card-head">
                <span className="mission-number">{pad(mission.number, 2)}</span>
                <div>
                  <h3>{mission.title}</h3>
                  <span className="muted small">
                    Día {mission.day} · {SECTORS[mission.sectorId].name} · {mission.durationHours} h
                  </span>
                </div>
                <span className={`tag ${STATUS[status].tag}`}>{STATUS[status].label}</span>
              </div>
              <p>{mission.objective}</p>
              <ul className="risk-inline">
                {mission.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
              {hints ? (
                mission.routes.map((route) => (
                  <div key={route.id} className="team-inline">
                    {mission.routes.length > 1 && <span className="mono small">{route.name}</span>}
                    {route.optimalCrew.map((id) => (
                      <span key={id} className="team-chip" title={CREW[id].name}>
                        <CrewSprite crewId={id} size="sm" />
                        {firstName(id)}
                      </span>
                    ))}
                  </div>
                ))
              ) : (
                <p className="small muted">Equipo óptimo oculto en la fase Difícil.</p>
              )}
              {open && (
                <button type="button" className="btn btn-primary btn-sm" onClick={onGoToTasks}>
                  Asignar equipo en Tareas
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}
