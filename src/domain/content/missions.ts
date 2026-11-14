import type { CrewId } from './crew'
import type { SectorId } from './sectors'
import type { ShipDelta, ShipKey } from './ship'
import type { StatDelta } from '../model/stats'

/**
 * Story missions (design doc §8–9). Each one appears as a task on a fixed day of the journey.
 *
 * A route defines the optimal crew, per-character base consequences, team effects and
 * penalties for each absent optimal member. Consequences are applied whether the mission
 * succeeds or fails (the team went through it); the reward only arrives on success.
 *
 * Interpretations of the design text are listed in docs/GAME_DESIGN.md.
 */
export const MAX_TEAM_SIZE = 3

export type EffectScope = 'participants' | 'crew'

export type MissionEffect =
  /** Stat change applied once to every member of the scope. */
  | { kind: 'stats'; scope: EffectScope; delta: StatDelta }
  /** Stat change applied once to one participant chosen with the game's seeded PRNG. */
  | { kind: 'random-participant'; delta: StatDelta }
  /** Ship system change. */
  | { kind: 'ship'; delta: ShipDelta }
  /** Ship system scaled by a factor (e.g. "Alimentos -50%" → food × 0.5). */
  | { kind: 'ship-scale'; key: ShipKey; factor: number }
  /** Persistent modifier: every future recovery is multiplied by `factor`. */
  | { kind: 'recovery-modifier'; factor: number }

export interface MissionReward {
  text: string
  ship?: ShipDelta
  /** Applied to the whole crew. */
  crew?: StatDelta
}

export interface AbsenceRule {
  crewId: CrewId
  summary: string
  effects: MissionEffect[]
  /** Scales the numeric reward (e.g. "Combustible obtenido -50%" → 0.5). */
  rewardMultiplier?: number
  /** Replaces the reward entirely (e.g. "Moral +5 solamente"). */
  rewardOverride?: MissionReward
}

export interface MissionRoute {
  id: string
  name: string
  optimalCrew: CrewId[]
  baseEffects: Partial<Record<CrewId, StatDelta>>
  teamEffects: MissionEffect[]
  absenceRules: AbsenceRule[]
  reward: MissionReward
}

export interface MissionDefinition {
  id: string
  number: number
  title: string
  sectorId: SectorId
  /** Journey day on which the mission becomes available (at 09:00). */
  day: number
  /** Hours the team is away. */
  durationHours: number
  objective: string
  briefing: string
  risks: string[]
  /** Damage the ship takes during the mission no matter what (mission 5 storm). */
  impact?: ShipDelta
  routes: MissionRoute[]
  sequence: string[]
}

const ghostSatellite: MissionDefinition = {
  id: 'ghost-satellite',
  number: 1,
  title: 'El Satélite Fantasma',
  sectorId: 'aldrin',
  day: 2,
  durationHours: 6,
  objective: 'Investigar un satélite abandonado para recuperar información.',
  briefing:
    'Los sensores exteriores del Sector Aldrin detectan un satélite sin firma de propulsión en una órbita estable. Sus sistemas siguen alimentados. N0VA-7 recomienda una incursión breve para extraer sus registros.',
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
      reward: {
        text: 'Se obtiene toda la información: mapas de navegación y componentes recuperados.',
        ship: { power: 10 },
      },
    },
  ],
  sequence: [
    'Cápsula de exploración desacoplada del hangar Aldrin.',
    'Aproximación al satélite. Radiación por encima de lo nominal.',
    'Acoplamiento completado. Sistemas internos bloqueados.',
    'Mecanismos de defensa automáticos detectados.',
  ],
}

const orchardOutbreak: MissionDefinition = {
  id: 'orchard-outbreak',
  number: 2,
  title: 'Brote en los Huertos',
  sectorId: 'tereshkova',
  day: 7,
  durationHours: 8,
  objective: 'Contener un patógeno que se propaga por los cultivos del invernadero.',
  briefing:
    'Las cámaras de cultivo del Invernadero Tereshkova muestran manchas necróticas que avanzan entre bandejas. Si el brote no se contiene, las reservas de alimento no alcanzarán para el viaje.',
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
          effects: [{ kind: 'stats', scope: 'crew', delta: { morale: -10 } }],
          rewardMultiplier: 0.6,
        },
        {
          crewId: 'elias',
          summary: 'Todos pierden 10 Salud.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { health: -10 } }],
        },
        {
          crewId: 'lyra',
          summary: 'Los participantes reciben +15 Estrés y pierden 15 Sueño.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { stress: 15, sleep: -15 } }],
        },
      ],
      reward: {
        text: 'Brote contenido. La producción de alimentos se recupera.',
        ship: { food: 25 },
      },
    },
  ],
  sequence: [
    'Equipo con trajes de aislamiento en la esclusa del invernadero.',
    'Muestras tomadas. El patógeno resiste los fungicidas estándar.',
    'Cuarentena de las bandejas infectadas.',
  ],
}

