import { GAME_SCHEMA_VERSION, gameStateSchema, type GameState } from '../domain/model/game'

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

/**
 * Upgrades older envelopes to the current schema. Add one entry per version bump:
 * `{ 1: (state) => upgradedToV2 }`. Empty while only version 1 exists.
 */
const MIGRATIONS: Record<number, (state: unknown) => unknown> = {}

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
