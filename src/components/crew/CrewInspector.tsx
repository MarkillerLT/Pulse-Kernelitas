import type { CSSProperties } from 'react'
import { BedDouble, Dumbbell, Brain, Cross, Coffee, Terminal, X } from 'lucide-react'
import { useMissionStore } from '../../store/missionStore'
import { parameters } from '../../simulation/parameters/defaults'
import type { Activity } from '../../simulation/models/mission'
import { Button } from '../ui/button'
import { Portrait, Status } from './CrewList'
import { activityLabels, locationLabels, roleLabels } from '../../lib/localization'

const actions = [
  {
    activity: 'rest',
    label: 'Descansar',
    icon: BedDouble,
    effect: '−24 fatiga · +25 recuperación del sueño',
  },
  {
    activity: 'exercise',
    label: 'Ejercitar',
    icon: Dumbbell,
    effect: '+6 fatiga · recuperación diferida',
  },
  { activity: 'assessment', label: 'Evaluar', icon: Brain, effect: 'Resultados al día siguiente' },
  { activity: 'medical', label: 'Tratar', icon: Cross, effect: '−16 fatiga · −16 estrés' },
  { activity: 'social', label: 'Convivir', icon: Coffee, effect: '−18 estrés · −6 fatiga' },
  { activity: 'work', label: 'Trabajar', icon: Terminal, effect: '+Progreso · +11±2 fatiga' },
] satisfies { activity: Activity; label: string; icon: typeof Brain; effect: string }[]
export function CrewInspector() {
  const { mission, selectedId, orders, assign, clearOrders, busy } = useMissionStore()
  const index = mission.crew.findIndex((a) => a.id === selectedId)
  const a = mission.crew[index]
  const queued = orders.find((d) => d.astronautId === a.id)
  const loadColor = (value: number) =>
    value >= 90
      ? 'var(--color-critical-text)'
      : value >= 65
        ? 'var(--color-warning)'
        : 'var(--color-link)'
  const metrics = [
    {
      label: 'Recuperación del sueño',
      value: a.sleep,
      color: 'var(--color-link)',
      hint: 'Más alto: mejor recuperación.',
    },
    {
      label: 'Carga de fatiga',
      value: a.fatigue,
      color: loadColor(a.fatigue),
      hint: 'Más bajo: menor carga.',
    },
    {
      label: 'Rendimiento cognitivo',
      value: a.cognition,
      color: 'var(--color-link)',
      hint: 'Más alto: mayor preparación.',
    },
    {
      label: 'Respuesta al estrés',
      value: a.stress,
      color: loadColor(a.stress),
      hint: 'Más bajo: menor tensión.',
    },
  ]
  return (
    <aside className="inspector panel">
      <div className="panel-heading">
        <h2>Diagnóstico de la tripulación</h2>
        <span className="live-dot">SIMULADO</span>
      </div>
      <div className="inspector-identity">
        <Portrait astronautId={a.id} />
        <div>
          <h3>{a.name}</h3>
          <small>{roleLabels[a.role] ?? a.role}</small>
          <Status health={a.health} />
        </div>
      </div>
      <div className="location-line">
        <span>{locationLabels[a.location] ?? a.location}</span>
        <b>{activityLabels[a.activity]}</b>
      </div>
      <div className="metrics">
        {metrics.map((m) => (
          <div
            className="metric"
            key={m.label}
            style={{ '--metric-color': m.color } as CSSProperties}
          >
            <div>
              <span>{m.label}</span>
              <strong>
                {m.value}
                <small>/100</small>
              </strong>
            </div>
            <div
              className="metric-track"
              role="meter"
              aria-label={m.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={m.value}
              aria-valuetext={`${m.value} de 100. ${m.hint}`}
            >
              <i style={{ width: `${m.value}%` }} />
            </div>
            <p className="metric-help">{m.hint}</p>
          </div>
        ))}
      </div>
      <div className="assignment-heading">
        <span className="eyebrow">ASIGNAR PRÓXIMO TURNO</span>
        <small>1 actividad / astronauta / día · Se aplica al avanzar</small>
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
          : 'Las rutinas se repiten hasta que las cambies. Descansar reduce el progreso de la misión.'}
      </p>
      {orders.length > 0 && (
        <button className="text-button" onClick={clearOrders}>
          <X size={12} /> Cancelar órdenes en cola: {orders.length}
        </button>
      )}
    </aside>
  )
}
