import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as persistence from '../../src/persistence/saveGame'
import { useMissionStore } from '../../src/store/missionStore'
import { createMission } from '../../src/simulation/engine/createMission'

beforeEach(() => {
  useMissionStore.setState({
    mission: createMission(),
    orders: [],
    selectedId: 'okafor',
    busy: false,
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})
it('keeps the resulting turn playable when autosave fails', async () => {
  vi.spyOn(persistence, 'saveMission').mockRejectedValue(new Error('Quota exceeded'))
  await useMissionStore.getState().advance()
  expect(useMissionStore.getState().mission.day).toBe(2)
  expect(useMissionStore.getState().notice).toContain('Autosave unavailable')
  expect(useMissionStore.getState().busy).toBe(false)
})
it('preserves current mission when loading or reset storage fails', async () => {
  const original = useMissionStore.getState().mission
  vi.spyOn(persistence, 'loadMission').mockRejectedValue(new Error('Corrupted'))
  await useMissionStore.getState().load()
  expect(useMissionStore.getState().mission).toBe(original)
  vi.spyOn(persistence, 'deleteMission').mockRejectedValue(new Error('Blocked'))
  await useMissionStore.getState().reset()
  expect(useMissionStore.getState().mission).toBe(original)
  expect(useMissionStore.getState().busy).toBe(false)
})
it('prevents double execution while an autosave is in flight', async () => {
  let resolve!: () => void
  vi.spyOn(persistence, 'saveMission').mockImplementation(
    () =>
      new Promise<void>((r) => {
        resolve = r
      }),
  )
  const first = useMissionStore.getState().advance()
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
  await useMissionStore.getState().advance()
  expect(useMissionStore.getState().mission.day).toBe(2)
  resolve()
  await first
})
