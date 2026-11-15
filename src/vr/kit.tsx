import { useState, type ReactNode } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import fontRegular from '@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff?url'
import fontMedium from '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff?url'
import { C } from './colors'
import { glyphSafe } from './text'

/**
 * Minimal world-space UI kit for the VR view: flat panels, labels and buttons built from planes
 * and SDF text. Sizes are metres; at ~1 m from the eyes a 0.024 m font reads comfortably on a
 * Quest 3. Every interactive element works with the mouse (desktop) and with XR rays / hands,
 * because @react-three/xr feeds controller pointers into the same R3F pointer events.
 */

type Vec3 = [number, number, number]

export function Panel({
  width,
  height,
  position,
  rotation,
  children,
  color = C.panel,
  opacity = 0.92,
}: {
  width: number
  height: number
  position?: Vec3
  rotation?: Vec3
  children?: ReactNode
  color?: string
  opacity?: number
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* Thin accent frame so panels read against the starfield and in passthrough. */}
      <mesh position={[0, height / 2 - 0.002, 0.0005]}>
        <planeGeometry args={[width, 0.004]} />
        <meshBasicMaterial color={C.accent} />
      </mesh>
      <group position={[-width / 2, height / 2, 0.001]}>{children}</group>
    </group>
  )
}

export function Label({
  children,
  position = [0, 0, 0],
  size = 0.024,
  color = C.text,
  maxWidth,
  bold,
  anchorX = 'left',
  anchorY = 'top',
}: {
  children: string
  position?: Vec3
  size?: number
  color?: string
  maxWidth?: number
  bold?: boolean
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
}) {
  return (
    <Text
      position={position}
      fontSize={size}
      color={color}
      maxWidth={maxWidth}
      font={bold ? fontMedium : fontRegular}
      anchorX={anchorX}
      anchorY={anchorY}
      lineHeight={1.25}
      // Labels never steal pointer hits from the buttons behind/around them.
      raycast={() => null}
    >
      {glyphSafe(children)}
    </Text>
  )
}

export function Button({
  label,
  position,
  width,
  height = 0.05,
  onClick,
  tone = 'default',
  disabled,
  active,
  size = 0.022,
}: {
  label: string
  /** Top-left corner, in the parent panel's coordinates. */
  position: Vec3
  width: number
  height?: number
  onClick?: () => void
  tone?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  active?: boolean
  size?: number
}) {
  const [hover, setHover] = useState(false)
  const base =
    tone === 'primary' ? C.primary : tone === 'danger' ? C.danger : active ? C.active : C.button
  const color = disabled ? C.buttonDisabled : hover ? C.buttonHover : base
  const handlers = disabled
    ? {}
    : {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onClick?.()
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover(true)
        },
        onPointerOut: () => setHover(false),
      }
  return (
    <group position={[position[0] + width / 2, position[1] - height / 2, position[2] + 0.002]}>
      <mesh {...handlers}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {active && (
        <mesh position={[-width / 2 + 0.003, 0, 0.0005]}>
          <planeGeometry args={[0.006, height]} />
          <meshBasicMaterial color={C.accent} />
        </mesh>
      )}
      <Label
        position={[0, 0, 0.001]}
        size={size}
        anchorX="center"
        anchorY="middle"
        maxWidth={width - 0.02}
        color={disabled ? C.muted : C.text}
      >
        {label}
      </Label>
    </group>
  )
}

/** Horizontal 0–100 meter. `invert` for stats where high is bad (stress). */
export function Meter({
  position,
  width,
  value,
  invert,
}: {
  position: Vec3
  width: number
  value: number
  invert?: boolean
}) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const good = invert ? 1 - v : v
  const color = good >= 0.6 ? C.good : good >= 0.35 ? C.warn : C.critical
  const h = 0.012
  return (
    <group position={position}>
      <mesh position={[width / 2, -h / 2, 0]}>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial color={C.track} />
      </mesh>
      {v > 0 && (
        <mesh position={[(width * v) / 2, -h / 2, 0.0005]}>
          <planeGeometry args={[width * v, h]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  )
}
