import type { StatKey } from '../model/stats'

/**
 * Recovery and deterioration rules from the design document (§7), kept as data so future actions,
 * events and sector mechanics can consume them. None is exposed to the player yet: most depend on
 * resources, time or probabilities the document does not quantify. `missing` lists what is needed.
 */
export interface RecoveryRule {
  id: string
  stat: StatKey
  source: string
  /** Exact amount when the document defines one, or a [min, max] range. */
  amount: number | [number, number]
  scope: 'self' | 'target' | 'crew'
  cost?: string
  missing?: string
}

export const RECOVERY_RULES: readonly RecoveryRule[] = [
  {
    id: 'infirmary-rest',
    stat: 'health',
    source: 'Descanso en enfermería',
    amount: [5, 15],
    scope: 'self',
    cost: 'Consume medicinas.',
    missing: 'Recurso "medicinas" y cómo elegir el valor dentro del rango.',
  },
  {
    id: 'elias-treatment',
    stat: 'health',
    source: 'Tratamiento de Elias',
    amount: [20, 40],
    scope: 'target',
    cost: 'Aumenta el Estrés de Elias; puede reducir su Salud.',
    missing: 'Magnitud del coste para Elias y criterio de "habilidades avanzadas".',
  },
  {
    id: 'kai-remedies',
    stat: 'health',
    source: 'Remedios de Kai',
    amount: 10,
    scope: 'target',
    cost: 'Consume recursos agrícolas.',
    missing: 'Recurso agrícola y su coste.',
  },
  {
    id: 'kai-meals',
    stat: 'morale',
    source: 'Comidas especiales de Kai',
    amount: 10,
    scope: 'crew',
    cost: 'Consume reservas especiales.',
    missing: 'Recurso "reservas especiales".',
  },
  {
    id: 'free-time',
    stat: 'morale',
    source: 'Tiempo libre',
    amount: 5,
    scope: 'self',
    cost: 'Ocupa un turno completo.',
    missing: 'Sistema de turnos fuera de misiones.',
  },
  {
    id: 'mission-success',
    stat: 'morale',
    source: 'Éxito en misiones',
    amount: [5, 20],
    scope: 'self',
    missing: 'Criterio para elegir el valor dentro del rango.',
  },
  {
    id: 'orion-talk',
    stat: 'morale',
    source: 'Conversaciones con Orion',
    amount: 10,
    scope: 'target',
    missing: 'Sistema de conflictos.',
  },
  {
    id: 'rest-stress',
    stat: 'stress',
    source: 'Descansar',
    amount: -10,
    scope: 'self',
    missing: 'Sistema de turnos fuera de misiones.',
  },
  {
    id: 'recreation',
    stat: 'stress',
    source: 'Actividades recreativas',
    amount: -15,
    scope: 'self',
    cost: 'Consumen tiempo.',
    missing: 'Sistema de turnos fuera de misiones.',
  },
  {
    id: 'celebration',
    stat: 'stress',
    source: 'Celebraciones',
    amount: -20,
    scope: 'crew',
    cost: 'Gastan recursos.',
    missing: 'Recursos consumidos.',
  },
  {
    id: 'orion-mediation',
    stat: 'stress',
    source: 'Mediación de Orion',
    amount: [-15, -10],
    scope: 'target',
    missing: 'Sistema de conflictos.',
  },
  {
    id: 'sleep-one-turn',
    stat: 'sleep',
    source: 'Dormir un turno',
    amount: 25,
    scope: 'self',
    missing:
      'Fórmula de reducción por Estrés (solo hay dos ejemplos: Estrés 20 → +25, Estrés 90 → +10).',
  },
  {
    id: 'sleep-two-turns',
    stat: 'sleep',
    source: 'Dormir dos turnos',
    amount: 50,
    scope: 'self',
    missing: 'Fórmula de reducción por Estrés.',
  },
  {
    id: 'long-rest',
    stat: 'sleep',
    source: 'Descanso prolongado',
    amount: 70,
    scope: 'self',
    cost: 'Fuera de servicio temporalmente.',
    missing: 'Duración del periodo fuera de servicio.',
  },
  {
    id: 'keep-promise',
    stat: 'trust',
    source: 'Cumplir promesas',
    amount: 5,
    scope: 'target',
    missing: 'Sistema de solicitudes y promesas.',
  },
  {
    id: 'prioritize-wellbeing',
    stat: 'trust',
    source: 'Dar prioridad al bienestar',
    amount: 10,
    scope: 'target',
    missing: 'Criterio de qué decisión cuenta como prioridad al bienestar.',
  },
  {
    id: 'grant-rest',
    stat: 'trust',
    source: 'Permitir descansos solicitados',
    amount: 5,
    scope: 'target',
    missing: 'Sistema de solicitudes.',
  },
  {
    id: 'save-companion',
    stat: 'trust',
    source: 'Salvar a un compañero',
    amount: [10, 20],
    scope: 'crew',
    missing: 'Criterio para elegir +10 o +20.',
  },
]
