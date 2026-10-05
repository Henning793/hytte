import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './lib/auth'
import './lib/theme'
import './styles/hytte.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app">
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </div>
  </StrictMode>,
)
