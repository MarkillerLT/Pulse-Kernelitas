import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Application } from '@pixi/react'
import { SpaceStationScene } from './scenes/SpaceStationScene'
import { loadSprites, type GameAssets } from './sprites/spriteLoader'
import { gamePalette } from './rendering/palette'

class RendererBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <p className="renderer-message">
        Gráficos no disponibles. Activa WebGL para ver la estación. Los controles de misión siguen
        disponibles.
      </p>
    ) : (
      this.props.children
    )
  }
}
export function GameCanvas() {
  const host = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [assets, setAssets] = useState<GameAssets | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let mounted = true
    loadSprites()
      .then((a) => {
        if (mounted) setAssets(a)
      })
      .catch(() => {
        if (mounted) setError(true)
      })
    const observer = new ResizeObserver((entries) =>
      setScale(Math.max(1, Math.floor(entries[0].contentRect.width / 480))),
    )
    if (host.current) observer.observe(host.current)
    return () => {
      mounted = false
      observer.disconnect()
    }
  }, [])
  return (
    <div
      ref={host}
      className="world-viewport"
      role="region"
      tabIndex={0}
      aria-label="Estación espacial interactiva en vista lateral. Selecciona un astronauta o pulsa una sala para poner una asignación en cola."
    >
      <div className="world-frame" style={{ width: 480 * scale, height: 270 * scale }}>
        {error ? (
          <p className="renderer-message">
            No se pudieron cargar los gráficos de la estación. Recarga para reintentar.
          </p>
        ) : assets ? (
          <RendererBoundary>
            <Application
              width={480}
              height={270}
              resolution={1}
              autoDensity={false}
              antialias={false}
              roundPixels
              background={gamePalette.space}
              preference="webgl"
            >
              <SpaceStationScene assets={assets} />
            </Application>
          </RendererBoundary>
        ) : (
          <p className="renderer-message">
            Conectando con la estación…<small>Preparando el hábitat y la tripulación.</small>
          </p>
        )}
      </div>
    </div>
  )
}
