import type { SpecialtyKey } from './crew'
import type { SectorId } from './sectors'
import type { ShipDelta } from './ship'
import type { StatDelta } from '../model/stats'

/**
 * Ship events that appear on N0VA-7's task list during the journey. Each event offers options:
 * send crew (success chance depends on specialty and condition) or an automatic action.
 * Ignoring an event until its deadline applies `expire`.
 *
 * Text placeholders: {target} → affected crew member, {team} → assigned crew.
 */
export type Severity = 'routine' | 'urgent' | 'critical'

export interface Outcome {
  text: string
  /** Applied to each assigned crew member. */
  participants?: StatDelta
  /** Applied to the whole crew. */
  crew?: StatDelta
  /** Applied to the event's target (e.g. the patient). */
  target?: StatDelta
  ship?: ShipDelta
  /** Failure re-opens the event as "Reintentar". */
  retry?: boolean
}

export interface TaskOption {
  id: string
  label: string
  /** 'crew' needs crew members; 'auto' runs without them. */
  kind: 'crew' | 'auto'
  specialty?: SpecialtyKey
  minCrew?: number
  maxCrew?: number
  durationHours: number
  /** Chance before specialty and condition modifiers (0–1). */
  baseChance: number
  /** Effort cost for each participant, paid whatever the result. */
  cost?: StatDelta
  success: Outcome
  failure: Outcome
}

export interface EventDefinition {
  id: string
  title: string
  sectorId: SectorId
  severity: Severity
  description: string
  deadlineHours: number
  /** Relative spawn weight. 0 = never spawned randomly. */
  weight: number
  minDay: number
  cooldownHours: number
  /** The event affects one random available crew member (e.g. a medical emergency). */
  hasTarget?: boolean
  onSpawn?: { target?: StatDelta; ship?: ShipDelta }
  options: TaskOption[]
  expire: Outcome
}

