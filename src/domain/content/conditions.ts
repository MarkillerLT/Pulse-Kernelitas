import type { CrewId } from './crew'
import type { StatKey } from '../model/stats'

/**
 * Permanent, unique and legendary states from the design document (§6.4–6.6).
 *
 * The catalog is the single source of truth for their texts. Crew members only store
 * condition ids. Triggers are NOT automated yet: most need rules the document leaves open
 * (e.g. "durante varias misiones", "sobreexplotar"). Only numeric stat limits that the document
 * states precisely are enforced, through `bounds`.
 */
export type ConditionCategory =
  'health' | 'sleep' | 'stress' | 'morale' | 'trust' | 'unique' | 'legendary'

export interface ConditionDefinition {
  id: string
  name: string
  category: ConditionCategory
  trigger: string
  effect: string
  /** Characters the design document associates with this state. */
  associatedCrew?: CrewId[]
  /** Precise stat limits stated by the document. Applied whenever stats change. */
  bounds?: Partial<Record<StatKey, { min?: number; max?: number }>>
}

export const CONDITION_CATEGORY_LABELS: Record<ConditionCategory, string> = {
  health: 'Salud',
  sleep: 'Sueño',
  stress: 'Estrés',
  morale: 'Moral',
  trust: 'Confianza',
  unique: 'Único',
  legendary: 'Legendario',
}

