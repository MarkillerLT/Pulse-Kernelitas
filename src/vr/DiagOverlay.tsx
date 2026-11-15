import { useEffect } from 'react'
import { diag, useDiag } from './diag'

const SHOW = new URLSearchParams(window.location.search).has('diag')

/** On-screen copy of the [vr-diag] log, only with `?diag` in the URL. */
export function DiagOverlay() {
  const lines = useDiag((s) => s.lines)
  if (!SHOW) return null
  return (
    <pre
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        right: 8,
        margin: 0,
        padding: 8,
        maxHeight: '45vh',
        overflow: 'auto',
        font: '12px/1.4 monospace',
        whiteSpace: 'pre-wrap',
        color: '#cfe8ff',
        background: 'rgba(0,0,0,0.75)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {lines.join('\n')}
    </pre>
  )
}

/** Router fallback for /vr: shows the diagnostics too, so a stuck load says where it stopped. */
export function VRLoading() {
  useEffect(() => {
    diag('descargando el módulo VR…')
    const t = window.setTimeout(() => diag('AVISO: la página VR sigue cargando tras 10 s'), 10000)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <>
      <p className="muted">Cargando la nave en 3D…</p>
      <DiagOverlay />
    </>
  )
}
