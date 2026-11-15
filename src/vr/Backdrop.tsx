import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  Color,
  IcosahedronGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
} from 'three'
import { cloudTexture, glowTexture, nebulaTexture, planetTexture } from './proc'
import { PLANET_POS, PLANET_RADIUS, SUN_POS } from './space'

/**
 * Deep-space scenery for the full-VR view: the ship orbits a big ocean planet (continents,
 * clouds and a glowing atmosphere rim) with a moon and an asteroid belt; a sun with a soft glow
 * lights everything, and a faint nebula fills the sky. All procedural, nothing to download.
 * Hidden in mixed reality, where the player's room is the backdrop.
 */

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmosphereFragment = /* glsl */ `
  uniform vec3 color;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
    gl_FragColor = vec4(color, rim * 0.95);
  }
`

function Planet() {
  const clouds = useRef<Mesh>(null)
  const surface = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (surface.current) surface.current.rotation.y += dt * 0.004
    if (clouds.current) clouds.current.rotation.y += dt * 0.007
  })
  const atmosphere = useMemo(() => ({ color: { value: new Color('#6fc8ff') } }), [])
  return (
    <group position={PLANET_POS} rotation={[0.35, 0, 0.18]}>
      <mesh ref={surface}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 64]} />
        <meshStandardMaterial map={planetTexture()} roughness={0.85} metalness={0} />
      </mesh>
      <mesh ref={clouds} scale={1.012}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 64]} />
        <meshStandardMaterial map={cloudTexture()} transparent depthWrite={false} roughness={1} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[PLANET_RADIUS, 64, 48]} />
        <shaderMaterial
          uniforms={atmosphere}
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function Moon() {
  const orbit = useRef<Group>(null)
  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.y += dt * 0.01
  })
  return (
    <group position={PLANET_POS} ref={orbit}>
      <mesh position={[PLANET_RADIUS * 1.7, PLANET_RADIUS * 0.55, -PLANET_RADIUS * 0.4]}>
        <sphereGeometry args={[PLANET_RADIUS * 0.12, 32, 24]} />
        <meshStandardMaterial color="#a8a399" roughness={1} />
      </mesh>
    </group>
  )
}

function AsteroidBelt({ count = 140 }: { count?: number }) {
  const mesh = useRef<InstancedMesh>(null)
  const ring = useRef<Group>(null)
  const geometry = useMemo(() => new IcosahedronGeometry(1, 0), [])
  const material = useMemo(
    () => new MeshStandardMaterial({ color: '#7d7468', roughness: 1, flatShading: true }),
    [],
  )
  const matrices = useMemo(() => {
    const out: Matrix4[] = []
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2
      const r = PLANET_RADIUS * (1.45 + rand() * 0.25)
      const pos = new Vector3(Math.cos(a) * r, (rand() - 0.5) * 3, Math.sin(a) * r)
      const q = new Quaternion().setFromAxisAngle(
        new Vector3(rand(), rand(), rand()).normalize(),
        rand() * Math.PI,
      )
      const s = 0.4 + rand() * 1.6
      out.push(new Matrix4().compose(pos, q, new Vector3(s, s * (0.6 + rand() * 0.5), s)))
    }
    return out
  }, [count])
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.006
    const m = mesh.current
    if (m && !m.userData.ready) {
      matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
      m.instanceMatrix.needsUpdate = true
      m.userData.ready = true
    }
  })
  return (
    <group position={PLANET_POS} rotation={[0.35, 0, 0.18]}>
      <group ref={ring}>
        <instancedMesh ref={mesh} args={[geometry, material, count]} />
      </group>
    </group>
  )
}

function Sun() {
  return (
    <group position={SUN_POS}>
      <mesh>
        <sphereGeometry args={[6, 24, 16]} />
        <meshBasicMaterial color="#fff6e0" />
      </mesh>
      <sprite scale={[90, 90, 1]}>
        <spriteMaterial
          map={glowTexture()}
          color="#ffe2b0"
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <sprite scale={[220, 220, 1]}>
        <spriteMaterial
          map={glowTexture()}
          color="#ffb070"
          transparent
          opacity={0.25}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}

/** `planet={false}` keeps only the sky: at warp the ship has left the planet's orbit behind. */
export function Backdrop({ planet = true }: { planet?: boolean }) {
  return (
    <>
      <directionalLight position={SUN_POS} intensity={1.4} color="#fff0d8" />
      <mesh>
        <sphereGeometry args={[480, 48, 32]} />
        <meshBasicMaterial
          map={nebulaTexture()}
          side={BackSide}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      {planet && (
        <>
          <Sun />
          <Planet />
          <Moon />
          <AsteroidBelt />
        </>
      )}
    </>
  )
}
