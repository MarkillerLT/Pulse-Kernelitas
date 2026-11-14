import type { CrewId } from './crew'
import type { SectorId } from './sectors'
import type { StatDelta } from '../model/stats'

/**
 * Mission definitions (design doc §8–9).
 *
 * Every mission has one or more routes. A normal mission has a single route; mission 5 lets the
 * player choose a route. Each route defines the optimal crew, per-character base consequences,
 * team-wide effects and penalties triggered by the absence of an optimal member.
 *
 * Only missions with `implemented: true` can be resolved by the engine. The others are kept as
 * data so the architecture is exercised and their design stays documented.
 */
export const MAX_TEAM_SIZE = 3

export type EffectScope = 'participants' | 'crew'

export type MissionEffect =
  /** A stat change applied once to every member of the scope. */
  | { kind: 'stats'; scope: EffectScope; delta: StatDelta; note?: string }
  /** A stat change applied once to one participant chosen with the game's seeded PRNG. */
  | { kind: 'random-participant'; delta: StatDelta }
  /** A consequence the engine cannot apply yet (resources, future modifiers…). */
  | { kind: 'unsupported'; text: string }

export interface AbsenceRule {
  /** Optimal member whose absence triggers the rule. */
  crewId: CrewId
  /** Narrative explanation from the design document. */
  summary: string
  effects: MissionEffect[]
}

export interface MissionRoute {
  id: string
  name: string
  optimalCrew: CrewId[]
  /** Consequences for each optimal member who takes part. */
  baseEffects: Partial<Record<CrewId, StatDelta>>
  /** Consequences for the whole team or crew, independent of composition. */
  teamEffects: MissionEffect[]
  absenceRules: AbsenceRule[]
  /** Outcome text when every optimal member takes part. */
  optimalReward: string
}

export interface MissionDefinition {
  id: string
  number: number
  title: string
  sectorId: SectorId
  objective?: string
  briefing?: string
  risks: string[]
  routes: MissionRoute[]
  /** Narrative lines shown during the resolution sequence. */
  sequence?: string[]
  implemented: boolean
  /** Ambiguities or missing information found in the design document. */
  designNotes?: string[]
}

const AMBIGUOUS_ALL =
  'El documento dice "todos" sin aclarar si son los participantes o toda la tripulación.'

const ghostSatellite: MissionDefinition = {
  id: 'ghost-satellite',
  number: 1,
  title: 'El Satélite Fantasma',
  sectorId: 'aldrin',
  objective: 'Investigar un satélite abandonado para recuperar información.',
  briefing:
    'Los sensores exteriores del Sector Aldrin detectan un satélite sin firma de propulsión en una órbita estable. Sus sistemas siguen alimentados. N0VA-7 recomienda una incursión breve con una cápsula de exploración para extraer sus registros.',
  risks: ['Sistemas bloqueados.', 'Trampas automáticas.', 'Radiación.'],
  routes: [
    {
      id: 'default',
      name: 'Incursión',
      optimalCrew: ['orion', 'lyra', 'zara'],
      baseEffects: {
        orion: { health: -5, stress: 10, sleep: -10 },
        lyra: { health: -10, stress: 15, sleep: -15 },
        zara: { health: -15, stress: 20, sleep: -20 },
      },
      teamEffects: [],
      absenceRules: [
        {
          crewId: 'lyra',
          summary: 'La tecnología tarda más en comprenderse.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { stress: 15, sleep: -10 } }],
        },
        {
          crewId: 'zara',
          summary: 'La infiltración es más difícil.',
          effects: [{ kind: 'random-participant', delta: { health: -25 } }],
        },
        {
          crewId: 'orion',
          summary: 'Falta coordinación.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { stress: 10, trust: -5 } }],
        },
      ],
      optimalReward: 'Se obtiene toda la información.',
    },
  ],
  sequence: [
    'Cápsula de exploración desacoplada del hangar Aldrin.',
    'Aproximación al satélite. Niveles de radiación por encima de lo nominal.',
    'Acoplamiento completado. Sistemas internos bloqueados.',
    'Equipo dentro del casco. Se detectan mecanismos de defensa automáticos.',
    'Extracción de registros en curso.',
    'Retorno a la Elysium.',
  ],
  implemented: true,
  designNotes: [
    'Los tripulantes que no forman parte del equipo óptimo no tienen consecuencias base definidas; solo reciben las penalizaciones por ausencia que afectan a los participantes.',
    'El documento no define qué información se recupera sin el equipo óptimo.',
  ],
}

