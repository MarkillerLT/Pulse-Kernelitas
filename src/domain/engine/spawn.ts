import { CREW, type CrewId } from '../content/crew'
import {
  EVENT_LIST,
  REQUEST_COOLDOWN_HOURS,
  REQUEST_DEADLINE_HOURS,
  getEvent,
} from '../content/events'
import { MISSION_LIST } from '../content/missions'
import type { GameState, Task } from '../model/game'
import { getAvailability } from '../rules/availability'
import { levelScaling, nightFactor, scaledDeadline } from '../rules/difficulty'
import {
  addLog,
  aliveCrew,
  changeCrew,
  changeShip,
  dayOf,
  fillText,
  hourOfDay,
  nextId,
  trackChanges,
} from './state'
import { nextRandom, pickRandom } from './random'

export interface Note {
  severity: 'info' | 'success' | 'warning' | 'critical'
  text: string
  /** Auto-pause: a decision is needed or something serious happened. */
  pause: boolean
}

export const MISSION_SPAWN_HOUR = 9
export const MISSION_DEADLINE_HOURS = 24

/** Creates an event task (and applies its spawn effects). Returns null if it cannot spawn. */
export function spawnEvent(state: GameState, eventId: string, notes: Note[]): Task | null {
  const event = getEvent(eventId)
  if (!event) return null
  let targetId: CrewId | null = null
  if (event.hasTarget) {
    const candidates = aliveCrew(state).filter((id) => state.crew[id].activity !== 'mission')
    if (!candidates.length) return null
    const [seed, pick] = pickRandom(state.rngSeed, candidates)
    state.rngSeed = seed
    targetId = pick
  }
  const task: Task = {
    id: nextId(state, 'T'),
    kind: 'event',
    refId: event.id,
    title: event.title,
    sectorId: event.sectorId,
    severity: event.severity,
    createdAt: state.hour,
    deadline: state.hour + scaledDeadline(event.deadlineHours, state.difficulty.level),
    targetId,
    attempt: 1,
    recurring: false,
    status: 'open',
    assignment: null,
  }
  state.tasks.push(task)
  state.eventHistory[event.id] = state.hour
  const tracked = trackChanges(state, () => {
    if (targetId) changeCrew(state, targetId, event.onSpawn?.target)
    changeShip(state, event.onSpawn?.ship)
  })
  const text = fillText(event.description, task)
  addLog(state, {
    kind: 'task',
    severity: event.severity === 'critical' ? 'critical' : 'warning',
    title: `Nueva tarea: ${event.title}`,
    text,
    crewIds: targetId ? [targetId] : [],
    ...tracked,
  })
  notes.push({
    severity:
      event.severity === 'critical' ? 'critical' : event.severity === 'urgent' ? 'warning' : 'info',
    text: `${event.title}. ${text}`,
    pause: event.severity !== 'routine',
  })
  return task
}

/**
 * Random ship events. The chance, the number of simultaneous events and how often each one
 * repeats grow with the level; at higher levels more of them land during the night shift.
 */
export function rollRandomEvent(state: GameState, notes: Note[]) {
  const level = state.difficulty.level
  const scaling = levelScaling(level)
  const open = state.tasks.filter((t) => t.kind === 'event').length
  if (open >= scaling.maxOpenEvents) return
  const day = dayOf(state.hour)
  const [seed, roll] = nextRandom(state.rngSeed)
  state.rngSeed = seed
  if (roll >= scaling.eventChance * nightFactor(level, hourOfDay(state.hour))) return
  // Higher levels unlock the late events earlier.
  const unlockedDay = Math.max(day, level)
  const openRefs = new Set(state.tasks.map((t) => t.refId))
  const eligible = EVENT_LIST.filter(
    (e) =>
      e.weight > 0 &&
      e.minDay <= unlockedDay &&
      !openRefs.has(e.id) &&
      state.hour - (state.eventHistory[e.id] ?? -Infinity) >= e.cooldownHours / scaling.cooldown,
  )
  if (!eligible.length) return
  const total = eligible.reduce((sum, e) => sum + e.weight, 0)
  const [seed2, value] = nextRandom(state.rngSeed)
  state.rngSeed = seed2
  let threshold = value * total
  const chosen = eligible.find((e) => (threshold -= e.weight) < 0) ?? eligible[eligible.length - 1]
  spawnEvent(state, chosen.id, notes)
}

