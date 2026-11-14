import { Assets, Rectangle, Texture, TextureSource } from 'pixi.js'
import { astronautFrames, crewSpriteDefinitions } from './spriteDefinitions'

TextureSource.defaultOptions.scaleMode = 'nearest'
export interface GameAssets {
  station: Texture
  crew: Texture[][]
}
let loading: Promise<GameAssets> | undefined
export function loadSprites(): Promise<GameAssets> {
  loading ??= (async () => {
    const station = await Assets.load<Texture>('/assets/pixel-art/station/backgrounds/station.png')
    const crew = await Promise.all(
      crewSpriteDefinitions.map(async (definition) => {
        const sheet = await Assets.load<Texture>(definition.url)
        sheet.source.scaleMode = 'nearest'
        return Array.from(
          { length: astronautFrames.count },
          (_, frame) =>
            new Texture({
              source: sheet.source,
              frame: new Rectangle(
                frame * astronautFrames.width,
                0,
                astronautFrames.width,
                astronautFrames.height,
              ),
            }),
        )
      }),
    )
    station.source.scaleMode = 'nearest'
    return { station, crew }
  })()
  return loading
}
