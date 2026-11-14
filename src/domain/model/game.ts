import { z } from 'zod'
import { CREW_IDS } from '../content/crew'
import { CONDITIONS } from '../content/conditions'
import { MISSIONS, MISSION_IDS } from '../content/missions'
import { SECTOR_IDS } from '../content/sectors'
import { statsSchema } from './stats'

/** Bump when the persisted shape changes, and add a migration in persistence/saveGame. */
export const GAME_SCHEMA_VERSION = 2

export const crewIdSchema = z.enum(CREW_IDS)

const num = z.number().optional()
const percent = z.number().min(0).max(100)
export const shipSchema = z.object({
  lifeSupport: percent,
  power: percent,
  hull: percent,
  food: percent,
  medicine: percent,
})
const shipDeltaSchema = z
  .object({ lifeSupport: num, power: num, hull: num, food: num, medicine: num })
  .strict()

/**
 * What a crew member is doing. Drives hourly stat drift and where they walk on the map.
 * - duty: working in their home sector.   - task: assigned to a ship task.
 * - mission: away on a story mission.       - rest: sleeping in the cabins.
 * - medical: recovering in the medical bay. - leisure: free time in the common area.
 * - dead.
 */
export const activitySchema = z.enum([
  'duty',
  'task',
  'mission',
  'rest',
  'medical',
  'leisure',
  'dead',
])
export type Activity = z.infer<typeof activitySchema>

export const crewStateSchema = z.object({
  stats: statsSchema,
  conditions: z.array(z.string()),
  activity: activitySchema,
  /** Game hour when the current activity ends (rest, leisure, task); null = open-ended. */
  activityUntil: z.number().nullable(),
  taskId: z.string().nullable(),
  counters: z.object({
    /** Times N0VA-7 forced the member to work while exhausted or saturated. */
    forced: z.number().int().min(0),
    /** Times sleep reached 0. */
    sleepZero: z.number().int().min(0),
    /** Consecutive hours with health below 25. */
    lowHealthHours: z.number().min(0),
    /** Consecutive hours with health at 0. */
    zeroHealthHours: z.number().min(0),
    requestCooldownUntil: z.number(),
    wellbeingCooldownUntil: z.number(),
  }),
})
export type CrewState = z.infer<typeof crewStateSchema>

export const severitySchema = z.enum(['routine', 'urgent', 'critical'])

export const taskSchema = z.object({
  id: z.string(),
  kind: z.enum(['event', 'mission', 'request']),
  /** Event id, mission id, or 'rest' for requests. */
  refId: z.string(),
  title: z.string(),
  sectorId: z.enum(SECTOR_IDS),
  severity: severitySchema,
  createdAt: z.number(),
  deadline: z.number(),
  targetId: crewIdSchema.nullable(),
  attempt: z.number().int().min(1),
  status: z.enum(['open', 'active']),
  assignment: z
    .object({
      optionId: z.string(),
      crewIds: z.array(crewIdSchema),
      startedAt: z.number(),
      endsAt: z.number(),
      chance: z.number().min(0).max(1),
      forcedIds: z.array(crewIdSchema),
      /** Most harmful condition at launch, used to explain a failure. */
      mainRisk: z.string().nullable(),
    })
    .nullable(),
})
export type Task = z.infer<typeof taskSchema>

export const crewChangeSchema = z.object({
  crewId: crewIdSchema,
  before: statsSchema,
  after: statsSchema,
})
export type CrewChange = z.infer<typeof crewChangeSchema>

export const logEntrySchema = z.object({
  id: z.string(),
  hour: z.number(),
  kind: z.enum(['task', 'mission', 'request', 'crew', 'ship', 'system']),
  severity: z.enum(['info', 'success', 'warning', 'critical']),
  title: z.string(),
  text: z.string(),
  crewIds: z.array(crewIdSchema),
  /** Success chance when a roll decided the outcome. */
  chance: z.number().nullable(),
  changes: z.array(crewChangeSchema),
  ship: shipDeltaSchema,
})
export type LogEntry = z.infer<typeof logEntrySchema>

export const missionStatusSchema = z.enum([
  'pending',
  'available',
  'active',
  'completed',
  'failed',
  'lost',
])
export type MissionStatus = z.infer<typeof missionStatusSchema>

export const settingsSchema = z.object({ reducedMotion: z.boolean(), autoPause: z.boolean() })
export type Settings = z.infer<typeof settingsSchema>

export const gameStateSchema = z
  .object({
    schemaVersion: z.literal(GAME_SCHEMA_VERSION),
    createdAt: z.string(),
    updatedAt: z.string(),
    /** Game clock in hours since the start of day 1 (00:00). */
    hour: z.number().int().min(0),
    rngSeed: z.number().int().min(0).max(0xffffffff),
    status: z.enum(['active', 'won', 'lost']),
    endReason: z.string().nullable(),
    crew: z.record(crewIdSchema, crewStateSchema),
    ship: shipSchema,
    tasks: z.array(taskSchema),
    missions: z.record(z.string(), missionStatusSchema),
    /** Last game hour each event was spawned (for cooldowns). */
    eventHistory: z.record(z.string(), z.number()),
    modifiers: z.object({ recoveryMultiplier: z.number().min(0).max(1) }),
    nextId: z.number().int().min(1),
    log: z.array(logEntrySchema),
    settings: settingsSchema,
  })
  .superRefine((state, ctx) => {
    for (const id of MISSION_IDS)
      if (!(id in state.missions))
        ctx.addIssue({ code: 'custom', message: `Falta el estado de la misión ${id}.` })
    for (const id of Object.keys(state.missions))
      if (!MISSIONS[id]) ctx.addIssue({ code: 'custom', message: `Misión desconocida: ${id}.` })
    for (const id of CREW_IDS)
      for (const condition of state.crew[id].conditions)
        if (!CONDITIONS[condition])
          ctx.addIssue({ code: 'custom', message: `Estado desconocido: ${condition}.` })
    const taskIds = new Set(state.tasks.map((t) => t.id))
    if (taskIds.size !== state.tasks.length)
      ctx.addIssue({ code: 'custom', message: 'Tareas duplicadas.' })
    for (const id of CREW_IDS) {
      const taskId = state.crew[id].taskId
      if (taskId && !taskIds.has(taskId))
        ctx.addIssue({ code: 'custom', message: `${id} apunta a una tarea inexistente.` })
    }
  })
export type GameState = z.infer<typeof gameStateSchema>
