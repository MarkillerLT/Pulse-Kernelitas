import { CREW, type CrewId } from '../content/crew'
import { JOURNEY_DAYS, NIGHT_END, NIGHT_START } from '../content/ship'
import type { GameState } from '../model/game'
import { getStatBounds } from '../rules/stats'
import { MEDICINE_PER_HOUR, hourlyDrift } from '../rules/drift'
import { expireTask, killCrew, resolveEventTask, resolveMissionTask } from './resolve'
import { rollRandomEvent, spawnMissions, spawnRequests, type Note } from './spawn'
import {
  addCondition,
  addLog,
  aliveCrew,
  changeCrew,
  changeShip,
  dayOf,
  hourOfDay,
  trackChanges,
} from './state'

export interface AdvanceResult {
  state: GameState
  notes: Note[]
  /** True when a note asked for an automatic pause. */
  pause: boolean
}

const FOOD_PER_CREW_PER_HOUR = 0.6 / 24
const GREENHOUSE_PER_HOUR = 1.5 / 24
const POWER_DRAIN_PER_HOUR = 0.1
const ENGINEERING_PER_HOUR = 0.12
const DEATH_AFTER_HOURS = 24
const CHRONIC_INJURY_AFTER_HOURS = 48

/**
 * Advances the game clock by `hours`, one hour at a time. Pure: returns a new state.
 * Stops early when the game ends, or after an hour that requests an automatic pause
 * (when `stopOnPause` is set), so the player can react.
 */
export function advanceHours(
  state: GameState,
  hours: number,
  { stopOnPause = false } = {},
): AdvanceResult {
  if (state.status !== 'active' || hours <= 0) return { state, notes: [], pause: false }
  const draft = structuredClone(state)
  const notes: Note[] = []
  for (let i = 0; i < hours && draft.status === 'active'; i++) {
    const before = notes.length
    advanceOneHour(draft, notes)
    if (stopOnPause && notes.slice(before).some((n) => n.pause)) break
  }
  return { state: draft, notes, pause: notes.some((n) => n.pause) }
}

function advanceOneHour(state: GameState, notes: Note[]) {
  state.hour += 1
  const hour = state.hour
  const time = hourOfDay(hour)

  // 1. Stat drift by activity.
  for (const id of aliveCrew(state)) {
    const crew = state.crew[id]
    changeCrew(
      state,
      id,
      hourlyDrift(crew, {
        ship: state.ship,
        recoveryMultiplier: state.modifiers.recoveryMultiplier,
      }),
    )
    if (crew.activity === 'medical') changeShip(state, { medicine: -MEDICINE_PER_HOUR })
  }

  // 2. Ship upkeep.
  const alive = aliveCrew(state)
  changeShip(state, { food: -alive.length * FOOD_PER_CREW_PER_HOUR, power: -POWER_DRAIN_PER_HOUR })
  if (state.crew.kai.activity === 'duty') changeShip(state, { food: GREENHOUSE_PER_HOUR })
  if (state.crew.lyra.activity === 'duty') changeShip(state, { power: ENGINEERING_PER_HOUR })
  if (state.ship.power < 25) changeShip(state, { lifeSupport: -0.5 })
  else if (state.ship.power >= 50) changeShip(state, { lifeSupport: 0.05 })

  // 3. Crew condition and schedule.
  for (const id of alive) updateCrew(state, id, time, notes)

  // 4. Tasks: finish active ones, expire ignored ones.
  for (const task of [...state.tasks]) {
    if (task.status === 'active' && task.assignment && hour >= task.assignment.endsAt) {
      if (task.kind === 'mission') resolveMissionTask(state, task, notes)
      else resolveEventTask(state, task, notes)
    } else if (task.status === 'open' && hour >= task.deadline) expireTask(state, task, notes)
  }

  // 5. Daily effects at midnight.
  if (time === 0) dailyUpdate(state, notes)

  // 6. New decisions.
  spawnMissions(state, notes)
  rollRandomEvent(state, notes)
  spawnRequests(state, notes)

  // 7. End of the game.
  checkEnd(state, notes)
}

