import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  // `pnpm dev:vr`: HTTPS on the LAN so a Meta Quest can open WebXR (it refuses plain http).
  plugins: [react(), ...(mode === 'vr' ? [basicSsl()] : [])],
  // In VR mode, forward headset console output (incl. [vr-diag] steps) to this terminal.
  server:
    mode === 'vr'
      ? { forwardConsole: { unhandledErrors: true, logLevels: ['warn', 'error'] } }
      : {},
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}))
