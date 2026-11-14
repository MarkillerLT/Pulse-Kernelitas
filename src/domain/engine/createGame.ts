import { CREW, CREW_IDS, type CrewId } from '../content/crew'
import { MISSION_IDS } from '../content/missions'
import {
  GAME_SCHEMA_VERSION,
  type CrewState,
  type GameState,
  type MissionStatus,
} from '../model/game'

export interface NewGameOptions {
  /** ISO timestamp, injected so the engine stays independent of the clock. */
  now: string
  seed?: number
}

export const DEFAULT_SEED = 0x0e1751

/** Fresh game with the initial statistics from the design document (§6.2). */
export function createGame({ now, seed = DEFAULT_SEED }: NewGameOptions): GameState {
  const crew = Object.fromEntries(
    CREW_IDS.map((id): [CrewId, CrewState] => [
      id,
      { stats: { ...CREW[id].initialStats }, conditions: [] },
    ]),
  ) as Record<CrewId, CrewState>
  const missions = Object.fromEntries(
    MISSION_IDS.map((id) => [id, 'available' satisfies MissionStatus]),
  ) as Record<string, MissionStatus>
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    turn: 1,
    rngSeed: seed >>> 0,
    crew,
    missions,
    resources: {},
    log: [],
    settings: { reducedMotion: false },
  }
}
