/**
 * CSP-safe OAuth guard — MUST load before auth-shell.js.
 * Inline scripts are blocked by production CSP; this file unblocks React on OAuth return
 * and stops stale service workers from hijacking the PKCE callback.
 */
(function () {
  var q = location.search || '';
  var h = location.hash || '';
  var oauth = /[?&]code=/.test(q) || /[?&]error=/.test(q)
    || /access_token=/.test(h) || /type=recovery/.test(h);
  if (!oauth) return;

  window.__HALLAQI_OAUTH_RETURN = true;
  window.__HALLAQI_AUTH_SHELL_PENDING = false;
  window.__HALLAQI_SKIP_SW_REGISTER = true;

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      });
    }
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    }
  } catch (e) { /* ignore */ }
})();
