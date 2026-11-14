import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/public-sans/wght.css'
import '@fontsource/dm-mono/latin-400.css'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
