import type { ReactNode } from 'react'
import { firstName } from '../../domain/content/crew'
import { getEvent } from '../../domain/content/events'
import { getMission } from '../../domain/content/missions'
import { SECTORS } from '../../domain/content/sectors'
import { REQUEST_OPTIONS } from '../../domain/engine/commands'
import { fillText } from '../../domain/engine/state'
import type { GameState, Task } from '../../domain/model/game'
import { useGame, type GameStore } from '../../store/gameStore'
import { formatHours } from '../../ui/activity'
import { C, SEVERITY_COLOR } from '../colors'
import { Button, Label, Meter, Panel } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 0.78
const PAD = 0.03
const INNER = W - PAD * 2
const MAX_CARDS = 4
const SEVERITY_RANK = { critical: 0, urgent: 1, routine: 2 }
const SEVERITY_LABEL = { critical: 'CRÍTICA', urgent: 'URGENTE', routine: 'RUTINA' }

function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.deadline - b.deadline,
  )
}

interface Option {
  label: string
  tone?: 'primary'
  onClick: () => void
}

/** Builds one card at the cursor and returns its height. */
function card(
  task: Task,
  game: GameState,
  y: number,
  actions: {
    assign: GameStore['assign']
    openAssign: (taskId: string, optionId: string) => void
  },
): { node: ReactNode; height: number } {
  if (task.status === 'active' && task.assignment) {
    const { startedAt, endsAt, crewIds, chance } = task.assignment
    const progress = endsAt > startedAt ? (game.hour - startedAt) / (endsAt - startedAt) : 1
    const height = 0.105
    return {
      height,
      node: (
        <group key={task.id} position={[PAD, y, 0]}>
          <Label size={0.017} color={C.accent} bold>
            EN CURSO
          </Label>
          <Label position={[0.13, 0, 0]} size={0.021} maxWidth={INNER - 0.13} bold>
            {clip(task.title, 38)}
          </Label>
          <Meter position={[0, -0.04, 0]} width={INNER} value={progress * 100} />
          <Label position={[0, -0.062, 0]} size={0.017} color={C.muted} maxWidth={INNER}>
            {`${crewIds.length ? crewIds.map(firstName).join(', ') : 'Automático'} · ${Math.round(chance * 100)}% · termina en ${formatHours(endsAt - game.hour)}`}
          </Label>
        </group>
      ),
    }
  }

  const left = task.deadline - game.hour
  const event = task.kind === 'event' ? getEvent(task.refId) : undefined
  const mission = task.kind === 'mission' ? getMission(task.refId) : undefined
  const description = event ? fillText(event.description, task) : (mission?.objective ?? '')
  const options: Option[] = []
  if (task.kind === 'request')
    for (const o of REQUEST_OPTIONS)
      options.push({
        label: o.label,
        tone: o.id === 'grant' ? 'primary' : undefined,
        onClick: () => actions.assign({ taskId: task.id, optionId: o.id, crewIds: [] }),
      })
  for (const o of event?.options ?? [])
    options.push({ label: o.label, onClick: () => actions.openAssign(task.id, o.id) })
  if (mission)
    options.push({
      label: 'Preparar equipo',
      tone: 'primary',
      onClick: () => actions.openAssign(task.id, mission.routes[0].id),
    })

  const tag =
    task.kind === 'mission'
      ? 'MISIÓN'
      : task.kind === 'request'
        ? 'SOLICITUD'
        : SEVERITY_LABEL[task.severity]
  const extra =
    task.kind === 'request' && task.targetId
      ? ` ${firstName(task.targetId)}: estrés ${Math.round(game.crew[task.targetId].stats.stress)}, sueño ${Math.round(game.crew[task.targetId].stats.sleep)}.`
      : ''
  const descText = clip(description + extra, 150)
  const descLines = Math.min(4, Math.ceil(descText.length / 52))
  const descH = descLines * 0.019 * 1.25
  const BTN_H = 0.046
  const GAP = 0.008
  const rows = Math.ceil(options.length / 2)
  const btnW = (INNER - GAP) / 2
  const top = 0.06
  const height = top + descH + 0.014 + rows * (BTN_H + GAP) + 0.012

  return {
    height,
    node: (
      <group key={task.id} position={[PAD, y, 0]}>
        <mesh position={[-0.012, -height / 2 + 0.006, -0.0005]}>
          <planeGeometry args={[0.005, height - 0.012]} />
          <meshBasicMaterial color={SEVERITY_COLOR[task.severity]} />
        </mesh>
        <Label size={0.016} color={SEVERITY_COLOR[task.severity]} bold>
          {tag}
        </Label>
        <Label position={[0.15, 0.001, 0]} size={0.021} maxWidth={INNER - 0.15} bold>
          {clip(task.title, 40)}
        </Label>
        <Label position={[0, -0.03, 0]} size={0.016} color={left <= 2 ? C.critical : C.muted}>
          {`${SECTORS[task.sectorId].name} · vence en ${formatHours(left)}`}
        </Label>
        <Label position={[0, -top, 0]} size={0.019} maxWidth={INNER} color="#c4cede">
          {descText}
        </Label>
        {options.map((o, i) => (
          <Button
            key={o.label + i}
            label={clip(o.label, 30)}
            tone={o.tone}
            size={0.017}
            width={options.length === 1 ? INNER : btnW}
            height={BTN_H}
            position={[
              (i % 2) * (btnW + GAP),
              -(top + descH + 0.014 + Math.floor(i / 2) * (BTN_H + GAP)),
              0,
            ]}
            onClick={o.onClick}
          />
        ))}
      </group>
    ),
  }
}

