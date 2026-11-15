/** Sections of the side panel next to the ship map. Switching never leaves the console. */
export type SideTab = 'tasks' | 'crew' | 'missions' | 'sectors' | 'log'

export const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: 'tasks', label: 'Tareas' },
  { id: 'crew', label: 'Tripulación' },
  { id: 'missions', label: 'Misiones' },
  { id: 'sectors', label: 'Sectores' },
  { id: 'log', label: 'Registro' },
]
