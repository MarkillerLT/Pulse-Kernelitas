import { create } from 'zustand'
import { createMission } from '../simulation/engine/createMission'
import { simulateTurn } from '../simulation/engine/simulateTurn'
import { parameters } from '../simulation/parameters/defaults'
import type { Activity, MissionState, PlayerDecision } from '../simulation/models/mission'
import { deleteMission, loadMission, saveMission } from '../persistence/saveGame'

// Serialize storage writes so a slow earlier autosave cannot overwrite a later turn.
let writes = Promise.resolve()
const persist = (mission: MissionState) => {
  writes = writes.catch(() => {}).then(() => saveMission(mission))
  return writes
}
interface MissionStore {
  mission: MissionState
  selectedId: string
  orders: PlayerDecision[]
  notice: string
  busy: boolean
  select: (id: string) => void
  assign: (activity: Activity) => void
  clearOrders: () => void
  advance: () => Promise<void>
  save: () => Promise<void>
  load: () => Promise<void>
  reset: () => Promise<void>
}
export const useMissionStore = create<MissionStore>((set, get) => ({
  mission: createMission(),
  selectedId: 'okafor',
  orders: [],
  notice: 'Awaiting your orders.',
  busy: false,
  select: (id) => set({ selectedId: id }),
  assign: (activity) =>
    set((s) => ({
      orders: [
        ...s.orders.filter((d) => d.astronautId !== s.selectedId),
        { astronautId: s.selectedId, activity },
      ],
      notice: 'Assignment queued. Execute next day to apply.',
    })),
  clearOrders: () => set({ orders: [], notice: 'Orders cleared. Current routines will continue.' }),
  advance: async () => {
    if (get().busy) return
    const result = simulateTurn(get().mission, get().orders, parameters)
    if (result.errors.length) {
      set({ notice: result.errors.join(' ') })
      return
    }
    set({ mission: result.state, orders: [], busy: true, notice: 'Saving daily report…' })
    try {
      await persist(result.state)
      set({ notice: 'Daily report saved locally.' })
    } catch {
      set({ notice: 'Autosave unavailable. Mission continues in memory; use Save to retry.' })
    } finally {
      set({ busy: false })
    }
  },
  save: async () => {
    if (get().busy) return
    set({ busy: true })
    try {
      await persist(get().mission)
      set({ notice: 'Mission saved on this device. Queued orders are not saved.' })
    } catch {
      set({ notice: 'Save failed. Browser storage may be disabled or full.' })
    } finally {
      set({ busy: false })
    }
  },
  load: async () => {
    if (get().busy) return
    set({ busy: true })
    try {
      await writes.catch(() => {})
      const mission = await loadMission()
      set(
        mission
          ? {
              mission,
              orders: [],
              selectedId: mission.crew[0].id,
              notice: 'Local mission restored.',
            }
          : { notice: 'No saved mission on this device.' },
      )
    } catch {
      set({
        notice:
          'Cannot load save: storage unavailable or save incompatible. Current mission preserved.',
      })
    } finally {
      set({ busy: false })
    }
  },
  reset: async () => {
    if (get().busy) return
    set({ busy: true })
    try {
      await writes.catch(() => {})
      await deleteMission()
      set({
        mission: createMission(),
        orders: [],
        selectedId: 'okafor',
        notice: 'New mission initialized. Previous local save removed.',
      })
    } catch {
      set({ notice: 'Reset failed: could not remove local save. Current mission preserved.' })
    } finally {
      set({ busy: false })
    }
  },
}))
