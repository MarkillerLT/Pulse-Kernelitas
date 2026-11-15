import { useEffect, useState, type ReactNode } from 'react'
import {
  CREW,
  CREW_IDS,
  SPECIALTY_LABELS,
  firstName,
  type CrewId,
  type SpecialtyKey,
} from '../../domain/content/crew'
import { getEvent } from '../../domain/content/events'
import { getMission } from '../../domain/content/missions'
import { previewAssignment } from '../../domain/engine/commands'
import { getAvailability } from '../../domain/rules/availability'
import { showsOptimalTeam } from '../../domain/rules/difficulty'
import type { GameState } from '../../domain/model/game'
import { useGame } from '../../store/gameStore'
import { ACTIVITY_LABELS } from '../../ui/activity'
import { C } from '../colors'
import { Button, Label, Panel } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 0.78
const PAD = 0.03
const INNER = W - PAD * 2
const pct = (v: number) => `${Math.round(v * 100)}%`
const signed = (v: number) => `${v >= 0 ? '+' : '-'}${Math.abs(Math.round(v * 100))}%`

/**
 * VR version of the assign dialog: pick the team, read the success chance and its causes, send.
 * Same rules as the 2D AssignDialog, since both call previewAssignment / assign from the engine.
 */
export function AssignPanel({
  game,
  taskId,
  optionId: initialOption,
  position,
  rotY,
}: {
  game: GameState
  taskId: string
  optionId: string
  position: [number, number, number]
  rotY: number
}) {
  const assign = useGame((s) => s.assign)
  const close = useVrUi((s) => s.closeAssign)
  const [optionId, setOptionId] = useState(initialOption)
  const [selected, setSelected] = useState<CrewId[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const task = game.tasks.find((t) => t.id === taskId)
  const gone = !task || task.status !== 'open'
  // The task resolved or expired while the panel was open.
  useEffect(() => {
    if (gone) close()
  }, [gone, close])
  if (gone) return null

  const preview = previewAssignment(game, { taskId, optionId, crewIds: selected })
  const option = preview.option
  const event = task.kind === 'event' ? getEvent(task.refId) : undefined
  const eventOption = event?.options.find((o) => o.id === optionId)
  const mission = task.kind === 'mission' ? getMission(task.refId) : undefined
  const route = mission?.routes.find((r) => r.id === optionId)
  const needsCrew = !!option && option.maxCrew > 0
  const forced = preview.warnings.length > 0
  const specialty = eventOption?.specialty
  const hints = showsOptimalTeam(game.difficulty.level, task.severity)
  const recommended: CrewId[] = !hints
    ? []
    : route
      ? route.optimalCrew
      : specialty
        ? best(
            CREW_IDS.filter((id) => getAvailability(game.crew[id]).available),
            specialty,
            option?.minCrew ?? 1,
          )
        : []
  const blocking = preview.errors.filter((e) => !(selected.length === 0 && /al menos/.test(e)))

  const toggle = (id: CrewId) => {
    setErrors([])
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : option && cur.length >= option.maxCrew
          ? option.maxCrew === 1
            ? [id]
            : cur
          : [...cur, id],
    )
  }
  const confirm = () => {
    const result = assign({ taskId, optionId, crewIds: selected })
    if (result.ok) close()
    else setErrors(result.errors)
  }

  let y = -0.03
  const nodes: ReactNode[] = []
  const push = (node: ReactNode, h: number) => {
    nodes.push(node)
    y -= h
  }

  push(
    <Label key="tag" position={[PAD, y, 0]} size={0.016} color={C.accent} bold>
      {task.kind === 'mission' ? 'MISIÓN' : 'TAREA'}
    </Label>,
    0.026,
  )
  push(
    <Label key="title" position={[PAD, y, 0]} size={0.028} maxWidth={INNER - 0.12} bold>
      {clip(task.title, 34)}
    </Label>,
    0.05,
  )

  if (mission && mission.routes.length > 1) {
    const rw = (INNER - 0.008 * (mission.routes.length - 1)) / mission.routes.length
    nodes.push(
      ...mission.routes.map((r, i) => (
        <Button
          key={r.id}
          label={clip(r.name, 22)}
          size={0.016}
          active={r.id === optionId}
          width={rw}
          height={0.042}
          position={[PAD + i * (rw + 0.008), y, 0]}
          onClick={() => setOptionId(r.id)}
        />
      )),
    )
    y -= 0.055
  }

  if (option) {
    push(
      <Label key="opt" position={[PAD, y, 0]} size={0.018} color={C.muted} maxWidth={INNER}>
        {`${clip(option.label, 40)} · ${option.durationHours} h${needsCrew ? ` · ${option.minCrew === option.maxCrew ? option.maxCrew : `${option.minCrew}-${option.maxCrew}`} tripulante(s)` : ''}${specialty ? ` · ${SPECIALTY_LABELS[specialty]}` : ''}`}
      </Label>,
      0.04,
    )
  }

  if (needsCrew) {
    for (const id of CREW_IDS) {
      const crew = game.crew[id]
      if (crew.activity === 'dead') continue
      const av = getAvailability(crew)
      const isSel = selected.includes(id)
      const tagRec = recommended.includes(id) ? (route ? ' · ÓPTIMO' : ' · RECOMENDADO') : ''
      const lvl =
        specialty && hints
          ? ` ${SPECIALTY_LABELS[specialty]} ${CREW[id].specialties[specialty]} ·`
          : ''
      push(
        <Button
          key={id}
          label={`${isSel ? '[x] ' : '[  ] '}${firstName(id)}${tagRec}  ·${lvl} ${clip(av.available ? ACTIVITY_LABELS[crew.activity] : av.reasons[0], 26)}`}
          size={0.016}
          active={isSel}
          disabled={!av.available}
          width={INNER}
          height={0.044}
          position={[PAD, y, 0]}
          onClick={() => toggle(id)}
        />,
        0.05,
      )
    }
    y -= 0.008
  }

  if (preview.chance) {
    const c = preview.chance.chance
    const color = c >= 0.6 ? C.good : c >= 0.35 ? C.warn : C.critical
    const empty = needsCrew && selected.length === 0
    push(
      <group key="chance" position={[PAD, y, 0]}>
        <Label size={0.016} color={C.muted}>
          PROBABILIDAD DE ÉXITO
        </Label>
        <Label position={[0, -0.022, 0]} size={0.05} color={empty ? C.muted : color} bold>
          {empty ? '—' : pct(c)}
        </Label>
        {!empty &&
          preview.chance.factors.slice(0, 4).map((f, i) => (
            <Label
              key={i}
              position={[0.2, -0.022 - i * 0.022, 0]}
              size={0.016}
              color={f.value < 0 ? C.critical : C.text}
              maxWidth={INNER - 0.2}
            >
              {`${clip(!hints && f.label.startsWith('Sin ') ? 'Falta un especialista clave' : f.label, 34)}  ${f.label === 'Base' || f.label === 'Equipo óptimo' ? pct(f.value) : signed(f.value)}`}
            </Label>
          ))}
      </group>,
      0.12,
    )
  }

  if (forced) {
    const first = preview.warnings[0]
    push(
      <Label key="warn" position={[PAD, y, 0]} size={0.016} color={C.warn} maxWidth={INNER}>
        {clip(
          `${first.warnings[0].title} (${firstName(first.crewId)}). Enviarlo de todas formas reduce su Confianza (-5).`,
          110,
        )}
      </Label>,
      0.05,
    )
  }

  const errs = [...new Set([...errors, ...blocking])]
  if (errs.length)
    push(
      <Label key="err" position={[PAD, y, 0]} size={0.016} color={C.critical} maxWidth={INNER}>
        {clip(errs.join(' '), 110)}
      </Label>,
      0.05,
    )

  const bw = (INNER - 0.01) / 2
  nodes.push(
    <Button
      key="cancel"
      label="Cancelar"
      width={bw}
      height={0.055}
      position={[PAD, y, 0]}
      onClick={close}
    />,
    <Button
      key="go"
      label={forced ? 'Mandar de igual forma' : needsCrew ? 'Enviar ahora' : 'Ejecutar'}
      tone={forced ? 'danger' : 'primary'}
      disabled={preview.errors.length > 0}
      width={bw}
      height={0.055}
      position={[PAD + bw + 0.01, y, 0]}
      onClick={confirm}
    />,
  )
  y -= 0.055 + PAD
  const height = -y

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={height}>
        <Button
          label="X"
          width={0.05}
          height={0.05}
          position={[W - PAD - 0.05, -0.02, 0]}
          onClick={close}
        />
        {nodes}
      </Panel>
    </group>
  )
}

function best(ids: CrewId[], specialty: SpecialtyKey, count: number): CrewId[] {
  return [...ids]
    .sort((a, b) => CREW[b].specialties[specialty] - CREW[a].specialties[specialty])
    .slice(0, Math.max(1, count))
}
