import { useState } from 'react'
import { useTexture } from '@react-three/drei'
import { CREW, SPECIALTY_LABELS, type CrewId } from '../../domain/content/crew'
import { getCondition } from '../../domain/content/conditions'
import { DIRECT_ORDERS, type DirectOrder } from '../../domain/engine/commands'
import type { GameState } from '../../domain/model/game'
import { STAT_KEYS, STAT_LABELS } from '../../domain/model/stats'
import { getWorkWarnings } from '../../domain/rules/availability'
import { useGame } from '../../store/gameStore'
import { ACTIVITY_LABELS } from '../../ui/activity'
import { crewTargets } from '../../ui/ship/motion'
import { CREW_SPRITES } from '../../ui/sprites'
import { C } from '../colors'
import { Button, Label, Meter, Panel, PixelImage } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 0.66
const PAD = 0.032
const INNER = W - PAD * 2
const ORDERS: DirectOrder[] = ['duty', 'rest', 'leisure', 'medical']

/**
 * File of the member picked on the crew panel, the VR version of the web's floating card:
 * statistics, conditions, warnings, direct orders, and a shortcut to stand next to them on board.
 */
export function CrewPanel({
  game,
  crewId,
  position,
  rotY,
}: {
  game: GameState
  crewId: CrewId
  position: [number, number, number]
  rotY: number
}) {
  const order = useGame((s) => s.order)
  const selectCrew = useVrUi((s) => s.selectCrew)
  const goOnboard = useVrUi((s) => s.goOnboard)
  const face = useTexture(CREW_SPRITES[crewId].front)
  const [error, setError] = useState<{ id: CrewId; text: string } | null>(null)
  const def = CREW[crewId]
  const crew = game.crew[crewId]
  const dead = crew.activity === 'dead'
  const away = crew.activity === 'mission'
  const warnings = dead ? [] : getWorkWarnings(crew)
  const conditions = crew.conditions
    .map((c) => getCondition(c)?.name)
    .filter((n): n is string => !!n)

  const statsTop = -0.115
  const rowH = 0.042
  const condTop = statsTop - STAT_KEYS.length * rowH - 0.008
  const condText = conditions.length ? clip(conditions.join(', '), 80) : 'Sin estados activos'
  const warnText = warnings.length ? clip(warnings.map((w) => w.title).join(', '), 70) : ''
  const ordersTop = condTop - 0.05 - (warnText ? 0.04 : 0)
  const bw = (INNER - 0.01) / 2
  const errText = error?.id === crewId ? error.text : ''
  const goTop = ordersTop - 2 * 0.058
  const height = -goTop + 0.055 + (errText ? 0.05 : 0) + PAD

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={height}>
        <PixelImage
          texture={face}
          size={0.075}
          dimmed={dead}
          position={[PAD + 0.0375, -0.055, 0.002]}
        />
        <Label position={[PAD + 0.09, -0.028, 0]} size={0.03} bold>
          {def.name}
        </Label>
        <Label position={[PAD + 0.09, -0.07, 0]} size={0.017} color={C.muted}>
          {`${SPECIALTY_LABELS[def.primarySpecialty]} · ${ACTIVITY_LABELS[crew.activity]}`}
        </Label>
        <Button
          label="X"
          width={0.055}
          height={0.055}
          position={[W - PAD - 0.055, -0.02, 0]}
          onClick={() => selectCrew(null)}
        />
        {STAT_KEYS.map((key, i) => (
          <group key={key} position={[PAD, statsTop - i * rowH, 0]}>
            <Label size={0.018} color={C.muted}>
              {STAT_LABELS[key]}
            </Label>
            <Meter
              position={[0.17, -0.007, 0]}
              width={INNER - 0.25}
              value={crew.stats[key]}
              invert={key === 'stress'}
            />
            <Label position={[INNER, 0, 0]} size={0.018} anchorX="right">
              {String(Math.round(crew.stats[key]))}
            </Label>
          </group>
        ))}
        <Label position={[PAD, condTop, 0]} size={0.016} color={C.dim} maxWidth={INNER}>
          {condText}
        </Label>
        {warnText && (
          <Label position={[PAD, condTop - 0.035, 0]} size={0.017} color={C.warn} maxWidth={INNER}>
            {warnText}
          </Label>
        )}
        {ORDERS.map((o, i) => (
          <Button
            key={o}
            label={DIRECT_ORDERS[o].label}
            size={0.018}
            active={crew.activity === o}
            disabled={dead || away || crew.activity === 'task'}
            width={bw}
            height={0.05}
            position={[PAD + (i % 2) * (bw + 0.01), ordersTop - Math.floor(i / 2) * 0.058, 0]}
            onClick={() => {
              const result = order(crewId, o)
              setError(result.ok ? null : { id: crewId, text: result.errors.join(' ') })
            }}
          />
        ))}
        <Button
          label={away ? 'Fuera de la nave (en misión)' : 'Ir a donde está (a bordo)'}
          size={0.018}
          disabled={dead || away}
          width={INNER}
          height={0.05}
          position={[PAD, goTop, 0]}
          onClick={() => goOnboard(crewTargets(game)[crewId].room)}
        />
        {errText && (
          <Label
            position={[PAD, goTop - 0.065, 0]}
            size={0.016}
            color={C.critical}
            maxWidth={INNER}
          >
            {clip(errText, 90)}
          </Label>
        )}
      </Panel>
    </group>
  )
}
