import { useEffect } from 'react'
import { CREW_IDS } from '../../domain/content/crew'
import type { GameState } from '../../domain/model/game'
import { MODE_INFO, tierOf } from '../../domain/rules/difficulty'
import { gameStore, useClockMinutes, useGame, type Notice, type Speed } from '../../store/gameStore'
import { formatClock } from '../../ui/activity'
import { C } from '../colors'
import { Button, Label, Meter, Panel } from '../kit'
import { clip } from '../text'

const W = 1.1
const PAD = 0.03
const SPEEDS: { value: Speed; label: string }[] = [
  { value: 0, label: 'Pausa' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]
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
    <Label
      position={[PAD, y, 0]}
      size={0.017}
      color={TONE_COLOR[notice.tone]}
      maxWidth={W - PAD * 2}
    >
      {clip(notice.text, 110)}
    </Label>
  )
}

/** Ship status strip above the diorama: clock, level, ship resources, speed and notices. */
export function HudPanel({
  game,
  position,
}: {
  game: GameState
  position: [number, number, number]
}) {
  const speed = useGame((s) => s.speed)
  const minutes = useClockMinutes()
  const setSpeed = useGame((s) => s.setSpeed)
  const auto = useGame((s) => s.speedMode === 'auto')
  const setAutoSpeed = useGame((s) => s.setAutoSpeed)
  const notices = useGame((s) => s.notices)
  const openMenu = useGame((s) => s.openMenu)
  const alive = CREW_IDS.filter((id) => game.crew[id].activity !== 'dead').length
  const over = game.status !== 'active'
  const shown = notices.slice(-3)
  const height = 0.2 + shown.length * 0.03 + (over ? 0.06 : 0)

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]}>
      <Panel width={W} height={height}>
        <Label position={[PAD, -0.028, 0]} size={0.03} bold color={C.accent}>
          ELYSIUM
        </Label>
        <Label position={[PAD + 0.17, -0.036, 0]} size={0.019}>
          {`${formatClock(game.hour, minutes)}${speed === 0 && !over ? ' · pausa' : ''}`}
        </Label>
        <Label position={[PAD + 0.48, -0.036, 0]} size={0.019} color={C.muted}>
          {`Nivel ${game.difficulty.level} · ${MODE_INFO[tierOf(game.difficulty.level)].label} · Tripulación ${alive}/${CREW_IDS.length}`}
        </Label>
        {SHIP_STATS.map(([key, label], i) => {
          const x = PAD + i * ((W - PAD * 2) / SHIP_STATS.length)
          const w = (W - PAD * 2) / SHIP_STATS.length - 0.025
          return (
            <group key={key} position={[x, -0.075, 0]}>
              <Label size={0.015} color={C.muted}>
                {`${label} ${Math.round(game.ship[key])}`}
              </Label>
              <Meter position={[0, -0.025, 0]} width={w} value={game.ship[key]} />
            </group>
          )
        })}
        {SPEEDS.map((s, i) => (
          <Button
            key={s.value}
            label={s.label}
            size={0.018}
            active={s.value === 0 ? speed === 0 : !auto && speed === s.value}
            disabled={over}
            width={0.1}
            height={0.045}
            position={[PAD + i * 0.108, -0.135, 0]}
            onClick={() => setSpeed(s.value)}
          />
        ))}
        <Button
          label={auto && speed !== 0 ? `Auto ${speed}×` : 'Auto'}
          size={0.018}
          active={auto}
          disabled={over}
          width={0.14}
          height={0.045}
          position={[PAD + SPEEDS.length * 0.108, -0.135, 0]}
          onClick={setAutoSpeed}
        />
        <Button
          label="Nueva partida"
          size={0.017}
          width={0.2}
          height={0.045}
          position={[W - PAD - 0.2, -0.135, 0]}
          onClick={() => openMenu('difficulty')}
        />
        {over && (
          <Label
            position={[PAD, -0.195, 0]}
            size={0.02}
            color={C.critical}
            maxWidth={W - PAD * 2}
            bold
          >
            {clip(`Partida terminada. ${game.endReason ?? ''}`, 100)}
          </Label>
        )}
        {shown.map((n, i) => (
          <NoticeRow key={n.id} notice={n} y={-0.2 - (over ? 0.06 : 0) - i * 0.03} />
        ))}
      </Panel>
    </group>
  )
}
