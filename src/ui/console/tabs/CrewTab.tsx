import { CONDITIONS, CONDITION_CATEGORY_LABELS } from '../../../domain/content/conditions'
import { CREW, CREW_IDS, SPECIALTY_LABELS, type CrewId } from '../../../domain/content/crew'
import type { GameState } from '../../../domain/model/game'
import { getWorkWarnings } from '../../../domain/rules/availability'
import { AvailabilityTag } from '../../components/AvailabilityTag'
import { CrewSprite } from '../../components/CrewSprite'
import { SpecialtyGrid } from '../../components/SpecialtyGrid'

/**
 * Roster of the five members. Picking one selects them on the map (where their statistics float
 * next to them) and expands their file here: specialties and permanent conditions.
 */
export function CrewTab({
  game,
  selectedId,
  onSelect,
}: {
  game: GameState
  selectedId: CrewId | null
  onSelect: (id: CrewId | null) => void
}) {
  return (
    <ul className="roster">
      {CREW_IDS.map((id) => {
        const crew = game.crew[id]
        const def = CREW[id]
        const selected = selectedId === id
        const warnings = crew.activity === 'dead' ? [] : getWorkWarnings(crew)
        return (
          <li key={id} className={`roster-item${selected ? ' is-selected' : ''}`}>
            <button
              type="button"
              className="roster-head"
              aria-pressed={selected}
              aria-label={`Ver a ${def.name}`}
              onClick={() => onSelect(selected ? null : id)}
            >
              <CrewSprite crewId={id} size="sm" dimmed={crew.activity === 'dead'} />
              <span className="roster-name">
                <strong>{def.name}</strong>
                <span className="small muted">{SPECIALTY_LABELS[def.primarySpecialty]}</span>
              </span>
              <AvailabilityTag state={crew} />
            </button>
            {warnings.length > 0 && (
              <p className="small text-warn">{warnings.map((w) => w.title).join(' · ')}</p>
            )}
            {selected && (
              <div className="roster-detail">
                <h3 className="subhead">Especialidades</h3>
                <SpecialtyGrid specialties={def.specialties} />
                <h3 className="subhead">Estados permanentes</h3>
                {crew.conditions.length === 0 ? (
                  <p className="small muted">Sin estados permanentes activos.</p>
                ) : (
                  <ul className="condition-list">
                    {crew.conditions.map((c) => (
                      <li key={c}>
                        <strong>{CONDITIONS[c].name}</strong>{' '}
                        <span className="tag">
                          {CONDITION_CATEGORY_LABELS[CONDITIONS[c].category]}
                        </span>
                        <p>{CONDITIONS[c].effect}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="subhead">Estados únicos posibles</h3>
                <ul className="condition-list is-potential">
                  {def.uniqueConditionIds.map((c) => (
                    <li key={c}>
                      <strong>{CONDITIONS[c].name}</strong>
                      <p>{CONDITIONS[c].effect}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
