import { STAT_LABELS, type StatKey } from '../../domain/model/stats'
import { readStat } from '../../domain/rules/stats'

interface Props {
  stat: StatKey
  value: number
  /** Effective maximum when a condition caps the statistic below 100. */
  max?: number
  compact?: boolean
}

const SEGMENTS = 10

/** Segmented retro meter. The color follows the design ranges, inverted for stress. */
export function StatMeter({ stat, value: raw, max = 100, compact = false }: Props) {
  const value = Math.round(raw)
  const reading = readStat(stat, value)
  const filled = Math.round(value / (100 / SEGMENTS))
  const locked = Math.round((100 - max) / (100 / SEGMENTS))
  return (
    <div
      className={`meter level-${reading.level}${compact ? ' is-compact' : ''}`}
      role="meter"
      aria-label={STAT_LABELS[stat]}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} de 100, ${reading.label}`}
      title={`${STAT_LABELS[stat]}: ${value} — ${reading.label}`}
    >
      <span className="meter-label">{STAT_LABELS[stat]}</span>
      <span className="meter-bar" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <i
            key={i}
            className={i < filled ? 'on' : i >= SEGMENTS - locked ? 'locked' : undefined}
          />
        ))}
      </span>
      <span className="meter-value">{value}</span>
      {!compact && <span className="meter-state">{reading.label}</span>}
    </div>
  )
}