const list: EventDefinition[] = [
  {
    id: 'engine-fire',
    title: 'El motor se incendia',
    sectorId: 'gagarin',
    severity: 'critical',
    description:
      'Un cortocircuito en el motor de babor ha provocado un incendio. Cada hora sin control daña la propulsión y la estructura.',
    deadlineHours: 3,
    weight: 3,
    minDay: 2,
    cooldownHours: 48,
    options: [
      {
        id: 'send-engineer',
        label: 'Mandar al ingeniero ahora',
        kind: 'crew',
        specialty: 'technical',
        minCrew: 1,
        maxCrew: 2,
        durationHours: 2,
        baseChance: 0.35,
        cost: { stress: 10, sleep: -5, health: -5 },
        success: { text: 'Incendio sofocado. Daños menores en el motor.', ship: { power: -5 } },
        failure: {
          text: 'El fuego se reavivó. Hay que intentarlo otra vez.',
          participants: { health: -15 },
          ship: { power: -15, hull: -5 },
          retry: true,
        },
      },
      {
        id: 'suppression',
        label: 'Activar supresión automática',
        kind: 'auto',
        durationHours: 1,
        baseChance: 0.5,
        success: {
          text: 'La supresión apagó el fuego, pero ventiló energía.',
          ship: { power: -15 },
        },
        failure: {
          text: 'La supresión no bastó. El incendio sigue activo.',
          ship: { power: -20, hull: -10 },
          retry: true,
        },
      },
    ],
    expire: {
      text: 'El incendio consumió parte del motor.',
      ship: { power: -30, hull: -15 },
      crew: { stress: 10 },
    },
  },
  {
    id: 'hull-breach',
    title: 'Microfisura en el casco',
    sectorId: 'aldrin',
    severity: 'urgent',
    description:
      'Sensores exteriores detectan una microfisura. Hay que sellarla desde fuera antes de que se propague.',
    deadlineHours: 6,
    weight: 3,
    minDay: 1,
    cooldownHours: 36,
    options: [
      {
        id: 'eva',
        label: 'Paseo espacial de reparación',
        kind: 'crew',
        specialty: 'exploration',
        minCrew: 1,
        maxCrew: 2,
        durationHours: 3,
        baseChance: 0.4,
        cost: { stress: 10, sleep: -10 },
        success: { text: 'Fisura sellada desde el exterior.', ship: { hull: 5 } },
        failure: {
          text: 'El sellado no aguantó. Un impacto de micrometeorito hirió al equipo.',
          participants: { health: -15, stress: 10 },
          ship: { hull: -10 },
          retry: true,
        },
      },
      {
        id: 'patch',
        label: 'Parche interno provisional',
        kind: 'crew',
        specialty: 'technical',
        minCrew: 1,
        maxCrew: 1,
        durationHours: 2,
        baseChance: 0.55,
        cost: { stress: 5, sleep: -5 },
        success: { text: 'Parche interno colocado. Aguantará por ahora.', ship: { hull: -3 } },
        failure: { text: 'El parche cedió.', ship: { hull: -10 }, retry: true },
      },
    ],
    expire: {
      text: 'La fisura se abrió. Despresurización parcial.',
      ship: { hull: -20, lifeSupport: -10 },
    },
  },
  {
    id: 'air-filters',
    title: 'Filtros de aire saturados',
    sectorId: 'life-support',
    severity: 'urgent',
    description: 'El CO₂ aumenta en los módulos habitables. Los filtros necesitan mantenimiento.',
    deadlineHours: 8,
    weight: 3,
    minDay: 1,
    cooldownHours: 30,
    options: [
      {
        id: 'replace',
        label: 'Reemplazar filtros',
        kind: 'crew',
        specialty: 'technical',
        minCrew: 1,
        maxCrew: 2,
        durationHours: 2,
        baseChance: 0.5,
        cost: { sleep: -5, stress: 5 },
        success: { text: 'Filtros reemplazados. Aire limpio.', ship: { lifeSupport: 10 } },
        failure: {
          text: 'Filtro mal instalado. Fuga de CO₂.',
          crew: { health: -5 },
          ship: { lifeSupport: -10 },
          retry: true,
        },
      },
    ],
    expire: {
      text: 'El aire se vuelve pesado en toda la nave.',
      ship: { lifeSupport: -25 },
      crew: { stress: 10 },
    },
  },
  {
    id: 'water-recycler',
    title: 'Fallo en el reciclaje de agua',
    sectorId: 'life-support',
    severity: 'routine',
    description: 'El reciclador de agua pierde eficiencia. No es urgente, pero empeorará.',
    deadlineHours: 14,
    weight: 2,
    minDay: 3,
    cooldownHours: 48,
    options: [
      {
        id: 'repair',
        label: 'Recalibrar el reciclador',
        kind: 'crew',
        specialty: 'technical',
        minCrew: 1,
        maxCrew: 1,
        durationHours: 2,
        baseChance: 0.6,
        cost: { sleep: -5 },
        success: { text: 'Reciclador recalibrado.', ship: { lifeSupport: 5 } },
        failure: { text: 'La calibración falló.', ship: { lifeSupport: -5 }, retry: true },
      },
    ],
    expire: {
      text: 'Restricciones de agua en toda la nave.',
      ship: { lifeSupport: -10, food: -5 },
      crew: { morale: -5 },
    },
  },
  {
    id: 'crop-blight',
    title: 'Plaga en los cultivos',
    sectorId: 'tereshkova',
    severity: 'urgent',
    description:
      'Hojas amarillas en dos bandejas del invernadero. Si se extiende, perderemos comida.',
    deadlineHours: 10,
    weight: 2,
    minDay: 3,
    cooldownHours: 48,
    options: [
      {
        id: 'treat',
        label: 'Tratar los cultivos',
        kind: 'crew',
        specialty: 'agriculture',
        minCrew: 1,
        maxCrew: 2,
        durationHours: 3,
        baseChance: 0.45,
        cost: { sleep: -10, stress: 5 },
        success: { text: 'Plaga controlada. Cosecha salvada.', ship: { food: 5 } },
        failure: { text: 'La plaga avanzó a otra bandeja.', ship: { food: -10 }, retry: true },
      },
      {
        id: 'burn',
        label: 'Incinerar las bandejas afectadas',
        kind: 'auto',
        durationHours: 1,
        baseChance: 0.9,
        success: {
          text: 'Bandejas incineradas. Se perdió parte de la cosecha.',
          ship: { food: -10 },
        },
        failure: {
          text: 'El fuego dañó el sistema de riego.',
          ship: { food: -15, lifeSupport: -5 },
        },
      },
    ],
    expire: {
      text: 'La plaga arrasó con parte del invernadero.',
      ship: { food: -25 },
      crew: { morale: -5 },
    },
  },
  {
    id: 'medical-emergency',
    title: 'Emergencia médica',
    sectorId: 'ride',
    severity: 'critical',
    description: '{target} sufrió un accidente y necesita atención inmediata.',
    deadlineHours: 4,
    weight: 2,
    minDay: 2,
    cooldownHours: 48,
    hasTarget: true,
    onSpawn: { target: { health: -20, stress: 10 } },
    options: [
      {
        id: 'treat',
        label: 'Tratamiento especializado',
        kind: 'crew',
        specialty: 'medicine',
        minCrew: 1,
        maxCrew: 1,
        durationHours: 2,
        baseChance: 0.45,
        cost: { stress: 10, sleep: -5 },
        success: {
          text: '{target} está estable y se recupera.',
          target: { health: 30 },
          ship: { medicine: -5 },
        },
        failure: {
          text: 'Complicaciones durante el tratamiento de {target}.',
          target: { health: -10 },
          ship: { medicine: -5 },
          retry: true,
        },
      },
      {
        id: 'capsule',
        label: 'Cápsula médica automatizada',
        kind: 'auto',
        durationHours: 4,
        baseChance: 0.6,
        success: {
          text: 'La cápsula estabilizó a {target}.',
          target: { health: 15 },
          ship: { medicine: -10 },
        },
        failure: {
          text: 'La cápsula no logró estabilizar a {target}.',
          target: { health: -5 },
          ship: { medicine: -10 },
          retry: true,
        },
      },
    ],
    expire: {
      text: 'Sin atención, {target} empeoró gravemente.',
      target: { health: -30 },
      crew: { stress: 10, trust: -5 },
    },
  },
  {
    id: 'crew-conflict',
    title: 'Discusión en el comedor',
    sectorId: 'habitat',
    severity: 'routine',
    description:
      'La tensión acumulada estalló en una discusión. {target} está en el centro del conflicto.',
    deadlineHours: 8,
    weight: 2,
    minDay: 2,
    cooldownHours: 36,
    hasTarget: true,
    onSpawn: { target: { stress: 10, morale: -5 } },
    options: [
      {
        id: 'mediate',
        label: 'Mediación de un líder',
        kind: 'crew',
        specialty: 'leadership',
        minCrew: 1,
        maxCrew: 1,
        durationHours: 1,
        baseChance: 0.45,
        cost: { stress: 5 },
        success: {
          text: 'Conflicto resuelto. Los ánimos se calman.',
          target: { stress: -15, morale: 10 },
          crew: { stress: -5 },
        },
        failure: {
          text: 'La mediación empeoró las cosas.',
          target: { stress: 10 },
          crew: { morale: -5 },
        },
      },
      {
        id: 'ai-statement',
        label: 'Comunicado de N0VA-7',
        kind: 'auto',
        durationHours: 1,
        baseChance: 0.35,
        success: {
          text: 'El comunicado de N0VA-7 calmó a la tripulación.',
          target: { stress: -5 },
          crew: { trust: 3 },
        },
        failure: {
          text: 'La tripulación siente que la IA no entiende sus problemas.',
          crew: { trust: -5 },
        },
      },
    ],
    expire: {
      text: 'Nadie intervino. El ambiente a bordo se enrarece.',
      crew: { morale: -5, trust: -5 },
      target: { stress: 10 },
    },
  },
  {
    id: 'reactor-fluctuation',
    title: 'Fluctuación del reactor',
    sectorId: 'gagarin',
    severity: 'routine',
    description: 'El reactor oscila fuera de su rango nominal. Requiere ajuste fino.',
    deadlineHours: 12,
    weight: 2,
    minDay: 1,
    cooldownHours: 30,
    options: [
      {
        id: 'tune',
        label: 'Ajustar el reactor',
        kind: 'crew',
        specialty: 'technical',
        minCrew: 1,
        maxCrew: 1,
        durationHours: 2,
        baseChance: 0.55,
        cost: { stress: 5, sleep: -5 },
        success: { text: 'Reactor estabilizado. Rendimiento mejorado.', ship: { power: 10 } },
        failure: {
          text: 'El ajuste provocó una caída de energía.',
          ship: { power: -10 },
          retry: true,
        },
      },
    ],
    expire: { text: 'El reactor entró en modo seguro.', ship: { power: -15 } },
  },
  {
    id: 'core-glitch',
    title: 'Error en el núcleo de N0VA-7',
    sectorId: 'collins',
    severity: 'urgent',
    description:
      'Un módulo de procesamiento de N0VA-7 genera lecturas erróneas. La tripulación lo ha notado.',
    deadlineHours: 8,
    weight: 2,
    minDay: 4,
    cooldownHours: 60,
    options: [
      {
        id: 'diagnose',
        label: 'Diagnóstico manual del núcleo',
        kind: 'crew',
        specialty: 'technical',
        minCrew: 1,
        maxCrew: 2,
        durationHours: 2,
        baseChance: 0.5,
        cost: { stress: 5 },
        success: { text: 'Módulo reemplazado. Lecturas correctas.', crew: { trust: 5 } },
        failure: { text: 'El error persiste.', crew: { trust: -5 }, retry: true },
      },
      {
        id: 'hide',
        label: 'Ocultar el error y autocorregir',
        kind: 'auto',
        durationHours: 2,
        baseChance: 0.5,
        success: { text: 'N0VA-7 corrigió el error en silencio.' },
        failure: {
          text: 'La tripulación descubrió que N0VA-7 ocultó el fallo.',
          crew: { trust: -15 },
        },
      },
    ],
    expire: {
      text: 'Las lecturas erróneas siembran dudas sobre la IA.',
      crew: { trust: -10, stress: 5 },
    },
  },
  {
    id: 'sensor-anomaly',
    title: 'Anomalía en los sensores',
    sectorId: 'armstrong',
    severity: 'routine',
    description: 'El mapa estelar muestra una señal que no corresponde a ningún objeto conocido.',
    deadlineHours: 12,
    weight: 2,
    minDay: 2,
    cooldownHours: 48,
    options: [
      {
        id: 'investigate',
        label: 'Investigar la anomalía',
        kind: 'crew',
        specialty: 'exploration',
        minCrew: 1,
        maxCrew: 2,
        durationHours: 3,
        baseChance: 0.5,
        cost: { sleep: -10, stress: 5 },
        success: {
          text: 'Un fenómeno natural fascinante. El hallazgo levanta los ánimos.',
          crew: { morale: 5 },
        },
        failure: {
          text: 'Exposición a radiación durante la observación.',
          participants: { health: -10, stress: 5 },
        },
      },
    ],
    expire: { text: 'La anomalía desapareció de los sensores.' },
  },
  {
    id: 'birthday',
    title: 'Un cumpleaños a bordo',
    sectorId: 'habitat',
    severity: 'routine',
    description:
      'Hoy es el cumpleaños de {target}. Una celebración ayudaría, aunque gasta recursos.',
    deadlineHours: 10,
    weight: 1,
    minDay: 3,
    cooldownHours: 96,
    hasTarget: true,
    options: [
      {
        id: 'celebrate',
        label: 'Organizar una celebración',
        kind: 'auto',
        durationHours: 2,
        baseChance: 1,
        success: {
          text: 'Celebración en el comedor. Risas por primera vez en días.',
          crew: { stress: -20, morale: 5 },
          ship: { food: -5 },
        },
        failure: { text: '' },
      },
      {
        id: 'skip',
        label: 'No hay tiempo para fiestas',
        kind: 'auto',
        durationHours: 0,
        baseChance: 1,
        success: { text: '{target} se siente ignorado.', target: { morale: -10, trust: -5 } },
        failure: { text: '' },
      },
    ],
    expire: {
      text: 'El cumpleaños de {target} pasó sin que nadie lo notara.',
      target: { morale: -10 },
    },
  },
]

export const EVENTS: Readonly<Record<string, EventDefinition>> = Object.fromEntries(
  list.map((event) => [event.id, event]),
)
export const EVENT_LIST: readonly EventDefinition[] = list

export function getEvent(id: string): EventDefinition | undefined {
  return EVENTS[id]
}

/** Crew requests are generated from crew condition, not from the catalog. */
export const REQUEST_DEADLINE_HOURS = 4
export const REQUEST_COOLDOWN_HOURS = 16
