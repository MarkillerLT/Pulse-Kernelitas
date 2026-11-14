import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { ConsoleView } from './console/ConsoleView'
import { CrewView } from './views/CrewView'
import { CrewProfileView } from './views/CrewProfileView'
import { MissionsView } from './views/MissionsView'
import { LogView } from './views/LogView'
import { SectorsView } from './views/SectorsView'
import { SectorView } from './views/SectorView'
import { SystemView } from './views/SystemView'
import { NotFoundView } from './views/NotFoundView'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ConsoleView /> },
      { path: 'crew', element: <CrewView /> },
      { path: 'crew/:crewId', element: <CrewProfileView /> },
      { path: 'missions', element: <MissionsView /> },
      { path: 'log', element: <LogView /> },
      { path: 'sectors', element: <SectorsView /> },
      { path: 'sectors/:sectorId', element: <SectorView /> },
      { path: 'system', element: <SystemView /> },
      { path: '*', element: <NotFoundView /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
