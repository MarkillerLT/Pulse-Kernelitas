import type { CSSProperties } from 'react'
import type { CrewId } from '../../domain/content/crew'
import { CREW_SPRITES } from '../sprites'

interface Props {
  crewId: CrewId
  facing?: 'front' | 'back'
  size?: 'sm' | 'md' | 'lg'
  dimmed?: boolean
}

/** Pixel-art portrait cropped from the character sheet. Decorative: names are always shown next to it. */
export function CrewSprite({ crewId, facing = 'front', size = 'md', dimmed = false }: Props) {
  const sprite = CREW_SPRITES[crewId]
  return (
    <span
      className={`sprite sprite-${size}${dimmed ? ' is-dimmed' : ''}`}
      style={{ '--accent': sprite.accent } as CSSProperties}
      aria-hidden="true"
    >
      <img src={sprite[facing]} alt="" draggable={false} />
    </span>
  )
}