/** Story missions appear on their scheduled day at 09:00. */
export function spawnMissions(state: GameState, notes: Note[]) {
  if (hourOfDay(state.hour) !== MISSION_SPAWN_HOUR) return
  const day = dayOf(state.hour)
  for (const mission of MISSION_LIST) {
    if (mission.day !== day || state.missions[mission.id] !== 'pending') continue
    state.missions[mission.id] = 'available'
    spawnMissionTask(state, mission.id, 1)
    addLog(state, {
      kind: 'mission',
      severity: 'warning',
      title: `Misión disponible: ${mission.title}`,
      text: mission.objective,
    })
    notes.push({
      severity: 'warning',
      text: `Nueva misión: ${mission.title}. ${mission.objective}`,
      pause: true,
    })
  }
}

export function spawnMissionTask(
  state: GameState,
  missionId: string,
  attempt: number,
  recurring = false,
) {
  const mission = MISSION_LIST.find((m) => m.id === missionId)!
  const name = recurring ? `Expedición: ${mission.title}` : mission.title
  state.tasks.push({
    id: nextId(state, 'T'),
    kind: 'mission',
    refId: mission.id,
    title: attempt > 1 ? `Reintentar misión: ${name}` : name,
    sectorId: mission.sectorId,
    severity: 'critical',
    createdAt: state.hour,
    deadline: state.hour + scaledDeadline(MISSION_DEADLINE_HOURS, state.difficulty.level),
    targetId: null,
    attempt,
    recurring,
    status: 'open',
    assignment: null,
  })
}

/**
 * Recurring missions (from level 3): expeditions that repeat a story mission's route, cost and
 * reward. They appear more often each level and at any hour, so they clash with sleep.
 */
export function spawnRecurringMission(state: GameState, notes: Note[]) {
  const level = state.difficulty.level
  const interval = levelScaling(level).missionInterval
  if (interval === null || state.hour < state.nextMissionAt) return
  const maxOpen = level >= 10 ? 2 : 1
  if (state.tasks.filter((t) => t.kind === 'mission' && t.recurring).length >= maxOpen) return
  const openRefs = new Set(state.tasks.map((t) => t.refId))
  const candidates = MISSION_LIST.filter((m) => !openRefs.has(m.id)).map((m) => m.id)
  if (!candidates.length) return
  const [seed, missionId] = pickRandom(state.rngSeed, candidates)
  const [seed2, jitter] = nextRandom(seed)
  state.rngSeed = seed2
  state.nextMissionAt = state.hour + Math.round(interval * (0.75 + jitter * 0.5))
  spawnMissionTask(state, missionId, 1, true)
  const mission = MISSION_LIST.find((m) => m.id === missionId)!
  addLog(state, {
    kind: 'mission',
    severity: 'warning',
    title: `Expedición disponible: ${mission.title}`,
    text: `${mission.objective} Misión recurrente (nivel ${level}).`,
  })
  notes.push({
    severity: 'warning',
    text: `Nueva expedición: ${mission.title}. Hay que enviar un equipo.`,
    pause: true,
  })
}

/** Crew members who are saturated or exhausted ask N0VA-7 for rest. */
export function spawnRequests(state: GameState, notes: Note[]) {
  for (const id of aliveCrew(state)) {
    const crew = state.crew[id]
    if (crew.activity !== 'duty' || state.hour < crew.counters.requestCooldownUntil) continue
    if (!getAvailability(crew).available) continue
    if (crew.stats.stress < 76 && crew.stats.sleep > 24) continue
    if (state.tasks.some((t) => t.kind === 'request' && t.targetId === id)) continue
    crew.counters.requestCooldownUntil = state.hour + REQUEST_COOLDOWN_HOURS
    const reason =
      crew.stats.stress >= 76 ? 'Estrés en colapso inminente' : 'Agotamiento: sueño crítico'
    state.tasks.push({
      id: nextId(state, 'T'),
      kind: 'request',
      refId: 'rest',
      title: `${CREW[id].name} solicita descanso`,
      sectorId: 'habitat',
      severity: 'urgent',
      createdAt: state.hour,
      deadline: state.hour + REQUEST_DEADLINE_HOURS,
      targetId: id,
      attempt: 1,
      recurring: false,
      status: 'open',
      assignment: null,
    })
    addLog(state, {
      kind: 'request',
      severity: 'warning',
      title: `${CREW[id].name} solicita descanso`,
      text: `${reason}. Ignorar la solicitud reducirá su confianza en N0VA-7.`,
      crewIds: [id],
    })
    notes.push({
      severity: 'warning',
      text: `${CREW[id].name} solicita descanso. ${reason}.`,
      pause: true,
    })
  }
}
