import { createStore, useStore } from 'zustand'
import { createGame } from '../domain/engine/createGame'
import { resolveMission, type ResolveResult } from '../domain/engine/resolveMission'
import type { MissionOrder } from '../domain/engine/analyzeTeam'
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
  tone: 'info' | 'success' | 'warning' | 'error'
  text: string
}

export type PersistenceStatus = 'saved' | 'unavailable'

export interface GameStore {
  game: GameState
  notice: Notice | null
  persistence: PersistenceStatus
  launchMission: (order: MissionOrder) => ResolveResult
  resetGame: () => void
  exportSave: () => string
  importSave: (raw: string) => { ok: true } | { ok: false; reason: string }
  setReducedMotion: (value: boolean) => void
  dismissNotice: () => void
}

export interface GameStoreDeps {
  storage: StorageLike | null
  now?: () => string
}

/**
 * Bridge between the pure engine, local persistence and React. The store never computes game
 * rules itself: it calls the engine, publishes the new snapshot and saves it.
 */
export function createGameStore({ storage, now = () => new Date().toISOString() }: GameStoreDeps) {
  let initialNotice: Notice | null = null
  let game: GameState
  const loaded = storage ? loadGame(storage) : null
  if (loaded?.status === 'ok') {
    game = loaded.state
  } else {
    game = createGame({ now: now() })
    if (loaded?.status === 'invalid') {
      initialNotice = {
        tone: 'warning',
        text: `No se pudo restaurar la partida guardada. ${loaded.reason} ${
          loaded.backedUp
            ? 'Se conservó una copia de seguridad y se inició una partida nueva.'
            : 'Se inició una partida nueva.'
        }`,
      }
    }
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
  const unavailableNotice: Notice = {
    tone: 'error',
    text: 'El almacenamiento local no está disponible. El progreso no se guardará al cerrar.',
  }

  const initialPersistence = persist(game)
  if (initialPersistence === 'unavailable' && !initialNotice) initialNotice = unavailableNotice

  return createStore<GameStore>()((set, get) => {
    const commit = (next: GameState, notice: Notice | null) => {
      const persistence = persist(next)
      set({
        game: next,
        persistence,
        notice: persistence === 'unavailable' ? unavailableNotice : notice,
      })
    }
    return {
      game,
      notice: initialNotice,
      persistence: initialPersistence,
      launchMission: (order) => {
        const result = resolveMission(get().game, order, { now: now() })
        if (result.ok) commit(result.state, null)
        return result
      },
      resetGame: () => {
        if (storage) {
          try {
            clearSave(storage)
          } catch {
            // The new game is saved right after; a failed delete is reported by `commit`.
          }
        }
        commit(createGame({ now: now() }), { tone: 'success', text: 'Nueva partida iniciada.' })
      },
      exportSave: () => serializeSave(get().game, now()),
      importSave: (raw) => {
        const parsed = parseSave(raw)
        if (!parsed.ok) {
          set({ notice: { tone: 'error', text: `Importación rechazada. ${parsed.reason}` } })
          return parsed
        }
        commit(parsed.state, { tone: 'success', text: 'Partida importada.' })
        return { ok: true }
      },
      setReducedMotion: (value) =>
        commit({ ...get().game, settings: { ...get().game.settings, reducedMotion: value } }, null),
      dismissNotice: () => set({ notice: null }),
    }
  })
}

export type GameStoreApi = ReturnType<typeof createGameStore>

export const gameStore: GameStoreApi = createGameStore({ storage: getBrowserStorage() })

export function useGame<T>(selector: (store: GameStore) => T): T {
  return useStore(gameStore, selector)
}
