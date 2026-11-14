import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Shuffle, TriangleAlert, X } from 'lucide-react'
import { CREW, CREW_IDS, SPECIALTY_LABELS, firstName, type CrewId } from '../../domain/content/crew'
import { getEvent } from '../../domain/content/events'
import { getMission } from '../../domain/content/missions'
import { previewAssignment } from '../../domain/engine/commands'
import { fillText } from '../../domain/engine/state'
import type { Task } from '../../domain/model/game'
import { STAT_KEYS } from '../../domain/model/stats'
import { getAvailability } from '../../domain/rules/availability'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { StatMeter } from '../components/StatMeter'
import { ACTIVITY_LABELS } from '../activity'
import { describeDelta } from '../format'

interface Props {
  task: Task
  optionId: string
  onClose: () => void
}

const pct = (value: number) => `${Math.round(value * 100)}%`
const signedPct = (value: number) =>
  `${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value * 100))}%`

/**
 * Decision screen for one task option: pick the crew, read the success chance and its causes,
 * then send them — or, when a member is saturated or exhausted, "Mandar de igual forma".
 */
export function AssignDialog({ task, optionId: initialOption, onClose }: Props) {
  const game = useGame((s) => s.game)
  const assign = useGame((s) => s.assign)
  const [optionId, setOptionId] = useState(initialOption)
  const [selected, setSelected] = useState<CrewId[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const preview = previewAssignment(game, { taskId: task.id, optionId, crewIds: selected })
  const option = preview.option
  const event = task.kind === 'event' ? getEvent(task.refId) : undefined
  const eventOption = event?.options.find((o) => o.id === optionId)
  const mission = task.kind === 'mission' ? getMission(task.refId) : undefined
  const route = mission?.routes.find((r) => r.id === optionId)
  const needsCrew = option && option.maxCrew > 0
  const forced = preview.warnings.length > 0
  const specialty = eventOption?.specialty
  const blocking = preview.errors.filter((e) => !(selected.length === 0 && /al menos/.test(e)))

  const toggle = (id: CrewId) => {
    setErrors([])
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : option && current.length >= option.maxCrew
          ? option.maxCrew === 1
            ? [id]
            : current
          : [...current, id],
    )
  }

  const confirm = () => {
    const result = assign({ taskId: task.id, optionId, crewIds: selected })
    if (result.ok) onClose()
    else setErrors(result.errors)
  }

  const description = event ? fillText(event.description, task) : mission ? mission.briefing : ''

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog dialog-wide">
          <header className="assign-head">
            <div>
              <span className={`tag sev-${task.severity}`}>
                {task.kind === 'mission' ? 'Misión' : 'Tarea'}
              </span>
              <Dialog.Title className="dialog-title">{task.title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="icon-btn" aria-label="Cerrar">
                <X size={14} />
              </button>
            </Dialog.Close>
          </header>
          <Dialog.Description className="dialog-description">{description}</Dialog.Description>

          {mission && (
            <fieldset className="route-picker">
              <legend className="subhead">
                {mission.routes.length > 1 ? 'Ruta' : 'Equipo óptimo'}
              </legend>
              {mission.routes.length > 1 &&
                mission.routes.map((r) => (
                  <label key={r.id}>
                    <input
                      type="radio"
                      name="route"
                      checked={r.id === optionId}
                      onChange={() => setOptionId(r.id)}
                    />
                    {r.name} ({r.optimalCrew.map(firstName).join(', ')})
                  </label>
                ))}
              {mission.routes.length === 1 && (
                <span>{route?.optimalCrew.map((id) => CREW[id].name).join(', ')}</span>
              )}
            </fieldset>
          )}

          <div className="assign-grid">
            {needsCrew && (
              <div>
                <h3 className="subhead">
                  {option.label} ·{' '}
                  {option.minCrew === option.maxCrew
                    ? option.maxCrew
                    : `${option.minCrew}–${option.maxCrew}`}{' '}
                  tripulante(s)
                  {specialty && ` · ${SPECIALTY_LABELS[specialty]}`}
                </h3>
                <ul className="select-list">
                  {CREW_IDS.map((id) => {
                    const crew = game.crew[id]
                    if (crew.activity === 'dead') return null
                    const availability = getAvailability(crew)
                    const isSelected = selected.includes(id)
                    const recommended = route?.optimalCrew.includes(id)
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`select-row${isSelected ? ' is-selected' : ''}`}
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? 'Quitar' : 'Asignar'} a ${CREW[id].name}`}
                          disabled={!availability.available}
                          onClick={() => toggle(id)}
                        >
                          <span className="select-check" aria-hidden="true">
                            {isSelected && <Check size={14} />}
                          </span>
                          <CrewSprite crewId={id} size="sm" dimmed={!availability.available} />
                          <span className="select-info">
                            <strong>{CREW[id].name}</strong>
                            <span className="small muted">
                              {specialty
                                ? `${SPECIALTY_LABELS[specialty]} ${CREW[id].specialties[specialty]} · `
                                : ''}
                              {availability.available
                                ? ACTIVITY_LABELS[crew.activity]
                                : availability.reasons[0]}
                            </span>
                            {recommended && <span className="tag tag-info">Equipo óptimo</span>}
                          </span>
                          <span className="select-stats">
                            {STAT_KEYS.map((key) => (
                              <StatMeter key={key} stat={key} value={crew.stats[key]} compact />
                            ))}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="assign-side">
              {preview.chance && (
                <div
                  className={`chance ${preview.chance.chance >= 0.6 ? 'is-good' : preview.chance.chance >= 0.35 ? 'is-mid' : 'is-bad'}`}
                >
                  <span className="chance-label">Probabilidad de éxito</span>
                  <strong className="chance-value">
                    {needsCrew && selected.length === 0 ? '—' : pct(preview.chance.chance)}
                  </strong>
                  {(!needsCrew || selected.length > 0) && (
                    <ul className="factor-list">
                      {preview.chance.factors.map((f, i) => (
                        <li key={i} className={f.value < 0 ? 'neg' : undefined}>
                          <span>{f.label}</span>
                          <b>
                            {f.label === 'Base' || f.label === 'Equipo óptimo'
                              ? pct(f.value)
                              : signedPct(f.value)}
                          </b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {option && (
                <p className="small muted">
                  Duración: {option.durationHours} h.
                  {eventOption?.cost &&
                    ` Desgaste por participante: ${describeDelta(eventOption.cost)}.`}
                </p>
              )}
              {eventOption && (
                <div className="outcomes small">
                  <p>
                    <b className="text-good">Éxito:</b> {fillText(eventOption.success.text, task)}
                  </p>
                  <p>
                    <b className="text-critical">Fallo:</b>{' '}
                    {fillText(eventOption.failure.text, task)}
                    {eventOption.failure.retry && ' Se podrá reintentar.'}
                  </p>
                </div>
              )}

              {preview.composition && selected.length > 0 && (
                <div className="small">
                  {preview.composition.activePenalties.length > 0 ? (
                    <ul className="warning-list" aria-label="Penalizaciones por ausencia">
                      {preview.composition.activePenalties.map((rule) => (
                        <li key={rule.crewId}>
                          <TriangleAlert size={13} aria-hidden="true" />
                          <span>
                            <strong>Sin {firstName(rule.crewId)}:</strong> {rule.summary}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-good">Equipo óptimo: solo consecuencias base.</p>
                  )}
                  {preview.composition.randomEffects.map((r, i) => (
                    <p key={i} className="text-warn">
                      <Shuffle size={12} aria-hidden="true" /> Un participante al azar:{' '}
                      {describeDelta(r.delta)}.
                    </p>
                  ))}
                  <p className="muted">Si tiene éxito: {preview.composition.reward.text}</p>
                </div>
              )}

              {forced && (
                <ul className="warning-list is-critical" aria-label="Advertencias">
                  {preview.warnings.flatMap((w) =>
                    w.warnings.map((warning) => (
                      <li key={w.crewId + warning.title}>
                        <TriangleAlert size={13} aria-hidden="true" />
                        <span>
                          <strong>
                            {warning.title} ({firstName(w.crewId)})
                          </strong>{' '}
                          {warning.detail}
                        </span>
                      </li>
                    )),
                  )}
                  <li className="muted">Enviarlo de todas formas reduce su Confianza (−5).</li>
                </ul>
              )}

              {[...errors, ...blocking].length > 0 && (
                <ul className="error-list" role="alert">
                  {[...new Set([...errors, ...blocking])].map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className={`btn btn-block ${forced ? 'btn-danger' : 'btn-primary'}`}
                disabled={preview.errors.length > 0}
                onClick={confirm}
              >
                {forced ? 'Mandar de igual forma' : needsCrew ? 'Enviar ahora' : 'Ejecutar'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
