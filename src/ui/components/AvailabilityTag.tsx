import type { CrewState } from '../../domain/model/game'
import { getAvailability } from '../../domain/rules/availability'
import { ACTIVITY_LABELS } from '../activity'

/** What a member is doing, colored by whether they can take a new task. */
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
