import { createBrowserRouter, Navigate } from 'react-router'
import { App, CrewPage, MissionPage, ResearchPage } from './App'
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <CrewPage /> },
      { path: 'mission', element: <MissionPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
