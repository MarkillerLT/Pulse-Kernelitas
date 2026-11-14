import { CREW_IDS, firstName, isCrewId, type CrewId } from '../content/crew'
import {
  MAX_TEAM_SIZE,
  getMission,
  getRoute,
  type AbsenceRule,
  type MissionDefinition,
  type MissionEffect,
  type MissionRoute,
} from '../content/missions'
import type { GameState } from '../model/game'
import { STAT_LABELS, STAT_KEYS, sumDeltas, type StatDelta } from '../model/stats'
import { getAvailability } from '../rules/availability'
import { readStat } from '../rules/stats'

export interface MissionOrder {
  missionId: string
  crewIds: readonly string[]
  routeId?: string
}

export interface EffectSource {
  label: string
  delta: StatDelta
}

export interface RandomEffect {
  absentCrewId: CrewId
  label: string
  delta: StatDelta
  candidates: CrewId[]
}

export interface TeamWarning {
  crewId: CrewId
  text: string
}

export interface TeamAnalysis {
  /** Blocking problems. The mission can only launch when empty. */
  errors: string[]
  mission?: MissionDefinition
  route?: MissionRoute
  participants: CrewId[]
  optimalPresent: CrewId[]
  absentOptimal: CrewId[]
  /** Participants outside the optimal team (no base consequences defined for them). */
  extraParticipants: CrewId[]
  isOptimal: boolean
  activePenalties: AbsenceRule[]
  /** Deterministic consequences per affected crew member, by source. */
  sources: Partial<Record<CrewId, EffectSource[]>>
  /** Consequences that will hit one participant chosen at random. */
  randomEffects: RandomEffect[]
  unsupported: string[]
  warnings: TeamWarning[]
}

function scopeMembers(scope: 'participants' | 'crew', participants: CrewId[]): CrewId[] {
  return scope === 'crew' ? [...CREW_IDS] : participants
}

/**
 * Validates a mission order and computes everything the UI needs to preview it. Pure: it reads
 * the state and never modifies it. `resolveMission` reuses this, so the preview and the actual
 * result cannot diverge.
 */
export function analyzeTeam(state: GameState, order: MissionOrder): TeamAnalysis {
  const errors: string[] = []
  const analysis: TeamAnalysis = {
    errors,
    participants: [],
    optimalPresent: [],
    absentOptimal: [],
    extraParticipants: [],
    isOptimal: false,
    activePenalties: [],
    sources: {},
    randomEffects: [],
    unsupported: [],
    warnings: [],
  }

  // 1. Mission validation.
  const mission = getMission(order.missionId)
  if (!mission) {
    errors.push('La misión no existe.')
    return analysis
  }
  analysis.mission = mission
  if (!mission.implemented) errors.push('Esta misión todavía no está operativa en el prototipo.')
  if (state.missions[mission.id] === 'completed') errors.push('La misión ya fue completada.')
  const route = getRoute(mission, order.routeId)
  if (!route) {
    errors.push('Selecciona una ruta válida para la misión.')
    return analysis
  }
  analysis.route = route

  // 2–3. Crew selection validation.
  if (order.crewIds.length === 0) errors.push('Selecciona al menos un tripulante.')
  if (order.crewIds.length > MAX_TEAM_SIZE)
    errors.push(`El equipo admite un máximo de ${MAX_TEAM_SIZE} tripulantes.`)
  const seen = new Set<string>()
  for (const id of order.crewIds) {
    if (seen.has(id)) {
      errors.push('Un tripulante no puede asignarse dos veces.')
      continue
    }
    seen.add(id)
    if (!isCrewId(id)) {
      errors.push(`Tripulante desconocido: ${id}.`)
      continue
    }
    const availability = getAvailability(state.crew[id].stats)
    if (!availability.available)
      errors.push(`${firstName(id)} no está disponible. ${availability.reasons.join(' ')}`)
    analysis.participants.push(id)
  }
  const participants = analysis.participants

  // Composition.
  analysis.optimalPresent = route.optimalCrew.filter((id) => participants.includes(id))
  analysis.absentOptimal = route.optimalCrew.filter((id) => !participants.includes(id))
  analysis.extraParticipants = participants.filter((id) => !route.optimalCrew.includes(id))
  analysis.isOptimal = analysis.absentOptimal.length === 0 && participants.length > 0
  analysis.activePenalties = route.absenceRules.filter((rule) =>
    analysis.absentOptimal.includes(rule.crewId),
  )

  // Consequences. Each source is applied exactly once per affected member.
  const addSource = (crewId: CrewId, source: EffectSource) => {
    ;(analysis.sources[crewId] ??= []).push(source)
  }
  for (const id of analysis.optimalPresent) {
    const base = route.baseEffects[id]
    if (base) addSource(id, { label: 'Consecuencia base', delta: base })
  }
  const applyEffect = (effect: MissionEffect, label: string, absentCrewId?: CrewId) => {
    if (effect.kind === 'unsupported') analysis.unsupported.push(effect.text)
    else if (effect.kind === 'stats')
      for (const id of scopeMembers(effect.scope, participants))
        addSource(id, { label, delta: effect.delta })
    else if (absentCrewId && participants.length > 0)
      analysis.randomEffects.push({
        absentCrewId,
        label,
        delta: effect.delta,
        candidates: [...participants],
      })
  }
  for (const effect of route.teamEffects) applyEffect(effect, 'Efecto de la misión')
  for (const rule of analysis.activePenalties)
    for (const effect of rule.effects)
      applyEffect(effect, `Sin ${firstName(rule.crewId)}: ${rule.summary}`, rule.crewId)

  // Informational warnings: current deteriorated states and worst-case projection.
  const warn = (crewId: CrewId, text: string) => analysis.warnings.push({ crewId, text })
  for (const id of participants) {
    const { stats } = state.crew[id]
    for (const key of STAT_KEYS) {
      const reading = readStat(key, stats[key])
      if (reading.level === 'critical')
        warn(id, `${STAT_LABELS[key]} ${stats[key]} (${reading.label}).`)
    }
    const deterministic = sumDeltas(...(analysis.sources[id] ?? []).map((s) => s.delta))
    const worst = sumDeltas(deterministic, ...analysis.randomEffects.map((r) => r.delta))
    if (stats.health + (worst.health ?? 0) <= 0)
      warn(id, 'Podría quedar incapacitado (Salud 0) en el peor caso.')
    else if (stats.sleep + (worst.sleep ?? 0) <= 0)
      warn(id, 'Podría colapsar (Sueño 0) en el peor caso.')
    else if (stats.morale + (worst.morale ?? 0) <= 0)
      warn(id, 'Podría negarse a cooperar (Moral 0) en el peor caso.')
  }
  return analysis
}
