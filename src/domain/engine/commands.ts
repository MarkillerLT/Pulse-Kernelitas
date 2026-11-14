import { CREW, isCrewId, type CrewId } from '../content/crew'
import { getEvent, type TaskOption } from '../content/events'
import { MAX_TEAM_SIZE, getMission, getRoute } from '../content/missions'
import type { GameState, Task } from '../model/game'
import { getAvailability, getWorkWarnings, type Warning } from '../rules/availability'
import { missionChance, taskChance, worstFactor, type ChanceResult } from '../rules/chance'
import { LEISURE_HOURS, SHIFT_HOURS } from '../rules/drift'
import { missionComposition, type MissionComposition } from './composition'
import { resolveEventTask } from './resolve'
import type { Note } from './spawn'
import { addCondition, addLog, aliveCrew, changeCrew, trackChanges } from './state'

export interface AssignOrder {
  taskId: string
  /** Event option id, mission route id, or 'grant' / 'deny' for requests. */
  optionId: string
  crewIds: readonly string[]
}

/** Options shown for a crew request. Resolved instantly. */
export const REQUEST_OPTIONS = [
  { id: 'grant', label: 'Conceder descanso', detail: 'Descansa 8 horas. Confianza +5.' },
  {
    id: 'deny',
    label: 'Denegar: lo necesitamos',
    detail: 'Sigue en su puesto. Confianza -5, Estrés +5.',
  },
] as const

export interface OptionInfo {
  label: string
  kind: 'crew' | 'auto' | 'mission' | 'request'
  minCrew: number
  maxCrew: number
  durationHours: number
}

export interface AssignmentPreview {
  errors: string[]
  option: OptionInfo | null
  chance: ChanceResult | null
  /** Members that trigger a warning; sending them anyway costs trust. */
  warnings: { crewId: CrewId; warnings: Warning[] }[]
  composition: MissionComposition | null
}

function optionInfo(task: Task, optionId: string): OptionInfo | null {
  if (task.kind === 'request') {
    const opt = REQUEST_OPTIONS.find((o) => o.id === optionId)
    return opt
      ? { label: opt.label, kind: 'request', minCrew: 0, maxCrew: 0, durationHours: 0 }
      : null
  }
  if (task.kind === 'mission') {
    const mission = getMission(task.refId)
    const route = mission && getRoute(mission, optionId)
    return route && mission
      ? {
          label: route.name,
          kind: 'mission',
          minCrew: 1,
          maxCrew: MAX_TEAM_SIZE,
          durationHours: mission.durationHours,
        }
      : null
  }
  const option = getEvent(task.refId)?.options.find((o) => o.id === optionId)
  if (!option) return null
  return {
    label: option.label,
    kind: option.kind,
    minCrew: option.kind === 'auto' ? 0 : (option.minCrew ?? 1),
    maxCrew: option.kind === 'auto' ? 0 : (option.maxCrew ?? 2),
    durationHours: option.durationHours,
  }
}

export function eventOption(task: Task, optionId: string): TaskOption | undefined {
  return task.kind === 'event'
    ? getEvent(task.refId)?.options.find((o) => o.id === optionId)
    : undefined
}

/** Everything the UI shows before confirming a decision. Pure. */
export function previewAssignment(state: GameState, order: AssignOrder): AssignmentPreview {
  const errors: string[] = []
  const empty: AssignmentPreview = {
    errors,
    option: null,
    chance: null,
    warnings: [],
    composition: null,
  }
  if (state.status !== 'active') errors.push('La partida terminó.')
  const task = state.tasks.find((t) => t.id === order.taskId)
  if (!task) {
    errors.push('La tarea ya no existe.')
    return empty
  }
  if (task.status !== 'open') errors.push('La tarea ya está en curso.')
  const option = optionInfo(task, order.optionId)
  if (!option) {
    errors.push('Opción no válida.')
    return empty
  }

  const crewIds: CrewId[] = []
  const seen = new Set<string>()
  for (const id of order.crewIds) {
    if (seen.has(id)) {
      errors.push('Un tripulante no puede asignarse dos veces.')
      continue
    }
    seen.add(id)
    if (!isCrewId(id)) {
      errors.push(`Tripulante desconocido: ${id}.`)
      continue
    }
    const availability = getAvailability(state.crew[id])
    if (!availability.available) errors.push(`${CREW[id].name}: ${availability.reasons.join(' ')}`)
    crewIds.push(id)
  }
  if (option.kind === 'crew' || option.kind === 'mission') {
    if (crewIds.length < option.minCrew)
      errors.push(
        option.minCrew === 1
          ? 'Selecciona al menos un tripulante.'
          : `Se necesitan ${option.minCrew} tripulantes.`,
      )
    if (crewIds.length > option.maxCrew)
      errors.push(`Máximo ${option.maxCrew} tripulante(s) para esta opción.`)
  } else if (crewIds.length) errors.push('Esta opción no requiere tripulantes.')

  const warnings = crewIds
    .map((crewId) => ({ crewId, warnings: getWorkWarnings(state.crew[crewId]) }))
    .filter((w) => w.warnings.length)

  let chance: ChanceResult | null = null
  let composition: MissionComposition | null = null
  if (task.kind === 'mission') {
    const route = getRoute(getMission(task.refId)!, order.optionId)!
    chance = missionChance(state, route.optimalCrew, crewIds)
    composition = missionComposition(route, crewIds, aliveCrew(state))
  } else if (task.kind === 'event') {
    const opt = eventOption(task, order.optionId)!
    chance = taskChance(state, opt.baseChance, opt.specialty, crewIds)
  }
  return { errors, option, chance, warnings, composition }
}

