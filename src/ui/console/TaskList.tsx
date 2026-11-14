import { Clock, Rocket, Users } from 'lucide-react'
import { CREW, firstName } from '../../domain/content/crew'
import { getEvent } from '../../domain/content/events'
import { getMission } from '../../domain/content/missions'
import { SECTORS } from '../../domain/content/sectors'
import { REQUEST_OPTIONS } from '../../domain/engine/commands'
import { fillText } from '../../domain/engine/state'
import type { GameState, Task } from '../../domain/model/game'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { formatHours } from '../activity'

const SEVERITY_RANK = { critical: 0, urgent: 1, routine: 2 }
const SEVERITY_LABEL = { critical: 'Crítica', urgent: 'Urgente', routine: 'Rutina' }

function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.deadline - b.deadline,
  )
}

interface Props {
  game: GameState
  onChoose: (task: Task, optionId: string) => void
}

/** N0VA-7's task list: every pending decision with its options, plus work in progress. */
export function TaskList({ game, onChoose }: Props) {
  const assign = useGame((s) => s.assign)
  const tasks = sortTasks(game.tasks)
  if (!tasks.length)
    return (
      <p className="muted small task-empty">
        Sin tareas pendientes. La tripulación sigue su rutina.
      </p>
    )

  return (
    <ol className="task-list">
      {tasks.map((task) => {
        const left = task.deadline - game.hour
        const event = task.kind === 'event' ? getEvent(task.refId) : undefined
        const mission = task.kind === 'mission' ? getMission(task.refId) : undefined
        const description = event ? fillText(event.description, task) : mission?.objective
        if (task.status === 'active' && task.assignment) {
          const { startedAt, endsAt, crewIds, chance } = task.assignment
          const progress = endsAt > startedAt ? (game.hour - startedAt) / (endsAt - startedAt) : 1
          return (
            <li key={task.id} className="task-card is-active">
              <div className="task-head">
                <span className="tag tag-info">En curso</span>
                <strong>{task.title}</strong>
              </div>
              <div
                className="task-progress"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso de ${task.title}`}
              >
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="task-meta">
                <span className="team-inline">
                  {crewIds.length ? (
                    crewIds.map((id) => <CrewSprite key={id} crewId={id} size="sm" />)
                  ) : (
                    <span className="small muted">Automático</span>
                  )}
                </span>
                <span className="small muted">
                  {Math.round(chance * 100)}% · termina en {formatHours(endsAt - game.hour)}
                </span>
              </div>
            </li>
          )
        }
        return (
          <li key={task.id} className={`task-card sev-${task.severity}`}>
            <div className="task-head">
              <span className={`tag sev-${task.severity}`}>
                {task.kind === 'mission'
                  ? 'Misión'
                  : task.kind === 'request'
                    ? 'Solicitud'
                    : SEVERITY_LABEL[task.severity]}
              </span>
              <strong>{task.title}</strong>
            </div>
            <div className="task-meta small muted">
              <span>{SECTORS[task.sectorId].name}</span>
              <span className={left <= 2 ? 'text-critical' : undefined}>
                <Clock size={11} aria-hidden="true" /> Vence en {formatHours(left)}
              </span>
            </div>
            {description && <p className="task-desc">{description}</p>}
            {task.kind === 'request' && task.targetId && (
              <p className="task-desc">
                {firstName(task.targetId)} tiene {Math.round(game.crew[task.targetId].stats.stress)}{' '}
                de estrés y {Math.round(game.crew[task.targetId].stats.sleep)} de sueño.
              </p>
            )}
            <div className="task-options">
              {task.kind === 'request' &&
                REQUEST_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`btn btn-sm ${o.id === 'grant' ? 'btn-primary' : ''}`}
                    title={o.detail}
                    onClick={() => assign({ taskId: task.id, optionId: o.id, crewIds: [] })}
                  >
                    {o.label}
                  </button>
                ))}
              {event?.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onChoose(task, o.id)}
                >
                  {o.kind === 'crew' ? <Users size={12} aria-hidden="true" /> : null}
                  {o.label}
                </button>
              ))}
              {mission && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => onChoose(task, mission.routes[0].id)}
                >
                  <Rocket size={12} aria-hidden="true" /> Preparar equipo
                </button>
              )}
            </div>
            {task.targetId && task.kind === 'event' && (
              <p className="small muted">Afectado: {CREW[task.targetId].name}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
