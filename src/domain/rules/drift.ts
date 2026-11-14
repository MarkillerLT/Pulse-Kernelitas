import type { CrewState } from '../model/game'
import type { ShipSystems } from '../content/ship'
import type { StatDelta } from '../model/stats'

/**
 * Hourly stat drift for one crew member, based on the activity and the design rules (§7).
 * Shift-based design values are spread over hours:
 * - Dormir un turno (8 h): +25 Sueño, reduced by stress (Estrés 20 → +25, Estrés 90 → +10).
 * - Descansar: -10 Estrés per shift.     - Tiempo libre / recreación (4 h): +5 Moral, -15 Estrés.
 * - Enfermería (8 h): +10 Salud (design range 5–15), consumes medicine.
 * - Sueño < 30: health recovery halved, stress grows twice as fast.
 * - Moral < 20: health recovery halved.  - Moral < 30: stress goes down at half speed.
 */
export const SHIFT_HOURS = 8
export const LEISURE_HOURS = 4

const AWAKE_SLEEP_LOSS: Record<string, number> = {
  duty: 1.2,
  task: 1.8,
  mission: 1.8,
  leisure: 0.8,
  medical: 0,
}
const STRESS_PER_HOUR: Record<string, number> = {
  duty: 0.3,
  task: 0.8,
  mission: 0.5,
  rest: -10 / SHIFT_HOURS,
  leisure: -15 / LEISURE_HOURS,
  medical: -0.5,
}
const MEDICAL_HEALTH_PER_HOUR = 10 / SHIFT_HOURS
const REST_HEALTH_PER_HOUR = 0.25
export const MEDICINE_PER_HOUR = 1 / SHIFT_HOURS

/** Sleep gained in one 8-hour shift, linear between the two design examples. */
export function sleepShiftGain(stress: number): number {
  if (stress <= 20) return 25
  return Math.max(10, 25 - ((stress - 20) * 15) / 70)
}

/** Recovery multipliers from active permanent conditions (§6.4). */
export function conditionMultipliers(conditions: readonly string[]) {
  const has = (id: string) => conditions.includes(id)
  let sleep = 1
  if (has('insomnia')) sleep *= 0.5
  if (has('fragmented-sleep')) sleep *= 0.75
  if (has('neurological-sequelae')) sleep *= 0.75
  if (has('chronic-fatigue')) sleep *= 0.5
  let health = 1
  if (has('muscular-exhaustion')) health *= 0.5
  let morale = 1
  if (has('burnout')) morale *= 0.5
  if (has('social-isolation')) morale *= 0.5
  if (has('leadership-exhaustion')) morale *= 0.75
  return { sleep, health, morale }
}

export interface DriftContext {
  ship: ShipSystems
  recoveryMultiplier: number
}

/** Delta for one hour. Pure: the caller applies and clamps it. */
export function hourlyDrift(
  crew: CrewState,
  { ship, recoveryMultiplier }: DriftContext,
): StatDelta {
  const { stats, activity } = crew
  if (activity === 'dead') return {}
  const mult = conditionMultipliers(crew.conditions)
  const delta: StatDelta = {}

  // Sleep
  if (activity === 'rest') {
    delta.sleep = (sleepShiftGain(stats.stress) / SHIFT_HOURS) * mult.sleep * recoveryMultiplier
  } else {
    delta.sleep = -(AWAKE_SLEEP_LOSS[activity] ?? 1)
  }

  // Stress
  let stress = STRESS_PER_HOUR[activity] ?? 0
  if (stress > 0 && stats.sleep < 30) stress *= 2
  if (stress < 0 && stats.morale < 30) stress *= 0.5
  if (stress < 0) stress *= recoveryMultiplier
  if (ship.lifeSupport < 30) stress += 0.5
  delta.stress = stress

  // Morale
  if (activity === 'leisure') delta.morale = (5 / LEISURE_HOURS) * mult.morale * recoveryMultiplier

  // Health
  let health = 0
  if (activity === 'medical') health = ship.medicine > 0 ? MEDICAL_HEALTH_PER_HOUR : 0.25
  else if (activity === 'rest') health = REST_HEALTH_PER_HOUR
  if (health > 0) {
    if (stats.sleep < 30 && activity !== 'rest') health *= 0.5
    if (stats.morale < 20) health *= 0.5
    health *= mult.health * recoveryMultiplier
  }
  if (ship.lifeSupport < 30) health -= 0.3
  if (health) delta.health = health

  return delta
}