export type CommandResult =
  { ok: true; state: GameState; notes: Note[] } | { ok: false; errors: string[] }

/**
 * Assigns crew (or an automatic action) to a task. Members with warnings are "forced":
 * they go anyway, lose 5 trust, and three forced orders cause Rencor (Confianza máx. 70).
 */
export function assignTask(state: GameState, order: AssignOrder): CommandResult {
  const preview = previewAssignment(state, order)
  if (preview.errors.length || !preview.option) return { ok: false, errors: preview.errors }
  const draft = structuredClone(state)
  const notes: Note[] = []
  const task = draft.tasks.find((t) => t.id === order.taskId)!
  const crewIds = order.crewIds as CrewId[]

  if (task.kind === 'request') {
    resolveRequest(draft, task, order.optionId as 'grant' | 'deny', notes)
    return { ok: true, state: draft, notes }
  }

  const forcedIds = preview.warnings.map((w) => w.crewId)
  if (forcedIds.length) {
    const tracked = trackChanges(draft, () => {
      for (const id of forcedIds) {
        changeCrew(draft, id, { trust: -5 })
        const crew = draft.crew[id]
        crew.counters.forced += 1
        if (crew.counters.forced >= 3 && addCondition(draft, id, 'grudge'))
          notes.push({
            severity: 'warning',
            text: `${CREW[id].name} guarda Rencor: Confianza máxima 70.`,
            pause: false,
          })
      }
    })
    addLog(draft, {
      kind: 'crew',
      severity: 'warning',
      title: 'Orden forzada',
      text: `${forcedIds.map((id) => CREW[id].name).join(', ')} fue enviado pese a las advertencias. Confianza -5.`,
      crewIds: forcedIds,
      ...tracked,
    })
  }

  const duration = preview.option.durationHours
  task.status = 'active'
  task.assignment = {
    optionId: order.optionId,
    crewIds,
    startedAt: draft.hour,
    endsAt: draft.hour + duration,
    chance: preview.chance?.chance ?? 1,
    forcedIds,
    mainRisk: preview.chance ? (worstFactor(preview.chance.factors)?.label ?? null) : null,
  }
  for (const id of crewIds) {
    const crew = draft.crew[id]
    crew.activity = task.kind === 'mission' ? 'mission' : 'task'
    crew.taskId = task.id
    crew.activityUntil = task.assignment.endsAt
  }
  if (task.kind === 'mission') draft.missions[task.refId] = 'active'
  const who = crewIds.length ? crewIds.map((id) => CREW[id].name).join(', ') : 'N0VA-7'
  addLog(draft, {
    kind: task.kind === 'mission' ? 'mission' : 'task',
    severity: 'info',
    title: `Orden: ${task.title}`,
    text: `${preview.option.label}. Asignado: ${who}. Duración ${duration} h.`,
    crewIds: [...crewIds],
    chance: task.assignment.chance,
  })
  if (duration === 0) resolveEventTask(draft, task, notes)
  return { ok: true, state: draft, notes }
}

