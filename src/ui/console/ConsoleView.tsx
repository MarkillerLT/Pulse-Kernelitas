import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { CREW, CREW_IDS, SPECIALTY_LABELS, type CrewId } from '../../domain/content/crew'
import { SHIP_KEYS, SHIP_LABELS } from '../../domain/content/ship'
import { DIRECT_ORDERS, type DirectOrder } from '../../domain/engine/commands'
import type { Task } from '../../domain/model/game'
import { STAT_KEYS } from '../../domain/model/stats'
import { getWorkWarnings } from '../../domain/rules/availability'
import { MODE_INFO, levelProgress, levelScaling, tierOf } from '../../domain/rules/difficulty'
import { gameStore, useGame, type Speed } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { Panel } from '../components/Panel'
import { StatMeter } from '../components/StatMeter'
import { ACTIVITY_LABELS, formatClock, formatDayProgress } from '../activity'
import { AssignDialog } from './AssignDialog'
import { ShipMap } from './ShipMap'
import { TaskList } from './TaskList'

const SPEEDS: Speed[] = [1, 2, 4]

export function ConsoleView() {
  const game = useGame((s) => s.game)
  const speed = useGame((s) => s.speed)
  const setSpeed = useGame((s) => s.setSpeed)
  const openSetup = useGame((s) => s.openSetup)
  const records = useGame((s) => s.records)
  const [selectedId, setSelectedId] = useState<CrewId | null>(null)
  const [choice, setChoice] = useState<{ task: Task; optionId: string } | null>(null)
  const resumeSpeed = useRef<Speed>(0)
  const openTasks = game.tasks.filter((t) => t.status === 'open').length

  // Deciding pauses the clock; closing the dialog restores the previous speed.
  const choose = (task: Task, optionId: string) => {
    resumeSpeed.current = speed
    setSpeed(0)
    setChoice({ task, optionId })
  }
  const closeChoice = () => {
    setChoice(null)
    setSpeed(resumeSpeed.current)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.code !== 'Space' || choice || /INPUT|TEXTAREA|BUTTON|SELECT/.test(target.tagName))
        return
      e.preventDefault()
      const { speed: current, setSpeed: set } = gameStore.getState()
      set(current === 0 ? 1 : 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choice])

  return (
    <div className="console">
      <section className="hud" aria-label="Reloj y sistemas">
        <div className="clock">
          <span className="eyebrow">{formatDayProgress(game.hour)}</span>
          <strong className="clock-time">{formatClock(game.hour)}</strong>
          <div className="speed" role="group" aria-label="Velocidad del tiempo">
            <button
              type="button"
              className={`btn btn-sm${speed === 0 ? ' is-on' : ''}`}
              aria-pressed={speed === 0}
              onClick={() => setSpeed(0)}
              disabled={game.status !== 'active'}
            >
              <Pause size={12} aria-hidden="true" /> Pausa
            </button>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm${speed === s ? ' is-on' : ''}`}
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
                disabled={game.status !== 'active'}
              >
                {s === 1 && <Play size={12} aria-hidden="true" />} {s}×
              </button>
            ))}
          </div>
          <span className="small muted">
            {speed === 0 ? 'Tiempo detenido. Espacio para reanudar.' : 'El tiempo corre.'}
          </span>
        </div>
        <LevelMeter level={game.difficulty.level} hour={game.hour} mode={game.difficulty.mode} />
        <dl className="systems">
          {SHIP_KEYS.map((key) => {
            const value = Math.round(game.ship[key])
            const level =
              value <= 10 ? 'critical' : value <= 25 ? 'warn' : value <= 50 ? 'ok' : 'good'
            return (
              <div key={key} className={`system level-${level}`}>
                <dt>{SHIP_LABELS[key]}</dt>
                <dd>
                  <span className="system-bar" aria-hidden="true">
                    <i style={{ width: `${value}%` }} />
                  </span>
                  <span className="system-value">{value}%</span>
                </dd>
              </div>
            )
          })}
        </dl>
      </section>

      <div className="console-main">
        <section className="map-panel" aria-label="Plano de la nave">
          <ShipMap
            game={game}
            selectedId={selectedId}
            onSelect={setSelectedId}
            reducedMotion={game.settings.reducedMotion}
          />
          <p className="small muted map-hint">
            Los tripulantes se mueven solos según su actividad. Pulsa uno para ver sus estadísticas
            y darle órdenes.
          </p>
        </section>
        <Panel title="Tareas de N0VA-7" code={`${openTasks}`} className="task-panel">
          <TaskList game={game} onChoose={choose} />
        </Panel>
      </div>

      <CrewBoard selectedId={selectedId} onSelect={setSelectedId} />

      <Panel
        title="Registro reciente"
        code="LOG"
        actions={
          <Link to="/log" className="link-arrow">
            Historial <ChevronRight size={14} />
          </Link>
        }
      >
        <ol className="recent-log">
          {[...game.log]
            .reverse()
            .slice(0, 6)
            .map((entry) => (
              <li key={entry.id} className={`log-${entry.severity}`}>
                <span className="mono muted">{formatClock(entry.hour)}</span>
                <strong>{entry.title}</strong>
                <span className="muted">{entry.text}</span>
              </li>
            ))}
        </ol>
      </Panel>

      {choice && (
        <AssignDialog task={choice.task} optionId={choice.optionId} onClose={closeChoice} />
      )}

      {game.status !== 'active' && (
        <div className="end-overlay" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className="end-card">
            <span className="eyebrow">
              Fin del viaje · modo {MODE_INFO[game.difficulty.mode].label}
            </span>
            <h2 id="end-title">
              Nivel {game.difficulty.level} · Día {Math.floor(game.hour / 24) + 1}
            </h2>
            <p>{game.endReason}</p>
            {records[game.difficulty.mode] && (
              <p className="small muted">
                Récord en {MODE_INFO[game.difficulty.mode].label}: nivel{' '}
                {records[game.difficulty.mode]!.level}, día {records[game.difficulty.mode]!.day}.
              </p>
            )}
            <ul className="end-crew">
              {CREW_IDS.map((id) => (
                <li key={id}>
                  <CrewSprite crewId={id} size="sm" dimmed={game.crew[id].activity === 'dead'} />
                  <span>{CREW[id].name}</span>
                  <span
                    className={game.crew[id].activity === 'dead' ? 'text-critical' : 'text-good'}
                  >
                    {game.crew[id].activity === 'dead' ? 'Fallecido' : 'Con vida'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="button-row">
              <button type="button" className="btn btn-primary" onClick={() => openSetup(true)}>
                <RotateCcw size={14} aria-hidden="true" /> Nueva partida
              </button>
              <Link to="/log" className="btn">
                Ver historial
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CrewBoard({
  selectedId,
  onSelect,
}: {
  selectedId: CrewId | null
  onSelect: (id: CrewId | null) => void
}) {
  const game = useGame((s) => s.game)
  const order = useGame((s) => s.order)
  const [error, setError] = useState<string | null>(null)
  const give = (id: CrewId, o: DirectOrder) => {
    const result = order(id, o)
    setError(result.ok ? null : result.errors.join(' '))
  }
  return (
    <section className="crew-board" aria-label="Tripulación">
      {CREW_IDS.map((id) => {
        const crew = game.crew[id]
        const dead = crew.activity === 'dead'
        const selected = selectedId === id
        const warnings = dead || !selected ? [] : getWorkWarnings(crew)
        const busy = crew.activity === 'task' || crew.activity === 'mission'
        return (
          <article
            key={id}
            className={`crew-tile${selected ? ' is-selected' : ''}${dead ? ' is-dead' : ''}`}
          >
            <button
              type="button"
              className="crew-tile-head"
              onClick={() => onSelect(selected ? null : id)}
              aria-pressed={selected}
              aria-label={`Seleccionar a ${CREW[id].name}`}
            >
              <CrewSprite crewId={id} size="md" dimmed={dead} />
              <span>
                <strong>{CREW[id].name}</strong>
                <span className="small muted">{SPECIALTY_LABELS[CREW[id].primarySpecialty]}</span>
                <span className={`tag act-${crew.activity}`}>{ACTIVITY_LABELS[crew.activity]}</span>
              </span>
            </button>
            {selected && !dead && (
              <div className="crew-tile-stats">
                {STAT_KEYS.map((key) => (
                  <StatMeter key={key} stat={key} value={crew.stats[key]} compact />
                ))}
              </div>
            )}
            {warnings.map((w) => (
              <p key={w.title} className="small text-warn">
                {w.title}
              </p>
            ))}
            {selected && !dead && (
              <div className="crew-orders">
                {(['rest', 'leisure', 'medical', 'duty'] as DirectOrder[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="btn btn-sm"
                    title={DIRECT_ORDERS[o].detail}
                    disabled={busy || crew.activity === o}
                    onClick={() => give(id, o)}
                  >
                    {DIRECT_ORDERS[o].label}
                  </button>
                ))}
                <Link to={`/crew/${id}`} className="link-arrow small">
                  Ficha <ChevronRight size={12} />
                </Link>
                {busy && (
                  <p className="small muted">
                    Ocupado: no puede recibir otra orden hasta terminar.
                  </p>
                )}
                {error && (
                  <p className="small text-critical" role="alert">
                    {error}
                  </p>
                )}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}

/** Tetris-style level indicator: current level, phase and progress to the next one. */
function LevelMeter({
  level,
  hour,
  mode,
}: {
  level: number
  hour: number
  mode: 'easy' | 'medium' | 'hard'
}) {
  const tier = tierOf(level)
  const scaling = levelScaling(level)
  const progress = Math.round(levelProgress(hour) * 100)
  return (
    <div className={`level-meter tier-${tier}`} aria-label={`Nivel ${level}`}>
      <span className="eyebrow">
        Modo {MODE_INFO[mode].label} · fase {MODE_INFO[tier].label}
      </span>
      <strong className="level-value">Nivel {level}</strong>
      <span className="system-bar" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </span>
      <span className="small muted">
        Energía ×{scaling.power.toFixed(2)} · tareas +{Math.round((scaling.duration - 1) * 100)}%
        {scaling.missionInterval ? ` · expediciones ~${scaling.missionInterval} h` : ''}
      </span>
    </div>
  )
}
