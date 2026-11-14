import { Link, useParams } from 'react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { CONDITIONS, CONDITION_CATEGORY_LABELS } from '../../domain/content/conditions'
import { CREW, CREW_IDS, SPECIALTY_LABELS, isCrewId } from '../../domain/content/crew'
import { getMission } from '../../domain/content/missions'
import { STAT_CONSEQUENCES, STAT_KEYS, STAT_LABELS } from '../../domain/model/stats'
import { getAvailability } from '../../domain/rules/availability'
import { getStatBounds, readStat } from '../../domain/rules/stats'
import { useGame } from '../../store/gameStore'
import { AvailabilityTag } from '../components/CrewCard'
import { CrewSprite } from '../components/CrewSprite'
import { DeltaValue } from '../components/DeltaValue'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { SpecialtyGrid } from '../components/SpecialtyGrid'
import { StatMeter } from '../components/StatMeter'
import { pad } from '../format'
import { NotFoundView } from './NotFoundView'

export function CrewProfileView() {
  const { crewId = '' } = useParams()
  const game = useGame((s) => s.game)
  if (!isCrewId(crewId)) return <NotFoundView what="El tripulante solicitado" />

  const crew = CREW[crewId]
  const state = game.crew[crewId]
  const bounds = getStatBounds(state.conditions)
  const availability = getAvailability(state.stats)
  const index = CREW_IDS.indexOf(crewId)
  const next = CREW_IDS[(index + 1) % CREW_IDS.length]
  const history = game.log.filter((entry) => entry.crewIds.includes(crewId)).reverse()

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Ruta">
        <Link to="/crew">
          <ArrowLeft size={14} aria-hidden="true" /> Tripulación
        </Link>
        <Link to={`/crew/${next}`}>
          {CREW[next].name} <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </nav>
      <PageHeader
        eyebrow={`Expediente · ${SPECIALTY_LABELS[crew.primarySpecialty]}`}
        title={crew.name}
      />

      <div className="profile-grid">
        <Panel title="Identificación" className="profile-id">
          <div className="profile-sprites">
            <CrewSprite crewId={crewId} size="lg" dimmed={!availability.available} />
            <CrewSprite crewId={crewId} size="lg" facing="back" dimmed={!availability.available} />
          </div>
          <AvailabilityTag state={state} />
          {availability.reasons.map((reason) => (
            <p key={reason} className="text-critical small">
              {reason}
            </p>
          ))}
          <h3 className="subhead">Especialidades</h3>
          <SpecialtyGrid specialties={crew.specialties} />
          <p className="muted small">
            Las especialidades no garantizan el éxito: solo evitan penalizaciones cuando el
            tripulante forma parte del equipo óptimo.
          </p>
        </Panel>

        <Panel title="Constantes" code="5" className="profile-stats">
          <ul className="stat-detail-list">
            {STAT_KEYS.map((key) => {
              const reading = readStat(key, state.stats[key])
              const deteriorated = reading.level !== 'good' && reading.level !== 'ok'
              return (
                <li key={key}>
                  <StatMeter stat={key} value={state.stats[key]} max={bounds[key].max} />
                  {(bounds[key].max < 100 || bounds[key].min > 0) && (
                    <p className="small text-warn">
                      Rango limitado por estados: {bounds[key].min}–{bounds[key].max}.
                    </p>
                  )}
                  {deteriorated && (
                    <p className="small muted">Riesgos: {STAT_CONSEQUENCES[key].join(' ')}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel
          title="Estados permanentes"
          code={`${state.conditions.length}`}
          className="profile-conditions"
        >
          {state.conditions.length === 0 ? (
            <p className="muted">Sin estados permanentes activos.</p>
          ) : (
            <ul className="condition-list">
              {state.conditions.map((id) => {
                const condition = CONDITIONS[id]
                return (
                  <li key={id}>
                    <strong>{condition.name}</strong>
                    <span className="tag">{CONDITION_CATEGORY_LABELS[condition.category]}</span>
                    <p>{condition.effect}</p>
                  </li>
                )
              })}
            </ul>
          )}
          <h3 className="subhead">Estados únicos posibles</h3>
          <ul className="condition-list is-potential">
            {crew.uniqueConditionIds.map((id) => (
              <li key={id}>
                <strong>{CONDITIONS[id].name}</strong>
                <p>{CONDITIONS[id].effect}</p>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Los estados únicos están documentados pero no se activan todavía: el diseño no define
            sus desencadenantes exactos.
          </p>
        </Panel>

        <Panel title="Historial de misiones" code={`${history.length}`} className="profile-history">
          {history.length === 0 ? (
            <p className="muted">Todavía no ha participado en misiones.</p>
          ) : (
            <ul className="event-list">
              {history.map((entry) => {
                const change = entry.changes.find((c) => c.crewId === crewId)
                return (
                  <li key={entry.id}>
                    <Link to={`/log/${entry.id}`}>
                      <span className="mono">T{pad(entry.turn)}</span>
                      <strong>{getMission(entry.missionId)?.title}</strong>
                      <span className="delta-row">
                        {change &&
                          STAT_KEYS.filter((k) => change.after[k] !== change.before[k]).map((k) => (
                            <span key={k}>
                              {STAT_LABELS[k]}{' '}
                              <DeltaValue stat={k} value={change.after[k] - change.before[k]} />
                            </span>
                          ))}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
