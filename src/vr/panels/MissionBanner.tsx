import { useEffect } from 'react'
import { C } from '../colors'
import { Button, Label, Panel } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 1.0
const PAD = 0.035
const HEIGHT = 0.19
const SHOW_MS = 14000

const TONE = { info: C.accent, success: C.good, critical: C.critical }

/**
 * Announcement over the status bar when the capsule lifts off or comes back, with a shortcut
 * to watch it from the hangar, life-size.
 */
export function MissionBanner({
  position,
  rotY,
}: {
  position: [number, number, number]
  rotY: number
}) {
  const banner = useVrUi((s) => s.banner)
  const hide = useVrUi((s) => s.hideBanner)
  const goOnboard = useVrUi((s) => s.goOnboard)
  const view = useVrUi((s) => s.view)
  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(hide, SHOW_MS)
    return () => window.clearTimeout(t)
  }, [banner, hide])
  if (!banner) return null
  const inHangar = view.mode === 'onboard' && view.sector === 'aldrin'
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <Panel width={W} height={HEIGHT} accent={TONE[banner.tone]}>
        <Label position={[PAD, -0.028, 0]} size={0.016} color={TONE[banner.tone]}>
          {banner.kind === 'launch'
            ? 'MISIÓN EN CURSO · CÁPSULA EN VUELO'
            : 'REGRESO DE LA CÁPSULA'}
        </Label>
        <Label position={[PAD, -0.055, 0]} size={0.03} bold maxWidth={W - PAD * 2 - 0.26}>
          {clip(banner.title, 46)}
        </Label>
        <Label
          position={[PAD, -0.11, 0]}
          size={0.017}
          color={C.muted}
          maxWidth={W - PAD * 2 - 0.26}
        >
          {clip(banner.text, 120)}
        </Label>
        {!inHangar && (
          <Button
            label="Ver desde el hangar"
            tone="primary"
            size={0.018}
            width={0.24}
            height={0.055}
            position={[W - PAD - 0.24, -0.04, 0]}
            onClick={() => goOnboard('aldrin')}
          />
        )}
        <Button
          label="Cerrar"
          size={0.018}
          width={0.24}
          height={0.05}
          position={[W - PAD - 0.24, -0.11, 0]}
          onClick={hide}
        />
      </Panel>
    </group>
  )
}
