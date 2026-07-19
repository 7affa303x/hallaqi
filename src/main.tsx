import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ensureFreshAppShell } from '@/lib/appShell'

declare global {
  interface Window {
    __HALLAQI_AUTH_SHELL_PENDING?: boolean
  }
}

async function waitForAuthShellGate(): Promise<void> {
  const hash = window.location.hash || ''
  if (window.__HALLAQI_AUTH_SHELL_PENDING && (/access_token=/.test(hash) || /type=recovery/.test(hash))) {
    window.__HALLAQI_AUTH_SHELL_PENDING = false
  }
  if (!window.__HALLAQI_AUTH_SHELL_PENDING) return

  // auth-shell may hang on SW/cache APIs after manual cache clear — never block boot forever.
  await new Promise<void>(resolve => window.setTimeout(resolve, 4000))
  window.__HALLAQI_AUTH_SHELL_PENDING = false
}

async function boot() {
  await waitForAuthShellGate()
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

  // Dynamic import AFTER shell checks so supabase detectSessionInUrl does not run
  // on the first OAuth pass (when we are about to clear SW and reload).
  const { default: App } = await import('./App.tsx')

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
