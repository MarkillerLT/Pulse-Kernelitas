import { describe, expect, it } from 'vitest'
import { CREW_IDS, type CrewId } from '../../src/domain/content/crew'
import { MISSION_IDS } from '../../src/domain/content/missions'
import { JOURNEY_DAYS } from '../../src/domain/content/ship'
import { createGame } from '../../src/domain/engine/createGame'
import { assignTask, orderCrew, previewAssignment } from '../../src/domain/engine/commands'
import { advanceHours } from '../../src/domain/engine/tick'
import { spawnEvent, spawnMissionTask } from '../../src/domain/engine/spawn'
import { gameStateSchema, type GameState } from '../../src/domain/model/game'
import type { Stats } from '../../src/domain/model/stats'
import { taskChance } from '../../src/domain/rules/chance'
import { hourlyDrift, sleepShiftGain } from '../../src/domain/rules/drift'

const NOW = '2026-11-14T12:00:00.000Z'
const newGame = (seed = 1) => createGame({ now: NOW, seed, firstTask: false })

function withStats(state: GameState, id: CrewId, stats: Partial<Stats>): GameState {
  const next = structuredClone(state)
  next.crew[id].stats = { ...next.crew[id].stats, ...stats }
  return next
}
function withEvent(state: GameState, eventId: string): [GameState, string] {
  const next = structuredClone(state)
  const task = spawnEvent(next, eventId, [])!
  return [next, task.id]
}
function ok(result: ReturnType<typeof assignTask>) {
  if (!result.ok) throw new Error(result.errors.join(' '))
  return result
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('new game', () => {
  it('uses the initial statistics of the design document', () => {
    const game = newGame()
    expect(game.crew.orion.stats).toEqual({
      health: 100,
      morale: 80,
      stress: 20,
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
    for (const id of CREW_IDS) expect(game.crew[id].activity).toBe('duty')
    for (const id of MISSION_IDS) expect(game.missions[id]).toBe('pending')
    expect(gameStateSchema.safeParse(game).success).toBe(true)
  })

  it('starts with the tutorial task by default', () => {
    expect(createGame({ now: NOW }).tasks.map((t) => t.refId)).toEqual(['air-filters'])
  })
})

describe('drift rules', () => {
  it('sleep recovery per shift matches the design examples', () => {
    expect(sleepShiftGain(20)).toBe(25)
    expect(sleepShiftGain(90)).toBe(10)
    expect(sleepShiftGain(55)).toBeCloseTo(17.5)
  })

  it('awake crew lose sleep; resting crew recover sleep and lose stress', () => {
    const game = newGame()
    const ctx = { ship: game.ship, recoveryMultiplier: 1 }
    expect(hourlyDrift(game.crew.orion, ctx).sleep).toBeLessThan(0)
    const resting = { ...game.crew.orion, activity: 'rest' as const }
    expect(hourlyDrift(resting, ctx).sleep).toBeGreaterThan(0)
    expect(hourlyDrift(resting, ctx).stress).toBeLessThan(0)
  })

  it('low sleep doubles stress growth', () => {
    const game = newGame()
    const ctx = { ship: game.ship, recoveryMultiplier: 1 }
    const tired = { ...game.crew.orion, stats: { ...game.crew.orion.stats, sleep: 20 } }
    expect(hourlyDrift(tired, ctx).stress).toBeCloseTo(
      hourlyDrift(game.crew.orion, ctx).stress! * 2,
    )
  })
})

describe('clock', () => {
  it('advances hours without mutating the input and keeps stats in range', () => {
    const game = deepFreeze(newGame())
    const snapshot = structuredClone(game)
    const { state } = advanceHours(game, 48)
    expect(game).toEqual(snapshot)
    expect(state.hour).toBe(game.hour + 48)
    for (const id of CREW_IDS)
      for (const value of Object.values(state.crew[id].stats)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
    expect(gameStateSchema.safeParse(state).success).toBe(true)
  })

  it('sends crew to sleep at night and back to duty in the morning', () => {
    const game = newGame() // 08:00
    const night = advanceHours(game, 14).state // 22:00
    expect(night.crew.orion.activity).toBe('rest')
    const morning = advanceHours(night, 8).state // 06:00
    expect(morning.crew.orion.activity).toBe('duty')
  })

  it('opens the first story mission on day 2 at 09:00 and pauses', () => {
    const result = advanceHours(newGame(), 25)
    expect(result.state.missions['ghost-satellite']).toBe('available')
    expect(result.state.tasks.some((t) => t.kind === 'mission')).toBe(true)
    expect(result.pause).toBe(true)
  })

  it('is deterministic for the same seed', () => {
    const a = advanceHours(newGame(42), 24 * 5).state
    const b = advanceHours(newGame(42), 24 * 5).state
    expect(a).toEqual(b)
  })

  it('expires ignored tasks and applies their consequences', () => {
    const [game] = withEvent(newGame(), 'engine-fire')
    const { state } = advanceHours(game, 3)
    expect(state.tasks.some((t) => t.refId === 'engine-fire')).toBe(false)
    expect(state.ship.power).toBeLessThan(game.ship.power - 25)
    expect(state.log.some((l) => l.title === 'Sin respuesta: El motor se incendia')).toBe(true)
  })

  it('wins after surviving the journey', () => {
    let state = newGame()
    state = { ...state, hour: JOURNEY_DAYS * 24 - 1 }
    const result = advanceHours(state, 1)
    expect(result.state.status).toBe('won')
  })

  it('loses when life support collapses', () => {
    const state = { ...newGame(), ship: { ...newGame().ship, lifeSupport: 0.1, power: 10 } }
    expect(advanceHours(state, 1).state.status).toBe('lost')
  })
})

describe('task assignment', () => {
  it('previews a visible chance based on specialty and condition', () => {
    const [game, taskId] = withEvent(newGame(), 'engine-fire')
    const lyra = previewAssignment(game, { taskId, optionId: 'send-engineer', crewIds: ['lyra'] })
    const kai = previewAssignment(game, { taskId, optionId: 'send-engineer', crewIds: ['kai'] })
    expect(lyra.errors).toEqual([])
    expect(lyra.chance!.chance).toBeGreaterThan(kai.chance!.chance)
    expect(lyra.chance!.factors.some((f) => f.label.startsWith('Técnica 10'))).toBe(true)
  })

  it('high stress lowers the chance and triggers the "send anyway" warning', () => {
    const [game, taskId] = withEvent(newGame(), 'engine-fire')
    const stressed = withStats(game, 'lyra', { stress: 85 })
    const calm = previewAssignment(game, { taskId, optionId: 'send-engineer', crewIds: ['lyra'] })
    const preview = previewAssignment(stressed, {
      taskId,
      optionId: 'send-engineer',
      crewIds: ['lyra'],
    })
    expect(preview.chance!.chance).toBeCloseTo(calm.chance!.chance - 0.2)
    expect(preview.warnings[0].warnings[0].title).toBe('Advertencia: niveles de estrés altos')
  })

  it('forcing a warned member costs trust and three times causes Rencor', () => {
    let state = withStats(newGame(), 'lyra', { stress: 85 })
    for (let i = 0; i < 3; i++) {
      const [withTask, taskId] = withEvent(state, 'reactor-fluctuation')
      state = ok(assignTask(withTask, { taskId, optionId: 'tune', crewIds: ['lyra'] })).state
      expect(state.crew.lyra.activity).toBe('task')
      state = advanceHours(state, 2).state
      state = withStats(state, 'lyra', { stress: 85, sleep: 60, health: 100, morale: 70 })
      state.crew.lyra.activity = 'duty'
      state.eventHistory = {}
    }
    expect(state.crew.lyra.counters.forced).toBe(3)
    expect(state.crew.lyra.conditions).toContain('grudge')
    expect(state.crew.lyra.stats.trust).toBeLessThanOrEqual(70)
  })

  it('validates the team: size, duplicates and availability', () => {
    const [game, taskId] = withEvent(newGame(), 'engine-fire')
    const errors = (crewIds: string[], optionId = 'send-engineer') =>
      previewAssignment(game, { taskId, optionId, crewIds }).errors
    expect(errors([])).toContain('Selecciona al menos un tripulante.')
    expect(errors(['lyra', 'kai', 'zara'])).toContain('Máximo 2 tripulante(s) para esta opción.')
    expect(errors(['lyra', 'lyra'])).toContain('Un tripulante no puede asignarse dos veces.')
    expect(errors(['lyra'], 'suppression')).toContain('Esta opción no requiere tripulantes.')
    const busy = structuredClone(game)
    busy.crew.lyra.activity = 'medical'
    expect(
      previewAssignment(busy, { taskId, optionId: 'send-engineer', crewIds: ['lyra'] }).errors[0],
    ).toContain('Centro Médico')
  })

  it('resolves the task when its time is up and frees the crew', () => {
    const [game, taskId] = withEvent(newGame(), 'engine-fire')
    const assigned = ok(
      assignTask(game, { taskId, optionId: 'send-engineer', crewIds: ['lyra'] }),
    ).state
    const { state, notes } = advanceHours(assigned, 2)
    expect(state.crew.lyra.activity).toBe('duty')
    expect(state.crew.lyra.taskId).toBeNull()
    const entry = state.log.find(
      (l) => l.title.endsWith('El motor se incendia') && /Completada|Fallida/.test(l.title),
    )!
    expect(entry.chance).toBeGreaterThan(0)
    expect(notes.length).toBeGreaterThan(0)
  })

  it('a failure explains its cause and offers a retry', () => {
    // Force a near-certain failure: exhausted, saturated Kai on an engineering task.
    const [spawned, taskId] = withEvent(newGame(3), 'engine-fire')
    const game = withStats(spawned, 'kai', { stress: 95, sleep: 20, health: 20 })
    const assigned = ok(
      assignTask(game, { taskId, optionId: 'send-engineer', crewIds: ['kai'] }),
    ).state
    expect(assigned.tasks[0].assignment!.chance).toBe(0.05)
    assigned.tasks[0].assignment!.chance = 0 // make the 5% roll deterministic for the test
    const { state } = advanceHours(assigned, 2)
    const failure = state.log.find((l) => l.title === 'Fallida: El motor se incendia')!
    expect(failure.text).toMatch(/Causa principal/)
    expect(state.tasks.some((t) => t.title === 'Reintentar: El motor se incendia')).toBe(true)
  })

  it('answers crew rest requests', () => {
    let state = withStats(newGame(), 'zara', { stress: 90 })
    state = advanceHours(state, 1).state
    const request = state.tasks.find((t) => t.kind === 'request' && t.targetId === 'zara')!
    expect(request.title).toBe('Zara Void solicita descanso')
    const granted = ok(
      assignTask(state, { taskId: request.id, optionId: 'grant', crewIds: [] }),
    ).state
    expect(granted.crew.zara.activity).toBe('rest')
    expect(granted.crew.zara.stats.trust).toBe(state.crew.zara.stats.trust + 5)
  })
})

describe('story missions', () => {
  function missionGame(crewIds: CrewId[]) {
    const game = newGame(9)
    spawnMissionTask(game, 'ghost-satellite', 1)
    game.missions['ghost-satellite'] = 'available'
    const taskId = game.tasks[0].id
    return {
      game,
      taskId,
      preview: previewAssignment(game, { taskId, optionId: 'default', crewIds }),
    }
  }

  it('optimal team gives the highest chance; absences lower it 15% each', () => {
    expect(missionGame(['orion', 'lyra', 'zara']).preview.chance!.chance).toBeCloseTo(0.75)
    expect(missionGame(['orion', 'lyra']).preview.chance!.chance).toBeCloseTo(0.6)
    expect(missionGame(['kai']).preview.chance!.chance).toBeCloseTo(0.3)
  })

  it('applies the design consequences and reports penalties', () => {
    const { game, taskId } = missionGame(['orion', 'lyra', 'zara'])
    const assigned = ok(
      assignTask(game, { taskId, optionId: 'default', crewIds: ['orion', 'lyra', 'zara'] }),
    ).state
    expect(assigned.crew.zara.activity).toBe('mission')
    expect(assigned.missions['ghost-satellite']).toBe('active')
    const { state } = advanceHours(assigned, 6)
    const entry = state.log.find(
      (l) => l.kind === 'mission' && /Misión (cumplida|fallida)/.test(l.title),
    )!
    const zara = entry.changes.find((c) => c.crewId === 'zara')!
    expect(zara.after.health).toBeLessThanOrEqual(zara.before.health - 15)
    expect(['completed', 'failed']).toContain(state.missions['ghost-satellite'])
    if (state.missions['ghost-satellite'] === 'failed')
      expect(state.tasks.some((t) => t.title === 'Reintentar misión: El Satélite Fantasma')).toBe(
        true,
      )
  })

  it('without Zara a random participant takes -25 health', () => {
    const { game, taskId } = missionGame(['orion', 'lyra'])
    const assigned = ok(
      assignTask(game, { taskId, optionId: 'default', crewIds: ['orion', 'lyra'] }),
    ).state
    const { state } = advanceHours(assigned, 6)
    const entry = state.log.find(
      (l) => l.kind === 'mission' && /Misión (cumplida|fallida)/.test(l.title),
    )!
    expect(entry.text).toMatch(/Afectado al azar: (Orion Vega|Lyra Kess)/)
  })
})

describe('direct orders', () => {
  it('sending a saturated member to rest earns trust once a day', () => {
    const game = withStats(newGame(), 'orion', { stress: 80 })
    const result = orderCrew(game, 'orion', 'rest')
    if (!result.ok) throw new Error()
    expect(result.state.crew.orion.activity).toBe('rest')
    expect(result.state.crew.orion.stats.trust).toBe(90)
  })

  it('cannot reassign a member who is on a task', () => {
    const [game, taskId] = withEvent(newGame(), 'engine-fire')
    const assigned = ok(
      assignTask(game, { taskId, optionId: 'send-engineer', crewIds: ['lyra'] }),
    ).state
    expect(orderCrew(assigned, 'lyra', 'rest').ok).toBe(false)
  })
})

describe('chance formula', () => {
  it('is clamped between 5% and 95%', () => {
    const game = newGame()
    expect(taskChance(game, 0.9, 'technical', ['lyra', 'kai']).chance).toBe(0.95)
    const wrecked = withStats(game, 'kai', {
      stress: 100,
      sleep: 0,
      health: 1,
      morale: 1,
      trust: 1,
    })
    expect(taskChance(wrecked, 0.1, 'technical', ['kai']).chance).toBe(0.05)
  })
})
