import { CREW, CREW_IDS, type CrewId } from '../content/crew'
import { SHIP_KEYS, type ShipDelta } from '../content/ship'
import type { CrewChange, GameState, LogEntry, Task } from '../model/game'
import { STAT_KEYS, type StatDelta, type Stats } from '../model/stats'
import { applyDelta, getStatBounds } from '../rules/stats'

/**
 * Mutation helpers used on a draft (a structuredClone of the state). Public engine functions
 * clone first, so callers never see their input modified.
 */
export const MAX_LOG = 300

export function aliveCrew(state: GameState): CrewId[] {
  return CREW_IDS.filter((id) => state.crew[id].activity !== 'dead')
}

export function changeCrew(state: GameState, id: CrewId, delta: StatDelta | undefined) {
  if (!delta) return
  const crew = state.crew[id]
  if (crew.activity === 'dead') return
  crew.stats = applyDelta(crew.stats, delta, getStatBounds(crew.conditions))
}

export function changeShip(state: GameState, delta: ShipDelta | undefined) {
  if (!delta) return
  for (const key of SHIP_KEYS) {
    const change = delta[key]
    if (change)
      state.ship[key] = Math.round(Math.min(100, Math.max(0, state.ship[key] + change)) * 100) / 100
  }
}

export function addCondition(state: GameState, id: CrewId, condition: string): boolean {
  const crew = state.crew[id]
  if (crew.conditions.includes(condition)) return false
  crew.conditions.push(condition)
  // A new limit (e.g. Rencor: Confianza máx. 70) applies immediately.
  crew.stats = applyDelta(crew.stats, {}, getStatBounds(crew.conditions))
  return true
}

export function nextId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`
}

export type LogInput = Omit<LogEntry, 'id' | 'hour' | 'changes' | 'ship' | 'chance' | 'crewIds'> &
  Partial<Pick<LogEntry, 'changes' | 'ship' | 'chance' | 'crewIds'>>

export function addLog(state: GameState, input: LogInput): LogEntry {
  const entry: LogEntry = {
    id: nextId(state, 'L'),
    hour: state.hour,
    crewIds: [],
    chance: null,
    changes: [],
    ship: {},
    ...input,
  }
  state.log.push(entry)
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG)
  return entry
}

/** Runs `fn` and reports which crew stats and ship systems it changed. */
export function trackChanges(
  state: GameState,
  fn: () => void,
): { changes: CrewChange[]; ship: ShipDelta } {
  const before = Object.fromEntries(
    CREW_IDS.map((id) => [id, { ...state.crew[id].stats }]),
  ) as Record<CrewId, Stats>
  const shipBefore = { ...state.ship }
  fn()
  const changes: CrewChange[] = []
  for (const id of CREW_IDS) {
    const after = state.crew[id].stats
    if (STAT_KEYS.some((k) => Math.abs(after[k] - before[id][k]) >= 0.5))
      changes.push({ crewId: id, before: before[id], after: { ...after } })
  }
  const ship: ShipDelta = {}
  for (const key of SHIP_KEYS) {
    const diff = Math.round(state.ship[key] - shipBefore[key])
    if (diff) ship[key] = diff
  }
  return { changes, ship }
}

export function fillText(
  text: string,
  task: Pick<Task, 'targetId'>,
  crewIds: readonly CrewId[] = [],
): string {
  return text
    .replaceAll('{target}', task.targetId ? CREW[task.targetId].name : 'un tripulante')
    .replaceAll('{team}', crewIds.map((id) => CREW[id].name).join(', ') || 'N0VA-7')
}

export const dayOf = (hour: number) => Math.floor(hour / 24) + 1
export const hourOfDay = (hour: number) => hour % 24
