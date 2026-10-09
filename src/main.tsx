import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './lib/auth'
import { CabinProvider } from './lib/cabins'
// Må lastes før appen tegnes: fanger nettleserens installeringstilbud.
import './lib/install'
import './lib/theme'
import './lib/update'
import './styles/hytte.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app">
      <AuthProvider>
        <CabinProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </CabinProvider>
      </AuthProvider>
    </div>
  </StrictMode>,
)
