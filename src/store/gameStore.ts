import { createStore, useStore } from 'zustand'
import { createGame } from '../domain/engine/createGame'
import { advanceHours } from '../domain/engine/tick'
import {
  assignTask,
  orderCrew,
  type AssignOrder,
  type DirectOrder,
} from '../domain/engine/commands'
import type { Note } from '../domain/engine/spawn'
import type { GameState } from '../domain/model/game'
import {
  clearSave,
  getBrowserStorage,
  loadGame,
  loadRecords,
  parseSave,
  saveGame,
  saveRecord,
  serializeSave,
  type Records,
  type StorageLike,
} from '../persistence/saveGame'
import { dayOf } from '../domain/engine/state'
import type { DifficultyMode } from '../domain/rules/difficulty'

export interface Notice {
  id: number
  tone: 'info' | 'success' | 'warning' | 'error'
  text: string
}

export type PersistenceStatus = 'saved' | 'unavailable'
/**
 * 0 = paused. Real milliseconds per game hour at 1× is HOUR_MS: 8 s, so the shortest task
 * deadline (2 h) still leaves 16 s to decide at 1×. The clock shows quarter hours in between.
 */
export type Speed = 0 | 1 | 2 | 4
/** Sections of the pause menu: express guide, difficulty / new game, settings. */
export type MenuTab = 'guide' | 'difficulty' | 'settings'
export const HOUR_MS = 8000
/**
 * Automatic speed: 1× while a task is waiting for a decision or still running, and this speed
 * the rest of the time so quiet stretches (nights, routine work) don't drag. Dropping back to 1×
 * happens on the same game hour a task appears, so the fast speed never eats decision time.
 */
export const AUTO_FAST_SPEED: Exclude<Speed, 0> = 4
export type SpeedMode = 'auto' | 'manual'

/** Speed the automatic mode wants for this state. */
export function autoSpeedFor(game: GameState): Exclude<Speed, 0> {
  return game.tasks.some((t) => t.status === 'open' || t.status === 'active') ? 1 : AUTO_FAST_SPEED
}
const MAX_NOTICES = 4

export interface GameStore {
  game: GameState
  speed: Speed
  notices: Notice[]
  persistence: PersistenceStatus
  /** Real time accumulated toward the next game hour. */
  elapsedMs: number
  /** Best run per mode. */
  records: Records
  /** Open pause-menu section, or null while playing. The clock only stops while it is open. */
  menu: MenuTab | null
  /** First launch: a mode must be chosen before playing, so the menu cannot be dismissed. */
  mustChooseMode: boolean
  /** Speed to restore when the menu closes (manual mode). */
  resumeSpeed: Exclude<Speed, 0>
  /** 'auto' adapts the speed to the tasks; picking 1×/2×/4× by hand switches to 'manual'. */
  speedMode: SpeedMode
  /** Back to the automatic speed. */
  setAutoSpeed: () => void
  /** Opens the pause menu (pausing the clock) or switches its section. */
  openMenu: (tab?: MenuTab) => void
  /** Closes the menu and resumes the clock at the previous speed. */
  closeMenu: () => void
  /** A manual speed (switches to manual mode), or 0 to pause without changing the mode. */
  setSpeed: (speed: Speed) => void
  /** Called by the ticker with real elapsed milliseconds. */
  tick: (realMs: number) => void
  assign: (order: AssignOrder) => { ok: true } | { ok: false; errors: string[] }
  order: (crewId: string, order: DirectOrder) => { ok: true } | { ok: false; errors: string[] }
  /** Starts a new game in `mode` (default: the current mode). */
  resetGame: (mode?: DifficultyMode) => void
  exportSave: () => string
  importSave: (raw: string) => { ok: true } | { ok: false; reason: string }
  setSetting: (key: 'reducedMotion', value: boolean) => void
  dismissNotice: (id: number) => void
}

export interface GameStoreDeps {
  storage: StorageLike | null
  now?: () => string
  seed?: number
}

const TONE: Record<Note['severity'], Notice['tone']> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  critical: 'error',
}

/**
 * Bridge between the pure engine, local persistence and React. The store never computes game
 * rules: it converts real time into game hours, calls the engine and saves the snapshot.
 * Time always runs: nothing pauses it automatically. Only the pause menu (opened explicitly by
 * the player) stops the clock — and on first launch, while the player picks a mode.
 */
