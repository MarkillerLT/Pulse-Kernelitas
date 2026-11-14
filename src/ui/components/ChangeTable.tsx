import { CREW } from '../../domain/content/crew'
import type { CrewChange } from '../../domain/model/game'
import { STAT_KEYS, STAT_LABELS } from '../../domain/model/stats'
import { CrewSprite } from './CrewSprite'
import { DeltaValue } from './DeltaValue'
import { describeDelta } from '../format'

/** Before → after for every affected crew member, with the breakdown of each source. */
export function ChangeTable({ changes }: { changes: CrewChange[] }) {
  return (
    <div className="change-list">
      {changes.map((change) => (
        <article key={change.crewId} className="change-card">
          <header>
            <CrewSprite crewId={change.crewId} size="sm" />
            <strong>{CREW[change.crewId].name}</strong>
          </header>
          <table className="change-table">
            <caption className="sr-only">Cambios de {CREW[change.crewId].name}</caption>
            <thead>
              <tr>
                <th scope="col">Estadística</th>
                <th scope="col">Antes</th>
                <th scope="col">Cambio</th>
                <th scope="col">Después</th>
              </tr>
            </thead>
            <tbody>
              {STAT_KEYS.map((key) => {
                const applied = change.after[key] - change.before[key]
                const requested = change.requested[key] ?? 0
                return (
                  <tr
                    key={key}
                    className={applied === 0 && requested === 0 ? 'is-idle' : undefined}
                  >
                    <th scope="row">{STAT_LABELS[key]}</th>
                    <td>{change.before[key]}</td>
                    <td>
                      {applied !== 0 ? <DeltaValue stat={key} value={applied} /> : '—'}
                      {requested !== applied && (
                        <small className="clamped" title="Limitado por el rango permitido">
                          {' '}
                          (límite)
                        </small>
                      )}
                    </td>
                    <td>{change.after[key]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <ul className="source-list">
            {change.sources.map((source, i) => (
              <li key={i}>
                <span>{source.label}</span> <b>{describeDelta(source.delta)}</b>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
