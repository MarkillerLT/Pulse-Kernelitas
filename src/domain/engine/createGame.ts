import { CREW, CREW_IDS, type CrewId } from '../content/crew'
import { MISSION_IDS } from '../content/missions'
import { INITIAL_SHIP, START_HOUR } from '../content/ship'
import {
  GAME_SCHEMA_VERSION,
  type CrewState,
  type GameState,
  type MissionStatus,
} from '../model/game'
import { MODE_INFO, type DifficultyMode } from '../rules/difficulty'
import { spawnEvent } from './spawn'
import { addLog } from './state'

export interface NewGameOptions {
  /** ISO timestamp, injected so the engine stays independent of the clock. */
  now: string
  seed?: number
  /** Start with the tutorial task on the list (default true). */
  firstTask?: boolean
  /** Difficulty mode: sets the starting level (default 'easy'). */
  mode?: DifficultyMode
}

export const DEFAULT_SEED = 0x0e1751

/** Fresh game: initial statistics from the design document (§6.2), day 1 at 08:00. */
export function createGame({
  now,
  seed = DEFAULT_SEED,
  firstTask = true,
  mode = 'easy',
}: NewGameOptions): GameState {
  const crew = Object.fromEntries(
    CREW_IDS.map((id): [CrewId, CrewState] => [
      id,
      {
        stats: { ...CREW[id].initialStats },
        conditions: [],
        activity: 'duty',
        activityUntil: null,
        taskId: null,
        counters: {
          forced: 0,
          sleepZero: 0,
          lowHealthHours: 0,
          zeroHealthHours: 0,
          requestCooldownUntil: 0,
          wellbeingCooldownUntil: 0,
        },
      },
    ]),
  ) as Record<CrewId, CrewState>
  const missions = Object.fromEntries(
    MISSION_IDS.map((id) => [id, 'pending' satisfies MissionStatus]),
  ) as Record<string, MissionStatus>
  const state: GameState = {
    schemaVersion: GAME_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    hour: START_HOUR,
    rngSeed: seed >>> 0,
    difficulty: { mode, level: MODE_INFO[mode].startLevel },
    nextMissionAt: START_HOUR + 24,
    status: 'active',
    endReason: null,
    crew,
    ship: { ...INITIAL_SHIP },
    tasks: [],
    missions,
    eventHistory: {},
    modifiers: { recoveryMultiplier: 1 },
    nextId: 1,
    log: [],
    settings: { reducedMotion: false, autoPause: true },
  }
  addLog(state, {
    kind: 'system',
    severity: 'info',
    title: 'N0VA-7 en línea',
    text: `Modo ${MODE_INFO[mode].label}: nivel ${MODE_INFO[mode].startLevel}. Mantén a la tripulación con vida tanto como puedas.`,
  })
  if (firstTask) spawnEvent(state, 'air-filters', [])
  return state
}
