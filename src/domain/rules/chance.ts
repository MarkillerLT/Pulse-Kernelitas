import { CREW, SPECIALTY_LABELS, firstName, type CrewId, type SpecialtyKey } from '../content/crew'
import type { GameState } from '../model/game'
import { STAT_LABELS, type StatKey } from '../model/stats'
import { readStat } from './stats'

/**
 * Success chance shown to the player before every decision.
 *
 * chance = base
 *        + 4.5% × best specialty level in the team (0–10)
 *        + 5% for each extra member
 *        + average condition penalty of the team
 * clamped to 5–95%.
 *
 * Condition penalties follow the design ranges (§6.1): the worse a statistic, the more errors.
 */
export const MIN_CHANCE = 0.05
export const MAX_CHANCE = 0.95
const SKILL_STEP = 0.045
const EXTRA_MEMBER = 0.05

export interface ChanceFactor {
  label: string
  value: number
  crewId?: CrewId
}

export interface ChanceResult {
  chance: number
  factors: ChanceFactor[]
}

/** Per-member penalties derived from the current statistics. */
export function conditionPenalties(state: GameState, crewId: CrewId): ChanceFactor[] {
  const stats = state.crew[crewId].stats
  const name = firstName(crewId)
  const factors: ChanceFactor[] = []
  const add = (key: StatKey, value: number) =>
    factors.push({
      crewId,
      value,
      label: `${STAT_LABELS[key]} de ${name} (${readStat(key, stats[key]).label.toLowerCase()})`,
    })
  const stress = Math.round(stats.stress)
  if (stress >= 76) add('stress', -0.2)
  else if (stress >= 51) add('stress', -0.1)
  for (const key of ['sleep', 'health'] as const) {
    const value = Math.round(stats[key])
    if (value <= 24) add(key, -0.2)
    else if (value <= 49) add(key, -0.1)
  }
  const morale = Math.round(stats.morale)
  if (morale <= 24) add('morale', -0.1)
  else if (morale <= 49) add('morale', -0.05)
  if (Math.round(stats.trust) <= 24) add('trust', -0.1)
  return factors
}

const clampChance = (value: number) => Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, value))

export function taskChance(
  state: GameState,
  baseChance: number,
  specialty: SpecialtyKey | undefined,
  crewIds: readonly CrewId[],
): ChanceResult {
  const factors: ChanceFactor[] = [{ label: 'Base', value: baseChance }]
  if (crewIds.length === 0) return { chance: clampChance(baseChance), factors }
  if (specialty) {
    const best = crewIds.reduce((a, b) =>
      CREW[b].specialties[specialty] > CREW[a].specialties[specialty] ? b : a,
    )
    const level = CREW[best].specialties[specialty]
    factors.push({
      label: `${SPECIALTY_LABELS[specialty]} ${level} (${firstName(best)})`,
      value: level * SKILL_STEP,
      crewId: best,
    })
  }
  if (crewIds.length > 1)
    factors.push({
      label: `Apoyo de ${crewIds.length - 1} tripulante(s)`,
      value: (crewIds.length - 1) * EXTRA_MEMBER,
    })
  factors.push(...averagePenalties(state, crewIds))
  return { chance: clampChance(sum(factors)), factors }
}

/** Story missions: the optimal team gives 75%; each absent optimal member costs 15%. */
export function missionChance(
  state: GameState,
  optimalCrew: readonly CrewId[],
  crewIds: readonly CrewId[],
): ChanceResult {
  const factors: ChanceFactor[] = [{ label: 'Equipo óptimo', value: 0.75 }]
  for (const id of optimalCrew)
    if (!crewIds.includes(id))
      factors.push({ label: `Sin ${firstName(id)}`, value: -0.15, crewId: id })
  factors.push(...averagePenalties(state, crewIds))
  return { chance: clampChance(sum(factors)), factors }
}

/** Each member's penalties weigh 1/n of the team's chance. */
function averagePenalties(state: GameState, crewIds: readonly CrewId[]): ChanceFactor[] {
  const n = crewIds.length
  return crewIds.flatMap((id) =>
    conditionPenalties(state, id).map((f) => ({ ...f, value: f.value / n })),
  )
}

const sum = (factors: ChanceFactor[]) => factors.reduce((total, f) => total + f.value, 0)

/** The most harmful factor, used to explain why a task failed. */
export function worstFactor(factors: ChanceFactor[]): ChanceFactor | undefined {
  return factors
    .filter((f) => f.value < 0 && f.crewId && f.label !== 'Base')
    .sort((a, b) => a.value - b.value)[0]
}
