import { useTexture } from '@react-three/drei'
import { CREW_IDS, firstName } from '../../domain/content/crew'
import type { GameState } from '../../domain/model/game'
import { getWorkWarnings } from '../../domain/rules/availability'
import { ACTIVITY_LABELS } from '../../ui/activity'
import { CREW_SPRITES } from '../../ui/sprites'
import { C, CREW_COLORS } from '../colors'
import { Button, Label, Meter, Panel, PixelImage, Rect } from '../kit'
import { useVrUi } from '../vrUi'

const PAD = 0.03
const CARD = 0.13
const GAP = 0.012
const W = PAD * 2 + CARD * 5 + GAP * 4
const CARD_H = 0.205
const HEIGHT = 0.06 + CARD_H + PAD
const FACE_URLS = CREW_IDS.map((id) => CREW_SPRITES[id].front)
// Load the five faces with the scene, so opening a crew file never suspends anything.
useTexture.preload(FACE_URLS)

/**
 * The faces of the whole crew in one panel. Pointing at a face and clicking opens that member's
 * file (stats and orders) right under it — no need to aim at the tiny figures on the ship.
 */
export function CrewRoster({
  game,
  position,
  rotY,
}: {
  game: GameState
  position: [number, number, number]
  rotY: number
}) {
  const selected = useVrUi((s) => s.selectedCrew)
  const selectCrew = useVrUi((s) => s.selectCrew)
  const faces = useTexture(FACE_URLS)

  return (
    <group position={[position[0], position[1] - HEIGHT / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={HEIGHT}>
        <Label position={[PAD, -0.025, 0]} size={0.024} bold>
          Tripulación
        </Label>
        <Label position={[W - PAD, -0.03, 0]} size={0.015} color={C.dim} anchorX="right">
          TOCA UNA CARA PARA VER SU FICHA
        </Label>
        {CREW_IDS.map((id, i) => {
          const crew = game.crew[id]
          const dead = crew.activity === 'dead'
          const warned = !dead && getWorkWarnings(crew).length > 0
          const x = PAD + i * (CARD + GAP)
          const y = -0.06
          const isSel = selected === id
          return (
            <group key={id}>
              <Button
                label=""
                width={CARD}
                height={CARD_H}
                active={isSel}
                position={[x, y, 0]}
                onClick={() => selectCrew(id)}
              />
              {/* Suit colour strip, the same one their figure wears on the ship. */}
              <Rect
                position={[x, y, 0.003]}
                width={CARD}
                height={0.006}
                color={CREW_COLORS[id]}
                layer={2}
              />
              <PixelImage
                texture={faces[i]}
                size={0.09}
                dimmed={dead}
                position={[x + CARD / 2, y - 0.058, 0.004]}
              />
              {warned && (
                <>
                  <Rect
                    position={[x + CARD - 0.034, y - 0.012, 0.005]}
                    width={0.026}
                    height={0.026}
                    color={C.warn}
                    layer={2}
                  />
                  <Label
                    position={[x + CARD - 0.021, y - 0.025, 0.006]}
                    size={0.02}
                    bold
                    anchorX="center"
                    anchorY="middle"
                    color={C.accentInk}
                  >
                    !
                  </Label>
                </>
              )}
              <Label
                position={[x + CARD / 2, y - 0.112, 0.004]}
                size={0.019}
                bold
                anchorX="center"
                color={isSel ? C.accent : C.text}
              >
                {firstName(id)}
              </Label>
              <Label
                position={[x + CARD / 2, y - 0.14, 0.004]}
                size={0.013}
                anchorX="center"
                color={dead ? C.critical : C.muted}
                maxWidth={CARD - 0.01}
              >
                {ACTIVITY_LABELS[crew.activity]}
              </Label>
              {!dead && (
                <Meter
                  position={[x + 0.012, y - CARD_H + 0.026, 0.004]}
                  width={CARD - 0.024}
                  value={crew.stats.health}
                />
              )}
            </group>
          )
        })}
      </Panel>
    </group>
  )
}
