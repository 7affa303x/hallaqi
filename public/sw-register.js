/** Register push SW on normal visits — never during OAuth callback (PKCE ?code=). */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (window.__HALLAQI_SKIP_SW_REGISTER || window.__HALLAQI_OAUTH_RETURN) return;

  var q = location.search || '';
  var h = location.hash || '';
  if (/[?&]code=/.test(q) || /[?&]error=/.test(q)
      || /access_token=/.test(h) || /type=recovery/.test(h)) {
    return;
  }

  function registerPushSw() {
    if (window.__HALLAQI_SKIP_SW_REGISTER || window.__HALLAQI_OAUTH_RETURN) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(function (err) { console.warn('[Hallaqi] push SW register failed', err); });
  }

  if (document.readyState === 'complete') registerPushSw();
  else window.addEventListener('load', registerPushSw);
})();
