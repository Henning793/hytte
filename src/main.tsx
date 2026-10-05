import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './lib/theme'
import './styles/hytte.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app">
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
)
