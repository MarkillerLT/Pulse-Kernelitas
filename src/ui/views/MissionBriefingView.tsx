import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, FileText, Rocket, Shuffle, TriangleAlert } from 'lucide-react'
import { CREW, CREW_IDS, SPECIALTY_LABELS, firstName, type CrewId } from '../../domain/content/crew'
import { MAX_TEAM_SIZE, getMission, type MissionEffect } from '../../domain/content/missions'
import { SECTORS } from '../../domain/content/sectors'
import { analyzeTeam } from '../../domain/engine/analyzeTeam'
import { STAT_KEYS, STAT_LABELS, sumDeltas } from '../../domain/model/stats'
import { getAvailability } from '../../domain/rules/availability'
import { useGame } from '../../store/gameStore'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CrewSprite } from '../components/CrewSprite'
import { DeltaValue } from '../components/DeltaValue'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { StatMeter } from '../components/StatMeter'
import { describeDelta, pad } from '../format'
import { NotFoundView } from './NotFoundView'

function describeEffect(effect: MissionEffect): string {
  if (effect.kind === 'unsupported') return `${effect.text} (aún no modelado)`
  if (effect.kind === 'random-participant')
    return `Un participante al azar: ${describeDelta(effect.delta)}`
  const who = effect.scope === 'crew' ? 'Toda la tripulación' : 'Cada participante'
  return `${who}: ${describeDelta(effect.delta)}`
}