const asteroidField: MissionDefinition = {
  id: 'asteroid-field',
  number: 3,
  title: 'Campo de Asteroides',
  sectorId: 'armstrong',
  day: 13,
  durationHours: 6,
  objective:
    'Atravesar un campo de asteroides y extraer combustible de un fragmento rico en hielo.',
  briefing:
    'La ruta más corta cruza un campo denso. Uno de los fragmentos contiene hielo utilizable como combustible. La navegación requiere precisión y reflejos.',
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
          effects: [],
          rewardMultiplier: 0.5,
        },
      ],
      reward: { text: 'Combustible extraído del fragmento de hielo.', ship: { power: 30 } },
    },
  ],
  impact: { hull: -5 },
  sequence: [
    'Motores al 40%. Entrada en el campo de asteroides.',
    'Impactos menores en el blindaje frontal.',
    'Fragmento de hielo localizado. Iniciando extracción.',
  ],
}

const distressSignal: MissionDefinition = {
  id: 'distress-signal',
  number: 4,
  title: 'La Señal de Auxilio',
  sectorId: 'armstrong',
  day: 19,
  durationHours: 8,
  objective: 'Responder a una señal de auxilio de una nave a la deriva.',
  briefing:
    'Comunicaciones recibe una señal de auxilio en bucle desde una nave sin propulsión. Puede haber supervivientes, o puede ser una trampa.',
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
      teamEffects: [{ kind: 'ship', delta: { medicine: -10, food: -5 } }],
      absenceRules: [
        {
          crewId: 'elias',
          summary: 'Los participantes pierden 15 Salud adicional.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { health: -15 } }],
        },
        {
          crewId: 'orion',
          summary: 'Moral +5 solamente.',
          effects: [],
          rewardOverride: {
            text: 'Rescate desordenado. La tripulación apenas lo celebra.',
            crew: { morale: 5 },
          },
        },
        {
          crewId: 'zara',
          summary: 'Los participantes pierden 20 Sueño adicional.',
          effects: [{ kind: 'stats', scope: 'participants', delta: { sleep: -20 } }],
        },
      ],
      reward: {
        text: 'Supervivientes rescatados. La tripulación confía en N0VA-7.',
        crew: { morale: 15, trust: 20 },
      },
    },
  ],
  sequence: [
    'Rumbo de intercepción fijado.',
    'Acoplamiento con la nave a la deriva. Pasillos sin presión.',
    'Señales de vida detectadas en la bodega.',
  ],
}

const stormHeart: MissionDefinition = {
  id: 'storm-heart',
  number: 5,
  title: 'El Corazón de la Tormenta',
  sectorId: 'gagarin',
  day: 25,
  durationHours: 6,
  objective: 'Sobrevivir a una tormenta iónica eligiendo qué sistema proteger.',
  briefing:
    'Una tormenta iónica envuelve a la Elysium. No hay equipo correcto: N0VA-7 solo puede concentrar a la tripulación en un sector. El resto sufrirá daños.',
  risks: ['No existe un equipo correcto. El jugador elige una ruta.'],
  impact: { power: -20, food: -15, medicine: -15, hull: -10 },
  routes: [
    {
      id: 'engine',
      name: 'Ruta Motor',
      optimalCrew: ['orion', 'lyra'],
      baseEffects: {},
      teamEffects: [{ kind: 'stats', scope: 'participants', delta: { stress: 15, sleep: -20 } }],
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
      reward: { text: 'Motor protegido: daño mínimo.', ship: { power: 20, hull: 10 } },
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
            { kind: 'ship-scale', key: 'food', factor: 0.5 },
            { kind: 'stats', scope: 'crew', delta: { morale: -15 } },
          ],
        },
      ],
      reward: { text: 'Cultivos protegidos.', ship: { food: 15 } },
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
          effects: [{ kind: 'recovery-modifier', factor: 0.5 }],
        },
      ],
      reward: { text: 'Enfermería protegida.', ship: { medicine: 15 } },
    },
  ],
  sequence: [
    'Tormenta iónica a 3 minutos. Redistribuyendo energía.',
    'Descargas en el casco. Sistemas secundarios en riesgo.',
    'Equipo en posición. Resistiendo el pico de la tormenta.',
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
