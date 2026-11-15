import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BackSide, type Group } from 'three'
import { PLANET_POS } from './space'

/**
 * Distant scenery for the full-VR view: the planet the missions fly to, its atmosphere glow,
 * a moon and the sunlight. Hidden in mixed reality, where the player's room is the backdrop.
 */
export function Backdrop() {
  const moon = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (moon.current) moon.current.rotation.y = clock.elapsedTime * 0.01
  })
  return (
    <>
      <directionalLight position={[-30, 20, -40]} intensity={0.6} color="#ffe6c4" />
      <group position={PLANET_POS}>
        <mesh>
          <sphereGeometry args={[14, 48, 32]} />
          <meshStandardMaterial color="#3d6f86" emissive="#0c2430" roughness={0.9} />
        </mesh>
        {/* Atmosphere rim. */}
        <mesh scale={1.06}>
          <sphereGeometry args={[14, 48, 32]} />
          <meshBasicMaterial
            color="#7fe3ff"
            transparent
            opacity={0.18}
            side={BackSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <group ref={moon}>
          <mesh position={[24, 6, 6]}>
            <sphereGeometry args={[2.4, 24, 16]} />
            <meshStandardMaterial color="#b9b4a8" roughness={1} />
          </mesh>
        </group>
      </group>
    </>
  )
}
