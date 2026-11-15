import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../../src/ui/router'
import { HOUR_MS, gameStore } from '../../src/store/gameStore'
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
  gameStore.setState({
    game,
    speed: 0,
    notices: [],
    elapsedMs: 0,
    menu: null,
    mustChooseMode: false,
  })
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
    gameStore.getState().tick(HOUR_MS)
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

  it("shows a member's statistics in a floating card only after pressing them", async () => {
    const user = userEvent.setup()
    renderAt()
    expect(screen.queryByRole('group', { name: 'Ficha de Kai Verdant' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seleccionar a Kai Verdant' }))
    const card = screen.getByRole('group', { name: 'Ficha de Kai Verdant' })
    expect(within(card).getByRole('meter', { name: 'Estrés' })).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Cerrar ficha' }))
    expect(screen.queryByRole('group', { name: 'Ficha de Kai Verdant' })).not.toBeInTheDocument()
  })

  it('shows the clock in quarter hours between game hours', () => {
    gameStore.getState().setSpeed(1)
    gameStore.getState().tick(HOUR_MS / 2)
    renderAt()
    expect(screen.getByText('Día 1 · 08:30', { selector: '.clock-time' })).toBeInTheDocument()
  })

  it('keeps the clock running while a decision is open', async () => {
    gameStore.getState().setSpeed(2)
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Reemplazar filtros' }))
    await screen.findByRole('dialog')
    expect(gameStore.getState().speed).toBe(2)
  })

  it('Fácil recommends the best specialist; Difícil only shows the chance', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Reemplazar filtros' }))
    let dialog = await screen.findByRole('dialog')
    const lyra = within(dialog).getByRole('button', { name: 'Asignar a Lyra Kess' })
    expect(within(lyra).getByText('Recomendado')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    cleanup()

    setGame((g) => {
      g.difficulty = { mode: 'hard', level: 10 }
      spawnMissionTask(g, 'ghost-satellite', 1)
    })
    renderAt()
    await user.click(screen.getByRole('button', { name: /Preparar equipo/ }))
    dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).queryByText('Equipo óptimo', { selector: '.tag' }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByText(/Oculto en la fase Difícil/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Asignar a Zara Void' }))
    expect(within(dialog).getByText('Probabilidad de éxito')).toBeInTheDocument()
    expect(within(dialog).queryByText(/^Sin (Orion|Lyra|Kai|Elias)/)).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('Falta un especialista clave').length).toBeGreaterThan(0)
  })

  it('shows the level and picks a new mode from the pause menu', async () => {
    const user = userEvent.setup()
    renderAt()
    expect(screen.getByText('Nivel 1', { selector: '.level-value' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pausa' }))
    const menu = await screen.findByRole('dialog')
    await user.click(within(menu).getByRole('tab', { name: 'Dificultad' }))
    await user.click(within(menu).getByRole('radio', { name: /Medio/ }))
    await user.click(within(menu).getByRole('button', { name: /Comenzar en modo Medio/ }))
    expect(gameStore.getState().game.difficulty).toEqual({ mode: 'medium', level: 5 })
    expect(gameStore.getState().menu).toBeNull()
    expect(gameStore.getState().speed).toBeGreaterThan(0)
  })

  it('the pause menu is the only pause: it stops the clock and resumes the previous speed', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: '4×' }))
    expect(gameStore.getState().speed).toBe(4)
    await user.click(screen.getByRole('button', { name: 'Pausa' }))
    expect(gameStore.getState().speed).toBe(0)
    const menu = await screen.findByRole('dialog')
    expect(within(menu).getByText('Eres N0VA-7')).toBeInTheDocument()
    await user.click(within(menu).getByRole('button', { name: /Reanudar/ }))
    expect(gameStore.getState().speed).toBe(4)
    await user.keyboard('{Escape}')
    expect(gameStore.getState().menu).toBe('guide')
    await user.keyboard('{Escape}')
    expect(gameStore.getState().menu).toBeNull()
  })
})

describe('side tabs', () => {
  it('switches sections in the side panel without leaving the console', async () => {
    const user = userEvent.setup()
    renderAt()
    const map = screen.getByRole('img', { name: /Plano de la nave Elysium/ })
    await user.click(screen.getByRole('tab', { name: 'Tripulación' }))
    await user.click(screen.getByRole('button', { name: 'Ver a Zara Void' }))
    expect(screen.getByText('Exploradora Veterana')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Ficha de Zara Void' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Misiones' }))
    expect(screen.getByText('El Corazón de la Tormenta')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Registro' }))
    expect(screen.getAllByText('N0VA-7 en línea').length).toBeGreaterThan(0)
    expect(map).toBeInTheDocument()
  })

  it('pressing a room on the map opens that sector in the Sectores tab', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: /^Complejo Gagarin/ }))
    expect(screen.getByRole('tab', { name: 'Sectores' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Complejo Gagarin' })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes', () => {
    renderAt('/nowhere')
    expect(screen.getByText('Registro no encontrado')).toBeInTheDocument()
  })

  it('resets the game from the pause menu', async () => {
    gameStore.getState().setSpeed(4)
    gameStore.getState().tick(10_000)
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Pausa' }))
    await user.click(await screen.findByRole('tab', { name: 'Dificultad' }))
    await user.click(screen.getByRole('button', { name: /Comenzar en modo/ }))
    expect(gameStore.getState().game.hour).toBe(8)
  })
})
