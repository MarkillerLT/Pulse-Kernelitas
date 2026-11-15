import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Play, Trophy, X } from 'lucide-react'
import { START_HOUR } from '../../domain/content/ship'
import {
  DIFFICULTY_MODES,
  LEVEL_HOURS,
  MODE_INFO,
  type DifficultyMode,
} from '../../domain/rules/difficulty'
import { useGame } from '../../store/gameStore'

/** Mode picker shown on first launch and whenever the player starts a new game. */
export function NewGameDialog() {
  const open = useGame((s) => s.setupOpen)
  const openSetup = useGame((s) => s.openSetup)
  const resetGame = useGame((s) => s.resetGame)
  const records = useGame((s) => s.records)
  const game = useGame((s) => s.game)
  const [mode, setMode] = useState<DifficultyMode>(game.difficulty.mode)
  const inProgress = game.status === 'active' && game.hour > START_HOUR

  return (
    <Dialog.Root open={open} onOpenChange={openSetup}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog dialog-wide">
          <header className="assign-head">
            <div>
              <span className="tag tag-info">Nueva partida</span>
              <Dialog.Title className="dialog-title">Elige la dificultad</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="icon-btn" aria-label="Cerrar">
                <X size={14} />
              </button>
            </Dialog.Close>
          </header>
          <Dialog.Description className="dialog-description">
            Sobrevive todo lo que puedas. Cada {LEVEL_HOURS} horas de juego sube el nivel: más
            consumo de energía, más emergencias y expediciones, tareas más largas y más choques con
            las horas de sueño.
          </Dialog.Description>
          <div className="mode-grid" role="radiogroup" aria-label="Dificultad">
            {DIFFICULTY_MODES.map((m) => {
              const info = MODE_INFO[m]
              const record = records[m]
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  className={`mode-card mode-${m}${mode === m ? ' is-selected' : ''}`}
                  onClick={() => setMode(m)}
                >
                  <span className="eyebrow">
                    {info.tierLabel} · nivel {info.startLevel}
                    {m === 'hard'
                      ? '+'
                      : `–${MODE_INFO[m === 'easy' ? 'medium' : 'hard'].startLevel - 1}`}
                  </span>
                  <strong>{info.label}</strong>
                  <span className="small">{info.summary}</span>
                  <span className="small muted mode-record">
                    <Trophy size={12} aria-hidden="true" />{' '}
                    {record ? `Récord: nivel ${record.level}, día ${record.day}` : 'Sin récord'}
                  </span>
                </button>
              )
            })}
          </div>
          {inProgress && <p className="small text-warn">Se borrará la partida actual.</p>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => resetGame(mode)}
          >
            <Play size={14} aria-hidden="true" /> Comenzar en modo {MODE_INFO[mode].label}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
