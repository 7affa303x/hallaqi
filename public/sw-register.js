/** Register SW only on normal visits — never during OAuth callback (PKCE ?code=). */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (window.__HALLAQI_SKIP_SW_REGISTER || window.__HALLAQI_OAUTH_RETURN) return;

  var q = location.search || '';
  var h = location.hash || '';
  if (/[?&]code=/.test(q) || /[?&]error=/.test(q)
      || /access_token=/.test(h) || /type=recovery/.test(h)) {
    return;
  }

  window.addEventListener('load', function () {
    if (window.__HALLAQI_SKIP_SW_REGISTER || window.__HALLAQI_OAUTH_RETURN) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
})();
