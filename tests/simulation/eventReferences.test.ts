import { describe, expect, it } from 'vitest'
import { createMission } from '../../src/simulation/engine/createMission'
import { simulateTurn } from '../../src/simulation/engine/simulateTurn'
import { missionSchema } from '../../src/simulation/models/mission'
import { parameters } from '../../src/simulation/parameters/defaults'
import { saveMission, loadMission, deleteMission } from '../../src/persistence/saveGame'

describe('optional typed event references', () => {
  it('records the affected ID on each generated astronaut warning and delayed effect', () => {
    const start = createMission()
    for (const astronaut of start.crew) astronaut.fatigue = 80
    const first = simulateTurn(start, [], { ...parameters, workFatigue: 1 }).state
    const overloads = first.events.filter((e) => e.title === 'Overload detected')
    expect(overloads.map((e) => e.astronautIds)).toEqual(start.crew.map((a) => [a.id]))
    const second = simulateTurn(
      first,
      start.crew.map((a) => ({ astronautId: a.id, activity: 'rest' })),
      parameters,
    ).state
    expect(
      second.events.filter((e) => e.title === 'Delayed strain').map((e) => e.astronautIds),
    ).toEqual(start.crew.map((a) => [a.id]))
  })
  it('keeps general mission events unassigned', () => {
    const start = createMission()
    start.day = start.duration
    const state = simulateTurn(start, [], parameters).state
    expect(state.events.find((e) => e.title === 'Mission aborted')?.astronautIds).toBeUndefined()
  })
  it('accepts old saves with no event references without a schema version change', async () => {
    const legacy = createMission()
    delete legacy.events[0].astronautIds
    expect(missionSchema.parse(legacy)).toEqual(legacy)
    await saveMission(legacy)
    expect(await loadMission()).toEqual(legacy)
    await deleteMission()
  })
  it('round trips multiple event references and rejects invalid crew IDs', async () => {
    const state = createMission()
    state.events[0].astronautIds = ['okafor', 'park']
    await saveMission(state)
    expect((await loadMission())?.events[0].astronautIds).toEqual(['okafor', 'park'])
    await deleteMission()
    state.events[0].astronautIds = ['unknown']
    expect(missionSchema.safeParse(state).success).toBe(false)
  })
})
