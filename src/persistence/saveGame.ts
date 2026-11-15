import { START_HOUR } from '../domain/content/ship'
import { GAME_SCHEMA_VERSION, gameStateSchema, type GameState } from '../domain/model/game'
import {
  DIFFICULTY_MODES,
  MODE_INFO,
  levelAt,
  type DifficultyMode,
} from '../domain/rules/difficulty'

/**
 * Local persistence in localStorage.
 *
 * Why localStorage: a full save is a few KB, reads are synchronous (the game is restored before
 * the first render, no loading flash) and it needs no dependency. IndexedDB would only pay off for
 * large or binary data. All access goes through `StorageLike` so tests can inject a fake.
 *
 * Saves are wrapped in a versioned envelope and validated with the domain schema on load.
 * Corrupt or incompatible saves are never silently discarded: the raw text is copied to a backup
 * key before a new game replaces it.
 */
export const SAVE_KEY = 'elysium.save'
export const BACKUP_KEY = 'elysium.save.backup'
const APP_ID = 'elysium'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

interface SaveEnvelope {
  app: typeof APP_ID
  version: number
  savedAt: string
  state: unknown
}

export type ParseResult = { ok: true; state: GameState } | { ok: false; reason: string }

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'invalid'; reason: string; backedUp: boolean }

type Draft = Record<string, unknown>

/**
 * Upgrades older envelopes to the current schema, one entry per version bump.
 * v2 → v3: endless survival with difficulty levels. Old games continue in Fácil at the level
 * their elapsed time corresponds to; a finished 30-day journey is kept as ended.
 */
const MIGRATIONS: Record<number, (state: unknown) => unknown> = {
  2: (raw) => {
    const state = { ...(raw as Draft) }
    const hour = typeof state.hour === 'number' ? state.hour : START_HOUR
    state.schemaVersion = 3
    state.difficulty = { mode: 'easy', level: levelAt(MODE_INFO.easy.startLevel, hour) }
    state.nextMissionAt = hour + 24
    if (state.status === 'won') state.status = 'lost'
    if (Array.isArray(state.tasks))
      state.tasks = state.tasks.map((t: Draft) => ({ ...t, recurring: false }))
    return state
  },
}

export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage
    const probe = '__elysium_probe__'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

export function serializeSave(state: GameState, savedAt: string): string {
  const envelope: SaveEnvelope = {
    app: APP_ID,
    version: GAME_SCHEMA_VERSION,
    savedAt,
    state: gameStateSchema.parse(state),
  }
  return JSON.stringify(envelope)
}

export function parseSave(raw: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'El archivo de guardado no es JSON válido.' }
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, reason: 'El guardado no tiene el formato esperado.' }
  }
  const envelope = data as Partial<SaveEnvelope>
  if (envelope.app !== APP_ID || typeof envelope.version !== 'number') {
    return { ok: false, reason: 'El archivo no es una partida de ELYSIUM.' }
  }
  if (envelope.version > GAME_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `El guardado es de una versión más reciente (v${envelope.version}).`,
    }
  }
  let state = envelope.state
  for (let version = envelope.version; version < GAME_SCHEMA_VERSION; version++) {
    const migrate = MIGRATIONS[version]
    if (!migrate) {
      return { ok: false, reason: `No existe migración para la versión v${version}.` }
    }
    state = migrate(state)
  }
  const result = gameStateSchema.safeParse(state)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') || 'estado'
    return { ok: false, reason: `Datos incompatibles en "${path}": ${issue?.message}` }
  }
  return { ok: true, state: result.data }
}

export function loadGame(storage: StorageLike): LoadResult {
  const raw = storage.getItem(SAVE_KEY)
  if (raw === null) return { status: 'empty' }
  const parsed = parseSave(raw)
  if (parsed.ok) return { status: 'ok', state: parsed.state }
  let backedUp: boolean
  try {
    storage.setItem(BACKUP_KEY, raw)
    backedUp = true
  } catch {
    backedUp = false
  }
  return { status: 'invalid', reason: parsed.reason, backedUp }
}

/** Throws when the state is invalid or storage rejects the write (quota, privacy mode…). */
export function saveGame(storage: StorageLike, state: GameState, savedAt: string): void {
  storage.setItem(SAVE_KEY, serializeSave(state, savedAt))
}

export function clearSave(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY)
}

/** Best run per mode, kept apart from the save so starting a new game does not erase it. */
export const RECORDS_KEY = 'elysium.records'

export interface RunRecord {
  level: number
  day: number
}
export type Records = Partial<Record<DifficultyMode, RunRecord>>

export function loadRecords(storage: StorageLike | null): Records {
  if (!storage) return {}
  try {
    const data = JSON.parse(storage.getItem(RECORDS_KEY) ?? '{}') as Record<string, unknown>
    const records: Records = {}
    for (const mode of DIFFICULTY_MODES) {
      const r = data[mode] as Partial<RunRecord> | undefined
      if (r && Number.isInteger(r.level) && Number.isInteger(r.day))
        records[mode] = { level: r.level!, day: r.day! }
    }
    return records
  } catch {
    return {}
  }
}

/** Stores `run` if it beats the mode's record. Returns the updated records. */
export function saveRecord(
  storage: StorageLike | null,
  records: Records,
  mode: DifficultyMode,
  run: RunRecord,
): Records {
  const best = records[mode]
  if (best && (best.level > run.level || (best.level === run.level && best.day >= run.day)))
    return records
  const next = { ...records, [mode]: run }
  try {
    storage?.setItem(RECORDS_KEY, JSON.stringify(next))
  } catch {
    // Records are a convenience: losing one must not interrupt the game.
  }
  return next
}
