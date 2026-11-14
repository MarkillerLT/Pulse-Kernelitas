import type { CrewId } from '../domain/content/crew'
import azulClaroFront from '../assets/characters/AzulClaroFront.jpeg'
import azulClaroBack from '../assets/characters/AzulClaroBack.jpeg'
import azulOscuroFront from '../assets/characters/AzulOscuroFront.jpeg'
import azulOscuroBack from '../assets/characters/AzulOscuroBack.jpeg'
import naranjaFront from '../assets/characters/NaranjaFront.jpeg'
import naranjaBack from '../assets/characters/NaranjaBack.jpeg'
import rojoFront from '../assets/characters/RojoFront.jpeg'
import rojoBack from '../assets/characters/RojoBack.jpeg'
import verdeFront from '../assets/characters/VerdeFront.jpeg'
import verdeBack from '../assets/characters/VerdeBack.jpeg'

/**
 * Sprite sheets from src/assets/characters: 1248×624 JPEGs, front/back views, with the character
 * drawn in the left square half on black. The color → character mapping lives only here.
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
