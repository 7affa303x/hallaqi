import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureFreshAppShell } from '@/lib/appShell'

declare global {
  interface Window {
    __HALLAQI_AUTH_SHELL_PENDING?: boolean
  }
}

async function boot() {
  // Inline index.html script owns the first OAuth return — do not mount or consume ?code=.
  if (window.__HALLAQI_AUTH_SHELL_PENDING) return

  const reloading = await ensureFreshAppShell()
  if (reloading) return

  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('hallaqi_refresh')) {
      url.searchParams.delete('hallaqi_refresh')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }
  } catch { /* ignore */ }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
