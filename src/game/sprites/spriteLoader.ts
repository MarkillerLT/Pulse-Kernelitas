import { Assets, Rectangle, Texture, TextureSource } from 'pixi.js'

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
      [0, 1, 2].map(async (i) => {
        const sheet = await Assets.load<Texture>(
          `/assets/pixel-art/astronauts/spritesheets/crew-${i}.png`,
        )
        sheet.source.scaleMode = 'nearest'
        return Array.from(
          { length: 12 },
          (_, frame) =>
            new Texture({ source: sheet.source, frame: new Rectangle(frame * 16, 0, 16, 24) }),
        )
      }),
    )
    station.source.scaleMode = 'nearest'
    return { station, crew }
  })()
  return loading
}
