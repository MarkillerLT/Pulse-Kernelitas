import palette from './palette.json'

// Pixi Graphics uses numeric colors; PNG generation consumes the same palette JSON.
export const gamePalette = {
  ...palette,
  selection: Number.parseInt(palette.white.slice(1), 16),
  warningMarker: Number.parseInt(palette.warning.slice(1), 16),
  criticalMarker: Number.parseInt(palette.critical.slice(1), 16),
  interaction: Number.parseInt(palette.blueLight.slice(1), 16),
}
