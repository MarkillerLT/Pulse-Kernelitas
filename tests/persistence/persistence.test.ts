import { beforeEach, describe, expect, it } from 'vitest'
import { createGame } from '../../src/domain/engine/createGame'
import {
  BACKUP_KEY,
  RECORDS_KEY,
  SAVE_KEY,
  loadGame,
  parseSave,
  saveGame,
  serializeSave,
  type StorageLike,
} from '../../src/persistence/saveGame'
import { AUTO_FAST_SPEED, HOUR_MS, autoSpeedFor, createGameStore } from '../../src/store/gameStore'

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
  const deps = () => ({ storage, now: () => NOW, seed: 5 })
  const firstTask = (store: ReturnType<typeof createGameStore>) => store.getState().game.tasks[0]

  it('starts a new saved game, paused, when there is no save', () => {
    const store = createGameStore(deps())
    expect(store.getState().game.hour).toBe(8)
    expect(store.getState().speed).toBe(0)
    expect(storage.getItem(SAVE_KEY)).not.toBeNull()
    expect(store.getState().persistence).toBe('saved')
  })

  it('converts real time into game hours only while running', () => {
    const store = createGameStore(deps())
    store.getState().tick(10_000)
    expect(store.getState().game.hour).toBe(8)
    store.getState().setSpeed(2)
    store.getState().tick(HOUR_MS) // 2× → two hours
    expect(store.getState().game.hour).toBe(10)
  })

  it('autosaves decisions and restores them after a reload', () => {
    const store = createGameStore(deps())
    const task = firstTask(store)
    expect(
      store.getState().assign({ taskId: task.id, optionId: 'replace', crewIds: ['lyra'] }).ok,
    ).toBe(true)
    const reloaded = createGameStore(deps())
    expect(reloaded.getState().game.crew.lyra.activity).toBe('task')
    expect(reloaded.getState().game.tasks[0].status).toBe('active')
    // A restored game opens on the pause menu; resuming runs it at 1×.
    expect(reloaded.getState().menu).toBe('guide')
    expect(reloaded.getState().speed).toBe(0)
    reloaded.getState().closeMenu()
    expect(reloaded.getState().speed).toBe(1)
  })

  it('does not change the state when a decision is invalid', () => {
    const store = createGameStore(deps())
    const before = store.getState().game
    const result = store
      .getState()
      .assign({ taskId: firstTask(store).id, optionId: 'replace', crewIds: [] })
    expect(result.ok).toBe(false)
    expect(store.getState().game).toBe(before)
  })

  it('reset replaces the progress with a new game, also after reload', () => {
    const store = createGameStore(deps())
    store.getState().setSpeed(4)
    store.getState().tick(HOUR_MS * 6)
    store.getState().resetGame()
    expect(store.getState().game.hour).toBe(8)
    expect(createGameStore(deps()).getState().game.hour).toBe(8)
  })

  it('recovers from a corrupt save with a warning and a backup', () => {
    storage.setItem(SAVE_KEY, 'garbage')
    const store = createGameStore(deps())
    expect(store.getState().notices[0].tone).toBe('warning')
    expect(storage.getItem(BACKUP_KEY)).toBe('garbage')
  })

  it('treats a save from the previous prototype (v1) as incompatible', () => {
    const raw = JSON.parse(serializeSave(createGame({ now: NOW }), NOW))
    raw.version = 1
    const parsed = parseSave(JSON.stringify(raw))
    expect(parsed.ok).toBe(false)
  })

  it('migrates a v2 save (30-day journey) to endless survival in Fácil', () => {
    const raw = JSON.parse(serializeSave(createGame({ now: NOW }), NOW))
    const v2 = raw.state
    delete v2.difficulty
    delete v2.nextMissionAt
    for (const task of v2.tasks) delete task.recurring
    v2.schemaVersion = 2
    v2.hour = 8 + 36 * 3 + 5
    raw.version = 2
    const parsed = parseSave(JSON.stringify(raw))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.state.difficulty).toEqual({ mode: 'easy', level: 4 })
    expect(parsed.state.tasks.every((t) => t.recurring === false)).toBe(true)
  })

  it('opens the pause menu on first launch and starts running in the chosen mode', () => {
    const store = createGameStore(deps())
    expect(store.getState().menu).toBe('guide')
    expect(store.getState().mustChooseMode).toBe(true)
    store.getState().closeMenu() // cannot skip choosing a mode
    expect(store.getState().menu).toBe('guide')
    store.getState().resetGame('hard')
    expect(store.getState().menu).toBeNull()
    expect(store.getState().speed).toBe(1)
    expect(store.getState().game.difficulty).toEqual({ mode: 'hard', level: 10 })
    // With a save, the game still opens on the pause menu, but it can be dismissed.
    const reloaded = createGameStore(deps())
    expect(reloaded.getState().menu).toBe('guide')
    expect(reloaded.getState().mustChooseMode).toBe(false)
    reloaded.getState().closeMenu()
    expect(reloaded.getState().menu).toBeNull()
    expect(reloaded.getState().speed).toBe(1)
  })

  it('only the pause menu stops the clock, and closing it resumes the previous speed', () => {
    const store = createGameStore(deps())
    store.getState().resetGame('easy')
    store.getState().setSpeed(4)
    store.getState().openMenu('settings')
    expect(store.getState().speed).toBe(0)
    store.getState().tick(HOUR_MS * 5)
    expect(store.getState().game.hour).toBe(8)
    store.getState().closeMenu()
    expect(store.getState().speed).toBe(4)
  })

  it('never pauses on its own when urgent events happen', () => {
    const store = createGameStore(deps())
    store.getState().resetGame('easy')
    // Day 2 at 09:00 opens the first story mission, an event that used to auto-pause.
    store.getState().tick(HOUR_MS * 30)
    expect(store.getState().game.hour).toBe(8 + 30)
    expect(store.getState().speed).toBeGreaterThan(0)
  })

  it('auto speed: 1× while a task is pending or running, fast otherwise', () => {
    const store = createGameStore(deps())
    store.getState().resetGame('easy')
    const game = store.getState().game
    expect(store.getState().speedMode).toBe('auto')
    // A new game starts with the air-filter task open → 1×.
    expect(store.getState().speed).toBe(1)
    expect(autoSpeedFor(game)).toBe(1)
    const running = structuredClone(game)
    running.tasks[0].status = 'active'
    expect(autoSpeedFor(running)).toBe(1)
    expect(autoSpeedFor({ ...game, tasks: [] })).toBe(AUTO_FAST_SPEED)

    // Once nothing is pending, the next committed hour speeds up.
    store.setState({ game: { ...game, tasks: [] } })
    store.getState().tick(HOUR_MS)
    const after = store.getState()
    expect(after.speed).toBe(autoSpeedFor(after.game))
  })

  it('a manual speed is kept until auto is chosen again', () => {
    const store = createGameStore(deps())
    store.getState().resetGame('easy')
    store.getState().setSpeed(2)
    expect(store.getState().speedMode).toBe('manual')
    store.getState().tick(HOUR_MS * 3)
    expect(store.getState().speed).toBe(2)
    // Pausing and resuming keeps the manual choice.
    store.getState().openMenu()
    store.getState().closeMenu()
    expect(store.getState().speed).toBe(2)
    store.getState().setAutoSpeed()
    expect(store.getState().speedMode).toBe('auto')
    expect(store.getState().speed).toBe(autoSpeedFor(store.getState().game))
  })

  it('keeps the best run per mode when a game ends, across new games', () => {
    const store = createGameStore(deps())
    const game = structuredClone(store.getState().game)
    game.ship.lifeSupport = 0.1
    game.ship.power = 0
    game.hour = 8 + 36 * 2
    game.difficulty.level = 3
    store.setState({ game })
    store.getState().setSpeed(4)
    for (let i = 0; i < 20 && store.getState().game.status === 'active'; i++)
      store.getState().tick(HOUR_MS)
    expect(store.getState().game.status).toBe('lost')
    expect(store.getState().records.easy).toEqual({ level: 3, day: 4 })
    store.getState().resetGame()
    expect(JSON.parse(storage.getItem(RECORDS_KEY)!).easy.level).toBe(3)
    expect(createGameStore(deps()).getState().records.easy?.level).toBe(3)
  })

  it('exports and imports a save', () => {
    const store = createGameStore(deps())
    store.getState().setSpeed(1)
    store.getState().tick(HOUR_MS * 3)
    const exported = store.getState().exportSave()
    const hour = store.getState().game.hour
    store.getState().resetGame()
    expect(store.getState().importSave(exported)).toEqual({ ok: true })
    expect(store.getState().game.hour).toBe(hour)
    expect(store.getState().importSave('nope').ok).toBe(false)
  })

  it('keeps playing in memory and warns when storage rejects writes', () => {
    const store = createGameStore(deps())
    storage.failWrites = true
    expect(
      store
        .getState()
        .assign({ taskId: firstTask(store).id, optionId: 'replace', crewIds: ['lyra'] }).ok,
    ).toBe(true)
    expect(store.getState().persistence).toBe('unavailable')
    expect(store.getState().notices.some((n) => n.tone === 'error')).toBe(true)
  })
})
