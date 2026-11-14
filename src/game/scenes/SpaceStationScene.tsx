import { extend } from '@pixi/react'
import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import { AstronautSprite } from '../entities/AstronautSprite'
import type { GameAssets } from '../sprites/spriteLoader'
import { useMissionStore } from '../../store/missionStore'
import type { Activity } from '../../simulation/models/mission'

extend({ Container, Sprite, AnimatedSprite, Graphics, Text })
const areas: { x: number; label: string; activity: Activity }[] = [
  { x: 16, label: 'MEDICAL', activity: 'assessment' },
  { x: 104, label: 'EXERCISE', activity: 'exercise' },
  { x: 192, label: 'QUARTERS', activity: 'rest' },
  { x: 280, label: 'CONTROL', activity: 'work' },
  { x: 368, label: 'COMMON', activity: 'social' },
]
const labelStyle = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 7,
  fill: '#b7ceda',
  letterSpacing: 1,
})
export function SpaceStationScene({ assets }: { assets: GameAssets }) {
  const crew = useMissionStore((s) => s.mission.crew)
  const assign = useMissionStore((s) => s.assign)
  const active = useMissionStore((s) => s.mission.status === 'active')
  return (
    <pixiContainer>
      <pixiSprite texture={assets.station} />
      {areas.map((area) => (
        <pixiContainer key={area.label}>
          <pixiText text={area.label} x={area.x + 10} y={126} style={labelStyle} resolution={1} />
          <pixiGraphics
            eventMode="static"
            cursor={active ? 'pointer' : 'default'}
            onPointerTap={() => {
              if (active) assign(area.activity)
            }}
            draw={(g) => {
              g.clear()
                .rect(area.x + 4, 140, 80, 79)
                .fill({ color: 0x4de1d4, alpha: 0.001 })
            }}
          />
        </pixiContainer>
      ))}
      {crew.map((a, index) => (
        <AstronautSprite key={a.id} astronaut={a} index={index} textures={assets.crew[index]} />
      ))}
    </pixiContainer>
  )
}
