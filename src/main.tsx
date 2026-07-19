import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureFreshAppShell } from '@/lib/appShell'

async function boot() {
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