/** N0VA-7's decisions, as a floating panel to the player's left. */
export function TaskPanel({
  game,
  position,
  rotY,
}: {
  game: GameState
  position: [number, number, number]
  rotY: number
}) {
  const assign = useGame((s) => s.assign)
  const openAssign = useVrUi((s) => s.openAssign)
  const sectorFilter = useVrUi((s) => s.sectorFilter)
  const filterSector = useVrUi((s) => s.filterSector)
  const all = sortTasks(game.tasks).filter((t) => !sectorFilter || t.sectorId === sectorFilter)
  const shown = all.slice(0, MAX_CARDS)

  const header = 0.11
  let y = -header
  const cards: ReactNode[] = []
  for (const task of shown) {
    const { node, height } = card(task, game, y, { assign, openAssign })
    cards.push(node)
    y -= height + 0.02
  }
  const footer = all.length > shown.length || !shown.length ? 0.05 : 0
  const height = Math.max(0.3, -y + footer + 0.01)

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={height}>
        <Label position={[PAD, -0.03, 0]} size={0.03} bold>
          Decisiones
        </Label>
        <Label position={[PAD + 0.22, -0.038, 0]} size={0.017} color={C.muted}>
          {sectorFilter ? `Sector: ${SECTORS[sectorFilter].name}` : 'Toca un sector para filtrar'}
        </Label>
        {sectorFilter && (
          <Button
            label="Ver todas"
            size={0.016}
            width={0.14}
            height={0.04}
            position={[W - PAD - 0.14, -0.022, 0]}
            onClick={() => filterSector(null)}
          />
        )}
        {cards}
        {!shown.length && (
          <Label position={[PAD, y, 0]} size={0.019} color={C.muted} maxWidth={INNER}>
            Sin tareas pendientes. La tripulación sigue su rutina.
          </Label>
        )}
        {all.length > shown.length && (
          <Label position={[PAD, y, 0]} size={0.017} color={C.muted}>
            {`+${all.length - shown.length} más (resuelve las de arriba primero)`}
          </Label>
        )}
      </Panel>
    </group>
  )
}
