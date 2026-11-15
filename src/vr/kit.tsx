import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { MeshBasicMaterial, NearestFilter, SRGBColorSpace, type Texture } from 'three'
import fontRegular from '@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff?url'
import fontMedium from '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff?url'
import { C } from './colors'
import { glyphSafe } from './text'

/**
 * World-space UI kit for the VR view: flat panels, labels, buttons, meters and pixel images.
 * Sizes are metres; at ~1 m a 0.024 m font reads comfortably on a Quest 3. Everything works with
 * the mouse (desktop) and with XR rays / hands, since @react-three/xr feeds controller pointers
 * into the same R3F pointer events.
 *
 * UI never depth-tests against the scene, so when the player is on board no wall or prop can
 * hide a panel. Draw order inside a panel comes from renderOrder (background < controls <
 * text), and `UiLayer` lifts modal windows above every other panel.
 */

type Vec3 = [number, number, number]

const LayerContext = createContext(10)

/** Renders its panels above the default UI layer (modals: decisions, pause). */
export function UiLayer({ base, children }: { base: number; children: ReactNode }) {
  return <LayerContext.Provider value={base}>{children}</LayerContext.Provider>
}

function useLayer() {
  return useContext(LayerContext)
}

/** Base material for UI text: same look, but always drawn over the scene. */
const uiTextMaterial = new MeshBasicMaterial({
  transparent: true,
  depthTest: false,
  depthWrite: false,
})

function UiPlane({
  width,
  height,
  color,
  opacity = 1,
  order,
  position,
  map,
  ...events
}: {
  width: number
  height: number
  color?: string
  opacity?: number
  order: number
  position?: Vec3
  map?: Texture
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: () => void
}) {
  return (
    <mesh position={position} renderOrder={order} {...events}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color={color}
        map={map}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export function Panel({
  width,
  height,
  position,
  rotation,
  children,
  color = C.panel,
  opacity = 0.94,
  accent = C.accent,
}: {
  width: number
  height: number
  position?: Vec3
  rotation?: Vec3
  children?: ReactNode
  color?: string
  opacity?: number
  accent?: string
}) {
  const base = useLayer()
  return (
    <group position={position} rotation={rotation}>
      {/* Catches rays so pointing at a panel never clicks the ship behind it. */}
      <UiPlane
        width={width}
        height={height}
        color={color}
        opacity={opacity}
        order={base}
        onClick={(e) => e.stopPropagation()}
      />
      {/* Accent edge on top, like the cards of the landing page. */}
      <UiPlane
        width={width}
        height={0.005}
        color={accent}
        order={base + 1}
        position={[0, height / 2 - 0.0025, 0.0005]}
      />
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
  world = false,
}: {
  children: string
  position?: Vec3
  size?: number
  color?: string
  maxWidth?: number
  bold?: boolean
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
  /** Labels that belong to the ship (room names, crew status) depth-test like the ship. */
  world?: boolean
}) {
  const base = useLayer()
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
      renderOrder={world ? 0 : base + 3}
      material={world ? undefined : uiTextMaterial}
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
  const base = useLayer()
  const [hover, setHover] = useState(false)
  const primary = tone === 'primary'
  const fill =
    tone === 'primary'
      ? hover
        ? C.accentHover
        : C.accent
      : tone === 'danger'
        ? hover
          ? C.dangerHover
          : C.danger
        : hover
          ? C.buttonHover
          : active
            ? C.active
            : C.button
  const color = disabled ? C.buttonDisabled : fill
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
      <UiPlane width={width} height={height} color={color} order={base + 1} {...handlers} />
      {(active || hover) && !primary && !disabled && (
        <UiPlane
          width={width}
          height={0.004}
          color={C.accent}
          order={base + 2}
          position={[0, -height / 2 + 0.002, 0.0005]}
        />
      )}
      <Label
        position={[0, 0, 0.001]}
        size={size}
        anchorX="center"
        anchorY="middle"
        maxWidth={width - 0.02}
        bold={primary || active}
        color={disabled ? C.muted : primary ? C.accentInk : active ? C.accent : C.text}
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
  const base = useLayer()
  const v = Math.max(0, Math.min(100, value)) / 100
  const good = invert ? 1 - v : v
  const color = good >= 0.6 ? C.good : good >= 0.35 ? C.warn : C.critical
  const h = 0.012
  return (
    <group position={position}>
      <UiPlane
        width={width}
        height={h}
        color={C.track}
        order={base + 1}
        position={[width / 2, -h / 2, 0]}
      />
      {v > 0 && (
        <UiPlane
          width={width * v}
          height={h}
          color={color}
          order={base + 2}
          position={[(width * v) / 2, -h / 2, 0.0005]}
        />
      )}
    </group>
  )
}

/** Pixel-art image (the crew sprites), kept crisp with nearest-neighbour filtering. */
export function PixelImage({
  texture,
  size,
  position,
  dimmed,
}: {
  texture: Texture
  size: number
  position: Vec3
  dimmed?: boolean
}) {
  const base = useLayer()
  const map = useMemo(() => {
    const t = texture.clone()
    t.magFilter = NearestFilter
    t.minFilter = NearestFilter
    t.colorSpace = SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [texture])
  return (
    <UiPlane
      width={size}
      height={size}
      map={map}
      color={dimmed ? '#555555' : '#ffffff'}
      order={base + 2}
      position={position}
    />
  )
}

/** Solid rectangle positioned by its top-left corner (row backgrounds, badges). */
export function Rect({
  position,
  width,
  height,
  color,
  opacity = 1,
  layer = 1,
}: {
  position: Vec3
  width: number
  height: number
  color: string
  opacity?: number
  layer?: number
}) {
  const base = useLayer()
  return (
    <UiPlane
      width={width}
      height={height}
      color={color}
      opacity={opacity}
      order={base + layer}
      position={[position[0] + width / 2, position[1] - height / 2, position[2]]}
    />
  )
}
