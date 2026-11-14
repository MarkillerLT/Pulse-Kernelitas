import { Link } from 'react-router'
import { ChevronRight, Rocket, TriangleAlert } from 'lucide-react'
import { CREW, CREW_IDS } from '../../domain/content/crew'
import { MISSION_LIST, getMission } from '../../domain/content/missions'
import { SECTOR_LIST } from '../../domain/content/sectors'
import { STAT_KEYS } from '../../domain/model/stats'
import { deriveAlerts } from '../../domain/rules/alerts'
import { getAvailability } from '../../domain/rules/availability'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { StatMeter } from '../components/StatMeter'
import { pad } from '../format'
import { SECTOR_ICONS } from '../sectorIcons'

export function BridgeView() {
  const game = useGame((s) => s.game)
  const alerts = deriveAlerts(game)
  const completed = MISSION_LIST.filter((m) => game.missions[m.id] === 'completed').length
  const operational = CREW_IDS.filter((id) => getAvailability(game.crew[id].stats).available).length
  const nextMission = MISSION_LIST.find((m) => m.implemented && game.missions[m.id] === 'available')
  const recent = [...game.log].reverse().slice(0, 3)

  return (
    <div className="page">
      <PageHeader eyebrow="S-01 · Puente Armstrong" title="N0VA-7 en línea">
        Supervisa a la tripulación, evalúa los riesgos y asigna misiones. La tripulación es tu
        responsabilidad: cada decisión tiene consecuencias.
      </PageHeader>

      <div className="bridge-grid">
        <Panel title="Estado de la nave" code="SYS" className="area-status">
          <dl className="readouts">
            <div>
              <dt>Turno</dt>
              <dd>{pad(game.turn)}</dd>
            </div>
            <div>
              <dt>Tripulación operativa</dt>
              <dd>
                {operational}/{CREW_IDS.length}
              </dd>
            </div>
            <div>
              <dt>Misiones completadas</dt>
              <dd>
                {completed}/{MISSION_LIST.length}
              </dd>
            </div>
            <div>
              <dt>Registros en memoria</dt>
              <dd>{game.log.length}</dd>
            </div>
          </dl>
          <p className="muted small">
            Recursos de la nave: sin valores definidos en el diseño actual. El inventario se
            habilitará cuando se definan.
          </p>
        </Panel>

        <Panel title="Alertas" code={`${alerts.length}`} className="area-alerts">
          {alerts.length === 0 ? (
            <p className="muted">Sin alertas. Todos los indicadores están en rango seguro.</p>
          ) : (
            <ul className="alert-list">
              {alerts.slice(0, 6).map((alert) => (
                <li key={alert.id} className={`alert alert-${alert.severity}`}>
                  <TriangleAlert size={14} aria-hidden="true" />
                  <div>
                    {alert.crewId ? (
                      <Link to={`/crew/${alert.crewId}`}>{alert.title}</Link>
                    ) : (
                      <strong>{alert.title}</strong>
                    )}
                    <span>{alert.detail}</span>
                  </div>
                </li>
              ))}
              {alerts.length > 6 && (
                <li className="muted small">+{alerts.length - 6} alertas más en Tripulación.</li>
              )}
            </ul>
          )}
        </Panel>

        <Panel
          title="Monitores de la tripulación"
          code="5"
          className="area-crew"
          actions={
            <Link to="/crew" className="link-arrow">
              Fichas <ChevronRight size={14} />
            </Link>
          }
        >
          <ul className="crew-monitor">
            {CREW_IDS.map((id) => {
              const state = game.crew[id]
              const { available } = getAvailability(state.stats)
              return (
                <li key={id}>
                  <Link to={`/crew/${id}`} className="crew-monitor-row">
                    <CrewSprite crewId={id} size="sm" dimmed={!available} />
                    <span className="crew-monitor-name">
                      <strong>{CREW[id].name}</strong>
                      {!available && <span className="tag tag-critical">Fuera de servicio</span>}
                    </span>
                    <span className="crew-monitor-stats">
                      {STAT_KEYS.map((key) => (
                        <StatMeter key={key} stat={key} value={state.stats[key]} compact />
                      ))}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Asignación de tareas" code="OPS" className="area-mission">
          {nextMission ? (
            <div className="mission-callout">
              <span className="eyebrow">Misión {pad(nextMission.number, 2)} · disponible</span>
              <h3>{nextMission.title}</h3>
              <p>{nextMission.objective}</p>
              <ul className="risk-inline">
                {nextMission.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
              <Link to={`/missions/${nextMission.id}`} className="btn btn-primary">
                <Rocket size={14} aria-hidden="true" /> Preparar misión
              </Link>
            </div>
          ) : (
            <div className="mission-callout">
              <p>No hay misiones operativas pendientes en este prototipo.</p>
              <Link to="/missions" className="btn">
                Ver misiones
              </Link>
            </div>
          )}
        </Panel>

        <Panel
          title="Últimos eventos"
          code="LOG"
          className="area-log"
          actions={
            <Link to="/log" className="link-arrow">
              Historial <ChevronRight size={14} />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="muted">Sin registros. Las decisiones de N0VA-7 aparecerán aquí.</p>
          ) : (
            <ul className="event-list">
              {recent.map((entry) => (
                <li key={entry.id}>
                  <Link to={`/log/${entry.id}`}>
                    <span className="mono">T{pad(entry.turn)}</span>
                    <strong>{getMission(entry.missionId)?.title}</strong>
                    <span className={`tag ${entry.outcome === 'optimal' ? 'tag-ok' : 'tag-warn'}`}>
                      {entry.outcome === 'optimal' ? 'Equipo óptimo' : 'Con penalizaciones'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Sectores de la Elysium" code="8" className="area-sectors">
          <ul className="sector-mini">
            {SECTOR_LIST.map((sector) => {
              const Icon = SECTOR_ICONS[sector.id]
              return (
                <li key={sector.id}>
                  <Link to={`/sectors/${sector.id}`}>
                    <Icon size={16} aria-hidden="true" />
                    <span className="mono">{sector.code}</span>
                    <span>{sector.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
