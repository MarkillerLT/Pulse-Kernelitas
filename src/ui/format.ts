import { STAT_KEYS, STAT_LABELS, type StatDelta, type StatKey } from '../domain/model/stats'

export const pad = (value: number, length = 3) => String(value).padStart(length, '0')

export function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

/** Whether a change is good for the crew. Stress is the only stat where going up is bad. */
export function deltaTone(key: StatKey, value: number): 'good' | 'bad' | 'neutral' {
  if (value === 0) return 'neutral'
  const improves = key === 'stress' ? value < 0 : value > 0
  return improves ? 'good' : 'bad'
}

export function describeDelta(delta: StatDelta): string {
  return STAT_KEYS.filter((key) => delta[key])
    .map((key) => `${STAT_LABELS[key]} ${formatDelta(delta[key]!)}`)
    .join(', ')
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}
