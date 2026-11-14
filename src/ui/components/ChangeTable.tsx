import { CREW } from '../../domain/content/crew'
import type { CrewChange } from '../../domain/model/game'
import { STAT_KEYS, STAT_LABELS } from '../../domain/model/stats'
import { CrewSprite } from './CrewSprite'
import { DeltaValue } from './DeltaValue'

/** Before → after for every crew member a decision affected. */
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
                const before = Math.round(change.before[key])
                const after = Math.round(change.after[key])
                return (
                  <tr key={key} className={before === after ? 'is-idle' : undefined}>
                    <th scope="row">{STAT_LABELS[key]}</th>
                    <td>{before}</td>
                    <td>
                      {after !== before ? <DeltaValue stat={key} value={after - before} /> : '—'}
                    </td>
                    <td>{after}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </article>
      ))}
    </div>
  )
}
