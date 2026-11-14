import { Link } from 'react-router'
import { CREW, SPECIALTY_LABELS, type CrewId } from '../../domain/content/crew'
import type { CrewState } from '../../domain/model/game'
import { STAT_KEYS } from '../../domain/model/stats'
import { getAvailability } from '../../domain/rules/availability'
import { getStatBounds } from '../../domain/rules/stats'
import { CrewSprite } from './CrewSprite'
import { ACTIVITY_LABELS } from '../activity'
import { StatMeter } from './StatMeter'

export function AvailabilityTag({ state }: { state: CrewState }) {
  const { available } = getAvailability(state)
  return (
    <span
      className={`tag ${available ? 'tag-ok' : state.activity === 'dead' ? 'tag-critical' : 'tag-warn'}`}
    >
      {ACTIVITY_LABELS[state.activity]}
    </span>
  )
}

export function CrewCard({ crewId, state }: { crewId: CrewId; state: CrewState }) {
  const crew = CREW[crewId]
  const bounds = getStatBounds(state.conditions)
  const { available } = getAvailability(state)
  return (
    <Link to={`/crew/${crewId}`} className="crew-card" aria-label={`Ficha de ${crew.name}`}>
      <div className="crew-card-head">
        <CrewSprite crewId={crewId} size="md" dimmed={!available} />
        <div>
          <strong className="crew-name">{crew.name}</strong>
          <span className="crew-role">{SPECIALTY_LABELS[crew.primarySpecialty]}</span>
          <AvailabilityTag state={state} />
        </div>
      </div>
      <div className="crew-card-stats">
        {STAT_KEYS.map((key) => (
          <StatMeter key={key} stat={key} value={state.stats[key]} max={bounds[key].max} compact />
        ))}
      </div>
    </Link>
  )
}
