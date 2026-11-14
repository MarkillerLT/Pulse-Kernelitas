import { CREW_IDS, type CrewId } from '../content/crew'
import type { CrewChange, GameState, LogEntry } from '../model/game'
import { sumDeltas } from '../model/stats'
import { getAvailability } from '../rules/availability'
import { applyDelta, getStatBounds } from '../rules/stats'
import { analyzeTeam, type EffectSource, type MissionOrder } from './analyzeTeam'
import { pickRandom } from './random'

export interface ResolveContext {
  /** ISO timestamp for the log entry, injected to keep the engine clock-free. */
  now: string
}

export type ResolveResult =
  { ok: true; state: GameState; entry: LogEntry } | { ok: false; errors: string[] }

/**
 * Resolves a mission order against the current game state.
 *
 * 1. Validates the mission and route.
 * 2. Validates the crew selection (1–3 members, unique, known).
 * 3. Checks every member is available.
 * 4. Computes consequences: base effects for optimal members present, team effects, and each
 *    triggered absence penalty once. Random targets use the state's seeded PRNG.
 * 5. Sums all deltas per member and clamps once to the member's bounds (0–100 or narrower).
 * 6. Returns a new state (input untouched): crew updated, mission completed, turn advanced.
 * 7. Produces a log entry describing everything that happened.
 */
export function resolveMission(
  state: GameState,
  order: MissionOrder,
  { now }: ResolveContext,
): ResolveResult {
  const analysis = analyzeTeam(state, order)
  if (analysis.errors.length > 0 || !analysis.mission || !analysis.route)
    return { ok: false, errors: analysis.errors.length ? analysis.errors : ['Orden no válida.'] }
  const { mission, route } = analysis

  const sources: Partial<Record<CrewId, EffectSource[]>> = {}
  for (const id of CREW_IDS) if (analysis.sources[id]) sources[id] = [...analysis.sources[id]]

  let seed = state.rngSeed
  const randomEvents: LogEntry['randomEvents'] = []
  for (const effect of analysis.randomEffects) {
    const [next, target] = pickRandom(seed, effect.candidates)
    seed = next
    ;(sources[target] ??= []).push({
      label: `${effect.label} (seleccionado al azar)`,
      delta: effect.delta,
    })
    randomEvents.push({ absentCrewId: effect.absentCrewId, targetId: target, delta: effect.delta })
  }

  const crew = { ...state.crew }
  const changes: CrewChange[] = []
  const incapacitated: CrewId[] = []
  for (const id of CREW_IDS) {
    const memberSources = sources[id]
    if (!memberSources) continue
    const current = state.crew[id]
    const requested = sumDeltas(...memberSources.map((s) => s.delta))
    const after = applyDelta(current.stats, requested, getStatBounds(current.conditions))
    crew[id] = { ...current, stats: after }
    changes.push({
      crewId: id,
      before: { ...current.stats },
      after,
      requested,
      sources: memberSources.map((s) => ({ label: s.label, delta: { ...s.delta } })),
    })
    if (getAvailability(current.stats).available && !getAvailability(after).available)
      incapacitated.push(id)
  }

  const entry: LogEntry = {
    id: `t${state.turn}-${mission.id}`,
    turn: state.turn,
    timestamp: now,
    missionId: mission.id,
    routeId: route.id,
    crewIds: [...analysis.participants],
    outcome: analysis.isOptimal ? 'optimal' : 'compromised',
    penalties: analysis.activePenalties.map((rule) => ({
      absentCrewId: rule.crewId,
      summary: rule.summary,
    })),
    randomEvents,
    unsupported: [...analysis.unsupported],
    changes,
    intel: analysis.isOptimal ? route.optimalReward : null,
    incapacitated,
  }

  return {
    ok: true,
    entry,
    state: {
      ...state,
      updatedAt: now,
      turn: state.turn + 1,
      rngSeed: seed,
      crew,
      missions: { ...state.missions, [mission.id]: 'completed' },
      log: [...state.log, entry],
    },
  }
}
