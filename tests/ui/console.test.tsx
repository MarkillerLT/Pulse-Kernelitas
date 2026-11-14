import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../../src/ui/router'
import { gameStore } from '../../src/store/gameStore'
import { createGame } from '../../src/domain/engine/createGame'
import { spawnMissionTask } from '../../src/domain/engine/spawn'
import type { GameState } from '../../src/domain/model/game'

function renderAt(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}
function setGame(mutate: (g: GameState) => void = () => {}) {
  const game = createGame({ now: '2026-11-14T12:00:00.000Z', seed: 11 })
  game.settings.reducedMotion = true
  mutate(game)
  gameStore.setState({ game, speed: 0, notices: [], elapsedMs: 0 })
}

beforeEach(() => setGame())

describe('bridge console', () => {
  it('shows the clock, the ship, the crew and the pending task', () => {
    renderAt()
    expect(screen.getByText('Día 1 · 08:00', { selector: '.clock-time' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Plano de la nave Elysium/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seleccionar a Lyra Kess' })).toBeInTheDocument()
    expect(
      screen.getByText('Filtros de aire saturados', { selector: 'strong' }),
    ).toBeInTheDocument()
  })

  it('assigning a task shows the visible chance and sends the crew', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Reemplazar filtros' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Asignar a Lyra Kess' }))
    expect(within(dialog).getByText('95%')).toBeInTheDocument()
    expect(within(dialog).getByText('Técnica 10 (Lyra)')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Enviar ahora' }))
    expect(gameStore.getState().game.crew.lyra.activity).toBe('task')
    expect(screen.getByText('En curso')).toBeInTheDocument()
  })

  it('warns about high stress and requires "Mandar de igual forma"', async () => {
    setGame((g) => {
      g.crew.lyra.stats.stress = 85
    })
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Reemplazar filtros' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Asignar a Lyra Kess' }))
    expect(within(dialog).getByText(/Advertencia: niveles de estrés altos/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Mandar de igual forma' }))
    expect(gameStore.getState().game.crew.lyra.stats.trust).toBe(70)
  })

  it('missions allow up to three members and list absence penalties', async () => {
    setGame((g) => {
      spawnMissionTask(g, 'ghost-satellite', 1)
      g.missions['ghost-satellite'] = 'available'
    })
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: /Preparar equipo/ }))
    const dialog = await screen.findByRole('dialog')
    for (const name of ['Orion Vega', 'Kai Verdant', 'Elias Nova', 'Zara Void'])
      await user.click(within(dialog).getByRole('button', { name: `Asignar a ${name}` }))
    expect(within(dialog).getAllByRole('button', { pressed: true })).toHaveLength(3)
    const penalties = within(dialog).getByRole('list', { name: 'Penalizaciones por ausencia' })
    expect(within(penalties).getByText(/Sin Lyra:/)).toBeInTheDocument()
  })

  it('grants a rest request from the task list', async () => {
    setGame((g) => {
      g.crew.zara.stats.stress = 90
    })
    gameStore.getState().setSpeed(1)
    gameStore.getState().tick(2000)
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Conceder descanso' }))
    expect(gameStore.getState().game.crew.zara.activity).toBe('rest')
  })

  it('gives direct orders to the selected crew member', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Seleccionar a Kai Verdant' }))
    await user.click(screen.getByRole('button', { name: 'Tiempo libre' }))
    expect(gameStore.getState().game.crew.kai.activity).toBe('leisure')
  })

  it('pauses and runs the clock', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: /4×/ }))
    expect(gameStore.getState().speed).toBe(4)
    await user.click(screen.getByRole('button', { name: /Pausa/ }))
    expect(gameStore.getState().speed).toBe(0)
  })
})

describe('other views', () => {
  it('renders crew profile, missions, sectors, log and unknown routes', () => {
    renderAt('/crew/zara')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Zara Void')
    cleanup()
    renderAt('/missions')
    expect(screen.getByText('El Corazón de la Tormenta')).toBeInTheDocument()
    cleanup()
    renderAt('/sectors/gagarin')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Complejo Gagarin')
    cleanup()
    renderAt('/log')
    expect(screen.getByText('N0VA-7 en línea')).toBeInTheDocument()
    cleanup()
    renderAt('/nowhere')
    expect(screen.getByText('Registro no encontrado')).toBeInTheDocument()
  })

  it('resets the game from the system view after confirmation', async () => {
    gameStore.getState().setSpeed(4)
    gameStore.getState().tick(10_000)
    const user = userEvent.setup()
    renderAt('/system')
    await user.click(screen.getByRole('button', { name: /Reiniciar partida/ }))
    await user.click(await screen.findByRole('button', { name: 'Reiniciar' }))
    expect(gameStore.getState().game.hour).toBe(8)
  })
})
