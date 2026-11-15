import { NIGHT_END, NIGHT_START, START_HOUR } from '../content/ship'

/**
 * Progressive difficulty, Tetris-style: the game starts calm at the mode's starting level and
 * the level goes up every LEVEL_HOURS of game time. Difficulty never depends on the clock speed:
 * each level raises energy and food consumption, spawns more events and recurring missions,
 * makes tasks and missions take longer and pushes more emergencies into the night shift.
 *
 * The three modes are the three tiers of the curve. The mode picks the starting level; the tier
 * of the *current* level decides how much help N0VA-7 shows (optimal team, recommendations).
 */
export const DIFFICULTY_MODES = ['easy', 'medium', 'hard'] as const
export type DifficultyMode = (typeof DIFFICULTY_MODES)[number]

export const MODE_INFO: Record<
  DifficultyMode,
  { label: string; tierLabel: string; startLevel: number; summary: string }
> = {
  easy: {
    label: 'Fácil',
    tierLabel: 'Inicial',
    startLevel: 1,
    summary: 'Empieza en el nivel 1. N0VA-7 recomienda el equipo óptimo en cada tarea.',
  },
  medium: {
    label: 'Medio',
    tierLabel: 'Intermedio',
    startLevel: 5,
    summary: 'Empieza en el nivel 5. Solo hay recomendaciones en tareas críticas y misiones.',
  },
  hard: {
    label: 'Difícil',
    tierLabel: 'Avanzado',
    startLevel: 10,
    summary: 'Empieza en el nivel 10. Ves la probabilidad, pero no el equipo óptimo.',
  },
}

/** Game hours per level. */
export const LEVEL_HOURS = 36

export function levelAt(startLevel: number, hour: number): number {
  return startLevel + Math.floor(Math.max(0, hour - START_HOUR) / LEVEL_HOURS)
}

/** Fraction of the current level already played (0–1), for the HUD bar. */
export function levelProgress(hour: number): number {
  return (Math.max(0, hour - START_HOUR) % LEVEL_HOURS) / LEVEL_HOURS
}

/** Tier of a level: 1–4 Fácil, 5–9 Medio, 10+ Difícil. */
export function tierOf(level: number): DifficultyMode {
  return level >= 10 ? 'hard' : level >= 5 ? 'medium' : 'easy'
}

export type HintLevel = 'full' | 'demanding' | 'none'
const HINTS: Record<DifficultyMode, HintLevel> = {
  easy: 'full',
  medium: 'demanding',
  hard: 'none',
}

/**
 * Whether N0VA-7 reveals the optimal team for a task at this level.
 * Medio only reveals it for the most demanding tasks: critical events and missions.
 */
export function showsOptimalTeam(level: number, severity: 'routine' | 'urgent' | 'critical') {
  const hints = HINTS[tierOf(level)]
  return hints === 'full' || (hints === 'demanding' && severity === 'critical')
}

const isNight = (time: number) => time >= NIGHT_START || time < NIGHT_END

/** Multipliers and limits for one level. Level 1 matches the original balance. */
export function levelScaling(level: number) {
  const s = Math.max(0, level - 1)
  return {
    /** Reactor drain and food consumption. */
    power: 1 + 0.12 * s,
    food: 1 + 0.07 * s,
    /** Hourly chance of a random ship event. */
    eventChance: 0.045 + 0.009 * s,
    maxOpenEvents: Math.min(6, 3 + Math.floor(s / 3)),
    /** Divides event cooldowns. */
    cooldown: 1 + 0.08 * s,
    /** Multiplies task and mission durations. */
    duration: 1 + 0.06 * s,
    /** Multiplies the time to answer a task. */
    deadline: Math.max(0.6, 1 - 0.03 * s),
    /** Hours between recurring missions; none before level 3. */
    missionInterval: level < 3 ? null : Math.max(20, 72 - 5 * (level - 3)),
    /**
     * Weight of night hours for spawns: few emergencies at night early on, more and more later,
     * so missions and emergencies clash with the sleep schedule.
     */
    night: 0.5 + 0.12 * s,
  }
}

export function nightFactor(level: number, time: number): number {
  return isNight(time) ? levelScaling(level).night : 1
}

export function scaledDuration(hours: number, level: number): number {
  return hours === 0 ? 0 : Math.max(1, Math.round(hours * levelScaling(level).duration))
}

export function scaledDeadline(hours: number, level: number): number {
  return Math.max(2, Math.round(hours * levelScaling(level).deadline))
}

/** What changes at a new level, for the level-up notice. */
export function levelUpText(level: number): string {
  const s = levelScaling(level)
  const parts = [
    `consumo de energía ×${s.power.toFixed(2)}`,
    `tareas ${Math.round((s.duration - 1) * 100)}% más largas`,
  ]
  if (s.missionInterval) parts.push(`misiones cada ~${s.missionInterval} h`)
  return parts.join(', ')
}
