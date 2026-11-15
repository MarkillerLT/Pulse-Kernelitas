import { create } from 'zustand'

/**
 * Loading/XR diagnostics for the VR view. Each step is logged with console.warn, which the Vite
 * dev server forwards to the terminal (server.forwardConsole), so a headset with no devtools
 * still reports where it got stuck. With `?diag` in the URL the same lines show on screen.
 */
interface DiagStore {
  lines: string[]
}

export const useDiag = create<DiagStore>()(() => ({ lines: [] }))

const t0 = performance.now()

export function diag(message: string) {
  const line = `+${((performance.now() - t0) / 1000).toFixed(1)}s ${message}`
  console.warn(`[vr-diag] ${line}`)
  useDiag.setState((s) => ({ lines: [...s.lines, line].slice(-14) }))
}

let installed = false
/** Reports uncaught errors and the browser/WebXR capabilities once. */
export function installDiag() {
  if (installed) return
  installed = true
  window.addEventListener('error', (e) => diag(`ERROR ${e.message} @ ${e.filename}:${e.lineno}`))
  window.addEventListener('unhandledrejection', (e) =>
    diag(`PROMESA RECHAZADA ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`),
  )
  diag(`navegador: ${navigator.userAgent}`)
  diag(`isSecureContext=${window.isSecureContext} navigator.xr=${'xr' in navigator}`)
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr
  if (xr) {
    for (const mode of ['immersive-vr', 'immersive-ar'] as const)
      xr.isSessionSupported(mode).then(
        (ok) => diag(`${mode} soportado=${ok}`),
        (e: unknown) => diag(`${mode} error=${String(e)}`),
      )
  }
}
