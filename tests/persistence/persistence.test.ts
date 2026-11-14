import { beforeEach, describe, expect, it } from 'vitest'
import { createGame } from '../../src/domain/engine/createGame'
import {
  BACKUP_KEY,
  SAVE_KEY,
  loadGame,
  parseSave,
  saveGame,
  serializeSave,
  type StorageLike,
} from '../../src/persistence/saveGame'
import { createGameStore } from '../../src/store/gameStore'

const NOW = '2026-11-14T12:00:00.000Z'

class MemoryStorage implements StorageLike {
  data = new Map<string, string>()
  failWrites = false
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('QuotaExceededError')
    this.data.set(key, value)
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
}

let storage: MemoryStorage
beforeEach(() => {
  storage = new MemoryStorage()
})

describe('save files', () => {
  it('round-trips a game through storage', () => {
    const game = createGame({ now: NOW })
    saveGame(storage, game, NOW)
    expect(loadGame(storage)).toEqual({ status: 'ok', state: game })
  })

  it('reports an empty slot', () => {
    expect(loadGame(storage)).toEqual({ status: 'empty' })
  })

  it('rejects corrupt JSON and keeps a backup of the raw text', () => {
    storage.setItem(SAVE_KEY, '{not json')
    const result = loadGame(storage)
    expect(result).toMatchObject({ status: 'invalid', backedUp: true })
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json')
  })

  it('rejects saves from a newer schema version', () => {
    const raw = JSON.parse(serializeSave(createGame({ now: NOW }), NOW))
    raw.version = 99
    const parsed = parseSave(JSON.stringify(raw))
    expect(parsed.ok).toBe(false)
  })

  it('rejects files that are not ELYSIUM saves', () => {
    expect(parseSave(JSON.stringify({ hello: 'world' })).ok).toBe(false)
  })

  it('rejects out-of-range statistics', () => {
    const raw = JSON.parse(serializeSave(createGame({ now: NOW }), NOW))
    raw.state.crew.orion.stats.health = 140
    const parsed = parseSave(JSON.stringify(raw))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason).toContain('crew.orion.stats.health')
  })

  it('rejects unknown conditions and missing crew members', () => {
    const raw = JSON.parse(serializeSave(createGame({ now: NOW }), NOW))
    raw.state.crew.kai.conditions = ['made-up']
    expect(parseSave(JSON.stringify(raw)).ok).toBe(false)
    const raw2 = JSON.parse(serializeSave(createGame({ now: NOW }), NOW))
    delete raw2.state.crew.kai
    expect(parseSave(JSON.stringify(raw2)).ok).toBe(false)
  })
})

describe('game store persistence', () => {
  const order = { missionId: 'ghost-satellite', crewIds: ['orion', 'lyra', 'zara'] }

  it('starts a new saved game when there is no save', () => {
    const store = createGameStore({ storage, now: () => NOW })
    expect(store.getState().game.turn).toBe(1)
    expect(storage.getItem(SAVE_KEY)).not.toBeNull()
    expect(store.getState().persistence).toBe('saved')
  })

  it('autosaves after a mission and restores it after a reload', () => {
    const store = createGameStore({ storage, now: () => NOW })
    const result = store.getState().launchMission(order)
    expect(result.ok).toBe(true)
    // Simulates closing and reopening the app: a brand new store reading the same storage.
    const reloaded = createGameStore({ storage, now: () => NOW })
    const game = reloaded.getState().game
    expect(game.turn).toBe(2)
    expect(game.crew.zara.stats.health).toBe(85)
    expect(game.missions['ghost-satellite']).toBe('completed')
    expect(game.log).toHaveLength(1)
  })

  it('does not change the state when a launch is invalid', () => {
    const store = createGameStore({ storage, now: () => NOW })
    const before = store.getState().game
    const result = store.getState().launchMission({ ...order, crewIds: [] })
    expect(result.ok).toBe(false)
    expect(store.getState().game).toBe(before)
  })

  it('reset replaces the progress with a new game, also after reload', () => {
    const store = createGameStore({ storage, now: () => NOW })
    store.getState().launchMission(order)
    store.getState().resetGame()
    expect(store.getState().game.turn).toBe(1)
    const reloaded = createGameStore({ storage, now: () => NOW })
    expect(reloaded.getState().game.log).toEqual([])
    expect(reloaded.getState().game.crew.zara.stats.health).toBe(100)
  })

  it('recovers from a corrupt save with a warning and a backup', () => {
    storage.setItem(SAVE_KEY, 'garbage')
    const store = createGameStore({ storage, now: () => NOW })
    expect(store.getState().notice?.tone).toBe('warning')
    expect(store.getState().game.turn).toBe(1)
    expect(storage.getItem(BACKUP_KEY)).toBe('garbage')
  })

  it('exports and imports a save', () => {
    const store = createGameStore({ storage, now: () => NOW })
    store.getState().launchMission(order)
    const exported = store.getState().exportSave()
    store.getState().resetGame()
    expect(store.getState().importSave(exported)).toEqual({ ok: true })
    expect(store.getState().game.turn).toBe(2)
    expect(store.getState().importSave('nope').ok).toBe(false)
    expect(store.getState().game.turn).toBe(2)
  })

  it('keeps playing in memory and warns when storage rejects writes', () => {
    const store = createGameStore({ storage, now: () => NOW })
    storage.failWrites = true
    const result = store.getState().launchMission(order)
    expect(result.ok).toBe(true)
    expect(store.getState().game.turn).toBe(2)
    expect(store.getState().persistence).toBe('unavailable')
    expect(store.getState().notice?.tone).toBe('error')
  })
})
