import type { CrewId } from '../domain/content/crew'
import azulClaroFront from '../assets/characters/pixel/AzulClaroFront.png'
import azulClaroBack from '../assets/characters/pixel/AzulClaroBack.png'
import azulOscuroFront from '../assets/characters/pixel/AzulOscuroFront.png'
import azulOscuroBack from '../assets/characters/pixel/AzulOscuroBack.png'
import naranjaFront from '../assets/characters/pixel/NaranjaFront.png'
import naranjaBack from '../assets/characters/pixel/NaranjaBack.png'
import rojoFront from '../assets/characters/pixel/RojoFront.png'
import rojoBack from '../assets/characters/pixel/RojoBack.png'
import verdeFront from '../assets/characters/pixel/VerdeFront.png'
import verdeBack from '../assets/characters/pixel/VerdeBack.png'

/**
 * 16×16 transparent sprites extracted from the character sheets in src/assets/characters
 * (scripts/extract-crew-sprites.py). The color → character mapping lives only here.
 */
export interface CrewSpriteSet {
  front: string
  back: string
  /** Suit accent color, used for small identity marks in the interface. */
  accent: string
}

export const CREW_SPRITES: Record<CrewId, CrewSpriteSet> = {
  orion: { front: azulClaroFront, back: azulClaroBack, accent: '#4fd1e0' },
  lyra: { front: naranjaFront, back: naranjaBack, accent: '#f29a3a' },
  elias: { front: rojoFront, back: rojoBack, accent: '#d2453f' },
  zara: { front: azulOscuroFront, back: azulOscuroBack, accent: '#7b93ad' },
  kai: { front: verdeFront, back: verdeBack, accent: '#2fae6a' },
}
