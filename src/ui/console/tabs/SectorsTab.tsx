import { ArrowLeft } from 'lucide-react'
import { CREW, CREW_IDS } from '../../../domain/content/crew'
import { MISSION_LIST } from '../../../domain/content/missions'
import { SECTORS, SECTOR_LIST, type SectorId } from '../../../domain/content/sectors'
import type { GameState } from '../../../domain/model/game'
import type { StatKey } from '../../../domain/model/stats'
import { CrewSprite } from '../../components/CrewSprite'
import { StatMeter } from '../../components/StatMeter'
import { pad } from '../../format'
import { SECTOR_ICONS } from '../../sectorIcons'

/** Crew statistics each sector monitors, where the design links them (medical, habitat). */
const MONITORED: Partial<Record<SectorId, { title: string; stats: StatKey[] }>> = {
  ride: { title: 'Expedientes médicos', stats: ['health', 'sleep'] },
  habitat: { title: 'Convivencia', stats: ['morale', 'stress', 'trust'] },
}

/** Sector list; a sector picked here or on the map shows its detail in place. */
export function SectorsTab({
  game,
  sectorId,
  onSector,
  onGoToTasks,
}: {
  game: GameState
  sectorId: SectorId | null
  onSector: (id: SectorId | null) => void
  onGoToTasks: () => void
}) {
  if (!sectorId)
    return (
      <ul className="sector-list">
        {SECTOR_LIST.map((sector) => {
          const Icon = SECTOR_ICONS[sector.id]
          const open = game.tasks.filter(
            (t) => t.sectorId === sector.id && t.status === 'open',
          ).length
          return (
            <li key={sector.id}>
              <button type="button" className="sector-row" onClick={() => onSector(sector.id)}>
                <Icon size={16} aria-hidden="true" />
                <span>
                  <strong>{sector.name}</strong>
                  <span className="small muted">{sector.domain}</span>
                </span>
                {open > 0 && <span className="tag tag-warn">{open} pendiente(s)</span>}
              </button>
            </li>
          )
        })}
      </ul>
    )

  const sector = SECTORS[sectorId]
  const Icon = SECTOR_ICONS[sectorId]
  const tasks = game.tasks.filter((t) => t.sectorId === sectorId)
  const missions = MISSION_LIST.filter((m) => m.sectorId === sectorId)
  const monitored = MONITORED[sectorId]
  return (
    <div className="sector-detail">
      <button type="button" className="link-arrow" onClick={() => onSector(null)}>
        <ArrowLeft size={14} aria-hidden="true" /> Todos los sectores
      </button>
      <div className="sector-title">
        <Icon size={18} aria-hidden="true" />
        <div>
          <span className="eyebrow">
            {sector.code} · {sector.domain}
          </span>
          <h3>{sector.name}</h3>
        </div>
      </div>
      <p className="small">{sector.summary}</p>

      <h4 className="subhead">Tareas en este sector</h4>
      {tasks.length === 0 ? (
        <p className="small muted">Sin incidencias.</p>
      ) : (
        <ul className="plain-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <button type="button" className="link-arrow" onClick={onGoToTasks}>
                {t.status === 'active' ? 'En curso' : 'Pendiente'} · {t.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      {monitored && (
        <>
          <h4 className="subhead">{monitored.title}</h4>
          <ul className="crew-monitor">
            {CREW_IDS.map((id) => (
              <li key={id} className="crew-monitor-row">
                <CrewSprite crewId={id} size="sm" />
                <span className="crew-monitor-name">
                  <strong>{CREW[id].name}</strong>
                </span>
                <span className="crew-monitor-stats">
                  {monitored.stats.map((key) => (
                    <StatMeter key={key} stat={key} value={game.crew[id].stats[key]} compact />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className="subhead">Equipamiento</h4>
      <ul className="equipment">
        {sector.contents.map((item, i) => (
          <li key={item}>
            <span className="mono muted">{pad(i + 1, 2)}</span> {item}
          </li>
        ))}
      </ul>

      {missions.length > 0 && (
        <>
          <h4 className="subhead">Misiones asociadas</h4>
          <ul className="plain-list small">
            {missions.map((m) => (
              <li key={m.id}>
                {pad(m.number, 2)} · {m.title}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
