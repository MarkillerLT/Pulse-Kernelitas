import { z } from 'zod'

export const activitySchema = z.enum([
  'work',
  'rest',
  'exercise',
  'assessment',
  'medical',
  'social',
])
export type Activity = z.infer<typeof activitySchema>
export const locationFor: Record<Activity, string> = {
  work: 'Mission control',
  rest: 'Sleeping quarters',
  exercise: 'Exercise area',
  assessment: 'Medical bay',
  medical: 'Medical bay',
  social: 'Crew common',
}
const score = z.number().min(0).max(100)
export const astronautSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  color: z.string(),
  activity: activitySchema,
  location: z.string(),
  sleep: score,
  fatigue: score,
  cognition: score,
  stress: score,
  health: z.enum(['nominal', 'strained', 'critical']),
})
export type Astronaut = z.infer<typeof astronautSchema>
export const decisionSchema = z.object({ astronautId: z.string(), activity: activitySchema })
export type PlayerDecision = z.infer<typeof decisionSchema>
export const telemetrySchema = z.object({
  day: z.number(),
  fatigue: score,
  cognition: score,
  stress: score,
  progress: score,
})
export const missionSchema = z
  .object({
    schemaVersion: z.literal(1),
    day: z.number().int().min(1),
    duration: z.number().int().positive(),
    seed: z.number().int().min(0).max(4294967295),
    progress: score,
    status: z.enum(['active', 'complete', 'failed']),
    crew: z.array(astronautSchema).length(3),
    resources: z.object({ medical: z.number().min(0), operations: z.number().min(0) }),
    events: z.array(
      z.object({
        id: z.string(),
        day: z.number(),
        severity: z.enum(['info', 'warning', 'critical']),
        title: z.string(),
        description: z.string(),
      }),
    ),
    pending: z.array(
      z.object({
        dueDay: z.number(),
        astronautId: z.string(),
        kind: z.enum(['recovery', 'strain', 'assessment']),
        magnitude: z.number(),
      }),
    ),
    telemetry: z.array(telemetrySchema),
    history: z.array(z.object({ day: z.number(), decisions: z.array(decisionSchema) })),
  })
  .superRefine((state, ctx) => {
    const ids = new Set(state.crew.map((a) => a.id))
    if (ids.size !== 3)
      ctx.addIssue({ code: 'custom', message: 'Crew identifiers must be unique.' })
    for (const effect of state.pending) {
      if (!ids.has(effect.astronautId))
        ctx.addIssue({ code: 'custom', message: 'Pending effect references unknown crew.' })
    }
    for (const entry of state.history)
      for (const decision of entry.decisions) {
        if (!ids.has(decision.astronautId))
          ctx.addIssue({ code: 'custom', message: 'History references unknown crew.' })
      }
  })
export type MissionState = z.infer<typeof missionSchema>
export type SimulationParameters = {
  workFatigue: number
  restRecovery: number
  dailyOperations: number
  medicalCost: number
  activityCosts: Record<Activity, number>
  progressPerWorker: number
  strainThreshold: number
}
export type SimulationResult = { state: MissionState; errors: string[] }
