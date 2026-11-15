import type { ReactNode } from 'react'
import type { Point } from '../ui/ship/layout'
import { PX, toWorld } from './space'

/** Wall height of the rooms (diorama metres). */
export const WALL_H = 0.045

/** Places children at a map point, `h` metres above the deck. */
export function At({ p, h = 0, children }: { p: Point; h?: number; children: ReactNode }) {
  const [x, z] = toWorld(p)
  return <group position={[x, h, z]}>{children}</group>
}

interface Look {
  color: string
  emissive?: string
  glow?: number
  metal?: number
  rough?: number
  transparent?: boolean
  opacity?: number
}

function Material({
  color,
  emissive,
  glow = 1.2,
  metal = 0.3,
  rough = 0.6,
  transparent,
  opacity,
}: Look) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? '#000'}
      emissiveIntensity={emissive ? glow : 0}
      metalness={metal}
      roughness={rough}
      transparent={transparent}
      opacity={opacity}
    />
  )
}

/** Box sitting on the deck (or `y` above it): width/depth in map px, height in metres. */
export function Box({
  p,
  w,
  d,
  h,
  y = 0,
  rotY = 0,
  ...look
}: { p: Point; w: number; d: number; h: number; y?: number; rotY?: number } & Look) {
  return (
    <At p={p} h={y + h / 2}>
      <mesh rotation={[0, rotY, 0]}>
        <boxGeometry args={[w * PX, h, d * PX]} />
        <Material {...look} />
      </mesh>
    </At>
  )
}

/** Vertical cylinder on the deck: radius in map px, height in metres. */
export function Cyl({
  p,
  r,
  h,
  y = 0,
  top,
  ...look
}: { p: Point; r: number; h: number; y?: number; top?: number } & Look) {
  return (
    <At p={p} h={y + h / 2}>
      <mesh>
        <cylinderGeometry args={[(top ?? r) * PX, r * PX, h, 20]} />
        <Material {...look} />
      </mesh>
    </At>
  )
}

/** Sphere centred `y` above the deck: radius in map px. */
export function Ball({ p, r, y, ...look }: { p: Point; r: number; y: number } & Look) {
  return (
    <At p={p} h={y}>
      <mesh>
        <sphereGeometry args={[r * PX, 16, 12]} />
        <Material {...look} />
      </mesh>
    </At>
  )
}
