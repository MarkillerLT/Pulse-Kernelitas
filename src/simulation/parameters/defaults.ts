import type { SimulationParameters } from '../models/mission'

/** Game-balance coefficients, NOT measured NASA or clinical values. */
export const parameters: SimulationParameters = {
  workFatigue: 11,
  restRecovery: 24,
  dailyOperations: 3,
  medicalCost: 2,
  activityCosts: { work: 0, rest: 1, exercise: 2, assessment: 2, medical: 1, social: 1 },
  progressPerWorker: 4.5,
  strainThreshold: 78,
}
