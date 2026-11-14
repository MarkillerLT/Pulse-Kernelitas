import type { StatKey } from '../../domain/model/stats'
import { deltaTone, formatDelta } from '../format'

export function DeltaValue({ stat, value }: { stat: StatKey; value: number }) {
  return <span className={`delta delta-${deltaTone(stat, value)}`}>{formatDelta(value)}</span>
}
