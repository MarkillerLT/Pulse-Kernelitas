import { CREW_IDS, CREW, type CrewId } from '../content/crew'
import type { GameState } from '../model/game'
import { STAT_KEYS, STAT_LABELS } from '../model/stats'
import { getAvailability } from './availability'
import { readStat } from './stats'

export interface Alert {
  id: string
  severity: 'warning' | 'critical'
  crewId?: CrewId
  title: string
  detail: string
}

/**
 * Alerts are derived from the current state on demand, never stored, so they cannot fall out of
 * sync with the statistics they describe.
 */
export function deriveAlerts(state: GameState): Alert[] {
  const alerts: Alert[] = []
  let unavailable = 0
  for (const id of CREW_IDS) {
    const { stats } = state.crew[id]
    const name = CREW[id].name
    const availability = getAvailability(stats)
    if (!availability.available) {
      unavailable += 1
      alerts.push({
        id: `${id}-unavailable`,
        severity: 'critical',
        crewId: id,
        title: `${name} fuera de servicio`,
        detail: availability.reasons.join(' '),
      })
      continue
    }
    for (const key of STAT_KEYS) {
      const reading = readStat(key, stats[key])
      if (reading.level === 'critical' || reading.level === 'warn') {
        alerts.push({
          id: `${id}-${key}`,
          severity: reading.level === 'critical' ? 'critical' : 'warning',
          crewId: id,
          title: `${name}: ${STAT_LABELS[key]} ${stats[key]}`,
          detail: reading.label,
        })
      }
    }
  }
  if (unavailable === CREW_IDS.length) {
    alerts.unshift({
      id: 'crew-unavailable',
      severity: 'critical',
      title: 'Ningún tripulante disponible',
      detail: 'La tripulación completa está fuera de servicio.',
    })
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1))
}
