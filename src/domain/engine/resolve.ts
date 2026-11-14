import { CREW, firstName, type CrewId } from '../content/crew'
import { getEvent } from '../content/events'
import { getMission, getRoute } from '../content/missions'
import type { GameState, Task } from '../model/game'
import { sumDeltas } from '../model/stats'
import { missionComposition, type EffectSource } from './composition'
import { nextRandom, pickRandom } from './random'
import { spawnMissionTask, type Note } from './spawn'
import {
  addCondition,
  addLog,
  aliveCrew,
  changeCrew,
  changeShip,
  fillText,
  nextId,
  trackChanges,
} from './state'

/** Brings a member back from a task or mission: duty, or straight to medical/rest if needed. */
export function releaseCrew(state: GameState, id: CrewId) {
  const crew = state.crew[id]
  if (crew.activity === 'dead') return
  crew.taskId = null
  crew.activityUntil = null
  if (Math.round(crew.stats.health) <= 0) crew.activity = 'medical'
  else if (Math.round(crew.stats.sleep) <= 0) {
    crew.activity = 'rest'
    crew.activityUntil = state.hour + 8
  } else crew.activity = 'duty'
}

export function killCrew(state: GameState, id: CrewId, notes: Note[]) {
  const crew = state.crew[id]
  if (crew.activity === 'dead') return
  const taskId = crew.taskId
  crew.activity = 'dead'
  crew.taskId = null
  crew.activityUntil = null
  const task = state.tasks.find((t) => t.id === taskId)
  if (task?.assignment) task.assignment.crewIds = task.assignment.crewIds.filter((c) => c !== id)
  const tracked = trackChanges(state, () => {
    for (const other of aliveCrew(state)) {
      // Design §7: a companion's death costs 20–50 morale; Duelo adds -15 permanent.
      changeCrew(state, other, { morale: -20 })
      if (addCondition(state, other, 'grief')) changeCrew(state, other, { morale: -15 })
      // Culpa del Comandante: each death +15 stress for Orion.
      if (other === 'orion') changeCrew(state, other, { stress: 15 })
    }
  })
  addLog(state, {
    kind: 'crew',
    severity: 'critical',
    title: `${CREW[id].name} ha muerto`,
    text: 'Sin tratamiento a tiempo, sus constantes vitales se apagaron. La tripulación está de luto.',
    crewIds: [id],
    ...tracked,
  })
  notes.push({ severity: 'critical', text: `${CREW[id].name} ha muerto.`, pause: true })
}

function roll(state: GameState, chance: number): boolean {
  const [seed, value] = nextRandom(state.rngSeed)
  state.rngSeed = seed
  return value < chance
}

function failureCause(task: Task): string {
  const risk = task.assignment?.mainRisk
  if (!risk) return ''
  return risk.startsWith('Sin ')
    ? ` Causa principal: la ausencia de ${risk.slice(4)} pesó demasiado.`
    : ` Causa principal: ${risk.charAt(0).toLowerCase()}${risk.slice(1)} provocó errores.`
}

export function removeTask(state: GameState, task: Task) {
  state.tasks = state.tasks.filter((t) => t.id !== task.id)
}

/** Resolves an active event task when its time is up. */
export function resolveEventTask(state: GameState, task: Task, notes: Note[]) {
  const event = getEvent(task.refId)
  const option = event?.options.find((o) => o.id === task.assignment?.optionId)
  if (!event || !option || !task.assignment) return removeTask(state, task)
  const crewIds = task.assignment.crewIds
  const lostTeam = option.kind === 'crew' && crewIds.length === 0
  const success = !lostTeam && roll(state, task.assignment.chance)
  const outcome = success ? option.success : option.failure
  const tracked = trackChanges(state, () => {
    for (const id of crewIds) {
      changeCrew(state, id, option.cost)
      changeCrew(state, id, outcome.participants)
    }
    for (const id of aliveCrew(state)) changeCrew(state, id, outcome.crew)
    if (task.targetId) changeCrew(state, task.targetId, outcome.target)
    changeShip(state, outcome.ship)
  })
  for (const id of crewIds) releaseCrew(state, id)
  removeTask(state, task)
  const text = fillText(outcome.text, task, crewIds) + (success ? '' : failureCause(task))
  addLog(state, {
    kind: 'task',
    severity: success ? 'success' : event.severity === 'critical' ? 'critical' : 'warning',
    title: `${success ? 'Completada' : 'Fallida'}: ${task.title}`,
    text,
    crewIds: [...crewIds],
    chance: task.assignment.chance,
    ...tracked,
  })
  notes.push({
    severity: success ? 'success' : 'critical',
    text: `${success ? 'Éxito' : 'Fallo'} — ${task.title}. ${text}`,
    pause: !success,
  })
  if (!success && outcome.retry) {
    state.tasks.push({
      ...task,
      id: nextId(state, 'T'),
      title: `Reintentar: ${event.title}`,
      attempt: task.attempt + 1,
      createdAt: state.hour,
      deadline: state.hour + event.deadlineHours,
      status: 'open',
      assignment: null,
    })
  }
}