const orchardOutbreak: MissionDefinition = {
  id: 'orchard-outbreak',
  number: 2,
  title: 'Brote en los Huertos',
  sectorId: 'tereshkova',
  risks: ['Infección.', 'Escasez de alimentos.', 'Agotamiento.'],
  routes: [
    {
      id: 'default',
      name: 'Contención',
      optimalCrew: ['kai', 'elias', 'lyra'],
      baseEffects: {
        kai: { health: -15, stress: 10, sleep: -20, morale: 10 },
        elias: { health: -10, stress: 15, sleep: -15, morale: 5 },
        lyra: { health: -10, stress: 20, sleep: -20, morale: 5 },
      },
      teamEffects: [],
      absenceRules: [
        {
          crewId: 'kai',
          summary: 'Producción de alimentos -40%. Moral -10 para todos.',
          effects: [
            { kind: 'unsupported', text: 'Producción de alimentos -40%.' },
            { kind: 'stats', scope: 'crew', delta: { morale: -10 }, note: AMBIGUOUS_ALL },
          ],
        },
        {
          crewId: 'elias',
          summary: 'Todos pierden 10 Salud.',
          effects: [{ kind: 'stats', scope: 'crew', delta: { health: -10 }, note: AMBIGUOUS_ALL }],
        },
        {
          crewId: 'lyra',
          summary: 'Los participantes reciben +15 Estrés y pierden 15 Sueño.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { stress: 15, sleep: -15 } }],
        },
      ],
      optimalReward: 'Brote contenido.',
    },
  ],
  implemented: false,
  designNotes: ['Objetivo y recompensa no definidos.', AMBIGUOUS_ALL],
}

const asteroidField: MissionDefinition = {
  id: 'asteroid-field',
  number: 3,
  title: 'Campo de Asteroides',
  sectorId: 'armstrong',
  risks: ['Impactos.', 'Navegación compleja.', 'Poco tiempo.'],
  routes: [
    {
      id: 'default',
      name: 'Travesía',
      optimalCrew: ['orion', 'zara', 'lyra'],
      baseEffects: {
        orion: { health: -10, stress: 20, sleep: -20 },
        zara: { health: -20, stress: 25, sleep: -25 },
        lyra: { health: -10, stress: 15, sleep: -15 },
      },
      teamEffects: [],
      absenceRules: [
        {
          crewId: 'zara',
          summary: 'Todos pierden 15 Salud adicional.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { health: -15 } }],
        },
        {
          crewId: 'orion',
          summary: 'Todos pierden 20 Sueño adicional y reciben +10 Estrés.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { sleep: -20, stress: 10 } }],
        },
        {
          crewId: 'lyra',
          summary: 'Combustible obtenido -50%.',
          effects: [{ kind: 'unsupported', text: 'Combustible obtenido -50%.' }],
        },
      ],
      optimalReward: 'Combustible obtenido.',
    },
  ],
  implemented: false,
  designNotes: [
    'Objetivo no definido. La cantidad de combustible depende de recursos aún no modelados.',
  ],
}

