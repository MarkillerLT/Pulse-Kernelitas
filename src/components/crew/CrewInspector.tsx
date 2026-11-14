import { BedDouble, Dumbbell, Brain, Cross, Coffee, Terminal, X } from 'lucide-react'
import { useMissionStore } from '../../store/missionStore'
import { parameters } from '../../simulation/parameters/defaults'
import type { Activity } from '../../simulation/models/mission'
import { Button } from '../ui/button'
import { Portrait, Status } from './CrewList'

const actions = [
  { activity: 'rest', label: 'Rest', icon: BedDouble, effect: '−24 fatigue · +25 sleep' },
  {
    activity: 'exercise',
    label: 'Exercise',
    icon: Dumbbell,
    effect: '+6 fatigue · delayed recovery',
  },
  { activity: 'assessment', label: 'Assess', icon: Brain, effect: 'Results arrive next day' },
  { activity: 'medical', label: 'Treat', icon: Cross, effect: '−16 fatigue · −16 stress' },
  { activity: 'social', label: 'Socialize', icon: Coffee, effect: '−18 stress · −6 fatigue' },
  { activity: 'work', label: 'Duty', icon: Terminal, effect: '+Progress · +11±2 fatigue' },
] satisfies { activity: Activity; label: string; icon: typeof Brain; effect: string }[]
export function CrewInspector() {
  const { mission, selectedId, orders, assign, clearOrders, busy } = useMissionStore()
  const index = mission.crew.findIndex((a) => a.id === selectedId)
  const a = mission.crew[index]
  const queued = orders.find((d) => d.astronautId === a.id)
  const metrics = [
    { label: 'Sleep recovery', value: a.sleep, color: '#ac9bf2' },
    { label: 'Fatigue load', value: a.fatigue, color: a.fatigue >= 65 ? '#f0c477' : '#4de1d4' },
    { label: 'Cognitive performance', value: a.cognition, color: '#4de1d4' },
    { label: 'Stress response', value: a.stress, color: '#f0a099' },
  ]
  return (
    <aside className="inspector panel">
      <div className="panel-heading">
        <h2>Crew diagnostics</h2>
        <span className="live-dot">LIVE</span>
      </div>
      <div className="inspector-identity">
        <Portrait index={index} color={a.color} />
        <div>
          <h3>{a.name}</h3>
          <small>{a.role}</small>
          <Status health={a.health} />
        </div>
      </div>
      <div className="location-line">
        <span>{a.location}</span>
        <b>{a.activity}</b>
      </div>
      <div className="metrics">
        {metrics.map((m) => (
          <div className="metric" key={m.label}>
            <div>
              <span>{m.label}</span>
              <strong style={{ color: m.color }}>
                {m.value}
                <small>/100</small>
              </strong>
            </div>
            <div className="metric-track">
              <i style={{ width: `${m.value}%`, backgroundColor: m.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="assignment-heading">
        <span className="eyebrow">ASSIGN NEXT SHIFT</span>
        <small>1 activity / crew / day</small>
      </div>
      <div className="action-grid">
        {actions.map(({ activity, label, icon: Icon, effect }) => (
          <Button
            key={activity}
            variant="outline"
            className={`assignment ${queued?.activity === activity ? 'queued' : ''}`}
            disabled={busy || mission.status !== 'active'}
            onClick={() => assign(activity)}
            title={effect}
            aria-label={`${label} ${parameters.activityCosts[activity]} OP${activity === 'medical' ? ' + 2 MED' : ''}`}
            aria-pressed={queued?.activity === activity}
          >
            <span>
              <Icon size={15} />
              {label}
            </span>
            <small>
              {parameters.activityCosts[activity]} OP{activity === 'medical' ? ' + 2 MED' : ''}
            </small>
          </Button>
        ))}
      </div>
      <p className="order-detail">
        {queued
          ? actions.find((x) => x.activity === queued.activity)?.effect
          : 'Routines repeat until reassigned. Rest sacrifices mission output.'}
      </p>
      {orders.length > 0 && (
        <button className="text-button" onClick={clearOrders}>
          <X size={12} /> Clear all {orders.length} queued orders
        </button>
      )}
    </aside>
  )
}
