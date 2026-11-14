import { beforeEach, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CrewList } from '../../src/components/crew/CrewList'
import { CrewInspector } from '../../src/components/crew/CrewInspector'
import { useMissionStore } from '../../src/store/missionStore'
import { createMission } from '../../src/simulation/engine/createMission'

beforeEach(() => {
  useMissionStore.setState({
    mission: createMission(),
    selectedId: 'okafor',
    orders: [],
    busy: false,
  })
})
it('selects an astronaut through accessible crew controls, without mounting Pixi', async () => {
  render(
    <>
      <CrewList />
      <CrewInspector />
    </>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Elena Vasquez/ }))
  expect(useMissionStore.getState().selectedId).toBe('vasquez')
  expect(screen.getByRole('button', { name: /Elena Vasquez/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(screen.getByRole('heading', { name: 'Elena Vasquez' })).toBeInTheDocument()
})
it('queues assignments without advancing time, and applies them on execution', async () => {
  render(<CrewInspector />)
  await userEvent.click(screen.getByRole('button', { name: /Rest 1 OP/ }))
  expect(useMissionStore.getState().mission.day).toBe(1)
  expect(useMissionStore.getState().orders).toEqual([{ astronautId: 'okafor', activity: 'rest' }])
  await act(() => useMissionStore.getState().advance())
  expect(useMissionStore.getState().mission.crew[1].activity).toBe('rest')
  expect(useMissionStore.getState().orders).toHaveLength(0)
})
it('replaces rather than duplicates a queued activity and clears orders', async () => {
  render(<CrewInspector />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Rest 1 OP/ }))
  await user.click(screen.getByRole('button', { name: /Exercise 2 OP/ }))
  expect(useMissionStore.getState().orders).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: /Clear all/ }))
  expect(useMissionStore.getState().orders).toEqual([])
})
