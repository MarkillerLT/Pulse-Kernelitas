import type { Stats } from '../model/stats'

/** Static crew definitions (design doc §6.2–6.3). Never persisted: saves store only mutable state. */
export const CREW_IDS = ['orion', 'lyra', 'elias', 'zara', 'kai'] as const
export type CrewId = (typeof CREW_IDS)[number]

export const SPECIALTY_KEYS = [
  'leadership',
  'technical',
  'medicine',
  'exploration',
  'agriculture',
] as const
export type SpecialtyKey = (typeof SPECIALTY_KEYS)[number]
export type Specialties = Record<SpecialtyKey, number>

export const SPECIALTY_LABELS: Record<SpecialtyKey, string> = {
  leadership: 'Liderazgo',
  technical: 'Técnica',
  medicine: 'Medicina',
  exploration: 'Exploración',
  agriculture: 'Agricultura',
}

export interface CrewDefinition {
  id: CrewId
  name: string
  /** Primary specialty, used as the character's role. */
  primarySpecialty: SpecialtyKey
  specialties: Specialties
  initialStats: Stats
  /** Character-specific states the design document lists (§6.5). Potential, not active. */
  uniqueConditionIds: string[]
}

export const CREW: Readonly<Record<CrewId, CrewDefinition>> = {
  orion: {
    id: 'orion',
    name: 'Orion Vega',
    primarySpecialty: 'leadership',
    specialties: { leadership: 10, technical: 4, medicine: 3, exploration: 6, agriculture: 2 },
    initialStats: { health: 100, morale: 80, stress: 20, sleep: 80, trust: 80 },
    uniqueConditionIds: ['commanders-guilt', 'leadership-exhaustion', 'legendary-inspiration'],
  },
  lyra: {
    id: 'lyra',
    name: 'Lyra Kess',
    primarySpecialty: 'technical',
    specialties: { leadership: 4, technical: 10, medicine: 3, exploration: 4, agriculture: 1 },
    initialStats: { health: 100, morale: 70, stress: 30, sleep: 70, trust: 75 },
    uniqueConditionIds: ['tech-obsession', 'cognitive-overload', 'adaptive-genius'],
  },
  elias: {
    id: 'elias',
    name: 'Elias Nova',
    primarySpecialty: 'medicine',
    specialties: { leadership: 6, technical: 4, medicine: 10, exploration: 2, agriculture: 5 },
    initialStats: { health: 100, morale: 85, stress: 15, sleep: 80, trust: 80 },
    uniqueConditionIds: ['biomolecular-fatigue', 'silent-martyr', 'irreplaceable-medic'],
  },
  zara: {
    id: 'zara',
    name: 'Zara Void',
    primarySpecialty: 'exploration',
    specialties: { leadership: 5, technical: 3, medicine: 2, exploration: 10, agriculture: 1 },
    initialStats: { health: 100, morale: 60, stress: 40, sleep: 75, trust: 70 },
    uniqueConditionIds: ['hypervigilance-stress', 'injured-leg', 'veteran-explorer'],
  },
  kai: {
    id: 'kai',
    name: 'Kai Verdant',
    primarySpecialty: 'agriculture',
    specialties: { leadership: 6, technical: 4, medicine: 6, exploration: 2, agriculture: 10 },
    initialStats: { health: 100, morale: 90, stress: 10, sleep: 85, trust: 85 },
    uniqueConditionIds: ['chronic-fatigue', 'food-anxiety', 'guardian-of-life'],
  },
}

export const CREW_LIST: readonly CrewDefinition[] = CREW_IDS.map((id) => CREW[id])

export function isCrewId(value: string): value is CrewId {
  return (CREW_IDS as readonly string[]).includes(value)
}

export function crewName(id: CrewId): string {
  return CREW[id].name
}

export function firstName(id: CrewId): string {
  return CREW[id].name.split(' ')[0]
}
