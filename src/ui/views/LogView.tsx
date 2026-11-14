import { useState } from 'react'
import { SHIP_KEYS, SHIP_LABELS } from '../../domain/content/ship'
import type { LogEntry } from '../../domain/model/game'
import { useGame } from '../../store/gameStore'
import { ChangeTable } from '../components/ChangeTable'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { formatClock } from '../activity'
import { formatDelta } from '../format'

const FILTERS: { id: string; label: string; match: (e: LogEntry) => boolean }[] = [
  { id: 'all', label: 'Todo', match: () => true },
  { id: 'decisions', label: 'Decisiones', match: (e) => e.kind === 'task' || e.kind === 'request' },
  { id: 'missions', label: 'Misiones', match: (e) => e.kind === 'mission' },
  { id: 'crew', label: 'Tripulación', match: (e) => e.kind === 'crew' },
  { id: 'failures', label: 'Fallos y crisis', match: (e) => e.severity === 'critical' },
]

export function LogView() {
  const log = useGame((s) => s.game.log)
  const [filter, setFilter] = useState('all')
  const active = FILTERS.find((f) => f.id === filter)!
  const entries = [...log].reverse().filter(active.match)
  return (
    <div className="page">
      <PageHeader eyebrow="Núcleo Collins · Registro" title="Historial">
        Cada decisión de N0VA-7, con su probabilidad, su resultado y lo que le costó a la
        tripulación.
      </PageHeader>
      <div className="filters" role="group" aria-label="Filtrar registro">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm${filter === f.id ? ' is-on' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {entries.length === 0 ? (
        <p className="empty">Sin registros en esta categoría.</p>
      ) : (
        <ol className="log-list">
          {entries.map((entry) => {
            const ship = SHIP_KEYS.filter((k) => entry.ship[k])
            const details = entry.changes.length > 0 || ship.length > 0
            return (
              <li key={entry.id} className={`log-entry log-${entry.severity}`}>
                <details>
                  <summary>
                    <span className="mono log-time">{formatClock(entry.hour)}</span>
                    <span className="log-main">
                      <strong>{entry.title}</strong>
                      <span className="small muted">{entry.text}</span>
                    </span>
                    <span className="log-crew">
                      {entry.crewIds.map((id) => (
                        <CrewSprite key={id} crewId={id} size="sm" />
                      ))}
                    </span>
                    {entry.chance !== null && (
                      <span className="tag">{Math.round(entry.chance * 100)}%</span>
                    )}
                  </summary>
                  {details ? (
                    <div className="log-details">
                      {ship.length > 0 && (
                        <p className="small">
                          Nave:{' '}
                          {ship
                            .map((k) => `${SHIP_LABELS[k]} ${formatDelta(entry.ship[k]!)}`)
                            .join(' · ')}
                        </p>
                      )}
                      {entry.changes.length > 0 && <ChangeTable changes={entry.changes} />}
                    </div>
                  ) : (
                    <p className="small muted log-details">Sin cambios en estadísticas.</p>
                  )}
                </details>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
