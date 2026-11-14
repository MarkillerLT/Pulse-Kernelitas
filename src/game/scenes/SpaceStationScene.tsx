import { useState } from 'react'
import { extend } from '@pixi/react'
import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import { AstronautSprite } from '../entities/AstronautSprite'
import type { GameAssets } from '../sprites/spriteLoader'
import { useMissionStore } from '../../store/missionStore'
import type { Activity } from '../../simulation/models/mission'
import { gamePalette } from '../rendering/palette'
import { crewSpriteDefinitions } from '../sprites/spriteDefinitions'

extend({ Container, Sprite, AnimatedSprite, Graphics, Text })
const areas: { x: number; label: string; activity: Activity }[] = [
  { x: 16, label: 'ENFERMERÍA', activity: 'assessment' },
  { x: 104, label: 'EJERCICIO', activity: 'exercise' },
  { x: 192, label: 'DORMITORIO', activity: 'rest' },
  { x: 280, label: 'CONTROL', activity: 'work' },
  { x: 368, label: 'SALA COMÚN', activity: 'social' },
]
const labelStyle = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 6,
  fill: gamePalette.white,
  letterSpacing: 1,
})
export function SpaceStationScene({ assets }: { assets: GameAssets }) {
  const crew = useMissionStore((s) => s.mission.crew)
  const assign = useMissionStore((s) => s.assign)
  const active = useMissionStore((s) => s.mission.status === 'active')
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <pixiContainer>
      <pixiSprite texture={assets.station} />
      {areas.map((area) => (
        <pixiContainer key={area.label}>
          <pixiText text={area.label} x={area.x + 10} y={126} style={labelStyle} resolution={1} />
          <pixiGraphics
            eventMode="static"
            cursor={active ? 'pointer' : 'default'}
            onPointerOver={() => setHovered(area.label)}
            onPointerOut={() => setHovered(null)}
            onPointerTap={() => {
              if (active) assign(area.activity)
            }}
            draw={(g) => {
              g.clear()
                .rect(area.x + 4, 140, 80, 79)
                .fill({
                  color: gamePalette.interaction,
                  alpha: active && hovered === area.label ? 0.1 : 0.001,
                })
              if (active && hovered === area.label)
                g.rect(area.x + 4, 140, 80, 79).stroke({ color: gamePalette.interaction, width: 1 })
            }}
          />
        </pixiContainer>
      ))}
      {crew.map((a, index) => {
        const spriteIndex = crewSpriteDefinitions.findIndex(
          (definition) => definition.astronautId === a.id,
        )
        return spriteIndex < 0 ? null : (
          <AstronautSprite
            key={a.id}
            astronaut={a}
            index={index}
            textures={assets.crew[spriteIndex]}
          />
        )
      })}
    </pixiContainer>
  )
}
