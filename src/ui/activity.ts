import type { Activity } from '../domain/model/game'
import { JOURNEY_DAYS } from '../domain/content/ship'
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

export function formatClock(hour: number): string {
  return `Día ${dayOf(hour)} · ${String(hourOfDay(hour)).padStart(2, '0')}:00`
}

export function formatDayProgress(hour: number): string {
  return `Día ${Math.min(dayOf(hour), JOURNEY_DAYS)} de ${JOURNEY_DAYS}`
}

export function formatHours(hours: number): string {
  if (hours <= 0) return 'ahora'
  return hours === 1 ? '1 h' : `${hours} h`
}
