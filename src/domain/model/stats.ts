import { z } from 'zod'

/** The five primary crew statistics (design doc §6). All live in the 0–100 range. */
export const STAT_KEYS = ['health', 'morale', 'stress', 'sleep', 'trust'] as const
export type StatKey = (typeof STAT_KEYS)[number]

export const STAT_MIN = 0
export const STAT_MAX = 100

/** Stats drift by fractions each hour; the interface rounds them for display. */
export const statValueSchema = z.number().min(STAT_MIN).max(STAT_MAX)
export const statsSchema = z.object({
  health: statValueSchema,
  morale: statValueSchema,
  stress: statValueSchema,
  sleep: statValueSchema,
  trust: statValueSchema,
})
export type Stats = z.infer<typeof statsSchema>

/** A change to one or more statistics. Positive raises the value, negative lowers it. */
export type StatDelta = Partial<Record<StatKey, number>>

export const STAT_LABELS: Record<StatKey, string> = {
  health: 'Salud',
  morale: 'Moral',
  stress: 'Estrés',
  sleep: 'Sueño',
  trust: 'Confianza',
}

export const STAT_DESCRIPTIONS: Record<StatKey, string> = {
  health: 'Condición física y lesiones.',
  morale: 'Motivación, esperanza y felicidad.',
  stress: 'Presión psicológica acumulada.',
  sleep: 'Descanso y energía mental.',
  trust: 'Confianza en N0VA-7 y sus órdenes.',
}

/** Consequences listed by the design document for a deteriorated statistic (§6.1). Informational only. */
export const STAT_CONSEQUENCES: Record<StatKey, string[]> = {
  health: [
    'Menor rendimiento.',
    'Mayor probabilidad de accidentes.',
    'Recuperación más lenta de estrés y sueño.',
  ],
  morale: ['Trabaja más lento.', 'Comete errores.', 'Pierde confianza en la IA.'],
  stress: ['Discusiones con compañeros.', 'Decisiones impulsivas.', 'Crisis psicológicas.'],
  sleep: ['Olvida tareas.', 'Produce accidentes.', 'Puede quedarse dormido durante una misión.'],
  trust: ['Cuestiona órdenes.', 'Oculta información.', 'Puede actuar por su cuenta.'],
}

export function sumDeltas(...deltas: StatDelta[]): StatDelta {
  const total: StatDelta = {}
  for (const delta of deltas) {
    for (const key of STAT_KEYS) {
      const value = delta[key]
      if (value) total[key] = (total[key] ?? 0) + value
    }
  }
  return total
}

export function isEmptyDelta(delta: StatDelta): boolean {
  return STAT_KEYS.every((key) => !delta[key])
}
