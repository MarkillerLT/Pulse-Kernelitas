import { firstName, type CrewId } from '../content/crew'
import type { AbsenceRule, MissionEffect, MissionReward, MissionRoute } from '../content/missions'
import type { ShipKey } from '../content/ship'
import type { StatDelta } from '../model/stats'

export interface EffectSource {
  label: string
  delta: StatDelta
}

export interface MissionComposition {
  optimalPresent: CrewId[]
  absentOptimal: CrewId[]
  /** Participants outside the optimal team: no base consequence, only team penalties. */
  extraParticipants: CrewId[]
  isOptimal: boolean
  activePenalties: AbsenceRule[]
  /** Deterministic stat consequences per affected crew member. */
  sources: Partial<Record<CrewId, EffectSource[]>>
  /** Consequences for one participant chosen at random when resolved. */
  randomEffects: { label: string; delta: StatDelta }[]
  /** Ship consequences of the composition (not the reward). */
  shipEffects: MissionEffect[]
  /** Reward if the mission succeeds, after multipliers or overrides. */
  reward: MissionReward
}

/**
 * Consequences of sending `crewIds` on a mission route. Pure and deterministic; the random
 * participant is drawn later by the engine. Each penalty applies once per affected member.
 */
export function missionComposition(
  route: MissionRoute,
  crewIds: readonly CrewId[],
  aliveCrew: readonly CrewId[],
): MissionComposition {
  const participants = [...crewIds]
  const optimalPresent = route.optimalCrew.filter((id) => participants.includes(id))
  const absentOptimal = route.optimalCrew.filter((id) => !participants.includes(id))
  const activePenalties = route.absenceRules.filter((rule) => absentOptimal.includes(rule.crewId))
  const sources: MissionComposition['sources'] = {}
  const randomEffects: MissionComposition['randomEffects'] = []
  const shipEffects: MissionEffect[] = []
  const add = (id: CrewId, source: EffectSource) => {
    ;(sources[id] ??= []).push(source)
  }

  for (const id of optimalPresent) {
    const base = route.baseEffects[id]
    if (base) add(id, { label: 'Consecuencia base', delta: base })
  }
  const apply = (effect: MissionEffect, label: string) => {
    if (effect.kind === 'stats') {
      const members = effect.scope === 'crew' ? aliveCrew : participants
      for (const id of members) add(id, { label, delta: effect.delta })
    } else if (effect.kind === 'random-participant') {
      if (participants.length) randomEffects.push({ label, delta: effect.delta })
    } else shipEffects.push(effect)
  }
  for (const effect of route.teamEffects) apply(effect, 'Efecto de la misión')
  for (const rule of activePenalties)
    for (const effect of rule.effects)
      apply(effect, `Sin ${firstName(rule.crewId)}: ${rule.summary}`)

  let reward: MissionReward = route.reward
  for (const rule of activePenalties) {
    if (rule.rewardOverride) reward = rule.rewardOverride
    else if (rule.rewardMultiplier !== undefined && reward.ship) {
      const ship = Object.fromEntries(
        Object.entries(reward.ship).map(([k, v]) => [
          k,
          Math.round((v ?? 0) * rule.rewardMultiplier!),
        ]),
      ) as Partial<Record<ShipKey, number>>
      reward = { ...reward, ship, text: `${reward.text} (reducido: ${rule.summary})` }
    }
  }

  return {
    optimalPresent,
    absentOptimal,
    extraParticipants: participants.filter((id) => !route.optimalCrew.includes(id)),
    isOptimal: absentOptimal.length === 0 && participants.length > 0,
    activePenalties,
    sources,
    randomEffects,
    shipEffects,
    reward,
  }
}
