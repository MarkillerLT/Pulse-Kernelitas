import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowLeft, Shuffle, TriangleAlert, Users } from 'lucide-react'
import { CREW, firstName } from '../../domain/content/crew'
import { getMission, getRoute } from '../../domain/content/missions'
import type { LogEntry } from '../../domain/model/game'
import { useGame } from '../../store/gameStore'
import { ChangeTable } from '../components/ChangeTable'
import { CrewSprite } from '../components/CrewSprite'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { describeDelta, formatTimestamp, pad } from '../format'
import { NotFoundView } from './NotFoundView'

const LINE_DELAY_MS = 650

function sequenceLines(entry: LogEntry): string[] {
  const mission = getMission(entry.missionId)
  const lines = [`Equipo asignado: ${entry.crewIds.map(firstName).join(', ')}.`]
  lines.push(...(mission?.sequence ?? ['Misión en curso.']))
  for (const penalty of entry.penalties)
    lines.push(`⚠ Sin ${firstName(penalty.absentCrewId)}: ${penalty.summary}`)
  for (const event of entry.randomEvents)
    lines.push(`⚠ ${CREW[event.targetId].name} recibe el impacto: ${describeDelta(event.delta)}.`)
  for (const id of entry.incapacitated) lines.push(`✖ ${CREW[id].name} queda fuera de servicio.`)
  lines.push(
    entry.outcome === 'optimal'
      ? 'Misión completada sin complicaciones.'
      : 'Misión completada con complicaciones.',
  )
  return lines
}

export function MissionReportView() {
  const { entryId = '' } = useParams()
  const location = useLocation()
  const game = useGame((s) => s.game)
  const entry = game.log.find((e) => e.id === entryId)
  const animate =
    Boolean((location.state as { fresh?: boolean } | null)?.fresh) && !game.settings.reducedMotion
  const lines = entry ? sequenceLines(entry) : []
  const [shown, setShown] = useState(animate ? 1 : lines.length)
  const done = shown >= lines.length

  useEffect(() => {
    if (done) return
    const timer = window.setTimeout(() => setShown((n) => n + 1), LINE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [shown, done])

  if (!entry) return <NotFoundView what="El informe solicitado" />
  const mission = getMission(entry.missionId)
  const route = mission ? getRoute(mission, entry.routeId) : undefined

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Ruta">
        <Link to="/log">
          <ArrowLeft size={14} aria-hidden="true" /> Historial
        </Link>
      </nav>
      <PageHeader
        eyebrow={`Informe de misión · Turno ${pad(entry.turn)}`}
        title={mission?.title ?? entry.missionId}
      >
        {formatTimestamp(entry.timestamp)}
        {route && mission && mission.routes.length > 1 ? ` · ${route.name}` : ''}
      </PageHeader>

      <Panel title="Secuencia de resolución" code="SEQ" className="sequence-panel">
        <ol className="terminal" aria-live="polite">
          {lines.slice(0, shown).map((line, i) => (
            <li
              key={i}
              className={line.startsWith('⚠') || line.startsWith('✖') ? 'is-alert' : undefined}
            >
              <span className="prompt" aria-hidden="true">
                N0VA-7&gt;
              </span>{' '}
              {line}
            </li>
          ))}
          {!done && (
            <li className="is-pending" aria-hidden="true">
              <span className="prompt">N0VA-7&gt;</span> <span className="cursor">_</span>
            </li>
          )}
        </ol>
        {!done && (
          <button type="button" className="btn btn-ghost" onClick={() => setShown(lines.length)}>
            Saltar secuencia
          </button>
        )}
      </Panel>

      {done && (
        <div className="report-grid">
          <Panel
            title="Resultado"
            code={entry.outcome === 'optimal' ? 'OK' : 'WARN'}
            className="report-summary"
          >
            <p
              className={`team-verdict ${entry.outcome === 'optimal' ? 'text-good' : 'text-warn'}`}
            >
              {entry.outcome === 'optimal' ? 'Equipo óptimo' : 'Completada con penalizaciones'}
            </p>
            <div className="team-inline">
              {entry.crewIds.map((id) => (
                <span key={id} className="team-chip">
                  <CrewSprite crewId={id} size="sm" />
                  {firstName(id)}
                </span>
              ))}
            </div>
            <h3 className="subhead">Información recuperada</h3>
            <p>
              {entry.intel ??
                'No determinada: el diseño no define la información obtenida sin el equipo óptimo.'}
            </p>
            {entry.penalties.length > 0 && (
              <>
                <h3 className="subhead">Penalizaciones activadas</h3>
                <ul className="warning-list">
                  {entry.penalties.map((p) => (
                    <li key={p.absentCrewId}>
                      <TriangleAlert size={13} aria-hidden="true" />
                      <span>
                        <strong>Sin {firstName(p.absentCrewId)}:</strong> {p.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {entry.randomEvents.length > 0 && (
              <>
                <h3 className="subhead">Eventos aleatorios</h3>
                <ul className="plain-list">
                  {entry.randomEvents.map((event, i) => (
                    <li key={i}>
                      <Shuffle size={12} aria-hidden="true" /> {CREW[event.targetId].name}:{' '}
                      {describeDelta(event.delta)} (sin {firstName(event.absentCrewId)})
                    </li>
                  ))}
                </ul>
              </>
            )}
            {entry.incapacitated.length > 0 && (
              <p className="text-critical">
                Fuera de servicio: {entry.incapacitated.map((id) => CREW[id].name).join(', ')}.
              </p>
            )}
            {entry.unsupported.length > 0 && (
              <p className="small muted">No modelado aún: {entry.unsupported.join(' ')}</p>
            )}
            <div className="button-row">
              <Link to="/" className="btn btn-primary">
                Volver al puente
              </Link>
              <Link to="/crew" className="btn">
                <Users size={14} aria-hidden="true" /> Ver tripulación
              </Link>
            </div>
          </Panel>
          <Panel
            title="Consecuencias individuales"
            code={`${entry.changes.length}`}
            className="report-changes"
          >
            <ChangeTable changes={entry.changes} />
          </Panel>
        </div>
      )}
    </div>
  )
}
