import { useState } from 'react'
import { X } from 'lucide-react'
import { CREW, SPECIALTY_LABELS, type CrewId } from '../../domain/content/crew'
import { DIRECT_ORDERS, type DirectOrder } from '../../domain/engine/commands'
import { STAT_KEYS } from '../../domain/model/stats'
import { getWorkWarnings } from '../../domain/rules/availability'
import { getStatBounds } from '../../domain/rules/stats'
import { useGame } from '../../store/gameStore'
import { AvailabilityTag } from '../components/AvailabilityTag'
import { StatMeter } from '../components/StatMeter'

const ORDERS: DirectOrder[] = ['rest', 'leisure', 'medical', 'duty']

/**
 * Small floating card for the selected member: their statistics, warnings and direct orders.
 * ShipMap positions it next to the character every frame, so it follows them as they walk.
 */
export function CrewPopover({ crewId, onClose }: { crewId: CrewId; onClose: () => void }) {
  const crew = useGame((s) => s.game.crew[crewId])
  const order = useGame((s) => s.order)
  const [error, setError] = useState<{ id: CrewId; text: string } | null>(null)
  const def = CREW[crewId]
  const dead = crew.activity === 'dead'
  const busy = crew.activity === 'task' || crew.activity === 'mission'
  const warnings = dead ? [] : getWorkWarnings(crew)
  const bounds = getStatBounds(crew.conditions)
  const give = (o: DirectOrder) => {
    const result = order(crewId, o)
    setError(result.ok ? null : { id: crewId, text: result.errors.join(' ') })
  }

  return (
    <section className="crew-popover" role="group" aria-label={`Ficha de ${def.name}`}>
      <header className="crew-popover-head">
        <div>
          <strong>{def.name}</strong>
          <span className="crew-popover-role">{SPECIALTY_LABELS[def.primarySpecialty]}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar ficha">
          <X size={14} />
        </button>
      </header>
      <AvailabilityTag state={crew} />
      {!dead && (
        <div className="crew-popover-stats">
          {STAT_KEYS.map((key) => (
            <StatMeter key={key} stat={key} value={crew.stats[key]} max={bounds[key].max} compact />
          ))}
        </div>
      )}
      {warnings.map((w) => (
        <p key={w.title} className="small text-warn">
          {w.title}
        </p>
      ))}
      {!dead && (
        <div className="crew-orders">
          {ORDERS.map((o) => (
            <button
              key={o}
              type="button"
              className="btn btn-sm"
              title={DIRECT_ORDERS[o].detail}
              disabled={busy || crew.activity === o}
              onClick={() => give(o)}
            >
              {DIRECT_ORDERS[o].label}
            </button>
          ))}
        </div>
      )}
      {busy && <p className="small muted">Ocupado: podrá recibir órdenes al terminar.</p>}
      {error?.id === crewId && (
        <p className="small text-critical" role="alert">
          {error.text}
        </p>
      )}
    </section>
  )
}
