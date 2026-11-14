import { Link } from 'react-router'
import { FileText, Lock, Rocket } from 'lucide-react'
import { CREW, firstName } from '../../domain/content/crew'
import { MISSION_LIST, type MissionDefinition } from '../../domain/content/missions'
import { SECTORS } from '../../domain/content/sectors'
import type { GameState } from '../../domain/model/game'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { pad } from '../format'

type MissionView = 'available' | 'completed' | 'design'

function missionViewStatus(mission: MissionDefinition, game: GameState): MissionView {
  if (game.missions[mission.id] === 'completed') return 'completed'
  return mission.implemented ? 'available' : 'design'
}

const STATUS_LABEL: Record<MissionView, string> = {
  available: 'Disponible',
  completed: 'Completada',
  design: 'En diseño',
}
const STATUS_TAG: Record<MissionView, string> = {
  available: 'tag-ok',
  completed: 'tag-info',
  design: 'tag-muted',
}

export function MissionsView() {
  const game = useGame((s) => s.game)
  return (
    <div className="page">
      <PageHeader eyebrow="Asignación de tareas" title="Misiones">
        Asigna hasta tres tripulantes por misión. La composición del equipo determina las
        consecuencias.
      </PageHeader>
      <ol className="mission-list">
        {MISSION_LIST.map((mission) => {
          const status = missionViewStatus(mission, game)
          const report = game.log.findLast((entry) => entry.missionId === mission.id)
          return (
            <li key={mission.id} className={`mission-card is-${status}`}>
              <div className="mission-card-head">
                <span className="mission-number">{pad(mission.number, 2)}</span>
                <div>
                  <h2>{mission.title}</h2>
                  <span className="muted small">{SECTORS[mission.sectorId].name}</span>
                </div>
                <span className={`tag ${STATUS_TAG[status]}`}>{STATUS_LABEL[status]}</span>
              </div>
              <p>
                {mission.objective ?? 'Objetivo pendiente de definición en el documento de diseño.'}
              </p>
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
              <div className="mission-card-actions">
                {status === 'available' && (
                  <Link to={`/missions/${mission.id}`} className="btn btn-primary">
                    <Rocket size={14} aria-hidden="true" /> Preparar misión
                  </Link>
                )}
                {status === 'completed' && report && (
                  <Link to={`/log/${report.id}`} className="btn">
                    <FileText size={14} aria-hidden="true" /> Ver informe
                  </Link>
                )}
                {status === 'design' && (
                  <>
                    <span className="muted small">
                      <Lock size={12} aria-hidden="true" /> No operativa en este prototipo
                    </span>
                    <Link to={`/missions/${mission.id}`} className="btn btn-ghost">
                      Ver ficha
                    </Link>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
