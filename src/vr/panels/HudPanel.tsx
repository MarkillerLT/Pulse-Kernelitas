import { useEffect } from 'react'
import { CREW_IDS } from '../../domain/content/crew'
import { SECTOR_IDS } from '../../domain/content/sectors'
import type { GameState } from '../../domain/model/game'
import { MODE_INFO, tierOf } from '../../domain/rules/difficulty'
import { gameStore, useClockMinutes, useGame, type Notice } from '../../store/gameStore'
import { formatClock } from '../../ui/activity'
import { ROOM_LABELS } from '../../ui/ship/layout'
import { C } from '../colors'
import { Button, Label, Meter, Panel } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 1.24
const PAD = 0.035
const INNER = W - PAD * 2
const SPEEDS = [1, 2, 4] as const
const SHIP_STATS = [
  ['lifeSupport', 'Soporte vital'],
  ['power', 'Energía'],
  ['hull', 'Casco'],
  ['food', 'Comida'],
  ['medicine', 'Medicina'],
] as const
const TOAST_MS = 8000
const TONE_COLOR: Record<Notice['tone'], string> = {
  info: C.accent,
  success: C.good,
  warning: C.warn,
  error: C.critical,
}

function NoticeRow({ notice, y }: { notice: Notice; y: number }) {
  useEffect(() => {
    const t = window.setTimeout(() => gameStore.getState().dismissNotice(notice.id), TOAST_MS)
    return () => window.clearTimeout(t)
  }, [notice.id])
  return (
    <Label position={[PAD, y, 0]} size={0.019} color={TONE_COLOR[notice.tone]} maxWidth={INNER}>
      {clip(notice.text, 100)}
    </Label>
  )
}

/**
 * Status bar above the ship: clock, level, ship systems, time controls (Auto / 1× / 2× / 4× and
 * the pause menu) and one button per sector to go on board and see it life-size. Latest notices
 * at the bottom.
 */
export function HudPanel({
  game,
  position,
  rotY,
}: {
  game: GameState
  position: [number, number, number]
  rotY: number
}) {
  const speed = useGame((s) => s.speed)
  const minutes = useClockMinutes()
  const setSpeed = useGame((s) => s.setSpeed)
  const auto = useGame((s) => s.speedMode === 'auto')
  const setAutoSpeed = useGame((s) => s.setAutoSpeed)
  const openMenu = useGame((s) => s.openMenu)
  const notices = useGame((s) => s.notices)
  const goOnboard = useVrUi((s) => s.goOnboard)
  const alive = CREW_IDS.filter((id) => game.crew[id].activity !== 'dead').length
  const over = game.status !== 'active'
  const shown = notices.slice(-2)

  const rowControls = -0.15
  const rowSectors = rowControls - 0.092
  const rowNotices = rowSectors - 0.075
  const height = -rowNotices + shown.length * 0.03 + PAD * 0.6

  const sectorW = (INNER - 0.006 * 7) / 8
  return (
    <group position={[position[0], position[1] - height / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={height}>
        <Label position={[PAD, -0.03, 0]} size={0.034} bold color={C.accent}>
          ELYSIUM
        </Label>
        <Label position={[PAD + 0.2, -0.033, 0]} size={0.03} bold>
          {formatClock(game.hour, minutes)}
        </Label>
        <Label
          position={[PAD + 0.2, -0.072, 0]}
          size={0.016}
          color={speed === 0 ? C.warn : C.accent}
        >
          {over
            ? 'VIAJE TERMINADO'
            : speed === 0
              ? 'EN PAUSA'
              : `EN CURSO · ${auto ? 'AUTO' : 'MANUAL'} ${speed}×`}
        </Label>
        <Label position={[W - PAD, -0.035, 0]} size={0.019} color={C.muted} anchorX="right">
          {`Nivel ${game.difficulty.level} · ${MODE_INFO[tierOf(game.difficulty.level)].label}   Tripulación ${alive}/${CREW_IDS.length}`}
        </Label>

        {SHIP_STATS.map(([key, label], i) => {
          const cell = INNER / SHIP_STATS.length
          return (
            <group key={key} position={[PAD + i * cell, -0.098, 0]}>
              <Label size={0.015} color={C.dim}>
                {`${label.toUpperCase()}  ${Math.round(game.ship[key])}%`}
              </Label>
              <Meter position={[0, -0.024, 0]} width={cell - 0.03} value={game.ship[key]} />
            </group>
          )
        })}

        <Button
          label="Auto"
          size={0.019}
          active={auto}
          disabled={over}
          width={0.11}
          height={0.05}
          position={[PAD, rowControls, 0]}
          onClick={setAutoSpeed}
        />
        {SPEEDS.map((s, i) => (
          <Button
            key={s}
            label={`${s}×`}
            size={0.019}
            active={!auto && speed === s}
            disabled={over}
            width={0.08}
            height={0.05}
            position={[PAD + 0.118 + i * 0.087, rowControls, 0]}
            onClick={() => setSpeed(s)}
          />
        ))}
        <Button
          label="Pausa / menú"
          tone="primary"
          size={0.019}
          width={0.19}
          height={0.05}
          position={[PAD + 0.39, rowControls, 0]}
          onClick={() => openMenu('guide')}
        />
        <Label position={[PAD, rowControls - 0.066, 0]} size={0.015} color={C.dim}>
          RECORRER A BORDO · ELIGE UN SECTOR PARA VERLO A TAMAÑO REAL
        </Label>
        {SECTOR_IDS.map((id, i) => (
          <Button
            key={id}
            label={ROOM_LABELS[id]}
            size={0.016}
            width={sectorW}
            height={0.05}
            position={[PAD + i * (sectorW + 0.006), rowSectors, 0]}
            onClick={() => goOnboard(id)}
          />
        ))}

        {shown.map((n, i) => (
          <NoticeRow key={n.id} notice={n} y={rowNotices - i * 0.03} />
        ))}
      </Panel>
    </group>
  )
}
