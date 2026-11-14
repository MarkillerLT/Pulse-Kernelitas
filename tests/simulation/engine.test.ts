import { describe, expect, it } from 'vitest'
import { createMission } from '../../src/simulation/engine/createMission'
import { simulateTurn } from '../../src/simulation/engine/simulateTurn'
import { nextRandom } from '../../src/simulation/engine/random'
import { parameters as p } from '../../src/simulation/parameters/defaults'
import { missionSchema, type MissionState } from '../../src/simulation/models/mission'

function freeze(state: MissionState): MissionState {
  Object.freeze(state)
  for (const value of Object.values(state))
    if (typeof value === 'object' && value !== null) {
      Object.freeze(value)
      for (const child of Object.values(value))
        if (child && typeof child === 'object') Object.freeze(child)
    }
  return state
}
describe('pure deterministic mission engine', () => {
  it('initializes a valid, independent three-person fatigue scenario', () => {
    const mission = createMission()
    expect(missionSchema.parse(mission)).toEqual(mission)
    expect(mission.crew).toHaveLength(3)
    expect(mission.crew[1].fatigue).toBe(72)
    expect(createMission()).not.toBe(mission)
  })
  it('progresses day, history, telemetry and mission output', () => {
    const result = simulateTurn(createMission(), [], p)
    expect(result.errors).toEqual([])
    expect(result.state.day).toBe(2)
    expect(result.state.progress).toBeGreaterThan(0)
    expect(result.state.history[0].decisions).toHaveLength(3)
    expect(result.state.telemetry).toHaveLength(2)
    expect(result.state.crew[1].fatigue).toBeGreaterThan(72)
  })
  it('rest recovers sleep and fatigue, costs reserves and sacrifices output', () => {
    const start = createMission()
    const rest = simulateTurn(start, [{ astronautId: 'okafor', activity: 'rest' }], p).state
    const work = simulateTurn(start, [], p).state
    expect(rest.crew[1].fatigue).toBe(48)
    expect(rest.crew[1].sleep).toBe(63)
    expect(rest.crew[1].location).toBe('Sleeping quarters')
    expect(rest.resources.operations).toBe(176)
    expect(rest.progress).toBeLessThan(work.progress)
  })
  it('charges base upkeep, assignments and treatment supplies once', () => {
    const state = simulateTurn(
      createMission(),
      [
        { astronautId: 'okafor', activity: 'medical' },
        { astronautId: 'park', activity: 'exercise' },
      ],
      p,
    ).state
    expect(state.resources).toEqual({ operations: 174, medical: 10 })
  })
  it('resolves overload on the following day, even if subsequently resting', () => {
    const turn1 = simulateTurn(createMission(), [], p).state
    expect(turn1.pending.some((e) => e.kind === 'strain')).toBe(true)
    const turn2 = simulateTurn(turn1, [{ astronautId: 'okafor', activity: 'rest' }], p).state
    expect(turn2.events.some((e) => e.title === 'Delayed strain')).toBe(true)
    expect(
      turn2.pending.filter((e) => e.kind === 'strain' && e.astronautId === 'okafor'),
    ).toHaveLength(0)
  })
  it('delays exercise adaptation by two turns', () => {
    let s = simulateTurn(
      createMission(),
      [{ astronautId: 'okafor', activity: 'exercise' }],
      p,
    ).state
    expect(s.pending.find((e) => e.kind === 'recovery')?.dueDay).toBe(4)
    s = simulateTurn(s, [{ astronautId: 'okafor', activity: 'rest' }], p).state
    expect(s.events.some((e) => e.title === 'Adaptation benefit')).toBe(false)
    s = simulateTurn(s, [], p).state
    expect(s.events.some((e) => e.title === 'Adaptation benefit')).toBe(true)
  })
  it('assessment returns a delayed report without being treatment', () => {
    const start = createMission()
    const assessed = simulateTurn(
      start,
      [{ astronautId: 'okafor', activity: 'assessment' }],
      p,
    ).state
    expect(assessed.crew[1].fatigue).toBe(75)
    const next = simulateTurn(assessed, [], p).state
    expect(next.events.some((e) => e.title === 'Assessment results')).toBe(true)
  })
  it('is reproducible across JSON serialization and repeated decisions', () => {
    const start = createMission(123)
    const a = simulateTurn(start, [], p)
    const b = simulateTurn(JSON.parse(JSON.stringify(start)), [], p)
    expect(a).toEqual(b)
    expect(a.state.seed).not.toBe(start.seed)
    expect(nextRandom(123)).not.toEqual(nextRandom(124))
  })
  it('never mutates frozen input or decisions', () => {
    const input = freeze(createMission())
    const snapshot = JSON.stringify(input)
    const decisions = [{ astronautId: 'okafor', activity: 'rest' as const }]
    Object.freeze(decisions)
    const result = simulateTurn(input, decisions, p)
    expect(result.state).not.toBe(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
  it('rejects unaffordable treatment atomically', () => {
    const input = createMission()
    input.resources.medical = 0
    const result = simulateTurn(input, [{ astronautId: 'okafor', activity: 'medical' }], p)
    expect(result.errors).toHaveLength(1)
    expect(result.state).toBe(input)
  })
  it('rejects duplicate and unknown astronaut orders', () => {
    expect(
      simulateTurn(createMission(), [{ astronautId: 'unknown', activity: 'rest' }], p).errors,
    ).not.toHaveLength(0)
    expect(
      simulateTurn(
        createMission(),
        [
          { astronautId: 'park', activity: 'work' },
          { astronautId: 'park', activity: 'rest' },
        ],
        p,
      ).errors,
    ).not.toHaveLength(0)
  })
  it('ends on complete progress and prevents further turns', () => {
    const input = createMission()
    input.progress = 99
    const won = simulateTurn(input, [], p).state
    expect(won.status).toBe('complete')
    expect(simulateTurn(won, [], p).state).toBe(won)
  })
  it('aborts after transfer deadline and keeps scores bounded', () => {
    const input = createMission()
    input.day = 30
    const last = simulateTurn(input, [], p).state
    expect(last.status).toBe('failed')
    expect(missionSchema.safeParse(last).success).toBe(true)
  })
  it('a balanced recovery rotation can win within the resource budget', () => {
    let s = createMission()
    while (s.status === 'active') {
      const decisions = s.crew.map((a) => ({
        astronautId: a.id,
        activity: a.fatigue >= 60 ? ('rest' as const) : ('work' as const),
      }))
      const result = simulateTurn(s, decisions, p)
      expect(result.errors).toEqual([])
      s = result.state
    }
    expect(s.status).toBe('complete')
    expect(s.crew.every((a) => a.health !== 'critical')).toBe(true)
    expect(s.resources.operations).toBeGreaterThan(0)
  })
})
