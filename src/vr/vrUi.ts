import { create } from 'zustand'
import type { CrewId } from '../domain/content/crew'
import type { SectorId } from '../domain/content/sectors'

/** View-only state of the VR scene (what is selected/open). Game state stays in gameStore. */
interface VrUi {
  selectedCrew: CrewId | null
  sectorFilter: SectorId | null
  assigning: { taskId: string; optionId: string } | null
  selectCrew: (id: CrewId | null) => void
  filterSector: (id: SectorId | null) => void
  openAssign: (taskId: string, optionId: string) => void
  closeAssign: () => void
}

export const useVrUi = create<VrUi>()((set, get) => ({
  selectedCrew: null,
  sectorFilter: null,
  assigning: null,
  selectCrew: (id) => set({ selectedCrew: get().selectedCrew === id ? null : id, assigning: null }),
  filterSector: (id) => set({ sectorFilter: get().sectorFilter === id ? null : id }),
  openAssign: (taskId, optionId) => set({ assigning: { taskId, optionId }, selectedCrew: null }),
  closeAssign: () => set({ assigning: null }),
}))
