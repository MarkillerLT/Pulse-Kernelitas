import { lazy, Suspense } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { ConsoleView } from './console/ConsoleView'
import { NotFoundView } from './views/NotFoundView'
import { VRLoading } from '../vr/DiagOverlay'

// three.js + WebXR only load when someone opens /vr.
const VRView = lazy(() => import('../vr/VRView'))

export const routes: RouteObject[] = [
  {
    path: '/vr',
    element: (
      <Suspense fallback={<VRLoading />}>
        <VRView />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppShell />,
    // One screen: crew, missions, sectors and the log are tabs of the console, and settings,
    // guide and difficulty live in the pause menu.
    children: [
      { index: true, element: <ConsoleView /> },
      { path: '*', element: <NotFoundView /> },
    ],
  },
]

// The landing page owns `/`; the game lives under /juego/ (see vite.config.ts).
export const router = createBrowserRouter(routes, { basename: '/juego' })
