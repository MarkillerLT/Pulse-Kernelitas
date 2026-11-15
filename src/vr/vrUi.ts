import { create } from 'zustand'
import type { CrewId } from '../domain/content/crew'
import type { SectorId } from '../domain/content/sectors'

export type ViewMode = 'diorama' | 'onboard'
export interface View {
  mode: ViewMode
  /** Sector the player stands in while on board. */
  sector: SectorId
}

export interface Banner {
  id: number
  kind: 'launch' | 'return'
  title: string
  text: string
  tone: 'info' | 'success' | 'critical'
}

export type LogFilter = 'all' | 'decisions' | 'missions' | 'crisis'

/** View-only state of the VR scene (what is selected/open). Game state stays in gameStore. */
interface VrUi {
  selectedCrew: CrewId | null
  sectorFilter: SectorId | null
  assigning: { taskId: string; optionId: string } | null
  /** Requested view; ShipRig fades to black, applies it and fades back. */
  view: View
  banner: Banner | null
  logFilter: LogFilter
  logOffset: number
  sound: boolean
  selectCrew: (id: CrewId | null) => void
  filterSector: (id: SectorId | null) => void
  openAssign: (taskId: string, optionId: string) => void
  closeAssign: () => void
  goOnboard: (sector: SectorId) => void
  goDiorama: () => void
  showBanner: (banner: Omit<Banner, 'id'>) => void
  hideBanner: () => void
  setLogFilter: (filter: LogFilter) => void
  scrollLog: (delta: number) => void
  toggleSound: () => void
}

let bannerId = 0

export const useVrUi = create<VrUi>()((set, get) => ({
  selectedCrew: null,
  sectorFilter: null,
  assigning: null,
  view: { mode: 'diorama', sector: 'armstrong' },
  banner: null,
  logFilter: 'all',
  logOffset: 0,
  sound: true,
  selectCrew: (id) => set({ selectedCrew: get().selectedCrew === id ? null : id }),
  filterSector: (id) => set({ sectorFilter: get().sectorFilter === id ? null : id }),
  openAssign: (taskId, optionId) => set({ assigning: { taskId, optionId } }),
  closeAssign: () => set({ assigning: null }),
  goOnboard: (sector) => set({ view: { mode: 'onboard', sector } }),
  goDiorama: () => set({ view: { ...get().view, mode: 'diorama' } }),
  showBanner: (banner) => set({ banner: { ...banner, id: ++bannerId } }),
  hideBanner: () => set({ banner: null }),
  setLogFilter: (logFilter) => set({ logFilter, logOffset: 0 }),
  scrollLog: (delta) => set({ logOffset: Math.max(0, get().logOffset + delta) }),
  toggleSound: () => set({ sound: !get().sound }),
}))
