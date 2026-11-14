import type { Stats } from '../model/stats'

export interface Availability {
  available: boolean
  /** Reasons why the member cannot be sent on a mission. Empty when available. */
  reasons: string[]
}

/**
 * A crew member cannot be assigned to a mission when a statistic reaches the terminal state the
 * design document describes (§6.1):
 * - Salud 0: incapacitado o muerto.
 * - Moral 0: se niega a cooperar.
 * - Sueño 0: colapso inmediato.
 *
 * Confianza 0 ("Desobediencia") does not block: the document says the member may disobey, which
 * is a future behaviour rather than unavailability.
 */
export function getAvailability(stats: Stats): Availability {
  const reasons: string[] = []
  if (stats.health <= 0) reasons.push('Incapacitado: Salud en 0.')
  if (stats.morale <= 0) reasons.push('Se niega a cooperar: Moral en 0.')
  if (stats.sleep <= 0) reasons.push('Colapso inmediato: Sueño en 0.')
  return { available: reasons.length === 0, reasons }
}
