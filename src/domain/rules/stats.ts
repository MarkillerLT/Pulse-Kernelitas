import { getCondition } from '../content/conditions'
import {
  STAT_KEYS,
  STAT_MAX,
  STAT_MIN,
  type StatDelta,
  type StatKey,
  type Stats,
} from '../model/stats'

export type StatLevel = 'good' | 'ok' | 'warn' | 'critical' | 'fail'

export interface StatReading {
  label: string
  level: StatLevel
}

interface Band {
  min: number
  label: string
  level: StatLevel
}

/** Ranges from the design document (§6.1), ordered from highest threshold to lowest. */
const HIGH_IS_GOOD: Record<Exclude<StatKey, 'stress'>, Band[]> = {
  health: [
    { min: 75, label: 'Excelente', level: 'good' },
    { min: 50, label: 'Estable', level: 'ok' },
    { min: 25, label: 'Lesionado', level: 'warn' },
    { min: 1, label: 'Crítico', level: 'critical' },
    { min: 0, label: 'Incapacitado o muerto', level: 'fail' },
  ],
  morale: [
    { min: 75, label: 'Inspirado', level: 'good' },
    { min: 50, label: 'Normal', level: 'ok' },
    { min: 25, label: 'Desmotivado', level: 'warn' },
    { min: 1, label: 'Deprimido', level: 'critical' },
    { min: 0, label: 'Se niega a cooperar', level: 'fail' },
  ],
  sleep: [
    { min: 75, label: 'Descansado', level: 'good' },
    { min: 50, label: 'Cansado', level: 'ok' },
    { min: 25, label: 'Exhausto', level: 'warn' },
    { min: 1, label: 'Crítico', level: 'critical' },
    { min: 0, label: 'Colapso inmediato', level: 'fail' },
  ],
  trust: [
    { min: 75, label: 'Leal', level: 'good' },
    { min: 50, label: 'Confiado', level: 'ok' },
    { min: 25, label: 'Dudas', level: 'warn' },
    { min: 1, label: 'Desconfianza', level: 'critical' },
    { min: 0, label: 'Desobediencia', level: 'fail' },
  ],
}

/** Stress is the only statistic where a high value is bad. */
const STRESS: Band[] = [
  { min: 76, label: 'Colapso inminente', level: 'critical' },
  { min: 51, label: 'Saturado', level: 'warn' },
  { min: 26, label: 'Tenso', level: 'ok' },
  { min: 0, label: 'Tranquilo', level: 'good' },
]

export function readStat(key: StatKey, value: number): StatReading {
  const bands = key === 'stress' ? STRESS : HIGH_IS_GOOD[key]
  const band = bands.find((b) => value >= b.min) ?? bands[bands.length - 1]
  return { label: band.label, level: band.level }
}

export type StatBounds = Record<StatKey, { min: number; max: number }>

/**
 * Effective limits for a crew member: 0–100, narrowed by any active condition with a precise
 * numeric limit (e.g. Rencor: Confianza máxima 70; Lealtad Inquebrantable: nunca bajo 40).
 */
export function getStatBounds(conditionIds: readonly string[]): StatBounds {
  const bounds = Object.fromEntries(
    STAT_KEYS.map((key) => [key, { min: STAT_MIN, max: STAT_MAX }]),
  ) as StatBounds
  for (const id of conditionIds) {
    const limits = getCondition(id)?.bounds
    if (!limits) continue
    for (const key of STAT_KEYS) {
      const limit = limits[key]
      if (!limit) continue
      if (limit.max !== undefined) bounds[key].max = Math.min(bounds[key].max, limit.max)
      if (limit.min !== undefined) bounds[key].min = Math.max(bounds[key].min, limit.min)
    }
  }
  for (const key of STAT_KEYS) {
    if (bounds[key].min > bounds[key].max) bounds[key].min = bounds[key].max
  }
  return bounds
}

export function clamp(value: number, min = STAT_MIN, max = STAT_MAX): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Returns new stats with the delta applied and every value kept inside its bounds. Pure. */
export function applyDelta(stats: Stats, delta: StatDelta, bounds?: StatBounds): Stats {
  const next = { ...stats }
  for (const key of STAT_KEYS) {
    const change = delta[key] ?? 0
    const limit = bounds?.[key] ?? { min: STAT_MIN, max: STAT_MAX }
    next[key] = clamp(stats[key] + change, limit.min, limit.max)
  }
  return next
}

export function diffStats(before: Stats, after: Stats): StatDelta {
  const delta: StatDelta = {}
  for (const key of STAT_KEYS) {
    if (after[key] !== before[key]) delta[key] = after[key] - before[key]
  }
  return delta
}