function resolveRequest(state: GameState, task: Task, choice: 'grant' | 'deny', notes: Note[]) {
  const id = task.targetId!
  const crew = state.crew[id]
  state.tasks = state.tasks.filter((t) => t.id !== task.id)
  const tracked = trackChanges(state, () => {
    if (choice === 'grant') {
      // Design §7: permitir descansos solicitados → Confianza +5.
      changeCrew(state, id, { trust: 5 })
      crew.activity = 'rest'
      crew.activityUntil = state.hour + SHIFT_HOURS
    } else changeCrew(state, id, { trust: -5, stress: 5 })
  })
  addLog(state, {
    kind: 'request',
    severity: choice === 'grant' ? 'success' : 'warning',
    title:
      choice === 'grant'
        ? `Descanso concedido: ${CREW[id].name}`
        : `Descanso denegado: ${CREW[id].name}`,
    text: choice === 'grant' ? 'Descansará 8 horas.' : 'Seguirá en su puesto. No le ha gustado.',
    crewIds: [id],
    ...tracked,
  })
  notes.push({
    severity: choice === 'grant' ? 'success' : 'warning',
    text:
      choice === 'grant'
        ? `${CREW[id].name} se va a descansar.`
        : `${CREW[id].name} sigue trabajando, a disgusto.`,
    pause: false,
  })
}

export type DirectOrder = 'duty' | 'rest' | 'medical' | 'leisure'

export const DIRECT_ORDERS: Record<DirectOrder, { label: string; detail: string }> = {
  rest: {
    label: 'Descansar',
    detail: `${SHIFT_HOURS} h en las cabinas. Recupera Sueño y baja el Estrés.`,
  },
  leisure: {
    label: 'Tiempo libre',
    detail: `${LEISURE_HOURS} h en el área común. Moral +5, Estrés -15.`,
  },
  medical: { label: 'Enfermería', detail: 'Recupera Salud hasta el alta. Consume medicinas.' },
  duty: { label: 'Volver al puesto', detail: 'Regresa a su sector de trabajo.' },
}

/**
 * Direct orders that change what a member does. Prioritising wellbeing of a saturated or
 * exhausted member gives +10 trust (design §7), at most once a day per member.
 */
export function orderCrew(state: GameState, crewId: string, order: DirectOrder): CommandResult {
  if (state.status !== 'active') return { ok: false, errors: ['La partida terminó.'] }
  if (!isCrewId(crewId)) return { ok: false, errors: ['Tripulante desconocido.'] }
  const current = state.crew[crewId]
  if (current.activity === 'dead') return { ok: false, errors: ['El tripulante ha fallecido.'] }
  if (current.activity === 'task' || current.activity === 'mission')
    return { ok: false, errors: ['Está ocupado en una tarea. Espera a que termine.'] }
  if (current.activity === order) return { ok: false, errors: ['Ya está haciendo eso.'] }
  if (order === 'duty' && Math.round(current.stats.health) <= 0)
    return { ok: false, errors: ['Está incapacitado: debe seguir en la enfermería.'] }
  if (order === 'duty' && Math.round(current.stats.sleep) <= 0)
    return { ok: false, errors: ['Está colapsado: necesita dormir.'] }

  const draft = structuredClone(state)
  const notes: Note[] = []
  const crew = draft.crew[crewId]
  const needsCare = crew.stats.stress >= 76 || crew.stats.sleep <= 24 || crew.stats.health <= 24
  crew.activity = order
  crew.activityUntil =
    order === 'rest'
      ? draft.hour + SHIFT_HOURS
      : order === 'leisure'
        ? draft.hour + LEISURE_HOURS
        : null
  const tracked = trackChanges(draft, () => {
    if (order !== 'duty' && needsCare && draft.hour >= crew.counters.wellbeingCooldownUntil) {
      changeCrew(draft, crewId, { trust: 10 })
      crew.counters.wellbeingCooldownUntil = draft.hour + 24
      notes.push({
        severity: 'success',
        text: `${CREW[crewId].name} agradece que priorices su bienestar (Confianza +10).`,
        pause: false,
      })
    }
  })
  // A pending rest request is answered by this order.
  if (order === 'rest' || order === 'leisure' || order === 'medical')
    draft.tasks = draft.tasks.filter((t) => !(t.kind === 'request' && t.targetId === crewId))
  addLog(draft, {
    kind: 'crew',
    severity: 'info',
    title: `${CREW[crewId].name}: ${DIRECT_ORDERS[order].label}`,
    text: DIRECT_ORDERS[order].detail,
    crewIds: [crewId],
    ...tracked,
  })
  return { ok: true, state: draft, notes }
}
