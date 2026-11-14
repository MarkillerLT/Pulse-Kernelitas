import { Link } from 'react-router'
import { getMission } from '../../domain/content/missions'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { formatTimestamp, pad } from '../format'

export function LogView() {
  const log = useGame((s) => s.game.log)
  const entries = [...log].reverse()
  return (
    <div className="page">
      <PageHeader eyebrow="Núcleo Collins · Historial de misiones" title="Historial">
        Registro de decisiones de N0VA-7 y sus consecuencias.
      </PageHeader>
      {entries.length === 0 ? (
        <div className="empty">
          <p>Sin registros todavía.</p>
          <Link to="/missions" className="btn btn-primary">
            Ir a misiones
          </Link>
        </div>
      ) : (
        <ol className="log-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link to={`/log/${entry.id}`} className="log-row">
                <span className="mono log-turn">T{pad(entry.turn)}</span>
                <span className="log-main">
                  <strong>{getMission(entry.missionId)?.title ?? entry.missionId}</strong>
                  <span className="small muted">{formatTimestamp(entry.timestamp)}</span>
                </span>
                <span className="log-crew">
                  {entry.crewIds.map((id) => (
                    <CrewSprite key={id} crewId={id} size="sm" />
                  ))}
                </span>
                <span className={`tag ${entry.outcome === 'optimal' ? 'tag-ok' : 'tag-warn'}`}>
                  {entry.outcome === 'optimal'
                    ? 'Equipo óptimo'
                    : `${entry.penalties.length} penalizaciones`}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
