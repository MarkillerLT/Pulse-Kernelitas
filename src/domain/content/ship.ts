/** Ship systems tracked by N0VA-7. Values are percentages (0–100). */
export const SHIP_KEYS = ['lifeSupport', 'power', 'hull', 'food', 'medicine'] as const
export type ShipKey = (typeof SHIP_KEYS)[number]
export type ShipSystems = Record<ShipKey, number>
export type ShipDelta = Partial<Record<ShipKey, number>>

export const SHIP_LABELS: Record<ShipKey, string> = {
  lifeSupport: 'Soporte vital',
  power: 'Energía',
  hull: 'Casco',
  food: 'Comida',
  medicine: 'Medicinas',
}

export const INITIAL_SHIP: ShipSystems = {
  lifeSupport: 100,
  power: 90,
  hull: 100,
  food: 90,
  medicine: 70,
}

/** Game clock starts on day 1 at 08:00. */
export const START_HOUR = 8
/** Daily schedule: crew on duty go to sleep at 22:00 and wake up at 06:00. */
export const NIGHT_START = 22
export const NIGHT_END = 6
