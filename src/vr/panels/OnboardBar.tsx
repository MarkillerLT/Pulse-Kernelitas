import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import { SECTORS } from '../../domain/content/sectors'
import { useGame } from '../../store/gameStore'
import { C } from '../colors'
import { Button, Label, Panel } from '../kit'
import { useVrUi } from '../vrUi'

const W = 0.5
const H = 0.135
/** In the cockpit the bar also carries the throttle, so it is a little wider. */
const COCKPIT_W = 0.64
const DISTANCE = 0.8
/** How far the head may turn away before the bar drifts back in front (radians). */
const SLACK = 0.6

/**
 * The only UI left on board (or in the cockpit): where you are and a button back to the console;
 * in the cockpit, also the throttle (cruise / warp). It floats a little
 * below the line of sight and lazily follows the head when the player turns away, so it is
 * always at hand but never in the way of the view.
 */
export function OnboardBar() {
  const group = useRef<Group>(null)
  const yaw = useRef<number | null>(null)
  const head = useRef(new Vector3())
  const dir = useRef(new Vector3())
  const sector = useVrUi((s) => s.view.sector)
  const goDiorama = useVrUi((s) => s.goDiorama)
  const cockpit = useVrUi((s) => s.view.mode === 'cockpit')
  const throttle = useVrUi((s) => s.throttle)
  const setThrottle = useVrUi((s) => s.setThrottle)
  const pending = useGame((s) => s.game.tasks.filter((t) => t.status === 'open').length)

  useFrame(({ camera }, dt) => {
    const g = group.current
    if (!g) return
    camera.getWorldPosition(head.current)
    camera.getWorldDirection(dir.current)
    const target = Math.atan2(dir.current.x, dir.current.z)
    if (yaw.current === null) yaw.current = target
    let diff = target - yaw.current
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    if (Math.abs(diff) > SLACK) yaw.current += diff * Math.min(1, dt * 2.5)
    const a = yaw.current
    g.position.set(
      head.current.x + Math.sin(a) * DISTANCE,
      head.current.y - 0.42,
      head.current.z + Math.cos(a) * DISTANCE,
    )
    g.rotation.set(-0.35, a + Math.PI, 0, 'YXZ')
  })

  const back = pending
    ? `Volver a la consola · ${pending} tarea${pending > 1 ? 's' : ''}`
    : 'Volver a la consola'

  if (cockpit) {
    const half = (COCKPIT_W - 0.06 - 0.01) / 2
    return (
      <group ref={group}>
        <Panel width={COCKPIT_W} height={0.2}>
          <Label position={[0.03, -0.022, 0]} size={0.015} color={pending ? C.warn : C.accent}>
            {pending
              ? 'CABINA DE MANDO · NUEVA TAREA, SALIMOS DE HIPERVELOCIDAD'
              : 'CABINA DE MANDO'}
          </Label>
          <Button
            label="Crucero"
            size={0.018}
            active={throttle === 'cruise'}
            width={half}
            height={0.052}
            position={[0.03, -0.05, 0]}
            onClick={() => setThrottle('cruise')}
          />
          <Button
            label="Hipervelocidad"
            size={0.018}
            active={throttle === 'warp'}
            disabled={pending > 0}
            width={half}
            height={0.052}
            position={[0.03 + half + 0.01, -0.05, 0]}
            onClick={() => setThrottle('warp')}
          />
          <Button
            label={back}
            tone="primary"
            size={0.02}
            width={COCKPIT_W - 0.06}
            height={0.062}
            position={[0.03, -0.115, 0]}
            onClick={goDiorama}
          />
        </Panel>
      </group>
    )
  }

  return (
    <group ref={group}>
      <Panel width={W} height={H}>
        <Label position={[0.03, -0.022, 0]} size={0.015} color={C.accent}>
          {`A BORDO · ${SECTORS[sector].name.toUpperCase()}`}
        </Label>
        <Button
          label={back}
          tone="primary"
          size={0.02}
          width={W - 0.06}
          height={0.062}
          position={[0.03, -0.05, 0]}
          onClick={goDiorama}
        />
      </Panel>
    </group>
  )
}
