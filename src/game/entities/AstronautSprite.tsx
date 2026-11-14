import { useEffect, useMemo, useRef } from 'react'
import { useTick } from '@pixi/react'
import { AnimatedSprite, Graphics, type Texture } from 'pixi.js'
import type { Activity, Astronaut } from '../../simulation/models/mission'
import { useMissionStore } from '../../store/missionStore'

const stationTargets = {
  work: 319,
  rest: 233,
  exercise: 155,
  assessment: 72,
  medical: 54,
  social: 404,
}
const framesFor = (activity: Activity) =>
  activity === 'rest'
    ? [6, 7]
    : activity === 'exercise'
      ? [0, 9]
      : activity === 'work'
        ? [0, 8]
        : activity === 'medical' || activity === 'assessment'
          ? [0, 10]
          : [0, 1]
export function AstronautSprite({
  astronaut,
  textures,
  index,
}: {
  astronaut: Astronaut
  textures: Texture[]
  index: number
}) {
  const sprite = useRef<AnimatedSprite>(null)
  const outline = useRef<Graphics>(null)
  const position = useRef({ x: 302 + index * 17, y: 220 })
  const walking = useRef(false)
  const selected = useMissionStore((s) => s.selectedId === astronaut.id)
  const select = useMissionStore((s) => s.select)
  const idle = useMemo(
    () => framesFor(astronaut.activity).map((i) => textures[i]),
    [astronaut.activity, textures],
  )
  useEffect(() => {
    walking.current = false
    if (sprite.current) {
      sprite.current.textures = idle
      sprite.current.animationSpeed = 0.045
      sprite.current.play()
    }
  }, [idle])
  useTick((ticker) => {
    const s = sprite.current,
      border = outline.current
    if (!s) return
    const targetX =
      stationTargets[astronaut.activity] +
      (astronaut.activity === 'rest' ? index * 3 : (index - 1) * 12)
    const targetY = astronaut.activity === 'rest' ? 200 : 220
    const p = position.current
    const distance = targetX - p.x
    const speed =
      ((astronaut.health === 'critical' ? 8 : 22 - astronaut.fatigue * 0.1) *
        Math.min(ticker.deltaMS, 50)) /
      1000
    if (Math.abs(distance) > 0.5) p.x += Math.sign(distance) * Math.min(Math.abs(distance), speed)
    else p.y += Math.sign(targetY - p.y) * Math.min(Math.abs(targetY - p.y), speed)
    const moving = Math.abs(targetX - p.x) > 0.5 || Math.abs(targetY - p.y) > 0.5
    if (moving !== walking.current) {
      walking.current = moving
      s.textures = (moving ? [2, 3, 4, 5] : framesFor(astronaut.activity)).map((i) => textures[i])
      s.animationSpeed = moving ? 0.12 : 0.045
      s.play()
    }
    s.position.set(Math.round(p.x), Math.round(p.y))
    if (border) border.position.set(Math.round(p.x), Math.round(p.y))
  })
  return (
    <>
      <pixiGraphics
        ref={outline}
        draw={(g) => {
          g.clear()
          if (selected) g.rect(-10, -26, 20, 27).stroke({ color: 0x4de1d4, width: 1 })
          if (astronaut.health !== 'nominal')
            g.rect(-2, -30, 4, 3).fill(astronaut.health === 'critical' ? 0xf07178 : 0xf0c477)
        }}
      />
      <pixiAnimatedSprite
        ref={sprite}
        textures={idle}
        anchor={{ x: 0.5, y: 1 }}
        roundPixels
        eventMode="static"
        cursor="pointer"
        onPointerTap={() => select(astronaut.id)}
      />
    </>
  )
}
