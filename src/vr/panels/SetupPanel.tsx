import { useState } from 'react'
import { START_HOUR } from '../../domain/content/ship'
import { DIFFICULTY_MODES, MODE_INFO, type DifficultyMode } from '../../domain/rules/difficulty'
import { useGame } from '../../store/gameStore'
import { C } from '../colors'
import { Button, Label, Panel } from '../kit'

const W = 0.9
const PAD = 0.035
const INNER = W - PAD * 2

/** Difficulty picker, shown on first launch or when the player asks for a new game. */
export function SetupPanel({ position }: { position: [number, number, number] }) {
  const game = useGame((s) => s.game)
  const records = useGame((s) => s.records)
  const resetGame = useGame((s) => s.resetGame)
  const openSetup = useGame((s) => s.openSetup)
  const [mode, setMode] = useState<DifficultyMode>(game.difficulty.mode)
  const inProgress = game.status === 'active' && game.hour > START_HOUR
  const height = 0.56

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]}>
      <Panel width={W} height={height} opacity={0.97}>
        <Label position={[PAD, -0.035, 0]} size={0.034} bold>
          Elige la dificultad
        </Label>
        <Button
          label="X"
          width={0.05}
          height={0.05}
          position={[W - PAD - 0.05, -0.025, 0]}
          onClick={() => openSetup(false)}
        />
        <Label position={[PAD, -0.085, 0]} size={0.018} color={C.muted} maxWidth={INNER}>
          Sobrevive todo lo que puedas. El nivel sube con el tiempo: más emergencias, tareas más
          largas y menos sueño.
        </Label>
        {DIFFICULTY_MODES.map((m, i) => {
          const info = MODE_INFO[m]
          const record = records[m]
          const y = -0.15 - i * 0.105
          return (
            <group key={m}>
              <Button
                label={`${info.label} · nivel ${info.startLevel}`}
                active={mode === m}
                width={0.24}
                height={0.09}
                size={0.02}
                position={[PAD, y, 0]}
                onClick={() => setMode(m)}
              />
              <Label position={[PAD + 0.26, y - 0.008, 0]} size={0.016} maxWidth={INNER - 0.26}>
                {info.summary}
              </Label>
              <Label position={[PAD + 0.26, y - 0.062, 0]} size={0.015} color={C.muted}>
                {record ? `Récord: nivel ${record.level}, día ${record.day}` : 'Sin récord'}
              </Label>
            </group>
          )
        })}
        {inProgress && (
          <Label position={[PAD, -0.47, 0]} size={0.016} color={C.warn}>
            Se borrará la partida actual.
          </Label>
        )}
        <Button
          label={`Comenzar en modo ${MODE_INFO[mode].label}`}
          tone="primary"
          width={0.4}
          height={0.055}
          position={[W - PAD - 0.4, -0.465, 0]}
          onClick={() => resetGame(mode)}
        />
      </Panel>
    </group>
  )
}
