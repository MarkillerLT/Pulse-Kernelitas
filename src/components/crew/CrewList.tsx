import { ChevronRight } from 'lucide-react'
import { useMissionStore } from '../../store/missionStore'
import type { Astronaut } from '../../simulation/models/mission'

export function Portrait({ index, color }: { index: number; color: string }) {
  return (
    <div
      className="portrait"
      style={{ backgroundColor: `${color}12`, borderColor: `${color}40` }}
      aria-hidden="true"
    >
      <div
        style={{
          backgroundImage: `url(/assets/pixel-art/astronauts/spritesheets/crew-${index}.png)`,
        }}
      />
    </div>
  )
}
export function Status({ health }: { health: Astronaut['health'] }) {
  return (
    <span className={`crew-status ${health}`}>
      <i />
      {health}
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
        <h2>Crew manifest</h2>
        <span>03</span>
      </div>
      <div className="crew-cards">
        {crew.map((a, i) => (
          <button
            key={a.id}
            className={`crew-card ${selectedId === a.id ? 'selected' : ''}`}
            onClick={() => select(a.id)}
            aria-pressed={selectedId === a.id}
          >
            <div className="crew-identity">
              <Portrait index={i} color={a.color} />
              <div>
                <strong>{a.name}</strong>
                <small>{a.role}</small>
              </div>
              <ChevronRight size={14} />
            </div>
            <div className="crew-meta">
              <Status health={a.health} />
              <span>
                {orders.find((d) => d.astronautId === a.id) ? 'Order queued' : a.activity}
              </span>
            </div>
            <div className="mini-track">
              <i style={{ width: `${a.cognition}%`, background: a.color }} />
            </div>
            <div className="crew-meta">
              <small>Cognitive readiness</small>
              <b>
                {a.cognition}
                <em>/100</em>
              </b>
            </div>
          </button>
        ))}
      </div>
      <div className="crew-tip">
        <span className="eyebrow">FLIGHT DIRECTOR’S NOTE</span>
        <p>
          There is no perfect shift.
          <br />
          Protect the crew. Keep the mission moving.
        </p>
      </div>
    </section>
  )
}
