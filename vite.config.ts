import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** The game is a single-page app mounted under this path; the static landing page owns `/`. */
const GAME_BASE = '/juego/'

/**
 * Deep links into the game (/juego/crew, /juego/vr…) have no file of their own: serve the game's
 * index.html so React Router can resolve them. Applies to the dev server and `vite preview`.
 * A production host needs the same rewrite: /juego/* → /juego/index.html.
 */
function gameFallback(): Plugin {
  const rewrite = (req: IncomingMessage, _res: ServerResponse, next: () => void) => {
    const path = (req.url ?? '').split('?')[0]
    const isPage = req.method === 'GET' && !/\.[a-z0-9]+$/i.test(path)
    if (isPage && path === GAME_BASE.slice(0, -1)) req.url = GAME_BASE + req.url!.slice(path.length)
    else if (isPage && path.startsWith(GAME_BASE) && path !== GAME_BASE)
      req.url = `${GAME_BASE}index.html${req.url!.slice(path.length)}`
    next()
  }
  return {
    name: 'game-spa-fallback',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

export default defineConfig(({ mode }) => ({
  // `pnpm dev:vr`: HTTPS on the LAN so a Meta Quest can open WebXR (it refuses plain http).
  plugins: [react(), gameFallback(), ...(mode === 'vr' ? [basicSsl()] : [])],
  // In VR mode, forward headset console output (incl. [vr-diag] steps) to this terminal.
  server:
    mode === 'vr'
      ? { forwardConsole: { unhandledErrors: true, logLevels: ['warn', 'error'] } }
      : {},
  build: {
    // Two pages: the landing (/) and the game (/juego/).
    rolldownOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        juego: fileURLToPath(new URL('./juego/index.html', import.meta.url)),
      },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}))
