import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ensureFreshAppShell } from '@/lib/appShell'
import { isOAuthCallbackUrl } from '@/lib/authRedirect'

declare global {
  interface Window {
    __HALLAQI_AUTH_SHELL_PENDING?: boolean
    __HALLAQI_OAUTH_RETURN?: boolean
    __HALLAQI_SKIP_SW_REGISTER?: boolean
  }
}

function showBootError(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;text-align:center;background:#f8fafc;color:#0f172a">
      <div>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${message}</p>
        <button type="button" onclick="location.replace('/')" style="padding:10px 18px;border-radius:12px;border:none;background:#0F766E;color:#fff;font-weight:600;font-size:14px">
          إعادة المحاولة
        </button>
      </div>
    </div>`
}

async function boot() {
  try {
    if (isOAuthCallbackUrl()) {
      window.__HALLAQI_AUTH_SHELL_PENDING = false
      window.__HALLAQI_OAUTH_RETURN = true
      window.__HALLAQI_SKIP_SW_REGISTER = true
    } else if (window.__HALLAQI_AUTH_SHELL_PENDING) {
      await new Promise<void>(resolve => window.setTimeout(resolve, 1500))
      window.__HALLAQI_AUTH_SHELL_PENDING = false
    }

    const reloading = await ensureFreshAppShell()
    if (reloading) return

    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('hallaqi_refresh')) {
        url.searchParams.delete('hallaqi_refresh')
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      }
    } catch { /* ignore */ }

    const { default: App } = await import('./App.tsx')

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (err) {
    console.error('[hallaqi] boot failed', err)
    showBootError(
      isOAuthCallbackUrl()
        ? 'تعذر إكمال تسجيل الدخول. اضغط إعادة المحاولة أو سجّل بالبريد.'
        : 'تعذر تشغيل التطبيق. حاول تحديث الصفحة.',
    )
  }
}

void boot()
