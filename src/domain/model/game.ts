import { z } from 'zod'
import { CREW_IDS } from '../content/crew'
import { CONDITIONS } from '../content/conditions'
import { MISSIONS, MISSION_IDS } from '../content/missions'
import { statsSchema } from './stats'

/** Bump when the persisted shape changes, and add a migration in persistence/migrations. */
export const GAME_SCHEMA_VERSION = 1

export const crewIdSchema = z.enum(CREW_IDS)

const deltaValue = z.number().int().optional()
const statDeltaSchema = z
  .object({
    health: deltaValue,
    morale: deltaValue,
    stress: deltaValue,
    sleep: deltaValue,
    trust: deltaValue,
  })
  .strict()

export const crewStateSchema = z.object({
  stats: statsSchema,
  /** Active permanent/unique/legendary condition ids (see content/conditions). */
  conditions: z.array(z.string()),
})
export type CrewState = z.infer<typeof crewStateSchema>

export const missionStatusSchema = z.enum(['available', 'completed'])
export type MissionStatus = z.infer<typeof missionStatusSchema>

const statChangeSourceSchema = z.object({ label: z.string(), delta: statDeltaSchema })

export const crewChangeSchema = z.object({
  crewId: crewIdSchema,
  before: statsSchema,
  after: statsSchema,
  /** Sum of every delta requested for this member, before clamping. */
  requested: statDeltaSchema,
  sources: z.array(statChangeSourceSchema),
})
export type CrewChange = z.infer<typeof crewChangeSchema>

export const logEntrySchema = z.object({
  id: z.string().min(1),
  turn: z.number().int().min(1),
  timestamp: z.string(),
  missionId: z.string(),
  routeId: z.string(),
  crewIds: z.array(crewIdSchema).min(1),
  outcome: z.enum(['optimal', 'compromised']),
  penalties: z.array(z.object({ absentCrewId: crewIdSchema, summary: z.string() })),
  randomEvents: z.array(
    z.object({ absentCrewId: crewIdSchema, targetId: crewIdSchema, delta: statDeltaSchema }),
  ),
  /** Consequences the design describes but the engine cannot apply yet. */
  unsupported: z.array(z.string()),
  changes: z.array(crewChangeSchema),
  /** Information recovered, or null when the design does not define it for this composition. */
  intel: z.string().nullable(),
  incapacitated: z.array(crewIdSchema),
})
export type LogEntry = z.infer<typeof logEntrySchema>

export const settingsSchema = z.object({ reducedMotion: z.boolean() })
export type Settings = z.infer<typeof settingsSchema>

export const gameStateSchema = z
  .object({
    schemaVersion: z.literal(GAME_SCHEMA_VERSION),
    createdAt: z.string(),
    updatedAt: z.string(),
    /** Turn counter. Advances by one each time a mission is resolved. */
    turn: z.number().int().min(1),
    /** Seed of the deterministic PRNG, advanced whenever a random draw happens. */
    rngSeed: z.number().int().min(0).max(0xffffffff),
    crew: z.record(crewIdSchema, crewStateSchema),
    missions: z.record(z.string(), missionStatusSchema),
    /** Ship resources. The design document does not define any yet; the slot is reserved. */
    resources: z.record(z.string(), z.number()),
    log: z.array(logEntrySchema),
    settings: settingsSchema,
  })
  .superRefine((state, ctx) => {
    for (const id of MISSION_IDS) {
      if (!(id in state.missions))
        ctx.addIssue({ code: 'custom', message: `Falta el estado de la misión ${id}.` })
    }
    for (const id of Object.keys(state.missions)) {
      if (!MISSIONS[id]) ctx.addIssue({ code: 'custom', message: `Misión desconocida: ${id}.` })
    }
    for (const id of CREW_IDS) {
      for (const condition of state.crew[id].conditions) {
        if (!CONDITIONS[condition])
          ctx.addIssue({ code: 'custom', message: `Estado desconocido: ${condition}.` })
      }
    }
    const logIds = new Set<string>()
    for (const entry of state.log) {
      if (!MISSIONS[entry.missionId])
        ctx.addIssue({ code: 'custom', message: `Registro con misión desconocida.` })
      if (logIds.has(entry.id))
        ctx.addIssue({ code: 'custom', message: `Registro duplicado: ${entry.id}.` })
      logIds.add(entry.id)
    }
  })
export type GameState = z.infer<typeof gameStateSchema>
