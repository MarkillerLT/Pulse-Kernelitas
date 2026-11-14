import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../../src/ui/router'
import { gameStore } from '../../src/store/gameStore'
import { SAVE_KEY } from '../../src/persistence/saveGame'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  gameStore.getState().resetGame()
  gameStore.getState().dismissNotice()
  gameStore.getState().setReducedMotion(true)
})

describe('mission briefing', () => {
  it('limits the selection to three crew members', async () => {
    const user = userEvent.setup()
    renderAt('/missions/ghost-satellite')
    await user.click(screen.getByRole('button', { name: 'Asignar a Orion Vega' }))
    await user.click(screen.getByRole('button', { name: 'Asignar a Lyra Kess' }))
    await user.click(screen.getByRole('button', { name: 'Asignar a Zara Void' }))
    expect(screen.getByRole('button', { name: 'Asignar a Kai Verdant' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quitar a Orion Vega' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByText('Equipo óptimo. Solo se aplican las consecuencias base.'),
    ).toBeInTheDocument()
  })

  it('disables incapacitated crew members', () => {
    const game = gameStore.getState().game
    gameStore.setState({
      game: {
        ...game,
        crew: {
          ...game.crew,
          zara: { ...game.crew.zara, stats: { ...game.crew.zara.stats, health: 0 } },
        },
      },
    })
    renderAt('/missions/ghost-satellite')
    expect(screen.getByRole('button', { name: 'Asignar a Zara Void' })).toBeDisabled()
  })

  it('warns about absent members and cannot launch without a selection', async () => {
    const user = userEvent.setup()
    renderAt('/missions/ghost-satellite')
    expect(screen.getByRole('button', { name: /Lanzar misión/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Asignar a Elias Nova' }))
    const warnings = screen.getByRole('list', { name: 'Advertencias por integrantes ausentes' })
    expect(within(warnings).getByText(/Sin Lyra:/)).toBeInTheDocument()
    expect(within(warnings).getByText(/Sin Zara:/)).toBeInTheDocument()
    expect(within(warnings).getByText(/Sin Orion:/)).toBeInTheDocument()
  })

  it('launches after confirmation, shows the report and persists the result', async () => {
    const user = userEvent.setup()
    const router = renderAt('/missions/ghost-satellite')
    for (const name of ['Orion Vega', 'Lyra Kess', 'Zara Void'])
      await user.click(screen.getByRole('button', { name: `Asignar a ${name}` }))
    await user.click(screen.getByRole('button', { name: /Lanzar misión/ }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar lanzamiento' }))

    expect(router.state.location.pathname).toBe('/log/t1-ghost-satellite')
    expect(await screen.findByText('Se obtiene toda la información.')).toBeInTheDocument()
    expect(gameStore.getState().game.crew.zara.stats.health).toBe(85)
    expect(localStorage.getItem(SAVE_KEY)).toContain('"turn":2')

    await user.click(screen.getByRole('link', { name: 'Volver al puente' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('N0VA-7 en línea')
  })

  it('does not offer launching for missions still in design', () => {
    renderAt('/missions/orchard-outbreak')
    expect(screen.getByText(/Misión en diseño/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lanzar misión/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Asignar a Kai Verdant' })).toBeDisabled()
  })
})

describe('navigation views', () => {
  it('renders the bridge, crew profile, sectors and an unknown route', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: /Preparar misión/ })).toHaveAttribute(
      'href',
      '/missions/ghost-satellite',
    )
    cleanupAndRender('/crew/zara')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Zara Void')
    expect(screen.getByRole('meter', { name: 'Estrés' })).toHaveAttribute('aria-valuenow', '40')
    cleanupAndRender('/sectors/collins')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Núcleo Collins')
    cleanupAndRender('/crew/nobody')
    expect(screen.getByText('Registro no encontrado')).toBeInTheDocument()
  })

  it('resets the game from the system view after confirmation', async () => {
    gameStore.getState().launchMission({ missionId: 'ghost-satellite', crewIds: ['orion'] })
    const user = userEvent.setup()
    renderAt('/system')
    await user.click(screen.getByRole('button', { name: /Reiniciar partida/ }))
    await user.click(await screen.findByRole('button', { name: 'Reiniciar' }))
    expect(gameStore.getState().game.turn).toBe(1)
    expect(gameStore.getState().game.log).toEqual([])
  })
})

function cleanupAndRender(path: string) {
  cleanup()
  renderAt(path)
}
