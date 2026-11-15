import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Soft studio reflections for the metal of the ship and the astronauts' visors, generated on
 * the GPU from three.js's built-in room scene (no HDR file to download).
 */
export function SceneEnvironment({ intensity = 0.55 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl)
  const get = useThree((s) => s.get)
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl)
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    return texture
  }, [gl])
  useEffect(() => () => env.dispose(), [env])
  useEffect(() => {
    get().scene.environmentIntensity = intensity
  }, [get, intensity])
  return <primitive object={env} attach="environment" />
}
