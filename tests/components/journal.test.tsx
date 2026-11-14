import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MissionJournal } from '../../src/components/mission/MissionJournal'
import { createMission } from '../../src/simulation/engine/createMission'
import type { MissionEvent } from '../../src/simulation/models/mission'
import { getCrewSprite } from '../../src/game/sprites/spriteDefinitions'

const crew = createMission().crew
const warning: MissionEvent = {
  id: 'warning',
  day: 1,
  severity: 'warning',
  title: 'A quiet warning',
  description: 'Warning without any astronaut name.',
}

describe('mission journal astronaut sprites', () => {
  it('shows Okafor for the original briefing', () => {
    const mission = createMission()
    render(<MissionJournal events={mission.events} crew={mission.crew} />)
    expect(screen.getByRole('figure', { name: 'Idris Okafor' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Una advertencia silenciosa' })).toBeInTheDocument()
  })
  it.each(crew)(
    'uses the correct existing sheet for $name independent of crew order',
    (astronaut) => {
      render(
        <MissionJournal
          events={[{ ...warning, astronautIds: [astronaut.id] }]}
          crew={[...crew].reverse()}
        />,
      )
      const figure = screen.getByRole('figure', { name: astronaut.name })
      const portrait = figure.querySelector<HTMLElement>('.portrait')!
      expect(portrait.style.getPropertyValue('--sprite-url')).toBe(
        `url(${getCrewSprite(astronaut.id)!.url})`,
      )
      expect(portrait.style.getPropertyValue('--sprite-frame')).toBe('0')
      expect(portrait.style.getPropertyValue('--sprite-frame-width')).toBe('16px')
      expect(portrait.style.getPropertyValue('--sprite-frame-height')).toBe('24px')
    },
  )
  it('renders multiple affected astronauts once each', () => {
    render(
      <MissionJournal
        events={[{ ...warning, astronautIds: ['park', 'okafor', 'park'] }]}
        crew={crew}
      />,
    )
    expect(screen.getAllByRole('figure')).toHaveLength(2)
    expect(screen.getByRole('figure', { name: 'Mina Park' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Idris Okafor' })).toBeInTheDocument()
  })
  it('preserves general and legacy warnings without guessing from the description', () => {
    render(
      <MissionJournal
        events={[{ ...warning, description: 'Okafor has no event reference.' }]}
        crew={crew}
      />,
    )
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(document.querySelector('.has-astronauts')).not.toBeInTheDocument()
    expect(screen.getByText('Okafor has no event reference.')).toBeInTheDocument()
  })
  it('gracefully omits unknown references and keeps all event text', () => {
    render(<MissionJournal events={[{ ...warning, astronautIds: ['missing'] }]} crew={crew} />)
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(screen.getByText(warning.description)).toBeInTheDocument()
  })
  it('preserves reverse chronological order and matches each event separately', () => {
    render(
      <MissionJournal
        events={[
          { ...warning, astronautIds: ['okafor'] },
          { ...warning, id: 'new', day: 2, title: 'New warning', astronautIds: ['vasquez'] },
        ]}
        crew={crew}
      />,
    )
    const articles = screen.getAllByRole('article')
    expect(within(articles[0]).getByRole('figure', { name: 'Elena Vasquez' })).toBeInTheDocument()
    expect(within(articles[1]).getByRole('figure', { name: 'Idris Okafor' })).toBeInTheDocument()
  })
})
