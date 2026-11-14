import { beforeEach, describe, expect, it } from 'vitest'
import { database } from '../../src/persistence/database'
import { deleteMission, loadMission, saveMission } from '../../src/persistence/saveGame'
import { createMission } from '../../src/simulation/engine/createMission'
import { simulateTurn } from '../../src/simulation/engine/simulateTurn'
import { parameters } from '../../src/simulation/parameters/defaults'

beforeEach(async () => {
  await database.saves.clear()
})
describe('versioned IndexedDB persistence', () => {
  it('returns null when no save exists', async () => {
    expect(await loadMission()).toBeNull()
  })
  it('round trips all telemetry, pending effects, PRNG and history', async () => {
    const state = simulateTurn(createMission(), [], parameters).state
    await saveMission(state)
    expect(await loadMission()).toEqual(state)
  })
  it('replaces the local slot and can delete it', async () => {
    await saveMission(createMission(1))
    await saveMission(createMission(2))
    expect((await loadMission())?.seed).toBe(2)
    await deleteMission()
    expect(await loadMission()).toBeNull()
  })
  it('rejects unknown schemas and corrupted scores without deleting data', async () => {
    await database.saves.put({ id: 'mission', version: 2, savedAt: '', state: {} })
    await expect(loadMission()).rejects.toThrow('Unsupported save version')
    const state = createMission()
    state.crew[0].fatigue = -1
    await expect(saveMission(state)).rejects.toThrow()
    expect(await database.saves.count()).toBe(1)
  })
})
