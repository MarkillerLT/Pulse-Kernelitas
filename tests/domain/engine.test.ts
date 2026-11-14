import { describe, expect, it } from 'vitest'
import { CREW, CREW_IDS, type CrewId } from '../../src/domain/content/crew'
import { MISSION_IDS } from '../../src/domain/content/missions'
import { createGame } from '../../src/domain/engine/createGame'
import { analyzeTeam } from '../../src/domain/engine/analyzeTeam'
import { resolveMission } from '../../src/domain/engine/resolveMission'
import { gameStateSchema, type GameState } from '../../src/domain/model/game'
import type { Stats } from '../../src/domain/model/stats'

const NOW = '2026-11-14T12:00:00.000Z'
const MISSION = 'ghost-satellite'
const newGame = (seed?: number) => createGame({ now: NOW, seed })
const launch = (state: GameState, crewIds: string[]) =>
  resolveMission(state, { missionId: MISSION, crewIds }, { now: NOW })

function resolved(state: GameState, crewIds: string[]) {
  const result = launch(state, crewIds)
  if (!result.ok) throw new Error(result.errors.join(' '))
  return result
}

function withStats(state: GameState, id: CrewId, stats: Partial<Stats>): GameState {
  return {
    ...state,
    crew: {
      ...state.crew,
      [id]: { ...state.crew[id], stats: { ...state.crew[id].stats, ...stats } },
    },
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('createGame', () => {
  it('starts with the initial statistics from the design document', () => {
    const game = newGame()
    expect(game.crew.orion.stats).toEqual({
      health: 100,
      morale: 80,
      stress: 20,
      sleep: 80,
      trust: 80,
    })
    expect(game.crew.lyra.stats).toEqual({
      health: 100,
      morale: 70,
      stress: 30,
      sleep: 70,
      trust: 75,
    })
    expect(game.crew.elias.stats).toEqual({
      health: 100,
      morale: 85,
      stress: 15,
      sleep: 80,
      trust: 80,
    })
    expect(game.crew.zara.stats).toEqual({
      health: 100,
      morale: 60,
      stress: 40,
      sleep: 75,
      trust: 70,
    })
    expect(game.crew.kai.stats).toEqual({
      health: 100,
      morale: 90,
      stress: 10,
      sleep: 85,
      trust: 85,
    })
  })

  it('creates a valid state with every mission available, turn 1 and an empty log', () => {
    const game = newGame()
    expect(gameStateSchema.safeParse(game).success).toBe(true)
    expect(game.turn).toBe(1)
    expect(game.log).toEqual([])
    for (const id of MISSION_IDS) expect(game.missions[id]).toBe('available')
    for (const id of CREW_IDS) expect(game.crew[id].conditions).toEqual([])
  })

  it('does not share stat objects with the static crew definitions', () => {
    const game = newGame()
    game.crew.orion.stats.health = 1
    expect(CREW.orion.initialStats.health).toBe(100)
  })
})

describe('analyzeTeam validation', () => {
  const game = newGame()
  const errorsFor = (crewIds: string[], missionId = MISSION) =>
    analyzeTeam(game, { missionId, crewIds }).errors

  it('rejects an empty team', () => {
    expect(errorsFor([])).toContain('Selecciona al menos un tripulante.')
  })
  it('rejects more than three members', () => {
    expect(errorsFor(['orion', 'lyra', 'zara', 'kai'])).toContain(
      'El equipo admite un máximo de 3 tripulantes.',
    )
  })
  it('rejects the same member twice', () => {
    expect(errorsFor(['orion', 'orion'])).toContain('Un tripulante no puede asignarse dos veces.')
  })
  it('rejects unknown members and missions', () => {
    expect(errorsFor(['ghost'])).toContain('Tripulante desconocido: ghost.')
    expect(errorsFor(['orion'], 'nope')).toContain('La misión no existe.')
  })
  it('rejects missions that are not implemented yet', () => {
    expect(errorsFor(['kai'], 'orchard-outbreak')).toContain(
      'Esta misión todavía no está operativa en el prototipo.',
    )
  })
  it('blocks incapacitated members', () => {
    const state = withStats(game, 'zara', { health: 0 })
    const errors = analyzeTeam(state, { missionId: MISSION, crewIds: ['orion', 'zara'] }).errors
    expect(errors.some((e) => e.startsWith('Zara no está disponible.'))).toBe(true)
  })
  it('accepts teams of one, two or three available members', () => {
    expect(errorsFor(['elias'])).toEqual([])
    expect(errorsFor(['orion', 'kai'])).toEqual([])
    expect(errorsFor(['orion', 'lyra', 'zara'])).toEqual([])
  })
})

describe('resolveMission: El Satélite Fantasma', () => {
  it('applies only the base consequences with the optimal team', () => {
    const { state, entry } = resolved(newGame(), ['orion', 'lyra', 'zara'])
    expect(state.crew.orion.stats).toMatchObject({
      health: 95,
      stress: 30,
      sleep: 70,
      morale: 80,
      trust: 80,
    })
    expect(state.crew.lyra.stats).toMatchObject({ health: 90, stress: 45, sleep: 55 })
    expect(state.crew.zara.stats).toMatchObject({ health: 85, stress: 60, sleep: 55 })
    expect(state.crew.elias).toEqual(newGame().crew.elias)
    expect(state.crew.kai).toEqual(newGame().crew.kai)
    expect(entry.outcome).toBe('optimal')
    expect(entry.penalties).toEqual([])
    expect(entry.intel).toBe('Se obtiene toda la información.')
  })

  it('without Lyra: every participant gets +15 stress and -10 sleep', () => {
    const { state, entry } = resolved(newGame(), ['orion', 'zara', 'kai'])
    expect(state.crew.orion.stats).toMatchObject({ health: 95, stress: 45, sleep: 60 })
    expect(state.crew.zara.stats).toMatchObject({ health: 85, stress: 75, sleep: 45 })
    // Kai has no base consequence: only the penalty.
    expect(state.crew.kai.stats).toMatchObject({ health: 100, stress: 25, sleep: 75 })
    expect(entry.outcome).toBe('compromised')
    expect(entry.penalties.map((p) => p.absentCrewId)).toEqual(['lyra'])
    expect(entry.intel).toBeNull()
  })

  it('without Zara: exactly one random participant loses 25 extra health and it is logged', () => {
    const before = newGame(7)
    const { state, entry } = resolved(before, ['orion', 'lyra', 'elias'])
    expect(entry.randomEvents).toHaveLength(1)
    const { targetId, absentCrewId, delta } = entry.randomEvents[0]
    expect(absentCrewId).toBe('zara')
    expect(delta).toEqual({ health: -25 })
    expect(['orion', 'lyra', 'elias']).toContain(targetId)
    const base: Record<string, number> = { orion: -5, lyra: -10, elias: 0 }
    for (const id of ['orion', 'lyra', 'elias'] as const) {
      const expected = 100 + base[id] - (id === targetId ? 25 : 0)
      expect(state.crew[id].stats.health).toBe(expected)
    }
    expect(state.rngSeed).not.toBe(before.rngSeed)
  })

  it('random target is reproducible from the saved seed', () => {
    const a = resolved(newGame(123), ['orion', 'lyra', 'kai'])
    const b = resolved(newGame(123), ['orion', 'lyra', 'kai'])
    expect(a.entry.randomEvents).toEqual(b.entry.randomEvents)
    const targets = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => resolved(newGame(seed), ['orion', 'lyra', 'kai']).entry.randomEvents[0].targetId,
      ),
    )
    expect(targets.size).toBeGreaterThan(1)
  })

  it('without Orion: every participant gets +10 stress and -5 trust', () => {
    const { state } = resolved(newGame(), ['lyra', 'zara', 'elias'])
    expect(state.crew.lyra.stats).toMatchObject({ health: 90, stress: 55, sleep: 55, trust: 70 })
    expect(state.crew.zara.stats).toMatchObject({ health: 85, stress: 70, sleep: 55, trust: 65 })
    expect(state.crew.elias.stats).toMatchObject({ health: 100, stress: 25, sleep: 80, trust: 75 })
  })

  it('combines every penalty once each when no optimal member is sent', () => {
    const { state, entry } = resolved(newGame(), ['elias', 'kai'])
    expect(entry.penalties.map((p) => p.absentCrewId)).toEqual(['lyra', 'zara', 'orion'])
    expect(entry.randomEvents).toHaveLength(1)
    const target = entry.randomEvents[0].targetId
    for (const id of ['elias', 'kai'] as const) {
      const initial = newGame().crew[id].stats
      expect(state.crew[id].stats.stress).toBe(initial.stress + 15 + 10)
      expect(state.crew[id].stats.sleep).toBe(initial.sleep - 10)
      expect(state.crew[id].stats.trust).toBe(initial.trust - 5)
      expect(state.crew[id].stats.health).toBe(id === target ? 75 : 100)
      const change = entry.changes.find((c) => c.crewId === id)!
      const labels = change.sources.map((s) => s.label)
      expect(new Set(labels).size).toBe(labels.length)
    }
  })

  it('combines two penalties (without Lyra and Orion) without double-applying', () => {
    const { state } = resolved(newGame(), ['zara'])
    // Zara: base (-15 H, +20 S, -20 Sl) + no Lyra (+15 S, -10 Sl) + no Orion (+10 S, -5 T)
    expect(state.crew.zara.stats).toEqual({
      health: 85,
      morale: 60,
      stress: 85,
      sleep: 45,
      trust: 65,
    })
  })

  it('keeps every statistic between 0 and 100', () => {
    let state = newGame()
    state = withStats(state, 'zara', { health: 10, stress: 95, sleep: 5 })
    state = withStats(state, 'kai', { trust: 2 })
    const { state: next, entry } = resolved(state, ['zara', 'kai'])
    expect(next.crew.zara.stats.health).toBe(0)
    expect(next.crew.zara.stats.stress).toBe(100)
    expect(next.crew.zara.stats.sleep).toBe(0)
    expect(next.crew.kai.stats.trust).toBe(0)
    for (const id of CREW_IDS)
      for (const value of Object.values(next.crew[id].stats)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
    expect(entry.incapacitated).toContain('zara')
    // The log keeps the requested change separately from the clamped result.
    const zara = entry.changes.find((c) => c.crewId === 'zara')!
    expect(zara.requested.stress).toBe(45)
    expect(zara.after.stress).toBe(100)
  })

  it('respects precise limits from permanent conditions', () => {
    const base = newGame()
    const state: GameState = {
      ...base,
      crew: {
        ...base.crew,
        orion: {
          stats: { ...base.crew.orion.stats, trust: 42 },
          conditions: ['unbreakable-loyalty'],
        },
      },
    }
    const { state: next } = resolved(state, ['orion', 'zara'])
    expect(next.crew.orion.stats.trust).toBe(42) // no Orion penalty: unchanged
    const withoutOrion = resolved(
      {
        ...state,
        crew: {
          ...state.crew,
          lyra: {
            stats: { ...state.crew.lyra.stats, trust: 43 },
            conditions: ['unbreakable-loyalty'],
          },
        },
      },
      ['lyra'],
    )
    expect(withoutOrion.state.crew.lyra.stats.trust).toBe(40) // 43 - 5 would be 38, floor is 40
  })

  it('records a complete log entry and advances the turn', () => {
    const { state, entry } = resolved(newGame(), ['orion', 'lyra'])
    expect(entry).toMatchObject({
      id: 't1-ghost-satellite',
      turn: 1,
      timestamp: NOW,
      missionId: MISSION,
      routeId: 'default',
      crewIds: ['orion', 'lyra'],
      outcome: 'compromised',
    })
    expect(entry.changes.map((c) => c.crewId)).toEqual(['orion', 'lyra'])
    expect(entry.changes[0].before.health).toBe(100)
    expect(entry.changes[0].after.health).toBe(entry.randomEvents[0].targetId === 'orion' ? 70 : 95)
    expect(state.turn).toBe(2)
    expect(state.log).toEqual([entry])
    expect(state.missions[MISSION]).toBe('completed')
    expect(gameStateSchema.safeParse(state).success).toBe(true)
  })

  it('does not mutate the input state', () => {
    const game = deepFreeze(newGame())
    const snapshot = structuredClone(game)
    resolved(game, ['elias', 'kai'])
    expect(game).toEqual(snapshot)
  })

  it('cannot run the same mission twice and returns errors instead of a state', () => {
    const { state } = resolved(newGame(), ['orion', 'lyra', 'zara'])
    const again = launch(state, ['elias'])
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.errors).toContain('La misión ya fue completada.')
  })

  it('analysis preview matches the resolved deterministic consequences', () => {
    const game = newGame()
    const analysis = analyzeTeam(game, { missionId: MISSION, crewIds: ['orion', 'kai'] })
    expect(analysis.absentOptimal).toEqual(['lyra', 'zara'])
    expect(analysis.extraParticipants).toEqual(['kai'])
    expect(analysis.randomEffects[0].candidates).toEqual(['orion', 'kai'])
    const { entry } = resolved(game, ['orion', 'kai'])
    const kai = entry.changes.find((c) => c.crewId === 'kai')!
    const deterministic = kai.sources.filter((s) => !s.label.includes('al azar'))
    expect(deterministic).toEqual(analysis.sources.kai)
  })
})