/** Resolves a story mission when the team returns. */
export function resolveMissionTask(state: GameState, task: Task, notes: Note[]) {
  const mission = getMission(task.refId)
  const route = mission && getRoute(mission, task.assignment?.optionId)
  if (!mission || !route || !task.assignment) return removeTask(state, task)
  const crewIds = task.assignment.crewIds
  const comp = missionComposition(route, crewIds, aliveCrew(state))
  const success = crewIds.length > 0 && roll(state, task.assignment.chance)
  const lines: string[] = []

  const tracked = trackChanges(state, () => {
    for (const [id, sources] of Object.entries(comp.sources) as [CrewId, EffectSource[]][])
      changeCrew(state, id, sumDeltas(...sources.map((s) => s.delta)))
    for (const effect of comp.randomEffects) {
      if (!crewIds.length) break
      const [seed, target] = pickRandom(state.rngSeed, crewIds)
      state.rngSeed = seed
      changeCrew(state, target, effect.delta)
      lines.push(`${effect.label} Afectado al azar: ${CREW[target].name}.`)
    }
    for (const effect of comp.shipEffects) {
      if (effect.kind === 'ship') changeShip(state, effect.delta)
      else if (effect.kind === 'ship-scale')
        state.ship[effect.key] = Math.round(state.ship[effect.key] * effect.factor)
      else if (effect.kind === 'recovery-modifier')
        state.modifiers.recoveryMultiplier = Math.min(
          state.modifiers.recoveryMultiplier,
          effect.factor,
        )
    }
    changeShip(state, mission.impact)
    if (success) {
      changeShip(state, comp.reward.ship)
      for (const id of aliveCrew(state)) changeCrew(state, id, comp.reward.crew)
      // Design §7: éxito en misiones +5 a +20 Moral → +10 for the team.
      for (const id of crewIds) changeCrew(state, id, { morale: 10 })
    } else {
      for (const id of crewIds) changeCrew(state, id, { stress: 10 })
      for (const id of aliveCrew(state)) changeCrew(state, id, { morale: -5 })
    }
  })
  for (const id of crewIds) releaseCrew(state, id)
  removeTask(state, task)

  for (const rule of comp.activePenalties)
    lines.unshift(`Sin ${firstName(rule.crewId)}: ${rule.summary}`)
  const text = success
    ? `${comp.reward.text} ${lines.join(' ')}`.trim()
    : `El equipo regresó sin cumplir el objetivo.${failureCause(task)} ${lines.join(' ')}`.trim()
  state.missions[mission.id] = success ? 'completed' : 'failed'
  addLog(state, {
    kind: 'mission',
    severity: success ? 'success' : 'critical',
    title: `${success ? 'Misión cumplida' : 'Misión fallida'}: ${mission.title}`,
    text,
    crewIds: [...crewIds],
    chance: task.assignment.chance,
    ...tracked,
  })
  notes.push({
    severity: success ? 'success' : 'critical',
    text: success
      ? `Misión cumplida: ${mission.title}.`
      : `Misión fallida: ${mission.title}.${failureCause(task)} Puedes reintentarla.`,
    pause: true,
  })
  if (!success) spawnMissionTask(state, mission.id, task.attempt + 1)
}

/** An open task reached its deadline without a decision. */
export function expireTask(state: GameState, task: Task, notes: Note[]) {
  removeTask(state, task)
  if (task.kind === 'request') {
    const id = task.targetId!
    const tracked = trackChanges(state, () => changeCrew(state, id, { trust: -5 }))
    addLog(state, {
      kind: 'request',
      severity: 'warning',
      title: `Solicitud ignorada: ${CREW[id].name}`,
      text: 'N0VA-7 no respondió. Ignorar solicitudes erosiona la confianza.',
      crewIds: [id],
      ...tracked,
    })
    notes.push({
      severity: 'warning',
      text: `${CREW[id].name} se siente ignorado (Confianza -5).`,
      pause: false,
    })
    return
  }
  if (task.kind === 'mission') {
    const mission = getMission(task.refId)!
    state.missions[mission.id] = 'lost'
    const tracked = trackChanges(state, () => {
      for (const id of aliveCrew(state)) changeCrew(state, id, { morale: -10 })
    })
    addLog(state, {
      kind: 'mission',
      severity: 'critical',
      title: `Oportunidad perdida: ${mission.title}`,
      text: 'La ventana de la misión se cerró sin que N0VA-7 enviara un equipo.',
      ...tracked,
    })
    notes.push({ severity: 'critical', text: `Se perdió la misión ${mission.title}.`, pause: true })
    return
  }
  const event = getEvent(task.refId)
  if (!event) return
  const outcome = event.expire
  const tracked = trackChanges(state, () => {
    for (const id of aliveCrew(state)) changeCrew(state, id, outcome.crew)
    if (task.targetId) changeCrew(state, task.targetId, outcome.target)
    changeShip(state, outcome.ship)
  })
  const text = fillText(outcome.text, task)
  addLog(state, {
    kind: 'task',
    severity: 'critical',
    title: `Sin respuesta: ${task.title}`,
    text,
    crewIds: task.targetId ? [task.targetId] : [],
    ...tracked,
  })
  notes.push({ severity: 'critical', text: `${task.title}: ${text}`, pause: true })
}
