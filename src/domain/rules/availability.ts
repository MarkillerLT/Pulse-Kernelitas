import type { CrewState } from '../model/game'
import type { Stats } from '../model/stats'

export interface Availability {
  available: boolean
  /** Reasons the member cannot receive orders. Empty when available. */
  reasons: string[]
}

/**
 * Terminal states from the design document (§6.1) that block any order:
 * Salud 0 (incapacitado), Moral 0 (se niega a cooperar), Sueño 0 (colapso inmediato).
 */
export function statBlockers(stats: Stats): string[] {
  const reasons: string[] = []
  if (Math.round(stats.health) <= 0) reasons.push('Incapacitado: Salud en 0.')
  if (Math.round(stats.morale) <= 0) reasons.push('Se niega a cooperar: Moral en 0.')
  if (Math.round(stats.sleep) <= 0) reasons.push('Colapso: Sueño en 0.')
  return reasons
}

const BUSY: Partial<Record<CrewState['activity'], string>> = {
  task: 'Ocupado en otra tarea.',
  mission: 'Fuera de la nave en una misión.',
  medical: 'En tratamiento en el Centro Médico.',
  dead: 'Fallecido.',
}

/** Whether N0VA-7 can assign the member to a task right now. Resting members can be woken up. */
export function getAvailability(crew: CrewState): Availability {
  const busy = BUSY[crew.activity]
  if (busy) return { available: false, reasons: [busy] }
  const reasons = statBlockers(crew.stats)
  return { available: reasons.length === 0, reasons }
}

export interface Warning {
  /** Short alert, e.g. "Advertencia: niveles de estrés altos". */
  title: string
  detail: string
}

/**
 * Conditions that make an order "forced": the member can still go, but N0VA-7 must confirm
 * ("Mandar de igual forma") and the member loses trust (design §7: obligar a trabajar).
 */
export function getWorkWarnings(crew: CrewState): Warning[] {
  const { stats } = crew
  const warnings: Warning[] = []
  if (stats.stress >= 76)
    warnings.push({
      title: 'Advertencia: niveles de estrés altos',
      detail: 'Colapso inminente: decisiones impulsivas y errores.',
    })
  if (stats.sleep <= 24)
    warnings.push({
      title: 'Advertencia: agotamiento',
      detail: 'Sueño crítico: puede olvidar tareas o quedarse dormido.',
    })
  if (stats.health <= 24)
    warnings.push({
      title: 'Advertencia: salud crítica',
      detail: 'Mayor probabilidad de accidentes.',
    })
  return warnings
}

export function isAlive(crew: CrewState): boolean {
  return crew.activity !== 'dead'
}
