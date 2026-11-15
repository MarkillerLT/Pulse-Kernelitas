import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { CREW, CREW_IDS, type CrewId } from '../../domain/content/crew'
import { SHIP_KEYS, SHIP_LABELS } from '../../domain/content/ship'
import type { SectorId } from '../../domain/content/sectors'
import type { Task } from '../../domain/model/game'
import { MODE_INFO, levelProgress, levelScaling, tierOf } from '../../domain/rules/difficulty'
import { useGame } from '../../store/gameStore'
import { CrewSprite } from '../components/CrewSprite'
import { Panel } from '../components/Panel'
import { formatClock } from '../activity'
import { useMediaQuery } from '../useMediaQuery'
import { AssignDialog } from './AssignDialog'
import { CrewPopover } from './CrewPopover'
import { ShipMap } from './ShipMap'
import { SidePanel } from './SidePanel'
import { TaskList } from './TaskList'
import { CrewTab } from './tabs/CrewTab'
import { LogTab } from './tabs/LogTab'
import { MissionsTab } from './tabs/MissionsTab'
import { SectorsTab } from './tabs/SectorsTab'
import type { SideTab } from './tabs/types'

/**
 * The whole game on one screen: ship systems on top, the deck with the crew walking on the left
 * and a tabbed panel on the right. Nothing here pauses the clock: only the pause menu does.
 */
export function ConsoleView() {
  const game = useGame((s) => s.game)
  const records = useGame((s) => s.records)
  const openMenu = useGame((s) => s.openMenu)
  const [selectedId, setSelectedId] = useState<CrewId | null>(null)
  const [tab, setTab] = useState<SideTab>('tasks')
  const [sector, setSector] = useState<SectorId | null>(null)
  const [choice, setChoice] = useState<{ task: Task; optionId: string } | null>(null)
  const openTasks = game.tasks.filter((t) => t.status === 'open').length
  // On narrow screens the floating card would cover the whole map: it becomes a bottom sheet.
  const narrow = useMediaQuery('(max-width: 860px)')
  const crewCard = selectedId && (
    <CrewPopover crewId={selectedId} onClose={() => setSelectedId(null)} />
  )

  const showSector = (id: SectorId) => {
    setSector(id)
    setTab('sectors')
  }

  return (
    <div className="console">
      <section className="hud" aria-label="Sistemas de la nave">
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
        <div className="map-column">
          <section className="map-panel" aria-label="Plano de la nave">
            <ShipMap
              game={game}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRoom={showSector}
              activeSector={tab === 'sectors' ? sector : null}
              popover={narrow ? null : crewCard}
              reducedMotion={game.settings.reducedMotion}
            />
            <p className="small muted map-hint">
              Pulsa a un astronauta para ver sus estadísticas y darle órdenes; pulsa un sector para
              abrirlo en el panel.
            </p>
          </section>
          <Panel
            title="Registro reciente"
            code="LOG"
            actions={
              <button type="button" className="link-arrow" onClick={() => setTab('log')}>
                Ver todo <ChevronRight size={14} />
              </button>
            }
          >
            <ol className="recent-log">
              {[...game.log]
                .reverse()
                .slice(0, 4)
                .map((entry) => (
                  <li key={entry.id} className={`log-${entry.severity}`}>
                    <span className="mono muted">{formatClock(entry.hour)}</span>
                    <strong>{entry.title}</strong>
                    <span className="muted">{entry.text}</span>
                  </li>
                ))}
            </ol>
          </Panel>
        </div>

        <SidePanel tab={tab} onTab={setTab} counts={{ tasks: openTasks }}>
          {tab === 'tasks' && (
            <TaskList game={game} onChoose={(task, optionId) => setChoice({ task, optionId })} />
          )}
          {tab === 'crew' && (
            <CrewTab game={game} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {tab === 'missions' && <MissionsTab game={game} onGoToTasks={() => setTab('tasks')} />}
          {tab === 'sectors' && (
            <SectorsTab
              game={game}
              sectorId={sector}
              onSector={setSector}
              onGoToTasks={() => setTab('tasks')}
            />
          )}
          {tab === 'log' && <LogTab log={game.log} />}
        </SidePanel>
      </div>

      {narrow && crewCard && <div className="crew-sheet">{crewCard}</div>}

      {choice && (
        <AssignDialog
          task={choice.task}
          optionId={choice.optionId}
          onClose={() => setChoice(null)}
        />
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openMenu('difficulty')}
              >
                <RotateCcw size={14} aria-hidden="true" /> Nueva partida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Level indicator: current level, phase and progress to the next one. */
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