const distressSignal: MissionDefinition = {
  id: 'distress-signal',
  number: 4,
  title: 'La Señal de Auxilio',
  sectorId: 'armstrong',
  risks: ['Emboscadas.', 'Consumo de recursos.', 'Tiempo perdido.'],
  routes: [
    {
      id: 'default',
      name: 'Rescate',
      optimalCrew: ['orion', 'elias', 'zara'],
      baseEffects: {
        orion: { health: -10, stress: 15, sleep: -15 },
        elias: { health: -15, stress: 20, sleep: -15 },
        zara: { health: -15, stress: 10, sleep: -20 },
      },
      teamEffects: [
        {
          kind: 'stats',
          scope: 'crew',
          delta: { morale: 15, trust: 20 },
          note: 'Resultado global.',
        },
      ],
      absenceRules: [
        {
          crewId: 'elias',
          summary: 'Los participantes pierden 15 Salud adicional.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { health: -15 } }],
        },
        {
          crewId: 'orion',
          summary: 'Moral +5 solamente.',
          effects: [
            {
              kind: 'unsupported',
              text: 'El resultado global se reduce a Moral +5 (sustituye al resultado global).',
            },
          ],
        },
        {
          crewId: 'zara',
          summary: 'Los participantes pierden 20 Sueño adicional.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { sleep: -20 } }],
        },
      ],
      optimalReward: 'Moral +15 y Confianza +20.',
    },
  ],
  implemented: false,
  designNotes: [
    'No se aclara si el resultado global afecta a toda la tripulación o solo al equipo.',
    'La penalización sin Orion sustituye un efecto; el motor necesita reglas de sustitución.',
  ],
}

const stormHeart: MissionDefinition = {
  id: 'storm-heart',
  number: 5,
  title: 'El Corazón de la Tormenta',
  sectorId: 'gagarin',
  risks: ['No existe un equipo correcto. El jugador elige una ruta.'],
  routes: [
    {
      id: 'engine',
      name: 'Ruta Motor',
      optimalCrew: ['orion', 'lyra'],
      baseEffects: {},
      teamEffects: [
        {
          kind: 'stats',
          scope: 'participants',
          delta: { stress: 15, sleep: -20 },
          note: 'Daño mínimo.',
        },
      ],
      absenceRules: [
        {
          crewId: 'lyra',
          summary: 'Estrés +30. Salud -15.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { stress: 30, health: -15 } }],
        },
        {
          crewId: 'orion',
          summary: 'Confianza -10. Estrés +15.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { trust: -10, stress: 15 } }],
        },
      ],
      optimalReward: 'Daño mínimo.',
    },
    {
      id: 'orchards',
      name: 'Ruta Huertos',
      optimalCrew: ['kai'],
      baseEffects: {},
      teamEffects: [{ kind: 'stats', scope: 'participants', delta: { health: -10, sleep: -20 } }],
      absenceRules: [
        {
          crewId: 'kai',
          summary: 'Alimentos -50%. Moral -15 para todos.',
          effects: [
            { kind: 'unsupported', text: 'Alimentos -50%.' },
            { kind: 'stats', scope: 'crew', delta: { morale: -15 }, note: AMBIGUOUS_ALL },
          ],
        },
      ],
      optimalReward: 'Cultivos protegidos.',
    },
    {
      id: 'infirmary',
      name: 'Ruta Enfermería',
      optimalCrew: ['elias'],
      baseEffects: {},
      teamEffects: [{ kind: 'stats', scope: 'participants', delta: { health: -15, stress: 15 } }],
      absenceRules: [
        {
          crewId: 'elias',
          summary: 'Toda recuperación futura -50%.',
          effects: [{ kind: 'unsupported', text: 'Toda recuperación futura -50%.' }],
        },
      ],
      optimalReward: 'Enfermería protegida.',
    },
  ],
  implemented: false,
  designNotes: [
    'No se especifica si los efectos de cada ruta se aplican a cada participante o al grupo.',
    'Las rutas Motor/Huertos/Enfermería no definen objetivo ni recompensa concreta.',
  ],
}

const list: MissionDefinition[] = [
  ghostSatellite,
  orchardOutbreak,
  asteroidField,
  distressSignal,
  stormHeart,
]

export const MISSIONS: Readonly<Record<string, MissionDefinition>> = Object.fromEntries(
  list.map((mission) => [mission.id, mission]),
)
export const MISSION_LIST: readonly MissionDefinition[] = list
export const MISSION_IDS: readonly string[] = list.map((mission) => mission.id)

export function getMission(id: string): MissionDefinition | undefined {
  return MISSIONS[id]
}

export function getRoute(mission: MissionDefinition, routeId?: string): MissionRoute | undefined {
  return routeId === undefined && mission.routes.length === 1
    ? mission.routes[0]
    : mission.routes.find((route) => route.id === routeId)
}