function updateCrew(state: GameState, id: CrewId, time: number, notes: Note[]) {
  const crew = state.crew[id]
  const name = CREW[id].name
  const health = Math.round(crew.stats.health)
  crew.counters.zeroHealthHours = health <= 0 ? crew.counters.zeroHealthHours + 1 : 0
  crew.counters.lowHealthHours = health < 25 ? crew.counters.lowHealthHours + 1 : 0

  if (
    crew.counters.lowHealthHours >= CHRONIC_INJURY_AFTER_HOURS &&
    addCondition(state, id, 'chronic-injury')
  ) {
    addLog(state, {
      kind: 'crew',
      severity: 'warning',
      title: `${name}: Lesión Crónica`,
      text: 'Dos días con salud crítica dejaron secuelas. Salud máxima -20.',
      crewIds: [id],
    })
    notes.push({
      severity: 'warning',
      text: `${name} desarrolló una Lesión Crónica.`,
      pause: false,
    })
  }
  if (crew.counters.zeroHealthHours >= DEATH_AFTER_HOURS) return killCrew(state, id, notes)

  const busy = crew.activity === 'task' || crew.activity === 'mission'
  if (health <= 0 && !busy && crew.activity !== 'medical') {
    crew.activity = 'medical'
    crew.activityUntil = null
    addLog(state, {
      kind: 'crew',
      severity: 'critical',
      title: `${name} incapacitado`,
      text: 'Trasladado al Centro Médico Ride. Necesita medicinas para recuperarse.',
      crewIds: [id],
    })
    notes.push({
      severity: 'critical',
      text: `${name} está incapacitado y fue trasladado a la enfermería.`,
      pause: true,
    })
    return
  }

  // Collapse from exhaustion (design §6.1: Sueño 0 → colapso inmediato).
  if (
    !busy &&
    crew.activity !== 'rest' &&
    crew.activity !== 'medical' &&
    Math.round(crew.stats.sleep) <= 0
  ) {
    crew.counters.sleepZero += 1
    crew.activity = 'rest'
    crew.activityUntil = state.hour + 8
    addLog(state, {
      kind: 'crew',
      severity: 'critical',
      title: `${name} colapsó`,
      text: 'El agotamiento lo dejó fuera de servicio durante 8 horas.',
      crewIds: [id],
    })
    notes.push({ severity: 'critical', text: `${name} colapsó por agotamiento.`, pause: true })
    if (crew.counters.sleepZero >= 2 && addCondition(state, id, 'insomnia'))
      addLog(state, {
        kind: 'crew',
        severity: 'warning',
        title: `${name}: Insomnio`,
        text: 'Tras colapsar dos veces, recupera la mitad de sueño.',
        crewIds: [id],
      })
    return
  }

  // Daily routine and timed activities.
  const until = crew.activityUntil
  switch (crew.activity) {
    case 'duty':
      if (time === NIGHT_START) {
        crew.activity = 'rest'
        crew.activityUntil = null
      }
      break
    case 'rest':
      if ((until === null && time === NIGHT_END) || (until !== null && state.hour >= until)) {
        crew.activity = 'duty'
        crew.activityUntil = null
      }
      break
    case 'leisure':
      if (until !== null && state.hour >= until) {
        crew.activity = 'duty'
        crew.activityUntil = null
      }
      break
    case 'medical': {
      const max = getStatBounds(crew.conditions).health.max
      if (Math.round(crew.stats.health) >= Math.min(90, max)) {
        crew.activity = 'duty'
        crew.activityUntil = null
        addLog(state, {
          kind: 'crew',
          severity: 'success',
          title: `${name} recibe el alta`,
          text: 'Vuelve a su puesto.',
          crewIds: [id],
        })
      }
      break
    }
  }
}

function dailyUpdate(state: GameState, notes: Note[]) {
  const tracked = trackChanges(state, () => {
    for (const id of aliveCrew(state)) {
      // Design §7: Estrés > 80 → la Moral disminuye cada día.
      if (state.crew[id].stats.stress > 80) changeCrew(state, id, { morale: -5 })
      if (state.ship.food <= 0) changeCrew(state, id, { morale: -5, health: -5 })
    }
  })
  addLog(state, {
    kind: 'system',
    severity: 'info',
    title: `Día ${dayOf(state.hour)} de ${JOURNEY_DAYS}`,
    text:
      state.ship.food <= 0
        ? 'Sin comida: la tripulación pasa hambre.'
        : 'Informe diario de N0VA-7.',
    ...tracked,
  })
  if (state.ship.food <= 0)
    notes.push({ severity: 'critical', text: 'No queda comida a bordo.', pause: true })
}

function checkEnd(state: GameState, notes: Note[]) {
  let reason: string | null = null
  let status: GameState['status'] = 'active'
  if (aliveCrew(state).length === 0) reason = 'No quedan tripulantes con vida.'
  else if (state.ship.lifeSupport <= 0) reason = 'El soporte vital colapsó.'
  else if (state.ship.hull <= 0) reason = 'El casco cedió.'
  if (reason) status = 'lost'
  else if (state.hour >= JOURNEY_DAYS * 24) {
    status = 'won'
    reason = `La Elysium llegó a su destino con ${aliveCrew(state).length} de 5 tripulantes.`
  }
  if (status === 'active') return
  state.status = status
  state.endReason = reason
  addLog(state, {
    kind: 'system',
    severity: status === 'won' ? 'success' : 'critical',
    title: status === 'won' ? 'Destino alcanzado' : 'Misión perdida',
    text: reason!,
  })
  notes.push({ severity: status === 'won' ? 'success' : 'critical', text: reason!, pause: true })
}
