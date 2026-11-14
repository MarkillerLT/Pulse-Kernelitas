import type { CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'
import { useMissionStore } from '../../store/missionStore'
import type { Astronaut } from '../../simulation/models/mission'
import { activityLabels, healthLabels, roleLabels } from '../../lib/localization'
import { astronautFrames, getCrewSprite } from '../../game/sprites/spriteDefinitions'

export function Portrait({ astronautId }: { astronautId: string }) {
  const definition = getCrewSprite(astronautId)
  if (!definition) return null
  return (
    <div
      className="portrait"
      aria-hidden="true"
      data-astronaut-id={astronautId}
      style={
        {
          '--sprite-frame-width': `${astronautFrames.width}px`,
          '--sprite-frame-height': `${astronautFrames.height}px`,
          '--sprite-frame-count': astronautFrames.count,
          '--sprite-frame': astronautFrames.idle,
          '--sprite-url': `url(${definition.url})`,
        } as CSSProperties
      }
    >
      <div />
    </div>
  )
}
export function Status({ health }: { health: Astronaut['health'] }) {
  return (
    <span className={`crew-status ${health}`}>
      <i />
      {healthLabels[health]}
    </span>
  )
}
export function CrewList() {
  const crew = useMissionStore((s) => s.mission.crew)
  const selectedId = useMissionStore((s) => s.selectedId)
  const select = useMissionStore((s) => s.select)
  const orders = useMissionStore((s) => s.orders)
  return (
    <section className="crew-panel panel">
      <div className="panel-heading">
        <h2>Tripulación</h2>
        <span>03</span>
      </div>
      <div className="crew-cards">
        {crew.map((a) => (
          <button
            key={a.id}
            className={`crew-card ${selectedId === a.id ? 'selected' : ''}`}
            onClick={() => select(a.id)}
            aria-pressed={selectedId === a.id}
          >
            <div className="crew-identity">
              <Portrait astronautId={a.id} />
              <div>
                <strong>{a.name}</strong>
                <small>{roleLabels[a.role] ?? a.role}</small>
              </div>
              <ChevronRight size={14} />
            </div>
            <div className="crew-meta">
              <Status health={a.health} />
              <span>
                {orders.find((d) => d.astronautId === a.id)
                  ? 'Orden en cola'
                  : activityLabels[a.activity]}
              </span>
            </div>
            <div className="mini-track">
              <i style={{ width: `${a.cognition}%` }} />
            </div>
            <div className="crew-meta">
              <small>Preparación cognitiva</small>
              <b>
                {a.cognition}
                <em>/100</em>
              </b>
            </div>
          </button>
        ))}
      </div>
      <div className="crew-tip">
        <span className="eyebrow">NOTA DE DIRECCIÓN DE VUELO</span>
        <p>
          No existe el turno perfecto. <br />
          Protege a la tripulación. Mantén la misión en marcha.
        </p>
      </div>
    </section>
  )
}