const list: ConditionDefinition[] = [
  // §6.4 Salud
  {
    id: 'chronic-injury',
    name: 'Lesión Crónica',
    category: 'health',
    trigger: 'Salud inferior a 25 durante dos misiones.',
    effect: 'Salud máxima -20.',
    bounds: { health: { max: 80 } },
  },
  {
    id: 'microfractures',
    name: 'Microfracturas',
    category: 'health',
    trigger: 'Zara recibe daño severo en exploraciones.',
    effect: 'Salud -5 en cada misión de exploración.',
    associatedCrew: ['zara'],
  },
  {
    id: 'technical-burns',
    name: 'Quemaduras Técnicas',
    category: 'health',
    trigger: 'Lyra participa en incendios o fallos de reactor.',
    effect: 'Estrés +5 en misiones técnicas.',
    associatedCrew: ['lyra'],
  },
  {
    id: 'biomolecular-fatigue',
    name: 'Fatiga Biomolecular',
    category: 'health',
    trigger: 'Elias usa demasiada regeneración.',
    effect: 'Cada curación le cuesta -5 Salud.',
    associatedCrew: ['elias'],
  },
  {
    id: 'muscular-exhaustion',
    name: 'Agotamiento Muscular',
    category: 'health',
    trigger: 'Kai colapsa físicamente.',
    effect: 'Recuperación de Salud -50%.',
    associatedCrew: ['kai'],
  },
  {
    id: 'neurological-sequelae',
    name: 'Secuelas Neurológicas',
    category: 'health',
    trigger: 'Exposición a anomalías espaciales.',
    effect: 'Sueño recuperado -25%.',
  },
  // §6.4 Sueño
  {
    id: 'insomnia',
    name: 'Insomnio',
    category: 'sleep',
    trigger: 'Sueño = 0 dos veces.',
    effect: 'Recupera 50% menos Sueño.',
  },
  {
    id: 'fragmented-sleep',
    name: 'Sueño Fragmentado',
    category: 'sleep',
    trigger: 'Estrés superior a 90 durante varias misiones.',
    effect: 'Recuperación de Sueño -25%.',
  },
  {
    id: 'recurring-nightmares',
    name: 'Pesadillas Recurrentes',
    category: 'sleep',
    trigger: 'Acontecimiento traumático.',
    effect: 'Al despertar gana +5 Estrés.',
  },
  {
    // The document describes Hipervigilancia twice (sleep and stress). Both are kept on purpose.
    id: 'hypervigilance-sleep',
    name: 'Hipervigilancia (Sueño)',
    category: 'sleep',
    trigger: 'Común en Zara.',
    effect: 'Nunca recupera el 100% del Sueño.',
    associatedCrew: ['zara'],
  },
  {
    id: 'stimulant-dependency',
    name: 'Dependencia Estimulante',
    category: 'sleep',
    trigger: 'Abuso de medicamentos.',
    effect: 'Recupera Sueño más lento.',
  },
  // §6.4 Estrés
  {
    id: 'chronic-anxiety',
    name: 'Ansiedad Crónica',
    category: 'stress',
    trigger: 'Estrés superior a 80 durante tres misiones.',
    effect: 'Estrés +5 al comenzar cada misión.',
  },
  {
    id: 'burnout',
    name: 'Burnout',
    category: 'stress',
    trigger: 'Sobreexplotar un personaje.',
    effect: 'Moral recuperada -50%.',
  },
  {
    id: 'space-trauma',
    name: 'Trauma Espacial',
    category: 'stress',
    trigger: 'Presenciar una muerte.',
    effect: 'Estrés +10 en exploraciones.',
  },
  {
    id: 'fear-of-failure',
    name: 'Miedo al Fracaso',
    category: 'stress',
    trigger: 'Común en Lyra.',
    effect: '+10 Estrés en misiones críticas.',
    associatedCrew: ['lyra'],
  },
  {
    id: 'commanders-guilt',
    name: 'Culpa del Comandante',
    category: 'stress',
    trigger: 'Común en Orion.',
    effect: 'Cada muerte genera +15 Estrés.',
    associatedCrew: ['orion'],
  },
  {
    id: 'savior-complex',
    name: 'Complejo del Salvador',
    category: 'stress',
    trigger: 'Común en Elias.',
    effect: 'Si un compañero resulta herido: +10 Estrés.',
    associatedCrew: ['elias'],
  },
  // §6.4 Moral
  {
    id: 'chronic-demotivation',
    name: 'Desmotivación Crónica',
    category: 'morale',
    trigger: 'Moral inferior a 20 durante varias misiones.',
    effect: 'Moral máxima limitada a 80.',
    bounds: { morale: { max: 80 } },
  },
  {
    id: 'grief',
    name: 'Duelo',
    category: 'morale',
    trigger: 'Muere un compañero cercano.',
    effect: 'Moral -15 permanente.',
  },
  {
    id: 'loss-of-purpose',
    name: 'Pérdida de Propósito',
    category: 'morale',
    trigger: 'Acumulación de fracasos.',
    effect: 'Menor recuperación de Moral.',
  },
  {
    id: 'resentment',
    name: 'Resentimiento',
    category: 'morale',
    trigger: 'Sentirse sacrificado constantemente.',
    effect: 'Confianza máxima reducida.',
  },
  {
    id: 'social-isolation',
    name: 'Aislamiento Social',
    category: 'morale',
    trigger: 'No participar en eventos positivos.',
    effect: 'Ganancias de Moral -50%.',
  },
  // §6.4 Confianza
  {
    id: 'persistent-doubts',
    name: 'Dudas Persistentes',
    category: 'trust',
    trigger: 'Confianza inferior a 30.',
    effect: 'Ganancias de Confianza -50%.',
  },
  {
    id: 'grudge',
    name: 'Rencor',
    category: 'trust',
    trigger: 'Obligar a trabajar estando agotado repetidamente.',
    effect: 'Confianza máxima 70.',
    bounds: { trust: { max: 70 } },
  },
  {
    id: 'systematic-distrust',
    name: 'Desconfianza Sistemática',
    category: 'trust',
    trigger: 'Ocultar información importante.',
    effect: 'Puede ignorar órdenes en eventos especiales.',
  },
  {
    id: 'authority-breakdown',
    name: 'Ruptura de Autoridad',
    category: 'trust',
    trigger: 'Varias decisiones impopulares consecutivas.',
    effect: 'Confianza máxima 50.',
    bounds: { trust: { max: 50 } },
  },
  {
    id: 'unbreakable-loyalty',
    name: 'Lealtad Inquebrantable',
    category: 'trust',
    trigger: 'Salvar al personaje varias veces.',
    effect: 'Nunca puede caer por debajo de 40.',
    bounds: { trust: { min: 40 } },
  },
  // §6.5 Estados únicos por personaje
  {
    id: 'leadership-exhaustion',
    name: 'Agotamiento de Liderazgo',
    category: 'unique',
    trigger: 'Estado único de Orion Vega.',
    effect: 'Moral recuperada -25%.',
    associatedCrew: ['orion'],
  },
  {
    id: 'legendary-inspiration',
    name: 'Inspiración Legendaria',
    category: 'unique',
    trigger: 'Estado único de Orion Vega.',
    effect: 'Moral +10 a toda la tripulación al iniciar misión.',
    associatedCrew: ['orion'],
  },
  {
    id: 'tech-obsession',
    name: 'Obsesión Tecnológica',
    category: 'unique',
    trigger: 'Estado único de Lyra Kess.',
    effect: 'Técnica +20%, Moral -20.',
    associatedCrew: ['lyra'],
  },
  {
    id: 'cognitive-overload',
    name: 'Sobrecarga Cognitiva',
    category: 'unique',
    trigger: 'Estado único de Lyra Kess.',
    effect: 'Efectividad técnica -25%.',
    associatedCrew: ['lyra'],
  },
  {
    id: 'adaptive-genius',
    name: 'Genio Adaptativo',
    category: 'unique',
    trigger: 'Estado único de Lyra Kess.',
    effect: 'Penalizaciones técnicas reducidas a la mitad.',
    associatedCrew: ['lyra'],
  },
  {
    id: 'silent-martyr',
    name: 'Mártir Silencioso',
    category: 'unique',
    trigger: 'Estado único de Elias Nova.',
    effect: 'Moral +10 para otros al sacrificarse.',
    associatedCrew: ['elias'],
  },
  {
    id: 'irreplaceable-medic',
    name: 'Médico Irremplazable',
    category: 'unique',
    trigger: 'Estado único de Elias Nova.',
    effect: 'Recuperaciones de Salud +25%.',
    associatedCrew: ['elias'],
  },
  {
    id: 'hypervigilance-stress',
    name: 'Hipervigilancia (Estrés)',
    category: 'unique',
    trigger: 'Estado único de Zara Void.',
    effect: 'Nunca elimina completamente el Estrés.',
    associatedCrew: ['zara'],
  },
  {
    id: 'injured-leg',
    name: 'Pierna Lesionada',
    category: 'unique',
    trigger: 'Estado único de Zara Void.',
    effect: 'Salud -5 en exploraciones.',
    associatedCrew: ['zara'],
  },
  {
    id: 'veteran-explorer',
    name: 'Exploradora Veterana',
    category: 'unique',
    trigger: 'Estado único de Zara Void.',
    effect: 'Riesgo de exploración -25%.',
    associatedCrew: ['zara'],
  },
  {
    id: 'chronic-fatigue',
    name: 'Agotamiento Crónico',
    category: 'unique',
    trigger: 'Estado único de Kai Verdant.',
    effect: 'Recuperación de Sueño -50%.',
    associatedCrew: ['kai'],
  },
  {
    id: 'food-anxiety',
    name: 'Ansiedad Alimentaria',
    category: 'unique',
    trigger: 'Estado único de Kai Verdant.',
    effect: 'Si falta comida, Estrés +10.',
    associatedCrew: ['kai'],
  },
  {
    id: 'guardian-of-life',
    name: 'Guardián de la Vida',
    category: 'unique',
    trigger: 'Estado único de Kai Verdant.',
    effect: 'Moral +5 global mientras esté sano.',
    associatedCrew: ['kai'],
  },
  // §6.6 Estados legendarios (fin de partida, uno por personaje)
  {
    id: 'hero-of-elysium',
    name: 'Héroe de la Elysium',
    category: 'legendary',
    trigger: 'Sobrevivir con estados altos.',
    effect: 'Mejora a toda la tripulación.',
  },
  {
    id: 'void-survivor',
    name: 'Superviviente del Vacío',
    category: 'legendary',
    trigger: 'Sobrevivir múltiples colapsos.',
    effect: 'Resistencia extrema.',
  },
  {
    id: 'colony-legend',
    name: 'Leyenda de la Colonia',
    category: 'legendary',
    trigger: 'Llegar vivo al planeta final.',
    effect: 'Final especial.',
  },
  {
    id: 'broken-spirit',
    name: 'Espíritu Quebrado',
    category: 'legendary',
    trigger: 'Demasiados traumas acumulados.',
    effect: 'Grandes penalizaciones.',
  },
  {
    id: 'last-bastion',
    name: 'Último Bastión',
    category: 'legendary',
    trigger: 'Ser uno de los últimos tripulantes vivos.',
    effect: 'Bonificaciones de supervivencia.',
  },
]

export const CONDITIONS: Readonly<Record<string, ConditionDefinition>> = Object.fromEntries(
  list.map((condition) => [condition.id, condition]),
)
export const CONDITION_LIST: readonly ConditionDefinition[] = list

export function getCondition(id: string): ConditionDefinition | undefined {
  return CONDITIONS[id]
}
