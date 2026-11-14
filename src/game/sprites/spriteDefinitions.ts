import type { Activity } from '../../simulation/models/mission'

// Shared by Pixi textures and CSS portraits; one source for sprite identity and frame geometry.
export const astronautFrames = { width: 16, height: 24, count: 12, idle: 0 } as const
export const crewSpriteDefinitions = [
  { astronautId: 'vasquez', url: '/assets/pixel-art/astronauts/spritesheets/crew-0.png' },
  { astronautId: 'okafor', url: '/assets/pixel-art/astronauts/spritesheets/crew-1.png' },
  { astronautId: 'park', url: '/assets/pixel-art/astronauts/spritesheets/crew-2.png' },
] as const
export const walkingFrames = [2, 3, 4, 5] as const
export const activityFrames: Record<Activity, readonly number[]> = {
  work: [0, 8],
  rest: [6, 7],
  exercise: [0, 9],
  assessment: [0, 10],
  medical: [0, 10],
  social: [0, 1],
}
export const getCrewSprite = (astronautId: string) =>
  crewSpriteDefinitions.find((definition) => definition.astronautId === astronautId)