export function createGameStore({
  storage,
  now = () => new Date().toISOString(),
  seed,
}: GameStoreDeps) {
  let noticeId = 0
  const initialNotices: Notice[] = []
  let game: GameState
  const loaded = storage ? loadGame(storage) : null
  if (loaded?.status === 'ok') game = loaded.state
  else {
    game = createGame({ now: now(), seed })
    if (loaded?.status === 'invalid')
      initialNotices.push({
        id: ++noticeId,
        tone: 'warning',
        text: `No se pudo restaurar la partida guardada. ${loaded.reason} ${loaded.backedUp ? 'Se conservó una copia de seguridad.' : ''} Se inició una partida nueva.`,
      })
  }

  const persist = (state: GameState): PersistenceStatus => {
    if (!storage) return 'unavailable'
    try {
      saveGame(storage, state, now())
      return 'saved'
    } catch {
      return 'unavailable'
    }
  }
  const initialSetup = loaded?.status !== 'ok'
  let records = loadRecords(storage)
  const initialPersistence = persist(game)
  const unavailableText =
    'El almacenamiento local no está disponible. El progreso no se guardará al cerrar.'
  if (initialPersistence === 'unavailable')
    initialNotices.push({ id: ++noticeId, tone: 'error', text: unavailableText })

  return createStore<GameStore>()((set, get) => {
    const pushNotices = (notes: Note[], extra: Notice[] = []) => {
      const fresh = notes.map((n) => ({ id: ++noticeId, tone: TONE[n.severity], text: n.text }))
      return [...get().notices, ...extra, ...fresh].slice(-MAX_NOTICES)
    }
    const commit = (next: GameState, notes: Note[], patch: Partial<GameStore> = {}) => {
      const updated = { ...next, updatedAt: now() }
      const persistence = persist(updated)
      const extra =
        persistence === 'unavailable' && get().persistence === 'saved'
          ? [{ id: ++noticeId, tone: 'error' as const, text: unavailableText }]
          : []
      // Endless survival: store the run when it ends.
      if (get().game.status === 'active' && updated.status !== 'active')
        records = saveRecord(storage, get().records, updated.difficulty.mode, {
          level: updated.difficulty.level,
          day: dayOf(updated.hour),
        })
      // Automatic mode follows the tasks, but never un-pauses the clock.
      const running = (patch.speed ?? get().speed) !== 0
      if (get().speedMode === 'auto' && running && updated.status === 'active')
        patch = { ...patch, speed: autoSpeedFor(updated) }
      set({ game: updated, persistence, notices: pushNotices(notes, extra), records, ...patch })
    }
    return {
      game,
      // Opening the game always starts on the pause menu: nothing runs until the player resumes.
      speed: 0,
      notices: initialNotices,
      persistence: initialPersistence,
      elapsedMs: 0,
      records,
      menu: game.status === 'active' || initialSetup ? 'guide' : null,
      mustChooseMode: initialSetup,
      resumeSpeed: 1,
      speedMode: 'auto',
      openMenu: (tab = 'guide') => {
        const { menu, speed } = get()
        if (menu) return set({ menu: tab })
        set({ menu: tab, speed: 0, resumeSpeed: speed === 0 ? get().resumeSpeed : speed })
      },
      closeMenu: () => {
        if (get().mustChooseMode) return
        const { game, speedMode, resumeSpeed } = get()
        const speed = speedMode === 'auto' ? autoSpeedFor(game) : resumeSpeed
        set({ menu: null, speed: game.status === 'active' ? speed : 0 })
      },
      setSpeed: (speed) => {
        if (get().game.status !== 'active') return set({ speed: 0 })
        if (speed === 0) return set({ speed: 0 })
        set({ speed, resumeSpeed: speed, speedMode: 'manual' })
      },
      setAutoSpeed: () => {
        const { game, speed } = get()
        set({
          speedMode: 'auto',
          ...(speed !== 0 && game.status === 'active' ? { speed: autoSpeedFor(game) } : {}),
        })
      },
      tick: (realMs) => {
        const { speed, elapsedMs, game: current } = get()
        if (speed === 0 || current.status !== 'active') return
        const total = elapsedMs + realMs * speed
        const hours = Math.floor(total / HOUR_MS)
        if (hours === 0) return set({ elapsedMs: total })
        // No automatic pauses: only the end of the game stops the clock.
        const result = advanceHours(current, hours)
        const pause = result.state.status !== 'active'
        commit(result.state, result.notes, {
          elapsedMs: pause ? 0 : total - hours * HOUR_MS,
          speed: pause ? 0 : speed,
        })
      },
      assign: (order) => {
        const result = assignTask(get().game, order)
        if (!result.ok) return result
        commit(result.state, result.notes)
        return { ok: true }
      },
      order: (crewId, order) => {
        const result = orderCrew(get().game, crewId, order)
        if (!result.ok) return result
        commit(result.state, result.notes)
        return { ok: true }
      },
      resetGame: (mode = get().game.difficulty.mode) => {
        if (storage)
          try {
            clearSave(storage)
          } catch {
            // The new game is saved right after; a failure is reported by commit.
          }
        set({ notices: [] })
        const fresh = createGame({ now: now(), seed: Date.now() >>> 0, mode })
        commit(
          fresh,
          [
            {
              severity: 'success',
              text: `Nueva partida en nivel ${fresh.difficulty.level}.`,
              pause: false,
            },
          ],
          // A new game starts running right away.
          { speed: get().resumeSpeed, elapsedMs: 0, menu: null, mustChooseMode: false },
        )
      },
      exportSave: () => serializeSave(get().game, now()),
      importSave: (raw) => {
        const parsed = parseSave(raw)
        if (!parsed.ok) {
          set({
            notices: pushNotices([
              {
                severity: 'critical',
                text: `Importación rechazada. ${parsed.reason}`,
                pause: false,
              },
            ]),
          })
          return parsed
        }
        commit(parsed.state, [{ severity: 'success', text: 'Partida importada.', pause: false }], {
          speed: 0,
          elapsedMs: 0,
        })
        return { ok: true }
      },
      setSetting: (key, value) =>
        commit({ ...get().game, settings: { ...get().game.settings, [key]: value } }, []),
      dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),
    }
  })
}

export type GameStoreApi = ReturnType<typeof createGameStore>

export const gameStore: GameStoreApi = createGameStore({ storage: getBrowserStorage() })

/** Minutes into the current game hour, rounded down to the quarter (0, 15, 30, 45). */
export function useClockMinutes(): number {
  return useStore(gameStore, (s) => Math.min(45, Math.floor((s.elapsedMs / HOUR_MS) * 4) * 15))
}

export function useGame<T>(selector: (store: GameStore) => T): T {
  return useStore(gameStore, selector)
}
