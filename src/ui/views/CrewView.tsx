import { CREW_IDS } from '../../domain/content/crew'
import { STAT_KEYS, STAT_DESCRIPTIONS, STAT_LABELS } from '../../domain/model/stats'
import { useGame } from '../../store/gameStore'
import { CrewCard } from '../components/CrewCard'
import { PageHeader } from '../components/PageHeader'

export function CrewView() {
  const crew = useGame((s) => s.game.crew)
  return (
    <div className="page">
      <PageHeader eyebrow="Monitores de la tripulación" title="Tripulación">
        Cinco vidas bajo la supervisión de N0VA-7. Selecciona un tripulante para abrir su ficha.
      </PageHeader>
      <div className="crew-grid">
        {CREW_IDS.map((id) => (
          <CrewCard key={id} crewId={id} state={crew[id]} />
        ))}
      </div>
      <dl className="legend">
        {STAT_KEYS.map((key) => (
          <div key={key}>
            <dt>{STAT_LABELS[key]}</dt>
            <dd>{STAT_DESCRIPTIONS[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
