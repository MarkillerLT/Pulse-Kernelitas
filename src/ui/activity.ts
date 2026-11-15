import type { Activity } from '../domain/model/game'
import { dayOf, hourOfDay } from '../domain/engine/state'

export const ACTIVITY_LABELS: Record<Activity, string> = {
  duty: 'En su puesto',
  task: 'En una tarea',
  mission: 'En misión',
  rest: 'Descansando',
  medical: 'En enfermería',
  leisure: 'Tiempo libre',
  dead: 'Fallecido',
}

/** `minutes` shows the quarter hour in progress (the engine itself works in whole hours). */
export function formatClock(hour: number, minutes = 0): string {
  return `Día ${dayOf(hour)} · ${String(hourOfDay(hour)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatDayProgress(hour: number): string {
  return `Día ${dayOf(hour)}`
}

export function formatHours(hours: number): string {
  if (hours <= 0) return 'ahora'
  return hours === 1 ? '1 h' : `${hours} h`
}
