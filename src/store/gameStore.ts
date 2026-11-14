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
  parseSave,
  saveGame,
  serializeSave,
  type StorageLike,
} from '../persistence/saveGame'

export interface Notice {
  id: number
  tone: 'info' | 'success' | 'warning' | 'error'
  text: string
}

export type PersistenceStatus = 'saved' | 'unavailable'
/** 0 = paused. Real milliseconds per game hour at 1× is HOUR_MS. */
export type Speed = 0 | 1 | 2 | 4
export const HOUR_MS = 2000
const MAX_NOTICES = 4

export interface GameStore {
  game: GameState
  speed: Speed
  notices: Notice[]
  persistence: PersistenceStatus
  /** Real time accumulated toward the next game hour. */
  elapsedMs: number
  setSpeed: (speed: Speed) => void
  /** Called by the ticker with real elapsed milliseconds. */
  tick: (realMs: number) => void
  assign: (order: AssignOrder) => { ok: true } | { ok: false; errors: string[] }
  order: (crewId: string, order: DirectOrder) => { ok: true } | { ok: false; errors: string[] }
  resetGame: () => void
  exportSave: () => string
  importSave: (raw: string) => { ok: true } | { ok: false; reason: string }
  setSetting: (key: 'reducedMotion' | 'autoPause', value: boolean) => void
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
 * The game always loads paused so nothing happens before the player looks.
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
      set({ game: updated, persistence, notices: pushNotices(notes, extra), ...patch })
    }
    return {
      game,
      speed: 0,
      notices: initialNotices,
      persistence: initialPersistence,
      elapsedMs: 0,
      setSpeed: (speed) => set({ speed: get().game.status === 'active' ? speed : 0 }),
      tick: (realMs) => {
        const { speed, elapsedMs, game: current } = get()
        if (speed === 0 || current.status !== 'active') return
        const total = elapsedMs + realMs * speed
        const hours = Math.floor(total / HOUR_MS)
        if (hours === 0) return set({ elapsedMs: total })
        const result = advanceHours(current, hours, { stopOnPause: current.settings.autoPause })
        const pause =
          (result.pause && current.settings.autoPause) || result.state.status !== 'active'
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
      resetGame: () => {
        if (storage)
          try {
            clearSave(storage)
          } catch {
            // The new game is saved right after; a failure is reported by commit.
          }
        set({ notices: [] })
        commit(
          createGame({ now: now(), seed: Date.now() >>> 0 }),
          [{ severity: 'success', text: 'Nueva partida iniciada.', pause: false }],
          {
            speed: 0,
            elapsedMs: 0,
          },
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

export function useGame<T>(selector: (store: GameStore) => T): T {
  return useStore(gameStore, selector)
}
