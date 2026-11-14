import { CREW_IDS, CREW, type CrewId } from '../content/crew'
import { SHIP_KEYS, SHIP_LABELS } from '../content/ship'
import type { GameState } from '../model/game'
import { STAT_KEYS, STAT_LABELS } from '../model/stats'
import { statBlockers } from './availability'
import { readStat } from './stats'

export interface Alert {
  id: string
  severity: 'warning' | 'critical'
  crewId?: CrewId
  title: string
  detail: string
}

/** Derived from the current state on demand, never stored, so it cannot fall out of sync. */
export function deriveAlerts(state: GameState): Alert[] {
  const alerts: Alert[] = []
  for (const key of SHIP_KEYS) {
    const value = Math.round(state.ship[key])
    if (value <= 25)
      alerts.push({
        id: `ship-${key}`,
        severity: value <= 10 ? 'critical' : 'warning',
        title: `${SHIP_LABELS[key]} ${value}%`,
        detail: value <= 10 ? 'Nivel crítico.' : 'Nivel bajo.',
      })
  }
  for (const id of CREW_IDS) {
    const crew = state.crew[id]
    if (crew.activity === 'dead') continue
    const name = CREW[id].name
    const blockers = statBlockers(crew.stats)
    if (blockers.length) {
      alerts.push({
        id: `${id}-out`,
        severity: 'critical',
        crewId: id,
        title: `${name} fuera de servicio`,
        detail: blockers.join(' '),
      })
      continue
    }
    for (const key of STAT_KEYS) {
      const reading = readStat(key, crew.stats[key])
      if (reading.level === 'critical')
        alerts.push({
          id: `${id}-${key}`,
          severity: 'critical',
          crewId: id,
          title: `${name}: ${STAT_LABELS[key]} ${Math.round(crew.stats[key])}`,
          detail: reading.label,
        })
    }
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1))
}
