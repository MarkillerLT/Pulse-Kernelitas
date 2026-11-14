import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Application } from '@pixi/react'
import { SpaceStationScene } from './scenes/SpaceStationScene'
import { loadSprites, type GameAssets } from './sprites/spriteLoader'

class RendererBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <p className="renderer-message">
        Graphics unavailable. Enable WebGL to view the station. All mission controls remain
        playable.
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
      aria-label="Interactive side-view space station. Select crew or click a room to queue an assignment."
    >
      <div className="world-frame" style={{ width: 480 * scale, height: 270 * scale }}>
        {error ? (
          <p className="renderer-message">Station assets could not load. Reload to retry.</p>
        ) : assets ? (
          <RendererBoundary>
            <Application
              width={480}
              height={270}
              resolution={1}
              autoDensity={false}
              antialias={false}
              roundPixels
              background="#08111e"
              preference="webgl"
            >
              <SpaceStationScene assets={assets} />
            </Application>
          </RendererBoundary>
        ) : (
          <p className="renderer-message">Establishing station uplink…</p>
        )}
      </div>
    </div>
  )
}
