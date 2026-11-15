import { useState } from 'react'
import { CREW, SPECIALTY_LABELS, type CrewId } from '../../domain/content/crew'
import { getCondition } from '../../domain/content/conditions'
import { DIRECT_ORDERS, type DirectOrder } from '../../domain/engine/commands'
import type { GameState } from '../../domain/model/game'
import { STAT_KEYS, STAT_LABELS } from '../../domain/model/stats'
import { getWorkWarnings } from '../../domain/rules/availability'
import { useGame } from '../../store/gameStore'
import { ACTIVITY_LABELS } from '../../ui/activity'
import { C, CREW_COLORS } from '../colors'
import { Button, Label, Meter, Panel } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 0.6
const PAD = 0.03
const INNER = W - PAD * 2
const ORDERS: DirectOrder[] = ['duty', 'rest', 'leisure', 'medical']

/** Selected crew member: stats, active conditions and direct orders. */
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
  const [error, setError] = useState<{ id: CrewId; text: string } | null>(null)
  const def = CREW[crewId]
  const crew = game.crew[crewId]
  const warnings = crew.activity === 'dead' ? [] : getWorkWarnings(crew)
  const conditions = crew.conditions
    .map((c) => getCondition(c)?.name)
    .filter((n): n is string => !!n)

  const statsTop = -0.12
  const rowH = 0.04
  const condTop = statsTop - STAT_KEYS.length * rowH - 0.01
  const condText = conditions.length ? clip(conditions.join(', '), 90) : 'Sin estados activos'
  const warnText = warnings.length ? clip(warnings.map((w) => w.title).join(', '), 80) : ''
  const ordersTop = condTop - 0.07 - (warnText ? 0.04 : 0)
  const bw = (INNER - 0.01) / 2
  const errText = error?.id === crewId ? error.text : ''
  const height = -ordersTop + 2 * 0.055 + (errText ? 0.05 : 0) + PAD

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={height}>
        <mesh position={[PAD + 0.012, -0.05, 0]}>
          <circleGeometry args={[0.012, 20]} />
          <meshBasicMaterial color={CREW_COLORS[crewId]} />
        </mesh>
        <Label position={[PAD + 0.035, -0.03, 0]} size={0.03} bold>
          {def.name}
        </Label>
        <Label position={[PAD + 0.035, -0.072, 0]} size={0.017} color={C.muted}>
          {`${SPECIALTY_LABELS[def.primarySpecialty]} · ${ACTIVITY_LABELS[crew.activity]}`}
        </Label>
        <Button
          label="X"
          width={0.05}
          height={0.05}
          position={[W - PAD - 0.05, -0.02, 0]}
          onClick={() => selectCrew(null)}
        />
        {STAT_KEYS.map((key, i) => (
          <group key={key} position={[PAD, statsTop - i * rowH, 0]}>
            <Label size={0.017} color={C.muted}>
              {STAT_LABELS[key]}
            </Label>
            <Meter
              position={[0.16, -0.006, 0]}
              width={INNER - 0.24}
              value={crew.stats[key]}
              invert={key === 'stress'}
            />
            <Label position={[INNER, 0, 0]} size={0.017} anchorX="right">
              {String(Math.round(crew.stats[key]))}
            </Label>
          </group>
        ))}
        <Label position={[PAD, condTop, 0]} size={0.016} color={C.muted} maxWidth={INNER}>
          {condText}
        </Label>
        {warnText && (
          <Label position={[PAD, condTop - 0.04, 0]} size={0.016} color={C.warn} maxWidth={INNER}>
            {warnText}
          </Label>
        )}
        {ORDERS.map((o, i) => (
          <Button
            key={o}
            label={DIRECT_ORDERS[o].label}
            size={0.017}
            active={crew.activity === o}
            disabled={crew.activity === 'dead'}
            width={bw}
            height={0.047}
            position={[PAD + (i % 2) * (bw + 0.01), ordersTop - Math.floor(i / 2) * 0.055, 0]}
            onClick={() => {
              const result = order(crewId, o)
              setError(result.ok ? null : { id: crewId, text: result.errors.join(' ') })
            }}
          />
        ))}
        {errText && (
          <Label
            position={[PAD, ordersTop - 0.115, 0]}
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