export function MissionBriefingView() {
  const { missionId = '' } = useParams()
  const mission = getMission(missionId)
  const game = useGame((s) => s.game)
  const launchMission = useGame((s) => s.launchMission)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<CrewId[]>([])
  const [routeId, setRouteId] = useState(mission?.routes[0]?.id)
  const [launchErrors, setLaunchErrors] = useState<string[]>([])

  if (!mission) return <NotFoundView what="La misión solicitada" />

  const status = game.missions[mission.id]
  const route = mission.routes.find((r) => r.id === routeId) ?? mission.routes[0]
  const operable = mission.implemented && status === 'available'
  const analysis = analyzeTeam(game, {
    missionId: mission.id,
    routeId: route.id,
    crewIds: selected,
  })
  const report = game.log.findLast((entry) => entry.missionId === mission.id)
  const full = selected.length >= MAX_TEAM_SIZE

  const toggle = (id: CrewId) => {
    setLaunchErrors([])
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= MAX_TEAM_SIZE
          ? current
          : [...current, id],
    )
  }

  const launch = () => {
    const result = launchMission({ missionId: mission.id, routeId: route.id, crewIds: selected })
    if (result.ok) navigate(`/log/${result.entry.id}`, { state: { fresh: true } })
    else setLaunchErrors(result.errors)
  }

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Ruta">
        <Link to="/missions">
          <ArrowLeft size={14} aria-hidden="true" /> Misiones
        </Link>
      </nav>
      <PageHeader
        eyebrow={`Misión ${pad(mission.number, 2)} · ${SECTORS[mission.sectorId].name}`}
        title={mission.title}
      >
        {mission.objective ?? 'Objetivo pendiente de definición en el documento de diseño.'}
      </PageHeader>

      {status === 'completed' && (
        <div className="notice notice-info">
          <span>Misión completada. Las consecuencias ya se aplicaron a la tripulación.</span>
          {report && (
            <Link to={`/log/${report.id}`} className="btn btn-ghost">
              <FileText size={14} aria-hidden="true" /> Ver informe
            </Link>
          )}
        </div>
      )}
      {!mission.implemented && (
        <div className="notice notice-warning">
          <span>
            Misión en diseño: sus datos están documentados, pero aún no puede lanzarse en este
            prototipo.
          </span>
        </div>
      )}

      <div className="briefing-grid">
        <Panel title="Informe de N0VA-7" code="BRF" className="area-brief">
          {mission.briefing && <p className="briefing-text">{mission.briefing}</p>}
          <h3 className="subhead">Riesgos</h3>
          <ul className="risk-list">
            {mission.risks.map((risk) => (
              <li key={risk}>
                <TriangleAlert size={13} aria-hidden="true" /> {risk}
              </li>
            ))}
          </ul>

          {mission.routes.length > 1 && (
            <fieldset className="route-picker">
              <legend className="subhead">Ruta</legend>
              {mission.routes.map((r) => (
                <label key={r.id}>
                  <input
                    type="radio"
                    name="route"
                    value={r.id}
                    checked={r.id === route.id}
                    onChange={() => setRouteId(r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </fieldset>
          )}

          <h3 className="subhead">Equipo óptimo</h3>
          <ul className="optimal-list">
            {route.optimalCrew.map((id) => {
              const base = route.baseEffects[id]
              return (
                <li key={id}>
                  <CrewSprite crewId={id} size="sm" />
                  <div>
                    <strong>{CREW[id].name}</strong>
                    <span className="small muted">
                      {base ? describeDelta(base) : 'Sin consecuencia individual definida'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          {route.teamEffects.length > 0 && (
            <>
              <h3 className="subhead">Efectos de la misión</h3>
              <ul className="plain-list small">
                {route.teamEffects.map((effect, i) => (
                  <li key={i}>{describeEffect(effect)}</li>
                ))}
              </ul>
            </>
          )}
          <p className="small">
            <strong>Resultado con el equipo óptimo:</strong> {route.optimalReward}
          </p>

          <h3 className="subhead">Penalizaciones por ausencia</h3>
          <ul className="absence-list">
            {route.absenceRules.map((rule) => (
              <li key={rule.crewId}>
                <strong>Sin {firstName(rule.crewId)}</strong>
                <span>{rule.summary}</span>
                <ul className="plain-list small muted">
                  {rule.effects.map((effect, i) => (
                    <li key={i}>{describeEffect(effect)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {mission.designNotes && (
            <details className="design-notes">
              <summary>Notas de diseño</summary>
              <ul className="plain-list small">
                {mission.designNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </details>
          )}
        </Panel>

        <Panel
          title="Selección de tripulantes"
          code={`${selected.length}/${MAX_TEAM_SIZE}`}
          className="area-select"
        >
          <p className="small muted" id="selection-help">
            Selecciona entre 1 y {MAX_TEAM_SIZE} tripulantes. No se puede asignar a tripulantes
            fuera de servicio.
          </p>
          <ul className="select-list" aria-describedby="selection-help">
            {CREW_IDS.map((id) => {
              const state = game.crew[id]
              const availability = getAvailability(state.stats)
              const isSelected = selected.includes(id)
              const recommended = route.optimalCrew.includes(id)
              const disabled = !operable || !availability.available || (!isSelected && full)
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`select-row${isSelected ? ' is-selected' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Quitar' : 'Asignar'} a ${CREW[id].name}`}
                    disabled={disabled}
                    onClick={() => toggle(id)}
                  >
                    <span className="select-check" aria-hidden="true">
                      {isSelected && <Check size={14} />}
                    </span>
                    <CrewSprite crewId={id} size="sm" dimmed={!availability.available} />
                    <span className="select-info">
                      <strong>{CREW[id].name}</strong>
                      <span className="small muted">
                        {SPECIALTY_LABELS[CREW[id].primarySpecialty]} · Lid{' '}
                        {CREW[id].specialties.leadership} · Téc {CREW[id].specialties.technical} ·
                        Med {CREW[id].specialties.medicine} · Exp {CREW[id].specialties.exploration}{' '}
                        · Agr {CREW[id].specialties.agriculture}
                      </span>
                      {recommended && <span className="tag tag-info">Recomendado</span>}
                      {!availability.available && (
                        <span className="tag tag-critical">{availability.reasons[0]}</span>
                      )}
                    </span>
                    <span className="select-stats">
                      {STAT_KEYS.map((key) => (
                        <StatMeter key={key} stat={key} value={state.stats[key]} compact />
                      ))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Composición del equipo" code="EVAL" className="area-team">
          <ol className="slots">
            {Array.from({ length: MAX_TEAM_SIZE }, (_, i) => {
              const id = selected[i]
              return (
                <li key={i} className={id ? 'is-filled' : undefined}>
                  {id ? (
                    <>
                      <CrewSprite crewId={id} size="sm" facing="back" />
                      <span>{firstName(id)}</span>
                    </>
                  ) : (
                    <span className="muted">Vacante</span>
                  )}
                </li>
              )
            })}
          </ol>

          {selected.length > 0 && (
            <p className={`team-verdict ${analysis.isOptimal ? 'text-good' : 'text-warn'}`}>
              {analysis.isOptimal
                ? 'Equipo óptimo. Solo se aplican las consecuencias base.'
                : `Composición con penalizaciones: faltan ${analysis.absentOptimal.map(firstName).join(', ')}.`}
            </p>
          )}

          {selected.length > 0 && analysis.activePenalties.length > 0 && (
            <ul className="warning-list" aria-label="Advertencias por integrantes ausentes">
              {analysis.activePenalties.map((rule) => (
                <li key={rule.crewId}>
                  <TriangleAlert size={13} aria-hidden="true" />
                  <span>
                    <strong>Sin {firstName(rule.crewId)}:</strong> {rule.summary}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {analysis.extraParticipants.length > 0 && (
            <p className="small muted">
              {analysis.extraParticipants.map(firstName).join(', ')}: fuera del equipo óptimo, sin
              consecuencia base definida; recibe solo las penalizaciones del equipo.
            </p>
          )}

          {selected.length > 0 && (
            <>
              <h3 className="subhead">Consecuencias previstas</h3>
              <table className="projection">
                <thead>
                  <tr>
                    <th scope="col">Tripulante</th>
                    {STAT_KEYS.map((key) => (
                      <th key={key} scope="col">
                        {STAT_LABELS[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CREW_IDS.filter((id) => analysis.sources[id]).map((id) => {
                    const total = sumDeltas(...analysis.sources[id]!.map((s) => s.delta))
                    return (
                      <tr key={id}>
                        <th scope="row">{firstName(id)}</th>
                        {STAT_KEYS.map((key) => (
                          <td key={key}>
                            {total[key] ? <DeltaValue stat={key} value={total[key]} /> : '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {analysis.randomEffects.map((effect) => (
                <p key={effect.absentCrewId} className="small text-warn">
                  <Shuffle size={12} aria-hidden="true" /> Además, un participante al azar (
                  {effect.candidates.map(firstName).join(', ')}) recibirá{' '}
                  {describeDelta(effect.delta)}.
                </p>
              ))}
              {analysis.unsupported.map((text) => (
                <p key={text} className="small muted">
                  {text} (efecto aún no modelado)
                </p>
              ))}
              <p className="small muted">Los valores se limitan siempre al rango 0–100.</p>
            </>
          )}

          {analysis.warnings.length > 0 && (
            <ul className="warning-list is-critical" aria-label="Advertencias sobre la tripulación">
              {analysis.warnings.map((warning, i) => (
                <li key={i}>
                  <TriangleAlert size={13} aria-hidden="true" />
                  <span>
                    <strong>{firstName(warning.crewId)}:</strong> {warning.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {launchErrors.length > 0 && (
            <ul className="error-list" role="alert">
              {launchErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={!operable || analysis.errors.length > 0}
              >
                <Rocket size={14} aria-hidden="true" /> Lanzar misión
              </button>
            }
            title={`¿Lanzar «${mission.title}»?`}
            description={`Equipo: ${selected.map((id) => CREW[id].name).join(', ')}. Las consecuencias se aplicarán de inmediato y no se pueden deshacer.`}
            confirmLabel="Confirmar lanzamiento"
            onConfirm={launch}
          >
            {!analysis.isOptimal && (
              <p className="small text-warn">
                El equipo no es óptimo: se aplicarán {analysis.activePenalties.length}{' '}
                {analysis.activePenalties.length === 1 ? 'penalización' : 'penalizaciones'}.
              </p>
            )}
          </ConfirmDialog>
          {operable && analysis.errors.length > 0 && selected.length === 0 && (
            <p className="small muted">Selecciona al menos un tripulante para lanzar la misión.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
