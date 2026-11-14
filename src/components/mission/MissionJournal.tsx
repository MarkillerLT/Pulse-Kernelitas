import type { Astronaut, MissionEvent } from '../../simulation/models/mission'
import { severityLabels, translateMessage } from '../../lib/localization'
import { getCrewSprite } from '../../game/sprites/spriteDefinitions'
import { Portrait } from '../crew/CrewList'

export function MissionJournal({ events, crew }: { events: MissionEvent[]; crew: Astronaut[] }) {
  return (
    <div className="journal">
      {[...events].reverse().map((event) => {
        const affectedCrew = [...new Set(event.astronautIds ?? [])]
          .map((id) => crew.find((astronaut) => astronaut.id === id))
          .filter(
            (astronaut): astronaut is Astronaut => !!astronaut && !!getCrewSprite(astronaut.id),
          )
        return (
          <article key={event.id} className={`journal-entry ${event.severity}`}>
            <span className="eyebrow">
              DÍA {event.day} / {severityLabels[event.severity]}
            </span>
            <div
              className={
                affectedCrew.length
                  ? 'journal-entry-content has-astronauts'
                  : 'journal-entry-content'
              }
            >
              {affectedCrew.length > 0 && (
                <div className="journal-astronauts">
                  {affectedCrew.map((astronaut) => (
                    <figure
                      key={astronaut.id}
                      className="journal-astronaut"
                      aria-label={astronaut.name}
                    >
                      <Portrait astronautId={astronaut.id} />
                      <figcaption>{astronaut.name}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="journal-entry-text">
                <h3>{translateMessage(event.title)}</h3>
                <p>{translateMessage(event.description)}</p>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
